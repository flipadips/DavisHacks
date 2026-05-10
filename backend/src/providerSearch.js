const directoryBaseUrl = "https://lgbtqhealthcaredirectory.org";
const providerCache = new Map();

export async function searchProviders({ zipCode, careType }) {
  const cacheKey = `${zipCode}|${careType}`;

  if (providerCache.has(cacheKey)) {
    return providerCache.get(cacheKey);
  }

  const origin = await geocodeLocation(zipCode);

  if (!origin) {
    return {
      sourceUrl: "",
      providers: [],
      message: "Could not find coordinates for that ZIP code."
    };
  }

  const sourceUrl = buildDirectoryUrl({ careType, zipCode, origin });
  const directoryHtml = await fetchText(sourceUrl);
  const profileUrls = extractProviderUrls(directoryHtml).slice(0, 8);
  const providers = [];

  for (const profileUrl of profileUrls) {
    const provider = await fetchProviderProfile(profileUrl);

    if (provider) {
      providers.push(provider);
    }

    await delay(1100);
  }

  const result = {
    sourceUrl,
    providers,
    message: providers.length > 0 ? "Providers loaded." : "No providers found in the directory response."
  };

  providerCache.set(cacheKey, result);
  return result;
}

function buildDirectoryUrl({ careType, zipCode, origin }) {
  const params = new URLSearchParams({
    query: directoryQueryFromCareType(careType),
    geo: `${origin.lat}, ${origin.lng}`,
    _zip: zipCode,
    page: "1",
    distance: ""
  });

  return `${directoryBaseUrl}/directory?${params.toString()}`;
}

function directoryQueryFromCareType(careType) {
  const normalizedCareType = careType.toLowerCase();

  if (normalizedCareType.includes("hormone") || normalizedCareType.includes("gender")) {
    return "Gender Affirming Care";
  }

  if (normalizedCareType.includes("prep") || normalizedCareType.includes("hiv")) {
    return "HIV Prevention & Care";
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

async function fetchProviderProfile(url) {
  try {
    const html = await fetchText(url);
    const name = firstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const specialty = fieldAfterHeading(html, "Specialty");
    const phone = firstMatch(html, /Call at\s*([^<\n]+)/i);
    const address = extractAddress(html);
    const coordinates = address ? await geocodeLocation(address) : null;

    if (!name || !coordinates) {
      return null;
    }

    return {
      id: slugFromUrl(url),
      name,
      specialty,
      address,
      phone,
      url,
      lat: coordinates.lat,
      lng: coordinates.lng
    };
  } catch {
    return null;
  }
}

async function geocodeLocation(location) {
  const params = new URLSearchParams({
    q: location,
    format: "jsonv2",
    limit: "1",
    countrycodes: "us,ca"
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: requestHeaders()
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

async function fetchText(url) {
  const response = await fetch(url, {
    headers: requestHeaders()
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${url}`);
  }

  return response.text();
}

function requestHeaders() {
  return {
    Accept: "text/html,application/xhtml+xml,application/json",
    "User-Agent": "DavisHacks care finder prototype (contact: local-development)"
  };
}

function extractProviderUrls(html) {
  const urls = new Set();
  const linkPattern = /href=["']([^"']*\/provider\/[^"']+)["']/gi;
  let match = linkPattern.exec(html);

  while (match) {
    const url = new URL(match[1], directoryBaseUrl);
    urls.add(url.href.replace(/\/$/, ""));
    match = linkPattern.exec(html);
  }

  return [...urls];
}

function extractAddress(html) {
  const locationBlock = firstMatch(html, /#{3,6}\s*Location[s]?([\s\S]*?)(?:#{3,6}|Brought to you|©|$)/i);
  const source = locationBlock || html;
  const text = decodeHtml(stripTags(source))
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return text.find((line) => /\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/.test(line)) || "";
}

function fieldAfterHeading(html, label) {
  const pattern = new RegExp(`${label}:\\s*([\\s\\S]*?)(?:Languages:|Gender:|Ethnicity:|Sexual Orientation:|Insurance accepted:|Care delivered|#{3,6}|$)`, "i");
  return firstMatch(html, pattern);
}

function firstMatch(source, pattern) {
  const match = pattern.exec(source);
  return match ? decodeHtml(stripTags(match[1])).replace(/\s+/g, " ").trim() : "";
}

function stripTags(value) {
  return value.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, "\n");
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "-")
    .replace(/&ndash;/g, "-")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, "\"")
    .replace(/&ldquo;/g, "\"");
}

function slugFromUrl(url) {
  return new URL(url).pathname.split("/").filter(Boolean).pop();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
