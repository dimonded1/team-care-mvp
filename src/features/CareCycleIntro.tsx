import { motion, useReducedMotion } from "framer-motion";
import { AnimalPhoto } from "../components/AnimalPhoto";
import { AppHeader } from "../components/AppHeader";
import { Button } from "../components/Button";
import { FoundationMenu } from "../components/FoundationMenu";
import {
  HealthIcon,
  HeartIcon,
  MovementIcon,
  TrustIcon,
} from "../components/Icons";
import type { Animal } from "../types/app";

interface CareCycleIntroProps {
  animal: Animal;
  onBack: () => void;
  onContinue: () => void;
}

const orbitSteps = [
  { label: "Знакомство", Icon: TrustIcon },
  { label: "Визит", Icon: HeartIcon },
  { label: "Прогулка", Icon: MovementIcon },
  { label: "Здоровье", Icon: HealthIcon },
] as const;

export function CareCycleIntro({
  animal,
  onBack,
  onContinue,
}: CareCycleIntroProps) {
  const reduceMotion = useReducedMotion();

  return (
    <main className="screen care-cycle-intro">
      <AppHeader onBack={onBack} right={<FoundationMenu />} light />

      <section className="care-cycle-intro__layout" aria-labelledby="care-cycle-title">
        <div className="care-cycle-intro__copy">
          <h1 id="care-cycle-title">Орбита заботы</h1>
          <p>
            В центре — {animal.name}. Четыре круга показывают, как опекун
            возвращается к заботе снова и снова.
          </p>
        </div>

        <div
          className="care-system"
          role="img"
          aria-label={`${animal.name} в центре орбиты, вокруг — знакомство, визит, прогулка и здоровье`}
        >
          <span className="care-system__stars" aria-hidden="true" />
          <span className="care-system__orbit care-system__orbit--outer" aria-hidden="true" />
          <span className="care-system__orbit care-system__orbit--inner" aria-hidden="true" />

          <motion.div
            className="care-system__sun"
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.72 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={reduceMotion
              ? { duration: 0.12 }
              : { type: "spring", stiffness: 170, damping: 20, delay: 0.12 }}
          >
            <span className="care-system__sun-glow" aria-hidden="true" />
            <AnimalPhoto src={animal.photo} name={animal.name} />
            <strong>{animal.name}</strong>
          </motion.div>

          <div className="care-system__planets" aria-hidden="true">
            {orbitSteps.map(({ label, Icon }, index) => (
              <motion.span
                key={label}
                className={`care-system__planet care-system__planet--${index + 1}`}
                initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: reduceMotion ? 0.12 : 0.42,
                  delay: reduceMotion ? 0 : 0.44 + index * 0.12,
                  type: reduceMotion ? "tween" : "spring",
                  stiffness: 250,
                  damping: 20,
                }}
              >
                <Icon />
                <small>{index + 1}</small>
              </motion.span>
            ))}
          </div>

          <motion.span
            className="care-system__asteroid"
            aria-hidden="true"
            initial={reduceMotion ? { opacity: 0.55 } : { opacity: 0, x: -70, y: -26 }}
            animate={reduceMotion
              ? { opacity: 0.55 }
              : { opacity: [0, 1, 1, 0.25], x: [-70, -28, 18, 88], y: [-26, -8, 20, 48] }}
            transition={{ duration: 1.8, delay: 1.05, ease: [0.3, 0.7, 0.2, 1] }}
          />
          <motion.span
            className="care-system__shield"
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.84 }}
            animate={reduceMotion
              ? { opacity: 0.6, scale: 1 }
              : { opacity: [0, 0, 0.88, 0.42], scale: [0.84, 0.84, 1.04, 1] }}
            transition={{ duration: 1.15, delay: 1.45 }}
          />
        </div>

        <motion.div
          className="care-cycle-intro__meaning"
          initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.45, delay: reduceMotion ? 0 : 1.8 }}
        >
          <strong>Подопечный даёт тепло. Опекуны создают защитный круг.</strong>
          <span>
            Знакомство, регулярные визиты, прогулки и внимание к самочувствию
            складываются в одну постоянную связь.
          </span>
        </motion.div>

        <div className="care-cycle-intro__steps" aria-label="Четыре круга заботы">
          {orbitSteps.map(({ label, Icon }, index) => (
            <div key={label}>
              <span><Icon /></span>
              <strong>{index + 1}. {label}</strong>
            </div>
          ))}
        </div>

        <div className="care-cycle-intro__actions">
          <Button className="button--orange" fullWidth onClick={onContinue}>
            Начать со знакомства
          </Button>
          <button type="button" className="text-button" onClick={onContinue}>
            Перейти сразу к орбите
          </button>
        </div>
      </section>
    </main>
  );
}
