import { useState } from "react";
import { careTypes } from "../constants/careTypes.js";
import { readJsonStorage, writeJsonStorage } from "../utils/localStorage.js";

const savedIntake = readJsonStorage("careIntake");

export function useCareIntake(apiUrl) {
  const [zipCode, setZipCode] = useState(savedIntake?.zipCode || "");
  const [careType, setCareType] = useState(savedIntake?.careType || careTypes[0]);
  const [intakeInfo, setIntakeInfo] = useState(savedIntake);
  const [zipError, setZipError] = useState("");
  const [providerPins, setProviderPins] = useState([]);
  const [providerStatus, setProviderStatus] = useState("Save intake to load nearby providers.");
  const [providerSourceUrl, setProviderSourceUrl] = useState("");

  async function saveIntake(event) {
    event.preventDefault();

    const normalizedZip = zipCode.trim();

    if (!/^\d{5}(-\d{4})?$/.test(normalizedZip)) {
      setZipError("Enter a valid 5-digit ZIP code, or ZIP+4.");
      setIntakeInfo(null);
      return;
    }

    const nextIntakeInfo = {
      zipCode: normalizedZip,
      careType
    };

    writeJsonStorage("careIntake", nextIntakeInfo);
    setIntakeInfo(nextIntakeInfo);
    setZipError("");
    await loadProviders(nextIntakeInfo);
  }

  async function loadProviders(nextIntakeInfo) {
    setProviderStatus("Loading providers...");
    setProviderPins([]);
    setProviderSourceUrl("");

    try {
      const params = new URLSearchParams({
        zip: nextIntakeInfo.zipCode,
        careType: nextIntakeInfo.careType
      });
      const response = await fetch(`${apiUrl}/api/provider-search?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        setProviderStatus(data.error || "Provider search failed.");
        return;
      }

      setProviderPins(normalizeProviderPins(data.providers || []));
      setProviderSourceUrl(data.sourceUrl || "");
      setProviderStatus(data.message || "Providers loaded.");
    } catch {
      setProviderStatus("Provider search is unavailable right now.");
    }
  }

  return {
    zipCode,
    careType,
    intakeInfo,
    zipError,
    providerPins,
    providerStatus,
    providerSourceUrl,
    setZipCode,
    setCareType,
    saveIntake
  };
}

function normalizeProviderPins(providers) {
  return providers
    .map((provider, index) => {
      const position = getProviderPosition(provider);

      if (!position) {
        return null;
      }

      return {
        id: provider.id || provider.path || `provider-${index}`,
        label: `Provider ${index + 1}`,
        name: provider.name,
        city: provider.city || "",
        state: provider.state || "",
        url: provider.url || "",
        position
      };
    })
    .filter(Boolean);
}

function getProviderPosition(provider) {
  if (Number.isFinite(provider.lat) && Number.isFinite(provider.lng)) {
    return [provider.lat, provider.lng];
  }

  if (provider.position?.length === 2) {
    return provider.position;
  }

  if (provider._geoloc?.lat && provider._geoloc?.lng) {
    return [provider._geoloc.lat, provider._geoloc.lng];
  }

  return null;
}
