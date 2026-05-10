import React, { useEffect, useMemo, useRef, useState } from "react";
import { loadLeaflet } from "./map/leafletLoader.js";
import { searchPlace } from "./map/nominatimSearch.js";
import { buildPlacePin, createInfoWindowContent } from "./map/placePin.js";

const defaultCenter = [38.5449, -121.7405];

export default function MapView({
  center = defaultCenter,
  zoom = 13,
  initialPins = [],
  externalPins = [],
  externalStatus = "",
  sourceUrl = ""
}) {
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [pins, setPins] = useState(initialPins);
  const [query, setQuery] = useState("");
  const [mapStatus, setMapStatus] = useState("Loading map...");
  const [isSearching, setIsSearching] = useState(false);
  const providerPins = useMemo(() => externalPins.map(normalizeExternalPin).filter(Boolean), [externalPins]);
  const allPins = useMemo(() => [...providerPins, ...pins], [providerPins, pins]);

  useEffect(() => {
    let isMounted = true;

    loadLeaflet()
      .then((L) => {
        if (!isMounted || !mapNodeRef.current) return;

        const map = L.map(mapNodeRef.current, {
          center,
          zoom,
          scrollWheelZoom: true
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        mapRef.current = map;
        setMapStatus("Ready");
      })
      .catch((error) => {
        if (isMounted) {
          setMapStatus(error.message);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [center, zoom]);

  async function handlePlaceSearch(event) {
    event.preventDefault();

    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    setIsSearching(true);
    setMapStatus("Searching...");

    try {
      const place = await searchPlace(trimmedQuery);
      const nextPin = buildPlacePin(place, pins.length + 1);

      if (!nextPin) {
        setMapStatus("No matching place found");
        return;
      }

      setPins((currentPins) => [...currentPins, { ...nextPin, label: `Place ${currentPins.length + 1}` }]);
      setQuery("");
      setMapStatus("Place added");
    } catch (error) {
      setMapStatus(error.message);
    } finally {
      setIsSearching(false);
    }
  }

  useEffect(() => {
    const map = mapRef.current;
    const L = window.L;

    if (!map || !L) return;

    markersRef.current.forEach((marker) => {
      marker.remove();
    });

    markersRef.current = allPins.map((pin) => {
      return L.marker(pin.position).addTo(map).bindPopup(createInfoWindowContent(pin));
    });

    if (allPins.length > 0) {
      if (allPins.length === 1) {
        map.setView(allPins[0].position, 15);
      } else {
        map.fitBounds(allPins.map((pin) => pin.position), { padding: [28, 28] });
      }
    }
  }, [allPins]);

  return (
    <section className="map-panel" aria-label="Places map">
      <div className="map-panel__header">
        <div>
          <p className="eyebrow">OpenStreetMap</p>
          <h2>Trip Map</h2>
        </div>
        <strong>{externalStatus || mapStatus}</strong>
      </div>

      <form className="map-search-row" onSubmit={handlePlaceSearch}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          type="search"
          placeholder="Search for a place"
          aria-label="Search for a place"
          autoComplete="off"
          spellCheck="false"
          disabled={isSearching}
        />
        <button type="submit" disabled={isSearching}>
          Add
        </button>
      </form>

      <div className="map-canvas" ref={mapNodeRef} />

      {sourceUrl && (
        <a className="map-source-link" href={sourceUrl} target="_blank" rel="noreferrer">
          View source results
        </a>
      )}

      {allPins.length > 0 && (
        <ol className="map-pin-list" aria-label="Selected places">
          {allPins.map((pin) => (
            <li key={pin.id}>
              <strong>{pin.label}</strong>
              <span>{pin.name}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function normalizeExternalPin(pin) {
  const position = getPinPosition(pin);

  if (!position) {
    return null;
  }

  return {
    ...pin,
    id: pin.id || pin.path || `${pin.name}-${position.join(",")}`,
    label: pin.label || "Provider",
    name: pin.name || "Provider",
    city: pin.city || "",
    state: pin.state || "",
    position
  };
}

function getPinPosition(pin) {
  if (Array.isArray(pin.position) && pin.position.length === 2) {
    return pin.position;
  }

  if (Number.isFinite(pin.lat) && Number.isFinite(pin.lng)) {
    return [pin.lat, pin.lng];
  }

  if (Number.isFinite(pin._geoloc?.lat) && Number.isFinite(pin._geoloc?.lng)) {
    return [pin._geoloc.lat, pin._geoloc.lng];
  }

  return null;
}
