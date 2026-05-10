import { useEffect, useState } from "react";
import { readJsonStorage, writeJsonStorage } from "../utils/localStorage.js";

const mobileOnboardingQuery = "(max-width: 640px)";

function isMobileViewport() {
  return window.matchMedia(mobileOnboardingQuery).matches;
}

export function useMobileOnboarding() {
  const [isMobile, setIsMobile] = useState(isMobileViewport);
  const [mobileOnboarding, setMobileOnboarding] = useState(() => readJsonStorage("mobileOnboarding"));
  const [step, setStep] = useState(0);
  const [name, setName] = useState(mobileOnboarding?.name || "");
  const [location, setLocation] = useState(mobileOnboarding?.location || "");

  useEffect(() => {
    const mobileMatcher = window.matchMedia(mobileOnboardingQuery);
    const handleViewportChange = () => setIsMobile(mobileMatcher.matches);

    handleViewportChange();
    mobileMatcher.addEventListener("change", handleViewportChange);

    return () => {
      mobileMatcher.removeEventListener("change", handleViewportChange);
    };
  }, []);

  function handleNext(event) {
    event.preventDefault();

    if (step === 0) {
      if (!name.trim()) return;
      setStep(1);
      return;
    }

    if (!location.trim()) return;
    complete();
  }

  function complete() {
    const nextOnboarding = {
      name: name.trim(),
      location: location.trim(),
      completed: true
    };

    writeJsonStorage("mobileOnboarding", nextOnboarding);
    setMobileOnboarding(nextOnboarding);
  }

  return {
    shouldShow: isMobile && !mobileOnboarding?.completed,
    step,
    name,
    location,
    setName,
    setLocation,
    handleNext,
    goBack: () => setStep(0),
    skip: complete
  };
}
