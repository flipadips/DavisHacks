import { pool } from "./db.js";
import { careTags } from "./seedProviders.js";

const zipCenters = {
  "95616": { lat: 38.5449, lng: -121.7405, label: "Davis, CA" },
  "95618": { lat: 38.5449, lng: -121.7405, label: "Davis, CA" },
  "95776": { lat: 38.6785, lng: -121.7733, label: "Woodland, CA" },
  "95814": { lat: 38.5816, lng: -121.4944, label: "Sacramento, CA" },
  "95816": { lat: 38.571, lng: -121.4689, label: "Sacramento, CA" },
  "95817": { lat: 38.5518, lng: -121.4544, label: "Sacramento, CA" },
  "95825": { lat: 38.5891, lng: -121.4088, label: "Sacramento, CA" }
};

const defaultCenter = zipCenters["95616"];

export async function searchProviders({ zipCode = "", careType = "" } = {}) {
  const requestedTags = parseCareTags(careType);
  const origin = zipCenters[String(zipCode).slice(0, 5)] || defaultCenter;
  const providers = await fetchProvidersFromDatabase({ requestedTags, origin });

  return {
    source: "database",
    sourceUrl: "",
    query: {
      zipCode,
      careTypes: requestedTags,
      origin
    },
    providers,
    message: providers.length > 0 ? `${providers.length} providers loaded from database.` : "No database providers found."
  };
}

export async function listProviders() {
  const providers = await fetchProvidersFromDatabase({ requestedTags: [], origin: defaultCenter });

  return {
    source: "database",
    providers,
    message: providers.length > 0 ? `${providers.length} providers loaded from database.` : "No database providers found."
  };
}

async function fetchProvidersFromDatabase({ requestedTags, origin }) {
  const values = [];
  let whereClause = "";

  if (requestedTags.length > 0) {
    values.push(requestedTags);
    whereClause = "WHERE tags && $1::text[]";
  }

  const result = await pool.query(
    `
      SELECT
        id,
        source_id,
        name,
        short_summary,
        place_name,
        address,
        city,
        state,
        latitude,
        longitude,
        insurance,
        specialty,
        rating,
        review_count,
        accepting_patients,
        tags,
        languages
      FROM providers
      ${whereClause}
      ORDER BY name ASC
    `,
    values
  );

  return result.rows
    .map((provider) => normalizeProvider(provider, origin))
    .sort((a, b) => a.distanceMiles - b.distanceMiles);
}

function normalizeProvider(provider, origin) {
  const distanceMiles = roundDistance(distanceBetweenMiles(origin.lat, origin.lng, provider.latitude, provider.longitude));

  return {
    id: provider.source_id || `provider-${provider.id}`,
    databaseId: provider.id,
    name: provider.name,
    shortSummary: provider.short_summary,
    placeName: provider.place_name,
    clinicName: provider.place_name,
    address: provider.address,
    city: provider.city || "",
    state: provider.state || "",
    lat: provider.latitude,
    lng: provider.longitude,
    position: [provider.latitude, provider.longitude],
    insurance: provider.insurance || [],
    specialty: provider.specialty,
    specialties: [provider.specialty],
    rating: Number(provider.rating),
    reviewCount: provider.review_count,
    acceptingPatients: provider.accepting_patients,
    tags: provider.tags || [],
    focusTags: provider.tags || [],
    languages: provider.languages || [],
    distanceMiles,
    url: "",
    label: provider.place_name,
    databaseRecord: {
      name: provider.name,
      short_summary: provider.short_summary,
      place: {
        name: provider.place_name,
        address: provider.address,
        city: provider.city,
        state: provider.state,
        latitude: provider.latitude,
        longitude: provider.longitude,
        map_query: provider.address
      },
      insurance: provider.insurance || [],
      specialty: provider.specialty,
      rating: Number(provider.rating),
      review_count: provider.review_count,
      accepting_patients: provider.accepting_patients,
      tags: provider.tags || [],
      languages: provider.languages || []
    }
  };
}

function parseCareTags(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => careTags.includes(item));
}

function distanceBetweenMiles(lat1, lng1, lat2, lng2) {
  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function roundDistance(value) {
  return Math.round(value * 10) / 10;
}
