import { motion, useReducedMotion } from "framer-motion";
import { AnimalPhoto } from "../components/AnimalPhoto";
import { AppHeader } from "../components/AppHeader";
import { Button } from "../components/Button";
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
  onBack: () => void;
  onContinue: () => void;
}

const careDirections = [
  {
    label: "Повседневный уход и корм",
    icon: FoodIcon,
  },
  {
    label: "Здоровье и лечение",
    icon: HealthIcon,
  },
  {
    label: "Прогулки и социализация",
    icon: MovementIcon,
  },
  {
    label: "Фото, истории и поиск дома",
    icon: HomeIcon,
  },
  {
    label: "Внимание, подарки и участие",
    icon: HeartIcon,
  },
];

const fitProfiles = [
  {
    title: "Хотите помогать адресно",
    text: "Вы знаете имя подопечного, следите за его историей и видите, на чью жизнь влияет ваша помощь.",
    icon: HeartIcon,
  },
  {
    title: "Пока не можете забрать домой",
    text: "Можно стать важным человеком рядом, даже если дома сейчас нет условий для питомца.",
    icon: HomeIcon,
  },
  {
    title: "Ищете посильный формат",
    text: "Не нужно делать всё одному: у животного может быть команда до пяти опекунов.",
    icon: MovementIcon,
  },
];

export function GuardianshipScreen({ animal, onBack, onContinue }: GuardianshipScreenProps) {
  const reduceMotion = useReducedMotion();
  const enter = (delay = 0) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: reduceMotion ? 0.12 : 0.52,
      delay: reduceMotion ? 0 : delay,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  });

  return (
    <main className="screen guardianship-screen guardianship-landing">
      <AppHeader onBack={onBack} right="Что такое опека" light />

      <div className="guardianship-landing__content">
        <motion.section className="guardianship-hero" {...enter()}>
          <div className="guardianship-hero__media">
            <AnimalPhoto src={animal.photo} name={animal.name} />
          </div>

          <div className="guardianship-hero__copy">
            <h1>Быть рядом, пока не найдётся дом</h1>
            <p>
              Опека в фонде «Ника» - регулярная адресная помощь конкретному животному.
              Вы становитесь его виртуальным хозяином и участвуете в его жизни.
            </p>

            <div className="guardianship-home-goal">
              <div className="guardianship-home-goal__visual" aria-hidden="true">
                <span className="guardianship-home-goal__orbit" />
                <span className="guardianship-home-goal__satellite"><HeartIcon /></span>
                <span className="guardianship-home-goal__home"><HomeIcon /></span>
              </div>
              <div>
                <strong>Главная цель - будущая семья</strong>
                <span>Социализация и рассказы о питомце помогают ему быстрее встретить своих людей.</span>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          className="guardianship-facts"
          aria-labelledby="guardianship-facts-title"
          {...enter(0.08)}
        >
          <h2 id="guardianship-facts-title">Опека в нескольких фактах</h2>
          <div className="guardianship-facts__grid">
            <article className="guardianship-fact guardianship-fact--cat">
              <span>Кошка</span>
              <strong>2 000 ₽</strong>
              <small>в месяц</small>
            </article>
            <article className="guardianship-fact guardianship-fact--dog">
              <span>Собака</span>
              <strong>3 500 ₽</strong>
              <small>в месяц</small>
            </article>
            <article className="guardianship-fact guardianship-fact--visit">
              <span>Можно приезжать в гости</span>
              <strong>Четверг-воскресенье</strong>
              <small>11:00-16:00 или в опекунские дни, предупредив менеджера</small>
            </article>
            <article className="guardianship-fact guardianship-fact--news">
              <span>Оставаться в курсе</span>
              <strong>Новости, фото и видео</strong>
              <small>закрытые каналы опекунов в Telegram и MAX</small>
            </article>
            <article className="guardianship-fact guardianship-fact--symbol">
              <span>Знак личного участия</span>
              <strong>Сертификат и значок</strong>
              <small>ваше имя появится в карточке подопечного и в приюте</small>
            </article>
          </div>
        </motion.section>

        <motion.section
          className="guardianship-fit"
          aria-labelledby="guardianship-fit-title"
          {...enter(0.13)}
        >
          <header>
            <span>Забота в удобном ритме</span>
            <h2 id="guardianship-fit-title">Кому подходит опека</h2>
          </header>
          <div className="guardianship-fit__grid">
            {fitProfiles.map((profile, index) => {
              const ProfileIcon = profile.icon;
              return (
                <motion.article
                  key={profile.title}
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: reduceMotion ? 0.12 : 0.36, delay: reduceMotion ? 0 : index * 0.06 }}
                >
                  <span aria-hidden="true"><ProfileIcon /></span>
                  <strong>{profile.title}</strong>
                  <p>{profile.text}</p>
                </motion.article>
              );
            })}
          </div>
        </motion.section>

        <motion.section
          className="guardianship-team"
          aria-labelledby="guardianship-team-title"
          {...enter(0.2)}
        >
          <header className="guardianship-team__header">
            <div>
              <h2 id="guardianship-team-title">До пяти опекунов в одной команде</h2>
              <p>Одному человеку не нужно делать всё. Каждый усиливает общую заботу о {animal.name}.</p>
            </div>
            <div className="guardianship-team__count" aria-label="До пяти опекунов">
              <strong>5</strong>
              <span>мест в команде</span>
            </div>
          </header>

          <ol className="guardianship-directions" aria-label="Пять направлений помощи">
            {careDirections.map((direction, index) => {
              const DirectionIcon = direction.icon;
              return (
                <motion.li
                  key={direction.label}
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 10 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.45 }}
                  transition={{
                    duration: reduceMotion ? 0.12 : 0.38,
                    delay: reduceMotion ? 0 : index * 0.055,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <span><DirectionIcon /></span>
                  <strong>{direction.label}</strong>
                </motion.li>
              );
            })}
          </ol>
        </motion.section>
      </div>

      <div className="screen-actions sticky-actions guardianship-actions">
        <Button className="button--orange" fullWidth onClick={onContinue}>
          Завершить орбиту
        </Button>
      </div>
    </main>
  );
}
