import React from "react";
import ApiHealthCard from "./ApiHealthCard.jsx";
import GlobeIntro from "./GlobeIntro.jsx";
import GeminiNexus from "./GeminiNexus.jsx";
import CareIntakePanel from "./components/CareIntakePanel.jsx";
import ClaudePanel from "./components/ClaudePanel.jsx";
import CommandCenter from "./components/CommandCenter.jsx";
import CommandList from "./components/CommandList.jsx";
import MobileOnboarding from "./components/MobileOnboarding.jsx";
import { useCareIntake } from "./hooks/useCareIntake.js";
import { useClaude } from "./hooks/useClaude.js";
import { useCommands } from "./hooks/useCommands.js";
import { useMobileOnboarding } from "./hooks/useMobileOnboarding.js";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function App() {
  const commandState = useCommands(apiUrl);
  const intakeState = useCareIntake(apiUrl);
  const claudeState = useClaude(apiUrl, intakeState.intakeInfo);
  const onboarding = useMobileOnboarding();

  if (onboarding.shouldShow) {
    return (
      <MobileOnboarding
        step={onboarding.step}
        location={onboarding.location}
        careType={onboarding.careType}
        onLocationChange={onboarding.setLocation}
        onCareTypeChange={onboarding.setCareType}
        onNext={onboarding.handleNext}
        onBack={onboarding.goBack}
        onSkip={onboarding.skip}
        onDone={onboarding.skip}
        onSubmitCare={async (event) => {
          event.preventDefault();
          const didSave = await intakeState.saveIntakeValues({
            zipCode: onboarding.location,
            careType: onboarding.careType
          });

          if (didSave) {
            onboarding.showMapStep();
          }
        }}
        careIntakeProps={{
          zipCode: intakeState.zipCode,
          careType: intakeState.careType,
          intakeInfo: intakeState.intakeInfo,
          zipError: intakeState.zipError,
          providerStatus: intakeState.providerStatus,
          providerSourceUrl: intakeState.providerSourceUrl,
          onZipCodeChange: intakeState.setZipCode,
          onCareTypeChange: intakeState.setCareType,
          onSubmit: intakeState.saveIntake
        }}
        providerPins={intakeState.providerPins}
      />
    );
  }

  return (
    <main className="app-shell">
      <CareIntakePanel
        zipCode={intakeState.zipCode}
        careType={intakeState.careType}
        intakeInfo={intakeState.intakeInfo}
        zipError={intakeState.zipError}
        providerStatus={intakeState.providerStatus}
        providerSourceUrl={intakeState.providerSourceUrl}
        onZipCodeChange={intakeState.setZipCode}
        onCareTypeChange={intakeState.setCareType}
        onSubmit={intakeState.saveIntake}
      />
      
      <GlobeIntro
        providerPins={intakeState.providerPins}
        providerStatus={intakeState.providerStatus}
        providerSourceUrl={intakeState.providerSourceUrl}
      />

      <CommandList commands={commandState.commands} />
    </main>
  );
}
