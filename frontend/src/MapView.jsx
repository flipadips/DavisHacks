import React, { useEffect, useMemo, useRef, useState } from "react";
import { loadLeaflet } from "./map/leafletLoader.js";
import { searchPlace } from "./map/nominatimSearch.js";
import { buildPlacePin, createInfoWindowContent } from "./map/placePin.js";

const defaultCenter = [38.5449, -121.7405];
const cartoVoyagerTileLayer = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const cartoVoyagerAttribution =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export default function MapView({
  center = defaultCenter,
  zoom = 13,
  initialPins = [],
  externalPins = [],
  externalStatus = "",
  sourceUrl = "",
  resultLocation = "",
  resultCareType = ""
}) {
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const markersByIdRef = useRef(new Map());
  const sheetDragStartRef = useRef(null);
  const [pins, setPins] = useState(initialPins);
  const [query, setQuery] = useState("");
  const [mapStatus, setMapStatus] = useState("Loading map...");
  const [isSearching, setIsSearching] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [sheetMode, setSheetMode] = useState("half");
  const providerPins = useMemo(() => externalPins.map(normalizeExternalPin).filter(Boolean), [externalPins]);
  const allPins = useMemo(() => [...providerPins, ...pins], [providerPins, pins]);
  const locationLabel = formatResultLocation(resultLocation);
  const careLabel = compactCareType(resultCareType);

  useEffect(() => {
    let isMounted = true;

    loadLeaflet()
      .then((L) => {
        if (!isMounted || !mapNodeRef.current) return;

        const map = L.map(mapNodeRef.current, {
          center,
          zoom,
          zoomControl: false,
          scrollWheelZoom: true
        });

        L.tileLayer(cartoVoyagerTileLayer, {
          maxZoom: 19,
          attribution: cartoVoyagerAttribution
        }).addTo(map);
        L.control.zoom({ position: "bottomright" }).addTo(map);

        mapRef.current = map;
        setIsMapReady(true);
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

  function handleSheetPointerDown(event) {
    sheetDragStartRef.current = event.clientY;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handleSheetPointerUp(event) {
    const startY = sheetDragStartRef.current;
    sheetDragStartRef.current = null;

    if (startY === null) {
      setSheetMode((currentMode) => (currentMode === "full" ? "half" : "full"));
      return;
    }

    const dragDistance = event.clientY - startY;

    if (dragDistance < -24) {
      setSheetMode("full");
      return;
    }

    if (dragDistance > 24) {
      setSheetMode("half");
      return;
    }

    setSheetMode((currentMode) => (currentMode === "full" ? "half" : "full"));
  }

  function handlePinFocus(pin) {
    const map = mapRef.current;
    const marker = markersByIdRef.current.get(pin.id);

    if (!map || !marker) return;

    setSheetMode("half");
    map.invalidateSize();
    map.setView(pin.position, Math.max(map.getZoom(), 15), { animate: true });
    marker.openPopup();
  }

  useEffect(() => {
    const map = mapRef.current;
    const L = window.L;

    if (!isMapReady || !map || !L) return;

    markersRef.current.forEach((marker) => {
      marker.remove();
    });
    markersByIdRef.current.clear();

    const markerIcon = createMapMarkerIcon(L);

    markersRef.current = allPins.map((pin) => {
      const marker = L.marker(pin.position, { icon: markerIcon }).addTo(map).bindPopup(createInfoWindowContent(pin));
      markersByIdRef.current.set(pin.id, marker);
      return marker;
    });

    if (allPins.length > 0) {
      if (allPins.length === 1) {
        map.setView(allPins[0].position, 15);
      } else {
        map.fitBounds(allPins.map((pin) => pin.position), { padding: [28, 28] });
      }
    }
  }, [allPins, isMapReady]);

  return (
    <section className="map-panel" aria-label="Places map">
      <div className="map-panel__header">
        <div>
          <p className="eyebrow">Streets</p>
          <h2>Map</h2>
        </div>
        <strong>{externalStatus || mapStatus}</strong>
      </div>

      <div className="map-stage">
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
      </div>

      {(sourceUrl || allPins.length > 0) && (
        <div className={`map-results-sheet map-results-sheet--${sheetMode}`}>
          <button
            className="map-results-sheet__handle"
            type="button"
            aria-label={sheetMode === "full" ? "Collapse provider list" : "Expand provider list"}
            aria-expanded={sheetMode === "full"}
            onPointerDown={handleSheetPointerDown}
            onPointerUp={handleSheetPointerUp}
          >
            <span />
          </button>

          <div className="map-results-sheet__summary">
            <p>
              showing <strong>{allPins.length}</strong> results in
            </p>
            <h3>{locationLabel}</h3>
          </div>

          <div className="map-filter-row" aria-label="Provider filters">
            <button type="button">accepting patients</button>
            <button type="button" className="map-filter-row__select">insurance</button>
            <button type="button" className="map-filter-row__select">distance</button>
          </div>

          {sourceUrl && (
            <a className="map-source-link map-source-link--desktop" href={sourceUrl} target="_blank" rel="noreferrer">
              View source results
            </a>
          )}

          {allPins.length > 0 && (
            <ol className="map-pin-list" aria-label="Selected places">
              {allPins.map((pin) => (
                <li
                  key={pin.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handlePinFocus(pin)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handlePinFocus(pin);
                    }
                  }}
                  aria-label={`Show ${pin.name} on map`}
                >
                  <div className="map-provider-card__thumb" aria-hidden="true">
                    <span>{providerInitials(pin.name)}</span>
                  </div>
                  <div className="map-provider-card__body">
                    <p>{pin.name}</p>
                    <p>
                      4.5 <span aria-hidden="true">★</span> <small>(18 reviews) • nearby</small>
                    </p>
                    <strong>{careLabel || pin.label}</strong>
                    <em>Accepting New Patients</em>
                  </div>
                  {pin.url || sourceUrl ? (
                    <a
                      className="map-provider-card__open"
                      href={pin.url || sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open ${pin.name}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      ›
                    </a>
                  ) : (
                    <span className="map-provider-card__open" aria-hidden="true">
                      ›
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}

function formatResultLocation(value) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "your area";
  }

  return trimmedValue.toLowerCase();
}

function compactCareType(value) {
  const normalizedValue = value.toLowerCase();

  if (normalizedValue.includes("hormone")) return "Hormone Therapy";
  if (normalizedValue.includes("primary")) return "Primary Care";
  if (normalizedValue.includes("prep")) return "PrEP";
  if (normalizedValue.includes("mental")) return "Mental Health";
  if (normalizedValue.includes("hiv")) return "HIV Care";
  if (normalizedValue.includes("sti")) return "STI Care";
  if (normalizedValue.includes("gender")) return "Gender-Affirming Care";

  return value;
}

function providerInitials(name) {
  const words = name.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "V";
  }

  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
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

function createMapMarkerIcon(L) {
  return L.divIcon({
    className: "map-marker-icon",
    html: '<span class="map-marker-icon__pin"></span><span class="map-marker-icon__dot"></span>',
    iconSize: [30, 42],
    iconAnchor: [15, 40],
    popupAnchor: [0, -36]
  });
}

