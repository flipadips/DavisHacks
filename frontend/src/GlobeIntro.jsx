import React, { useEffect, useState } from "react";
import GlobeVisual from "./components/GlobeVisual.jsx";
import MapView from "./MapView.jsx";

export default function GlobeIntro({ providerPins = [], providerStatus = "", providerSourceUrl = "" }) {
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    if (providerPins.length > 0) {
      setShowMap(true);
    }
  }, [providerPins.length]);

  return (
    <section className={`globe-transition${showMap ? " globe-transition--map" : ""}`}>
      <div className="globe-stage" aria-hidden={showMap}>
        <div className="globe-copy">
          <p className="eyebrow">Care Near You</p>
          <h2>Start global. Land local.</h2>
          <p>
            Search affirming care from a calm launch point, then move straight into the map.
          </p>
          <button type="button" onClick={() => setShowMap(true)}>
            Open Map
          </button>
        </div>

        <GlobeVisual />
      </div>

      <div className="globe-map-frame" aria-hidden={!showMap}>
        {showMap && (
          <MapView
            externalPins={providerPins}
            externalStatus={providerStatus}
            sourceUrl={providerSourceUrl}
          />
        )}
      </div>
    </section>
  );
}
