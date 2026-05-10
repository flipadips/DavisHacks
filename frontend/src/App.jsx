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
        name={onboarding.name}
        location={onboarding.location}
        onNameChange={onboarding.setName}
        onLocationChange={onboarding.setLocation}
        onNext={onboarding.handleNext}
        onBack={onboarding.goBack}
        onSkip={onboarding.skip}
      />
    );
  }

  return (
    <main className="app-shell">
      <GlobeIntro
        providerPins={intakeState.providerPins}
        providerStatus={intakeState.providerStatus}
        providerSourceUrl={intakeState.providerSourceUrl}
      />

      <CommandCenter
        command={commandState.command}
        status={commandState.status}
        onCommandChange={commandState.setCommand}
        onSubmit={commandState.sendCommand}
      />

      <ApiHealthCard />

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

      <GeminiNexus intakeInfo={intakeState.intakeInfo} />

      <ClaudePanel
        question={claudeState.question}
        answer={claudeState.answer}
        status={claudeState.status}
        model={claudeState.model}
        onQuestionChange={claudeState.setQuestion}
        onSubmit={claudeState.askClaude}
      />

      <CommandList commands={commandState.commands} />
    </main>
  );
}
