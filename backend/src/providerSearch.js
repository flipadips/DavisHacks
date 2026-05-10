const directoryBaseUrl = "https://lgbtqhealthcaredirectory.org";
const algoliaApplicationId = process.env.LGBTQ_DIRECTORY_ALGOLIA_APP_ID || "SCMERBGKU4";
const algoliaApiKey = process.env.LGBTQ_DIRECTORY_ALGOLIA_API_KEY || "e358a47877b821aacbdc990a7412dd36";
const algoliaIndexName = process.env.LGBTQ_DIRECTORY_ALGOLIA_INDEX || "tsf_provider_prod";

export async function searchProviders({ zipCode, careType }) {
  const origin = await geocodeZipCode(zipCode);
  const sourceUrl = buildDirectoryUrl({ careType, zipCode, origin });

  if (!origin) {
    return {
      sourceUrl,
      providers: [],
      message: "Could not find coordinates for that ZIP code."
    };
  }

  const providers = await fetchProviderResults({ origin, careType });

  return {
    sourceUrl,
    providers,
    message: providers.length > 0 ? `${providers.length} providers found.` : "No providers found."
  };
}

function buildDirectoryUrl({ careType, zipCode, origin }) {
  const params = new URLSearchParams({
    query: directoryQueryFromCareType(careType),
    geo: origin ? `${origin.lat}, ${origin.lng}` : "",
    _zip: zipCode,
    page: "1",
    distance: ""
  });

  return `${directoryBaseUrl}/directory?${params.toString()}`;
}

async function fetchProviderResults({ origin, careType }) {
  const response = await fetch(algoliaEndpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: directoryBaseUrl,
      Referer: `${directoryBaseUrl}/`
    },
    body: JSON.stringify({
      requests: [
        {
          indexName: algoliaIndexName,
          params: providerSearchParams({ origin, careType })
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error("Directory provider search failed.");
  }

  const data = await response.json();
  const hits = data.results?.[0]?.hits || [];

  return hits.map(normalizeProviderHit).filter(Boolean);
}

function providerSearchParams({ origin, careType }) {
  const params = new URLSearchParams({
    aroundLatLng: `${origin.lat}, ${origin.lng}`,
    facets: JSON.stringify([
      "approach",
      "countries",
      "focus",
      "gender",
      "hispanic_latino",
      "insurance_types",
      "language",
      "lgbtq_practice",
      "licenses",
      "orientation",
      "race",
      "specialty",
      "telehealth",
      "transgender_identity"
    ]),
    hitsPerPage: "9",
    maxValuesPerFacet: "200",
    page: "0",
    query: ""
  });

  const specialty = directoryQueryFromCareType(careType);

  if (specialty) {
    params.set("facetFilters", JSON.stringify([[`specialty:${specialty}`]]));
  }

  return params.toString();
}

function normalizeProviderHit(hit) {
  const location = primaryLocation(hit.address_repeater);
  const position = providerPosition(hit, location);

  if (!hit.title || !position) {
    return null;
  }

  return {
    id: hit.objectID || String(hit.id),
    path: hit.slug || "",
    name: hit.title,
    city: location?.city || "",
    state: location?.state || hit.us_states?.[0] || "",
    lat: position.lat,
    lng: position.lng,
    url: hit.slug ? `${directoryBaseUrl}/provider/${hit.slug}` : ""
  };
}

function primaryLocation(locations = []) {
  return locations.find((location) => location.primary && !location.hide_listing) ||
    locations.find((location) => !location.hide_listing) ||
    locations[0] ||
    null;
}

function providerPosition(hit, location) {
  if (Number.isFinite(hit._geoloc?.lat) && Number.isFinite(hit._geoloc?.lng)) {
    return hit._geoloc;
  }

  const lat = Number(location?.lat);
  const lng = Number(location?.lng);

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }

  return null;
}

async function geocodeZipCode(zipCode) {
  const params = new URLSearchParams({
    q: zipCode,
    format: "jsonv2",
    limit: "1",
    countrycodes: "us,ca"
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "DavisHacks care finder prototype"
    }
  });

  if (!response.ok) {
    return null;
  }

  const [result] = await response.json();

  if (!result?.lat || !result?.lon) {
    return null;
  }

  return {
    lat: Number(result.lat),
    lng: Number(result.lon)
  };
}

function algoliaEndpoint() {
  const params = new URLSearchParams({
    "x-algolia-agent": "Algolia for JavaScript (4.25.2); Browser (lite); JS Helper (3.14.0); react-instantsearch (6.40.4)",
    "x-algolia-api-key": algoliaApiKey,
    "x-algolia-application-id": algoliaApplicationId
  });

  return `https://${algoliaApplicationId.toLowerCase()}-dsn.algolia.net/1/indexes/*/queries?${params.toString()}`;
}

function directoryQueryFromCareType(careType) {
  const normalizedCareType = careType.toLowerCase();

  if (normalizedCareType.includes("hormone")) {
    return "Gender Affirming Hormone Therapy";
  }

  if (normalizedCareType.includes("gender")) {
    return "Gender Affirming Care";
  }

  if (normalizedCareType.includes("prep")) {
    return "Pre-Exposure Prophylaxis (PrEP)";
  }

  if (normalizedCareType.includes("sti")) {
    return "HIV/STI Testing";
  }

  if (normalizedCareType.includes("hiv")) {
    return "HIV Care";
  }

  if (normalizedCareType.includes("sti") || normalizedCareType.includes("sexual")) {
    return "STI Prevention & Care";
  }

  if (normalizedCareType.includes("mental") || normalizedCareType.includes("counseling")) {
    return "Mental Health";
  }

  if (normalizedCareType.includes("family") || normalizedCareType.includes("fertility")) {
    return "Family Planning";
  }

  if (normalizedCareType.includes("youth") || normalizedCareType.includes("adolescent")) {
    return "Youth";
  }

  if (normalizedCareType.includes("primary")) {
    return "Primary Care";
  }

  return careType || "";
}
