import { motion, useReducedMotion, type Variants } from "framer-motion";
import { AnimalPhoto } from "../components/AnimalPhoto";
import { Button } from "../components/Button";
import { OrbitField } from "../components/OrbitField";
import type { MatchResult } from "../types/app";

interface RevealScreenProps {
  result: MatchResult;
  onContinue: () => void;
}

export function RevealScreen({ result, onContinue }: RevealScreenProps) {
  const reduceMotion = useReducedMotion();

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 16 },
    visible: (delay = 0) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: reduceMotion ? 0.12 : 0.72,
        delay: reduceMotion ? 0 : delay,
        ease: [0.23, 1, 0.32, 1],
      },
    }),
  };
  const photoVariants: Variants = {
    hidden: { opacity: 0, scale: reduceMotion ? 1 : 0.91, y: reduceMotion ? 0 : 12 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: reduceMotion
        ? { duration: 0.12 }
        : { type: "spring", stiffness: 125, damping: 23, mass: 1.02, delay: 0.74 },
    },
  };

  return (
    <motion.main
      className="screen reveal-screen"
      initial="hidden"
      animate="visible"
    >
      <OrbitField variant="reveal" showPlanets />
      <div className="reveal-layout">
        <motion.div className="reveal-topline" custom={0.24} variants={itemVariants}>
          Кажется, вам стоит познакомиться
        </motion.div>
        <motion.div className="reveal-visual" variants={photoVariants}>
          {!reduceMotion && (
            <motion.span
              className="reveal-photo-pulse"
              initial={{ opacity: 0, scale: 0.82 }}
              animate={{ opacity: [0, 0.48, 0], scale: [0.82, 1.08, 1.18] }}
              transition={{ duration: 1.7, delay: 0.98, ease: [0.23, 1, 0.32, 1] }}
              aria-hidden="true"
            />
          )}
          <div className="reveal-photo">
            <AnimalPhoto src={result.animal.photo} name={result.animal.name} />
          </div>
        </motion.div>
        <div className="reveal-copy">
          <motion.h1 custom={1.5} variants={itemVariants}>{result.animal.name}</motion.h1>
          <motion.p custom={1.9} variants={itemVariants}>{result.reasons.join(" ")}</motion.p>
          <motion.div className="screen-actions" custom={2.3} variants={itemVariants}>
            <Button fullWidth className="button--orange" onClick={onContinue}>
              Познакомиться
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.main>
  );
}
