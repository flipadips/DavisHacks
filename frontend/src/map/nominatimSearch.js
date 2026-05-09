const nominatimEndpoint = "https://nominatim.openstreetmap.org/search";

export async function searchPlace(query) {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    limit: "1"
  });

  const response = await fetch(`${nominatimEndpoint}?${params.toString()}`, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error("Place search failed.");
  }

  const results = await response.json();
  return results[0] || null;
}
