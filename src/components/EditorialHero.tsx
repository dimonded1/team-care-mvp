import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import type { PointerEvent } from "react";
import { Button } from "./Button";

interface EditorialHeroProps {
  onStart: () => void;
}

interface LaunchMascotProps {
  index: number;
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
  reduceMotion: boolean;
}

const mascots = [
  { kind: "dog", tag: "активный" },
  { kind: "cat", tag: "осторожный" },
  { kind: "cat", tag: "спокойный" },
  { kind: "dog", tag: "общительный" },
] as const;

export function DogMascot() {
  return (
    <svg viewBox="0 0 220 240" aria-hidden="true">
      <path className="mascot-blob" d="M31 94C23 43 67 12 116 18c52 6 93 36 88 94-5 60-33 108-95 110-55 2-69-39-78-128Z" />
      <path className="mascot-ear mascot-ear--left" d="M68 72C35 37 17 47 28 96c6 25 23 37 43 22Z" />
      <path className="mascot-ear mascot-ear--right" d="M157 71c34-33 51-22 39 26-6 25-24 36-43 20Z" />
      <path className="mascot-face" d="M55 85c4-36 30-53 59-53 31 0 56 19 59 55l4 57c3 42-25 67-65 67-39 0-66-25-62-67Z" />
      <path className="mascot-patch" d="M56 91c11-31 29-37 48-28-13 14-14 33-6 48-17 4-33-2-42-20Z" />
      <g className="mascot-eyes">
        <ellipse cx="88" cy="119" rx="8" ry="11" />
        <ellipse cx="140" cy="119" rx="8" ry="11" />
      </g>
      <ellipse className="mascot-snout" cx="114" cy="157" rx="38" ry="31" />
      <path className="mascot-nose" d="M97 146c3-11 31-11 34 0 2 9-9 16-17 16s-19-7-17-16Z" />
      <path className="mascot-mouth" d="M114 162c0 14-9 20-20 20m20-20c0 14 9 20 20 20" />
      <path className="mascot-tongue" d="M103 181h23c0 18-5 27-12 27s-11-9-11-27Z" />
      <circle className="mascot-cheek" cx="75" cy="157" r="7" />
      <circle className="mascot-cheek" cx="153" cy="157" r="7" />
    </svg>
  );
}

export function CatMascot() {
  return (
    <svg viewBox="0 0 220 240" aria-hidden="true">
      <path className="mascot-blob" d="M29 105C16 52 60 13 113 18c58 5 96 47 84 111-11 62-48 96-101 91-51-5-55-66-67-115Z" />
      <path className="mascot-ear mascot-ear--left" d="m52 88 10-61 50 40Z" />
      <path className="mascot-ear mascot-ear--right" d="m168 88-12-61-48 40Z" />
      <path className="mascot-ear-inner mascot-ear-inner--left" d="m65 65 4-25 21 17Z" />
      <path className="mascot-ear-inner mascot-ear-inner--right" d="m155 65-5-25-20 17Z" />
      <path className="mascot-face" d="M49 91c0-35 28-56 64-56 37 0 65 23 65 57v54c0 40-27 66-65 66-37 0-64-25-64-65Z" />
      <path className="mascot-cat-mark" d="m91 67 22 26 22-26-4 38H95Z" />
      <g className="mascot-eyes">
        <ellipse cx="84" cy="124" rx="8" ry="12" />
        <ellipse cx="143" cy="124" rx="8" ry="12" />
      </g>
      <path className="mascot-nose" d="m103 153 11-7 11 7-11 10Z" />
      <path className="mascot-mouth" d="M114 162c-3 13-12 17-22 15m22-15c3 13 12 17 22 15" />
      <path className="mascot-whisker" d="M91 159 47 148m44 23-47 3m93-15 43-11m-43 23 46 3" />
      <circle className="mascot-cheek" cx="75" cy="158" r="7" />
      <circle className="mascot-cheek" cx="153" cy="158" r="7" />
    </svg>
  );
}

function LaunchMascot({ index, pointerX, pointerY, reduceMotion }: LaunchMascotProps) {
  const mascot = mascots[index];
  const depth = [20, -16, 12, -22][index] ?? 10;
  const x = useTransform(pointerX, [-1, 1], [-depth, depth]);
  const y = useTransform(pointerY, [-1, 1], [-depth * 0.7, depth * 0.7]);
  const direction = index % 2 === 0 ? 1 : -1;

  return (
    <motion.div
      className={`launch-mascot launch-mascot--${index + 1}`}
      style={reduceMotion ? undefined : { x, y }}
      aria-hidden="true"
    >
      <motion.div
        className="launch-mascot__float"
        animate={reduceMotion ? undefined : {
          y: [0, -9 - index * 1.5, 0],
          rotate: [0, direction * (1.4 + index * 0.25), 0],
        }}
        transition={{
          duration: 5.8 + index * 0.7,
          delay: index * 0.24,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div className="launch-mascot__art">
          {mascot.kind === "dog" ? <DogMascot /> : <CatMascot />}
        </div>
        <span className="launch-mascot__tag">{mascot.tag}</span>
      </motion.div>
    </motion.div>
  );
}

function ArrowUpRight() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 17 17 7M8 7h9v9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EditorialHero({ onStart }: EditorialHeroProps) {
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 62, damping: 22, mass: 0.65 });
  const smoothY = useSpring(pointerY, { stiffness: 62, damping: 22, mass: 0.65 });

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (reduceMotion || event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 2);
    pointerY.set(((event.clientY - bounds.top) / bounds.height - 0.5) * 2);
  };

  const resetPointer = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <section
      className="launch-scene"
      aria-labelledby="launch-title"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
    >
      <motion.div
        className="launch-scene__halo"
        aria-hidden="true"
        animate={reduceMotion ? undefined : { scale: [1, 1.035, 1], opacity: [0.72, 0.92, 0.72] }}
        transition={{ duration: 5.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="launch-scene__orbit launch-scene__orbit--outer" aria-hidden="true">
        <i className="launch-planet launch-planet--orange" />
        <i className="launch-planet launch-planet--cream" />
      </div>
      <div className="launch-scene__orbit launch-scene__orbit--inner" aria-hidden="true">
        <i className="launch-planet launch-planet--pink" />
      </div>

      {mascots.map((_, index) => (
        <LaunchMascot
          key={index}
          index={index}
          pointerX={smoothX}
          pointerY={smoothY}
          reduceMotion={Boolean(reduceMotion)}
        />
      ))}

      <motion.div
        className="launch-card"
        initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.92, y: reduceMotion ? 0 : 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={reduceMotion
          ? { duration: 0.12 }
          : { type: "spring", stiffness: 240, damping: 24, mass: 0.85, delay: 0.08 }}
      >
        <h1 id="launch-title">
          <span>Найдите подопечного,</span>
          <span>которому близок</span>
          <strong>ваш ритм</strong>
        </h1>
        <p>
          Ответьте на несколько вопросов о вашем характере, ритме жизни и формате заботы —
          и мы познакомим вас с подходящим подопечным фонда.
        </p>
        <Button className="launch-card__cta" onClick={onStart} data-testid="primary-cta">
          <span>Начать знакомство</span>
          <ArrowUpRight />
        </Button>
      </motion.div>
    </section>
  );
}
