import React from "react";

export default function MobileOnboarding({
  step,
  name,
  location,
  onNameChange,
  onLocationChange,
  onNext,
  onBack,
  onSkip
}) {
  const isNameStep = step === 0;
  const value = isNameStep ? name : location;
  const canContinue = value.trim().length > 0;

  return (
    <main className="mobile-onboarding">
      <form className="mobile-onboarding__form" onSubmit={onNext}>
        <header className="mobile-onboarding__topbar">
          <button
            className="mobile-onboarding__back"
            type="button"
            aria-label="Go back"
            onClick={onBack}
            disabled={isNameStep}
          >
            <span aria-hidden="true" />
          </button>
          <button className="mobile-onboarding__skip" type="button" onClick={onSkip}>
            Skip
          </button>
        </header>

        <section className="mobile-onboarding__screen">
          <div className="mobile-onboarding__icon" aria-hidden="true">
            {isNameStep ? <ProfileIcon /> : <LocationIcon />}
          </div>
          <h1>{isNameStep ? "What's your name?" : "Where are you located?"}</h1>
          <p>
            {isNameStep
              ? "Personalize recommendations and keep your care search organized."
              : "No account needed. Get a list from providers near your area."}
          </p>
          <input
            value={value}
            onChange={(event) =>
              isNameStep ? onNameChange(event.target.value) : onLocationChange(event.target.value)
            }
            placeholder={isNameStep ? "Your name" : "Zipcode or City"}
            aria-label={isNameStep ? "Your name" : "Your location"}
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

function ProfileIcon() {
  return (
    <svg viewBox="0 0 48 48" role="img">
      <path d="M24 24c5.1 0 9.2-4.1 9.2-9.2S29.1 5.6 24 5.6s-9.2 4.1-9.2 9.2S18.9 24 24 24Z" />
      <path d="M8.5 42.4c2.2-8 7.8-12.1 15.5-12.1s13.3 4.1 15.5 12.1" />
    </svg>
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
