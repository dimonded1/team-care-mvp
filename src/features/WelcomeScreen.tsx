import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { EditorialHero } from "../components/EditorialHero";
import { Logo } from "../components/Logo";

interface WelcomeScreenProps {
  onStart: () => void;
}

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      setHowOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const closeMenu = () => {
    setMenuOpen(false);
    setHowOpen(false);
  };

  return (
    <main className="screen welcome-screen">
      <header className="app-header app-header--light welcome-nav">
        <a className="welcome-nav__logo" href="https://fond-nika.ru" target="_blank" rel="noreferrer">
          <Logo light />
        </a>
        <nav className="welcome-nav__links" aria-label="Ссылки фонда">
          <button
            type="button"
            aria-expanded={howOpen}
            aria-controls="welcome-how-popover"
            onClick={() => setHowOpen((value) => !value)}
          >
            Как это работает
          </button>
          <a href="https://fond-nika.ru/programs/opeka/" target="_blank" rel="noreferrer">Об опеке</a>
          <a href="https://fond-nika.ru/ourpets/" target="_blank" rel="noreferrer">Все подопечные <span aria-hidden="true">↗</span></a>
        </nav>
        <a
          className="welcome-nav__fund-link"
          href="https://fond-nika.ru"
          target="_blank"
          rel="noreferrer"
        >
          Сайт фонда <span aria-hidden="true">↗</span>
        </a>

        <button
          className="welcome-nav__menu-button"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="welcome-mobile-menu"
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? "Закрыть" : "Меню"}
        </button>

        <AnimatePresence>
          {howOpen && !menuOpen && (
            <motion.aside
              id="welcome-how-popover"
              className="welcome-how"
              aria-label="Как проходит знакомство"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <strong>Знакомство занимает около трёх минут</strong>
              <ol>
                <li><span>01</span>Ответьте на вопросы по вайбу</li>
                <li><span>02</span>Получите личный мэтч</li>
                <li><span>03</span>Пройдите маршрут заботы</li>
              </ol>
            </motion.aside>
          )}
        </AnimatePresence>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.button
              className="welcome-menu__scrim"
              type="button"
              aria-label="Закрыть меню"
              onClick={closeMenu}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.nav
              id="welcome-mobile-menu"
              className="welcome-menu"
              aria-label="Мобильная навигация"
              initial={{ opacity: 0, y: -14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 360, damping: 30 }}
            >
              <button type="button" aria-expanded={howOpen} onClick={() => setHowOpen((value) => !value)}>
                <span>Как это работает</span><span aria-hidden="true">{howOpen ? "−" : "+"}</span>
              </button>
              <AnimatePresence initial={false}>
                {howOpen && (
                  <motion.ol
                    className="welcome-menu__steps"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <li>Вопросы по вайбу</li>
                    <li>Личный мэтч</li>
                    <li>Маршрут заботы</li>
                  </motion.ol>
                )}
              </AnimatePresence>
              <a href="https://fond-nika.ru/programs/opeka/" target="_blank" rel="noreferrer" onClick={closeMenu}>Об опеке <span aria-hidden="true">↗</span></a>
              <a href="https://fond-nika.ru/ourpets/" target="_blank" rel="noreferrer" onClick={closeMenu}>Все подопечные <span aria-hidden="true">↗</span></a>
              <a href="https://fond-nika.ru" target="_blank" rel="noreferrer" onClick={closeMenu}>Сайт фонда <span aria-hidden="true">↗</span></a>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
      <EditorialHero onStart={onStart} />
    </main>
  );
}
