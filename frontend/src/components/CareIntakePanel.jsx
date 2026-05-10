import React from "react";
import { careTypes } from "../constants/careTypes.js";

export default function CareIntakePanel({
  zipCode,
  careType,
  intakeInfo,
  zipError,
  providerStatus,
  providerSourceUrl,
  onZipCodeChange,
  onCareTypeChange,
  onSubmit
}) {
  return (
    <section className="panel intake-panel">
      <div>
        <p className="eyebrow">Care Intake</p>
        <h2>Location and Care Type</h2>
      </div>

      <form className="intake-form" onSubmit={onSubmit}>
        <label>
          ZIP Code
          <input
            value={zipCode}
            onChange={(event) => onZipCodeChange(event.target.value)}
            placeholder="95616"
            aria-describedby={zipError ? "zip-error" : undefined}
          />
        </label>

        <label>
          Care Type
          <select value={careType} onChange={(event) => onCareTypeChange(event.target.value)}>
            {careTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        {zipError && (
          <p className="form-error" id="zip-error">
            {zipError}
          </p>
        )}

        <button type="submit">Save Intake</button>
      </form>

      <div className="intake-summary">
        <span>Saved for Claude</span>
        {intakeInfo ? (
          <strong>
            ZIP {intakeInfo.zipCode} - {intakeInfo.careType}
          </strong>
        ) : (
          <strong>No intake saved yet</strong>
        )}
      </div>

      <div className="intake-summary">
        <span>Provider Search</span>
        <strong>{providerStatus}</strong>
        {providerSourceUrl && (
          <a href={providerSourceUrl} target="_blank" rel="noreferrer">
            View directory search
          </a>
        )}
      </div>
    </section>
  );
}
