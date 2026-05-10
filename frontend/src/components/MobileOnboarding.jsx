import React, { useRef, useState } from "react";
import { Search, X } from "lucide-react";
import GlobeVisual from "./GlobeVisual.jsx";
import MapView from "../MapView.jsx";
import { careTypes } from "../constants/careTypes.js";

export default function MobileOnboarding({
  step,
  location,
  selectedCareTypes,
  careTypeLabel,
  onLocationChange,
  onCareTypeToggle,
  onNext,
  onBack,
  onSkip,
  onSubmitCare,
  onSubmitLocationSearch,
  careIntakeProps,
  providerPins = []
}) {
  const [expandedCareType, setExpandedCareType] = useState("");
  const mapSearchInputRef = useRef(null);
  const isSplashStep = step === 0;
  const isCareTypeStep = step === 2;
  const isMapStep = step === 3;
  const value = location;
  const canContinue = isSplashStep || isMapStep || (isCareTypeStep ? selectedCareTypes.length > 0 : value.trim().length > 0);

  if (isMapStep) {
    return (
      <main className="mobile-onboarding mobile-onboarding--map">
        <form className="mobile-onboarding__map-searchbar" onSubmit={onSubmitLocationSearch}>
          <Search className="mobile-onboarding__map-searchbar-icon" aria-hidden="true" strokeWidth={2.4} />
          <input
            ref={mapSearchInputRef}
            value={location}
            onChange={(event) => onLocationChange(event.target.value)}
            placeholder="Zipcode"
            aria-label="Search by ZIP code"
          />
          <button
            className="mobile-onboarding__map-searchbar-close"
            type="button"
            aria-label="Clear search"
            onClick={() => {
              onLocationChange("");
              requestAnimationFrame(() => mapSearchInputRef.current?.focus());
            }}
          >
            <X aria-hidden="true" strokeWidth={2.4} />
          </button>
        </form>

        <section className="mobile-onboarding__map-stage">
          <MapView
            externalPins={providerPins}
            externalStatus={careIntakeProps.providerStatus}
            sourceUrl={careIntakeProps.providerSourceUrl}
            resultLocation={location}
            resultCareType={careTypeLabel}
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
          <div className="mobile-onboarding__fade" key="care">
          <header className="mobile-onboarding__topbar">
            <button
              className="mobile-onboarding__back"
              type="button"
              aria-label="Go back"
              onClick={onBack}
            >
              <span aria-hidden="true" />
            </button>
            <OnboardingProgress step={step} />
            <button className="mobile-onboarding__skip" type="button" onClick={onSkip}>
              Skip
            </button>
          </header>

          <section className="mobile-onboarding__care-screen">
            <h1>what type of care?</h1>
            <p>No account needed. Get a list from providers near your area.</p>

            <div className="mobile-onboarding__care-options" aria-label="Care type">
              {careTypes.map((type) => (
                <CareTypeOption
                  key={type}
                  type={type}
                  isSelected={selectedCareTypes.includes(type)}
                  isExpanded={expandedCareType === type}
                  onSelect={() => {
                    const isAlreadySelected = selectedCareTypes.includes(type);
                    onCareTypeToggle(type);
                    setExpandedCareType(isAlreadySelected ? "" : type);
                  }}
                />
              ))}
            </div>
          </section>

          <footer className="mobile-onboarding__footer">
            <button type="submit" disabled={!canContinue}>
              Continue
            </button>
          </footer>
          </div>
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
          <div className="mobile-onboarding__fade" key="splash">
          <header className="mobile-onboarding__topbar">
            <button
              className="mobile-onboarding__back"
              type="button"
              aria-label="Go back"
              disabled
            >
              <span aria-hidden="true" />
            </button>
            <OnboardingProgress step={step} />
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
          </div>
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
        <div className="mobile-onboarding__fade" key="location">
        <header className="mobile-onboarding__topbar">
          <button
            className="mobile-onboarding__back"
            type="button"
            aria-label="Go back"
            onClick={onBack}
          >
            <span aria-hidden="true" />
          </button>
          <OnboardingProgress step={step} />
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
        </div>
      </form>
    </main>
  );
}

function CareTypeOption({ type, isSelected, isExpanded, onSelect }) {
  return (
    <button
      type="button"
      className={
        isSelected
          ? "mobile-onboarding__care-option mobile-onboarding__care-option--selected"
          : "mobile-onboarding__care-option"
      }
      onClick={onSelect}
      aria-pressed={isSelected}
      aria-expanded={isExpanded}
    >
      <span>{type}</span>
      <span className="mobile-onboarding__care-option-detail">
        {careTypeDescriptions[type] || "Find affirming providers who can help with this kind of care."}
      </span>
    </button>
  );
}

const careTypeDescriptions = {
  "Gender-affirming hormone therapy (HRT)": "Providers who can discuss hormones, monitoring, refills, and ongoing gender-affirming care.",
  "Gender-affirming surgery referrals": "Support finding clinicians who can help with referrals, letters, and surgical care navigation.",
  "PrEP / HIV prevention & treatment": "Care for HIV prevention, PrEP access, treatment questions, and ongoing support.",
  "STI screening & sexual health": "Testing, prevention, treatment, and affirming conversations about sexual health.",
  "Mental health & counseling": "Therapy, counseling, and mental health support from LGBTQ+-affirming providers.",
  "Family planning / fertility preservation": "Help with fertility options, family planning, contraception, and reproductive goals.",
  "Legal name & gender marker support": "Providers who may support documentation, letters, or care related to identity updates.",
  "Youth & adolescent care": "Affirming care for younger patients and families navigating support options.",
  "General primary care (LGBTQ+-affirming)": "Everyday health care with providers who understand LGBTQ+ patient needs."
};

function OnboardingProgress({ step }) {
  return (
    <div className="mobile-onboarding__progress" aria-label={`Step ${Math.min(step + 1, 3)} of 3`}>
      {[0, 1, 2].map((segment) => (
        <span
          key={segment}
          className={
            segment === Math.min(step, 2)
              ? "mobile-onboarding__progress-segment mobile-onboarding__progress-segment--active"
              : "mobile-onboarding__progress-segment"
          }
        />
      ))}
    </div>
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
