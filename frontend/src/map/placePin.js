export function buildPlacePin(place, index) {
  if (!place?.lat || !place?.lon) {
    return null;
  }

  const placeId = place.place_id || (place.osm_type && place.osm_id ? `${place.osm_type}-${place.osm_id}` : `place-${index}`);
  const placeName = getPlaceName(place, index);

  return {
    id: placeId,
    label: `Place ${index}`,
    name: placeName,
    address: place.display_name || "",
    position: [Number(place.lat), Number(place.lon)]
  };
}

export function createInfoWindowContent(pin) {
  const container = document.createElement("div");
  container.className = "map-info-window";

  const label = document.createElement("strong");
  label.textContent = pin.label;

  const name = document.createElement("span");
  name.textContent = pin.name;

  const address = document.createElement("small");
  address.textContent = pin.address || "Custom location";

  container.append(label, name, address);

  return container;
}

function getPlaceName(place, index) {
  const address = place.address || {};
  const streetAddress = [address.house_number, address.road].filter(Boolean).join(" ");
  const locality = address.city || address.town || address.village || address.county;

  if (streetAddress && locality) {
    return `${streetAddress}, ${locality}`;
  }

  if (streetAddress) {
    return streetAddress;
  }

  if (place.name && !/^\d+$/.test(place.name)) {
    return place.name;
  }

  const displayParts = place.display_name?.split(",").map((part) => part.trim()).filter(Boolean) || [];
  const usefulParts = displayParts.filter((part) => !/^\d+$/.test(part));

  if (usefulParts.length >= 2) {
    return usefulParts.slice(0, 2).join(", ");
  }

  return usefulParts[0] || displayParts[0] || `Place ${index}`;
}
