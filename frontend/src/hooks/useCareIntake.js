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
    await saveIntakeValues({ zipCode, careType });
  }

  async function saveIntakeValues(nextValues) {
    const normalizedZip = nextValues.zipCode.trim();
    const nextCareTypes = normalizeCareTypeValues(nextValues.careTypes || nextValues.careType || careType);
    const nextCareType = nextCareTypes.join(", ");

    if (!/^\d{5}(-\d{4})?$/.test(normalizedZip)) {
      setZipError("Enter a valid 5-digit ZIP code, or ZIP+4.");
      setIntakeInfo(null);
      return false;
    }

    const nextIntakeInfo = {
      zipCode: normalizedZip,
      careType: nextCareType
    };

    writeJsonStorage("careIntake", nextIntakeInfo);
    setZipCode(normalizedZip);
    setCareType(nextCareType);
    setIntakeInfo(nextIntakeInfo);
    setZipError("");
    await loadProviders(nextIntakeInfo, nextCareTypes);
    return true;
  }

  async function loadProviders(nextIntakeInfo, selectedCareTypes = [nextIntakeInfo.careType]) {
    setProviderStatus("Loading providers...");
    setProviderPins([]);
    setProviderSourceUrl("");

    try {
      const results = await Promise.all(selectedCareTypes.map((selectedCareType) => fetchProviders(nextIntakeInfo.zipCode, selectedCareType, apiUrl)));
      const providers = uniqueProviders(results.flatMap((result) => result.providers || []));
      const firstSourceUrl = results.find((result) => result.sourceUrl)?.sourceUrl || "";

      setProviderPins(normalizeProviderPins(providers));
      setProviderSourceUrl(firstSourceUrl);
      setProviderStatus(providers.length > 0 ? `${providers.length} providers found.` : "No providers found.");
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
    saveIntake,
    saveIntakeValues
  };
}

async function fetchProviders(zipCode, careType, apiUrl) {
  const params = new URLSearchParams({
    zip: zipCode,
    careType
  });
  const response = await fetch(`${apiUrl}/api/provider-search?${params.toString()}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Provider search failed.");
  }

  return data;
}

function normalizeCareTypeValues(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return value ? [value] : [];
}

function uniqueProviders(providers) {
  const providerMap = new Map();

  providers.forEach((provider) => {
    const key = provider.id || provider.path || provider.name;
    if (key && !providerMap.has(key)) {
      providerMap.set(key, provider);
    }
  });

  return [...providerMap.values()];
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
