import { motion, useReducedMotion } from "framer-motion";
import { AnimalPhoto } from "../components/AnimalPhoto";
import { AppHeader } from "../components/AppHeader";
import { Button } from "../components/Button";
import { FoundationMenu } from "../components/FoundationMenu";
import {
  FoodIcon,
  HealthIcon,
  HeartIcon,
  HomeIcon,
  MovementIcon,
} from "../components/Icons";
import type { Animal } from "../types/app";

interface GuardianshipScreenProps {
  animal: Animal;
  complete: boolean;
  onBack: () => void;
  onContinue: () => void;
}

const careDirections = [
  { label: "корм и ежедневный уход", icon: FoodIcon },
  { label: "здоровье и лечение", icon: HealthIcon },
  { label: "прогулки и социализацию", icon: MovementIcon },
  { label: "фото, истории и поиск дома", icon: HomeIcon },
];

export function GuardianshipScreen({
  animal,
  complete,
  onBack,
  onContinue,
}: GuardianshipScreenProps) {
  const reduceMotion = useReducedMotion();
  const enter = (delay = 0) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: reduceMotion ? 0.12 : 0.38,
      delay: reduceMotion ? 0 : delay,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  });

  return (
    <main className="screen guardianship-screen guardianship-brief">
      <AppHeader onBack={onBack} right={<FoundationMenu />} light />

      <div className="guardianship-brief__stars" aria-hidden="true" />
      <div className="guardianship-brief__content">
        <motion.section className="guardianship-brief__hero" {...enter()}>
          <div className="guardianship-brief__photo">
            <AnimalPhoto
              src={animal.photo}
              name={animal.name}
              className="guardianship-brief__animal-photo"
            />
            <span aria-hidden="true"><HeartIcon /></span>
          </div>
          <div>
            <p className="section-number">Следующий круг заботы</p>
            <h1>Быть рядом, пока не найдётся дом</h1>
            <p>
              Опека — это регулярная адресная помощь конкретному животному.
              Вы следите за историей {animal.nameGenitive} и поддерживаете {animal.sex === "девочка" ? "её" : "его"} вместе с фондом.
            </p>
          </div>
        </motion.section>

        <motion.section
          className="guardianship-brief__cards"
          aria-label="Главное об опеке"
          {...enter(0.06)}
        >
          <article>
            <span aria-hidden="true">01</span>
            <div>
              <h2>Команда до пяти опекунов</h2>
              <p>Помощь можно разделить: одному человеку не нужно закрывать всё.</p>
            </div>
          </article>
          <article>
            <span aria-hidden="true">02</span>
            <div>
              <h2>Помощь на каждый день</h2>
              <p>Команда поддерживает уход, здоровье, прогулки и шанс встретить семью.</p>
            </div>
          </article>
          <article>
            <span aria-hidden="true">03</span>
            <div>
              <h2>Связь с подопечным</h2>
              <p>Опекуны получают новости и могут участвовать в жизни животного.</p>
            </div>
          </article>
        </motion.section>

        <motion.details className="guardianship-brief__details" open {...enter(0.1)}>
          <summary>Что именно закрывает команда</summary>
          <ul>
            {careDirections.map((direction) => {
              const DirectionIcon = direction.icon;
              return (
                <li key={direction.label}>
                  <span aria-hidden="true"><DirectionIcon /></span>
                  <span>{direction.label}</span>
                </li>
              );
            })}
          </ul>
          <p>
            Размер и формат участия фонд уточняет лично: можно выбрать посильный
            ритм и задать вопросы до решения.
          </p>
        </motion.details>
      </div>

      <div className="screen-actions sticky-actions guardianship-actions">
        <Button className="button--orange" fullWidth onClick={onContinue}>
          {complete ? "Продолжить с командой заботы" : "Вернуться к орбите"}
        </Button>
      </div>
    </main>
  );
}
