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
  const [location, setLocation] = useState(mobileOnboarding?.location || "");
  const [careType, setCareType] = useState(mobileOnboarding?.careType || "");

  useEffect(() => {
    const mobileMatcher = window.matchMedia(mobileOnboardingQuery);
    const handleViewportChange = () => setIsMobile(mobileMatcher.matches);

    handleViewportChange();
    mobileMatcher.addEventListener("change", handleViewportChange);

    return () => {
      mobileMatcher.removeEventListener("change", handleViewportChange);
    };
  }, []);

  async function handleNext(event) {
    event.preventDefault();

    if (step === 0) {
      setStep(1);
      return;
    }

    if (!location.trim()) return;

    if (step === 1) {
      setStep(2);
      return;
    }

    if (!careType) return;
    setStep(3);
  }

  function complete() {
    const nextOnboarding = {
      location: location.trim(),
      careType,
      completed: true
    };

    writeJsonStorage("mobileOnboarding", nextOnboarding);
    setMobileOnboarding(nextOnboarding);
  }

  return {
    shouldShow: isMobile && !mobileOnboarding?.completed,
    step,
    location,
    careType,
    setLocation,
    setCareType,
    handleNext,
    showMapStep: () => setStep(3),
    goBack: () => setStep((currentStep) => Math.max(0, currentStep - 1)),
    skip: complete
  };
}
