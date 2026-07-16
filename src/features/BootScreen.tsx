import { motion, useReducedMotion } from "framer-motion";
import { Logo } from "../components/Logo";

export function BootScreen() {
  const reduceMotion = useReducedMotion();
  return (
    <main className="boot-screen" aria-label="Загрузка приложения">
      <motion.div
        className="boot-mark"
        initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reduceMotion ? 0.12 : 0.42 }}
      >
        <Logo />
      </motion.div>
      <p>Собираем истории подопечных</p>
      <div className="boot-line" role="status" aria-label="Загрузка">
        <motion.span
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: reduceMotion ? 0.15 : 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </main>
  );
}
