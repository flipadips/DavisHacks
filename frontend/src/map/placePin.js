export function buildPlacePin(place, index) {
  if (!place?.lat || !place?.lon) {
    return null;
  }

  return {
    id: place.place_id || `${place.osm_type}-${place.osm_id}` || `place-${index}`,
    label: `Place ${index}`,
    name: place.name || place.display_name?.split(",")[0] || `Place ${index}`,
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
