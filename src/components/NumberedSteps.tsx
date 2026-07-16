interface NumberedStep {
  id: string;
  label: string;
}

interface NumberedStepsProps {
  steps: NumberedStep[];
  label: string;
  tone?: "light" | "dark";
}

export function NumberedSteps({ steps, label, tone = "light" }: NumberedStepsProps) {
  return (
    <ol className={`numbered-steps numbered-steps--${tone}`} aria-label={label}>
      {steps.map((step, index) => (
        <li key={step.id}>
          <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          <strong>{step.label}</strong>
        </li>
      ))}
    </ol>
  );
}
