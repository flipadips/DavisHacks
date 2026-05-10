import React from "react";
import GlobeVisual from "./GlobeVisual.jsx";
import MapView from "../MapView.jsx";
import { careTypes } from "../constants/careTypes.js";

export default function MobileOnboarding({
  step,
  location,
  careType,
  onLocationChange,
  onCareTypeChange,
  onNext,
  onBack,
  onSkip,
  onDone,
  onSubmitCare,
  careIntakeProps,
  providerPins = []
}) {
  const isSplashStep = step === 0;
  const isCareTypeStep = step === 2;
  const isMapStep = step === 3;
  const value = location;
  const canContinue = isSplashStep || isMapStep || (isCareTypeStep ? Boolean(careType) : value.trim().length > 0);

  if (isMapStep) {
    return (
      <main className="mobile-onboarding mobile-onboarding--map">
        <header className="mobile-onboarding__topbar">
          <button
            className="mobile-onboarding__back"
            type="button"
            aria-label="Go back"
            onClick={onBack}
          >
            <span aria-hidden="true" />
          </button>
          <button className="mobile-onboarding__skip" type="button" onClick={onDone}>
            Done
          </button>
        </header>

        <section className="mobile-onboarding__map-stage">
          <MapView
            externalPins={providerPins}
            externalStatus={careIntakeProps.providerStatus}
            sourceUrl={careIntakeProps.providerSourceUrl}
          />
        </section>
      </main>
    );
  }

  if (isCareTypeStep) {
    return (
      <main className="mobile-onboarding">
        <div className="mobile-onboarding__globe-bg">
          <GlobeVisual />
        </div>

        <form className="mobile-onboarding__form" onSubmit={onSubmitCare}>
          <header className="mobile-onboarding__topbar">
            <button
              className="mobile-onboarding__back"
              type="button"
              aria-label="Go back"
              onClick={onBack}
            >
              <span aria-hidden="true" />
            </button>
            <button className="mobile-onboarding__skip" type="button" onClick={onSkip}>
              Skip
            </button>
          </header>

          <section className="mobile-onboarding__care-screen">
            <h1>what type of care?</h1>
            <p>No account needed. Get a list from providers near your area.</p>

            <div className="mobile-onboarding__care-options" role="radiogroup" aria-label="Care type">
              {careTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={
                    type === careType
                      ? "mobile-onboarding__care-option mobile-onboarding__care-option--selected"
                      : "mobile-onboarding__care-option"
                  }
                  onClick={() => onCareTypeChange(type)}
                  aria-pressed={type === careType}
                >
                  {type}
                </button>
              ))}
            </div>
          </section>

          <footer className="mobile-onboarding__footer">
            <button type="submit" disabled={!canContinue}>
              Continue
            </button>
          </footer>
        </form>
      </main>
    );
  }

  if (isSplashStep) {
    return (
      <main className="mobile-onboarding">
        <div className="mobile-onboarding__globe-bg">
          <GlobeVisual />
        </div>

        <form className="mobile-onboarding__form" onSubmit={onNext}>
          <header className="mobile-onboarding__topbar">
            <button
              className="mobile-onboarding__back"
              type="button"
              aria-label="Go back"
              disabled
            >
              <span aria-hidden="true" />
            </button>
            <button className="mobile-onboarding__skip" type="button" onClick={onSkip}>
              Skip
            </button>
          </header>

          <section className="mobile-onboarding__screen">
            <h1>
              Vouch,
              <br />
              find care that fits you.
            </h1>
          </section>

          <footer className="mobile-onboarding__footer">
            <button type="submit">Begin</button>
          </footer>
        </form>
      </main>
    );
  }

  return (
    <main className="mobile-onboarding">
      <div className="mobile-onboarding__globe-bg">
        <GlobeVisual />
      </div>

      <form className="mobile-onboarding__form" onSubmit={onNext}>
        <header className="mobile-onboarding__topbar">
          <button
            className="mobile-onboarding__back"
            type="button"
            aria-label="Go back"
            onClick={onBack}
          >
            <span aria-hidden="true" />
          </button>
          <button className="mobile-onboarding__skip" type="button" onClick={onSkip}>
            Skip
          </button>
        </header>

        <section className="mobile-onboarding__screen">
          <div className="mobile-onboarding__icon" aria-hidden="true">
            <LocationIcon />
          </div>
          <h1>Where are you located?</h1>
          <p>No account needed. Get a list from providers near your area.</p>
          <input
            value={value}
            onChange={(event) => onLocationChange(event.target.value)}
            placeholder="Zipcode or City"
            aria-label="Your location"
            autoFocus
          />
        </section>

        <footer className="mobile-onboarding__footer">
          <button type="submit" disabled={!canContinue}>
            Next
          </button>
        </footer>
      </form>
    </main>
  );
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 48 48" role="img">
      <path d="m6.8 14.4 12-6 12 6 10.4-5.2v24.4l-10.4 5.2-12-6-12 6V14.4Z" />
      <path d="M18.8 8.4v24.4M30.8 14.4v6" />
      <path d="M38.4 29.6c0 6.8-7.6 11.8-7.6 11.8s-7.6-5-7.6-11.8a7.6 7.6 0 0 1 15.2 0Z" />
      <path d="M30.8 29.6h.1" />
    </svg>
  );
}
