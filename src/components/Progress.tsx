import { motion, useReducedMotion } from "framer-motion";

interface ProgressProps {
  value: number;
  total: number;
  label: string;
  showCopy?: boolean;
  copyMode?: "full" | "counter";
  copyPlacement?: "before" | "after";
}

export function Progress({
  value,
  total,
  label,
  showCopy = true,
  copyMode = "full",
  copyPlacement = "before",
}: ProgressProps) {
  const percent = total === 0 ? 0 : (value / total) * 100;
  const reduceMotion = useReducedMotion();
  const copy = showCopy ? (
    <div
      className={`progress-copy${copyMode === "counter" ? " progress-copy--counter" : ""}`}
      aria-hidden={copyMode === "counter" ? "true" : undefined}
    >
      {copyMode === "full" ? <span>{label}</span> : null}
      <span>{value} из {total}</span>
    </div>
  ) : null;

  return (
    <div className="progress-block">
      {copyPlacement === "before" ? copy : null}
      <div
        className="progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={value}
        aria-valuetext={`${value} из ${total}`}
      >
        <motion.span
          initial={false}
          animate={{ scaleX: percent / 100 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
        />
      </div>
      {copyPlacement === "after" ? copy : null}
    </div>
  );
}
