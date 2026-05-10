import React, { useEffect, useMemo, useRef, useState } from "react";
import appointmentCalendarIcon from "./assets/appointment-calendar.svg";
import appointmentInsuranceIcon from "./assets/appointment-insurance.svg";
import appointmentLanguageIcon from "./assets/appointment-language.svg";
import { loadLeaflet } from "./map/leafletLoader.js";
import { searchPlace } from "./map/nominatimSearch.js";
import { buildPlacePin, createInfoWindowContent } from "./map/placePin.js";

const defaultCenter = [38.5449, -121.7405];
const cartoVoyagerTileLayer = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const cartoVoyagerAttribution =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
const appointmentDates = [
  { id: "sun-10", day: "Sun", date: "10", fullDay: "Sunday", reviewLabel: "Sunday, May 10 2026" },
  { id: "mon-11", day: "Mon", date: "11", fullDay: "Monday", reviewLabel: "Monday, May 11 2026" },
  { id: "tue-12", day: "Tue", date: "12", fullDay: "Tuesday", reviewLabel: "Tuesday, May 12 2026" },
  { id: "wed-13", day: "Wed", date: "13", fullDay: "Wednesday", reviewLabel: "Wednesday, May 13 2026" },
  { id: "thu-14", day: "Thu", date: "14", fullDay: "Thursday", reviewLabel: "Thursday, May 14 2026" },
  { id: "fri-15", day: "Fri", date: "15", fullDay: "Friday", reviewLabel: "Friday, May 15 2026" }
];
const distanceOptions = [
  { label: "All distances", value: "All" },
  { label: "Within 5 miles", value: 5 },
  { label: "Within 10 miles", value: 10 },
  { label: "Within 25 miles", value: 25 },
  { label: "Within 50 miles", value: 50 }
];

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
  const [isInsuranceSheetOpen, setIsInsuranceSheetOpen] = useState(false);
  const [isDistanceSheetOpen, setIsDistanceSheetOpen] = useState(false);
  const [insuranceFilter, setInsuranceFilter] = useState("All");
  const [distanceFilter, setDistanceFilter] = useState("All");
  const [acceptingOnly, setAcceptingOnly] = useState(false);
  const [bookingProvider, setBookingProvider] = useState(null);
  const [bookingStep, setBookingStep] = useState("detail");
  const [appointmentDateId, setAppointmentDateId] = useState("mon-11");
  const [appointmentTime, setAppointmentTime] = useState("1:00 PM");
  const [appointmentTransitionKey, setAppointmentTransitionKey] = useState(0);
  const providerPins = useMemo(() => externalPins.map(normalizeExternalPin).filter(Boolean), [externalPins]);
  const allPins = useMemo(() => [...providerPins, ...pins], [providerPins, pins]);
  const filteredPins = useMemo(
    () => filterPins(allPins, { acceptingOnly, insuranceFilter, distanceFilter }),
    [allPins, acceptingOnly, insuranceFilter, distanceFilter]
  );
  const insuranceOptions = useMemo(
    () => ["All", ...uniqueSorted(allPins.flatMap((pin) => pin.insurance || []))],
    [allPins]
  );
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

  useEffect(() => {
    document.body.classList.toggle("appointment-flow-active", Boolean(bookingProvider));

    return () => {
      document.body.classList.remove("appointment-flow-active");
    };
  }, [bookingProvider]);

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

  function openBookingFlow(event, pin) {
    event.stopPropagation();
    setBookingProvider(pin);
    setBookingStep("detail");
    setAppointmentDateId("mon-11");
    setAppointmentTime("1:00 PM");
    setAppointmentTransitionKey((currentValue) => currentValue + 1);
  }

  function closeBookingFlow() {
    setBookingProvider(null);
    setBookingStep("detail");
    setAppointmentDateId("mon-11");
    setAppointmentTime("1:00 PM");
  }

  function goToAppointmentStep(nextStep) {
    setBookingStep(nextStep);
    setAppointmentTransitionKey((currentValue) => currentValue + 1);
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

    markersRef.current = filteredPins.map((pin) => {
      const marker = L.marker(pin.position, { icon: markerIcon }).addTo(map).bindPopup(createInfoWindowContent(pin));
      markersByIdRef.current.set(pin.id, marker);
      return marker;
    });

    if (filteredPins.length > 0) {
      if (filteredPins.length === 1) {
        map.setView(filteredPins[0].position, 15);
      } else {
        map.fitBounds(filteredPins.map((pin) => pin.position), { padding: [28, 28] });
      }
    }
  }, [filteredPins, isMapReady]);

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
              showing <strong>{filteredPins.length}</strong> results in
            </p>
            <h3>{locationLabel}</h3>
          </div>

          <div className="map-filter-row" aria-label="Provider filters">
            <button
              type="button"
              className={acceptingOnly ? "map-filter-row__active" : ""}
              onClick={() => setAcceptingOnly((currentValue) => !currentValue)}
            >
              accepting patients
            </button>
            <button
              type="button"
              className="map-filter-row__select"
              onClick={() => setIsInsuranceSheetOpen(true)}
            >
              {insuranceFilter === "All" ? "all insurances" : insuranceFilter}
            </button>
            <button
              type="button"
              className={distanceFilter === "All" ? "map-filter-row__select" : "map-filter-row__select map-filter-row__active"}
              onClick={() => setIsDistanceSheetOpen(true)}
            >
              {formatDistanceFilter(distanceFilter)}
            </button>
          </div>

          {sourceUrl && (
            <a className="map-source-link map-source-link--desktop" href={sourceUrl} target="_blank" rel="noreferrer">
              View source results
            </a>
          )}

          {filteredPins.length > 0 && (
            <ol className="map-pin-list" aria-label="Selected places">
              {filteredPins.map((pin) => (
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
                    <p>{pin.placeName || pin.name}</p>
                    <p>
                      {formatRating(pin.rating)}
                      <span aria-hidden="true">★</span>
                      <small> ({pin.reviewCount || 18} reviews) • {formatDistance(pin.distanceMiles)}</small>
                    </p>
                    <strong>{pin.specialty || careLabel || pin.label}</strong>
                    <em>{pin.acceptingPatients ? "Accepting New Patients" : "Not Accepting New Patients"}</em>
                  </div>
                  <button
                    className="map-provider-card__open"
                    type="button"
                    aria-label={`Book with ${pin.name}`}
                    onClick={(event) => openBookingFlow(event, pin)}
                  >
                    &gt;
                  </button>
                </li>
              ))}
            </ol>
          )}
          {allPins.length > 0 && filteredPins.length === 0 && (
            <p className="map-results-sheet__empty">No providers match those filters.</p>
          )}
        </div>
      )}

      <div
        className={
          isInsuranceSheetOpen
            ? "map-filter-modal map-filter-modal--open"
            : "map-filter-modal"
        }
        aria-hidden={!isInsuranceSheetOpen}
      >
        <button
          className="map-filter-modal__scrim"
          type="button"
          aria-label="Close insurance filter"
          onClick={() => setIsInsuranceSheetOpen(false)}
        />
        <section className="map-filter-modal__sheet" aria-label="Sort by insurance">
          <div className="map-filter-modal__header">
            <h3>Sort By</h3>
            <button type="button" aria-label="Close" onClick={() => setIsInsuranceSheetOpen(false)}>
              <span aria-hidden="true">×</span>
            </button>
          </div>

          <div className="map-filter-modal__options">
            {insuranceOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={option === insuranceFilter ? "map-filter-modal__option map-filter-modal__option--selected" : "map-filter-modal__option"}
                onClick={() => {
                  setInsuranceFilter(option);
                  setIsInsuranceSheetOpen(false);
                }}
              >
                <span>{option}</span>
                {option === insuranceFilter && <span aria-hidden="true">✓</span>}
              </button>
            ))}
          </div>
        </section>
      </div>

      <div
        className={
          isDistanceSheetOpen
            ? "map-filter-modal map-filter-modal--open"
            : "map-filter-modal"
        }
        aria-hidden={!isDistanceSheetOpen}
      >
        <button
          className="map-filter-modal__scrim"
          type="button"
          aria-label="Close distance filter"
          onClick={() => setIsDistanceSheetOpen(false)}
        />
        <section className="map-filter-modal__sheet" aria-label="Filter by distance">
          <div className="map-filter-modal__header">
            <h3>Distance</h3>
            <button type="button" aria-label="Close" onClick={() => setIsDistanceSheetOpen(false)}>
              <span aria-hidden="true">×</span>
            </button>
          </div>

          <div className="map-filter-modal__options">
            {distanceOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={option.value === distanceFilter ? "map-filter-modal__option map-filter-modal__option--selected" : "map-filter-modal__option"}
                onClick={() => {
                  setDistanceFilter(option.value);
                  setIsDistanceSheetOpen(false);
                }}
              >
                <span>{option.label}</span>
                {option.value === distanceFilter && <span aria-hidden="true">✓</span>}
              </button>
            ))}
          </div>
        </section>
      </div>

      {bookingProvider && (
        <AppointmentFlow
          key={`${bookingStep}-${appointmentTransitionKey}`}
          provider={bookingProvider}
          step={bookingStep}
          appointmentDateId={appointmentDateId}
          appointmentTime={appointmentTime}
          onBack={() => {
            if (bookingStep === "detail") {
              closeBookingFlow();
            } else if (bookingStep === "time") {
              goToAppointmentStep("detail");
            } else if (bookingStep === "review") {
              goToAppointmentStep("time");
            } else {
              closeBookingFlow();
            }
          }}
          onClose={closeBookingFlow}
          onConfirmAvailability={() => goToAppointmentStep("time")}
          onSelectDate={(dateId) => setAppointmentDateId((currentValue) => (currentValue === dateId ? "" : dateId))}
          onSelectTime={setAppointmentTime}
          onConfirmTime={() => goToAppointmentStep("review")}
          onConfirmAppointment={() => goToAppointmentStep("booked")}
        />
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

function AppointmentFlow({
  provider,
  step,
  appointmentDateId,
  appointmentTime,
  onBack,
  onClose,
  onConfirmAvailability,
  onSelectDate,
  onSelectTime,
  onConfirmTime,
  onConfirmAppointment
}) {
  const selectedDate = appointmentDates.find((date) => date.id === appointmentDateId);
  const appointmentDate = selectedDate?.reviewLabel || "No date selected";
  const displayName = provider.name || "Physician";
  const pronouns = provider.pronouns || "she/her";
  const languages = provider.languages?.length ? provider.languages.join(", ") : "English";
  const insurance = provider.insurance?.[0] || "Medi-Cal";

  if (step === "booked") {
    return (
      <section className="appointment-flow appointment-flow--booked" aria-label="Appointment booked">
        <div className="appointment-flow__success" aria-hidden="true">
          <span />
        </div>
        <div className="appointment-flow__booked-copy">
          <h2>You&apos;re booked!</h2>
          <p>your appointment is confirmed. see you then!</p>
        </div>
        <div className="appointment-flow__booked-actions">
          <button type="button" onClick={onClose}>Continue</button>
          <button type="button" className="appointment-flow__calendar">
            <span className="appointment-flow__calendar-icon" aria-hidden="true" />
            Add to Calendar
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="appointment-flow" aria-label="Book appointment">
      <button className="appointment-flow__back" type="button" aria-label="Go back" onClick={onBack}>
        <span aria-hidden="true" />
      </button>

      {step === "detail" && (
        <>
          <ProviderAvatar provider={provider} />
          <div className="appointment-flow__provider-heading">
            <h2>{displayName} <span>{pronouns}</span></h2>
            <p>{provider.specialty ? titleCaseLower(provider.specialty) : "Doctor"}</p>
          </div>
          <div className="appointment-flow__facts">
            <p>
              <span className="appointment-flow__fact-icon" aria-hidden="true">
                <img src={appointmentCalendarIcon} alt="" />
              </span>
              Available on {selectedDate?.fullDay || "your selected day"}
              <small>45 min In Person Session</small>
            </p>
            <p>
              <span className="appointment-flow__fact-icon" aria-hidden="true">
                <img src={appointmentLanguageIcon} alt="" />
              </span>
              Speaks {languages}
            </p>
          </div>
          <p className="appointment-flow__description">
            {provider.shortSummary || "I provide affirming, compassionate care and help patients find support that fits their goals."}
          </p>
          <div className="appointment-flow__footer">
            <button type="button" onClick={onConfirmAvailability}>Confirm Availability</button>
            <small>free cancellation available 48 hours in advance</small>
          </div>
        </>
      )}

      {step === "time" && (
        <>
          <DateStrip selectedDateId={appointmentDateId} onSelectDate={onSelectDate} />
          <TimePicker selectedTime={appointmentTime} onSelectTime={onSelectTime} />
          <div className="appointment-flow__footer">
            <button type="button" onClick={onConfirmTime}>Confirm Time</button>
            <small>free cancellation available 48 hours in advance</small>
          </div>
        </>
      )}

      {step === "review" && (
        <>
          <h2 className="appointment-flow__title">Your Appointment</h2>
          <div className="appointment-flow__review-provider">
            <ProviderAvatar provider={provider} />
            <div>
              <strong>{displayName} <span>{pronouns}</span></strong>
              <p>{provider.specialty ? titleCaseLower(provider.specialty) : "Doctor"}</p>
            </div>
          </div>
          <div className="appointment-flow__review-list">
            <p>
              <span className="appointment-flow__fact-icon" aria-hidden="true">
                <img src={appointmentCalendarIcon} alt="" />
              </span>
              {appointmentDate}
              <small>{appointmentTime} In Person Session</small>
            </p>
            <p>
              <span className="appointment-flow__fact-icon" aria-hidden="true">
                <img src={appointmentInsuranceIcon} alt="" />
              </span>
              {insurance}
            </p>
          </div>
          <p className="appointment-flow__cancel-note">free cancellation available 48 hours in advance</p>
          <div className="appointment-flow__footer">
            <button type="button" onClick={onConfirmAppointment}>Confirm Appointment</button>
            <small>free cancellation available 48 hours in advance</small>
          </div>
        </>
      )}
    </section>
  );
}

function ProviderAvatar({ provider }) {
  return (
    <div className="appointment-flow__avatar" aria-hidden="true">
      <span>{providerInitials(provider.name || "Provider")}</span>
    </div>
  );
}

function DateStrip({ selectedDateId, onSelectDate }) {
  return (
    <div className="appointment-flow__dates" aria-label="Appointment dates">
      {appointmentDates.map(({ id, day, date }) => (
        <button
          key={id}
          type="button"
          className={id === selectedDateId ? "appointment-flow__date appointment-flow__date--selected" : "appointment-flow__date"}
          aria-pressed={id === selectedDateId}
          onClick={() => onSelectDate(id)}
        >
          <span>{day}</span>
          <strong>{date}</strong>
        </button>
      ))}
    </div>
  );
}

function TimePicker({ selectedTime, onSelectTime }) {
  const afternoon = ["1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];
  const evening = ["6:00 PM", "7:00 PM"];

  return (
    <div className="appointment-flow__times">
      <h3>Afternoon</h3>
      {afternoon.map((time) => (
        <button key={time} type="button" className={time === selectedTime ? "appointment-flow__time appointment-flow__time--selected" : "appointment-flow__time"} onClick={() => onSelectTime(time)}>
          {time}
        </button>
      ))}
      <h3>Evening</h3>
      {evening.map((time) => (
        <button key={time} type="button" className={time === selectedTime ? "appointment-flow__time appointment-flow__time--selected" : "appointment-flow__time"} onClick={() => onSelectTime(time)}>
          {time}
        </button>
      ))}
    </div>
  );
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

function filterPins(pins, { acceptingOnly, insuranceFilter, distanceFilter }) {
  return pins.filter((pin) => {
    if (acceptingOnly && !pin.acceptingPatients) {
      return false;
    }

    if (insuranceFilter !== "All" && !pin.insurance?.includes(insuranceFilter)) {
      return false;
    }

    if (distanceFilter !== "All") {
      const distance = Number(pin.distanceMiles);

      if (!Number.isFinite(distance) || distance > distanceFilter) {
        return false;
      }
    }

    return true;
  });
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function formatRating(value) {
  const rating = Number(value);
  return Number.isFinite(rating) ? rating.toFixed(1) : "4.5";
}

function formatDistance(value) {
  const distance = Number(value);
  return Number.isFinite(distance) ? `${distance.toFixed(1)} miles` : "nearby";
}

function formatDistanceFilter(value) {
  return value === "All" ? "distance" : `within ${value} mi`;
}

function titleCaseLower(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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
    shortSummary: pin.shortSummary || pin.short_summary || "",
    placeName: pin.placeName || pin.place_name || pin.clinicName || "",
    address: pin.address || "",
    city: pin.city || "",
    state: pin.state || "",
    insurance: pin.insurance || [],
    specialty: pin.specialty || pin.specialties?.[0] || "",
    rating: Number.isFinite(Number(pin.rating)) ? Number(pin.rating) : 4.5,
    reviewCount: Number.isFinite(Number(pin.reviewCount)) ? Number(pin.reviewCount) : 18,
    distanceMiles: Number.isFinite(Number(pin.distanceMiles)) ? Number(pin.distanceMiles) : null,
    tags: pin.tags || pin.focusTags || [],
    languages: pin.languages || [],
    acceptingPatients: Boolean(pin.acceptingPatients ?? pin.accepting_patients ?? true),
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


