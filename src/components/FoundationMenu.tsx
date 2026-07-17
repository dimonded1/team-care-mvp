import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";

export function FoundationMenu() {
  const [open, setOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);

  const close = () => {
    setOpen(false);
    setHowOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  useEffect(() => {
    if (!open) return;
    const firstControl = menuRef.current?.querySelector<HTMLElement>("button, a");
    firstControl?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !menuRef.current) return;
      const controls = [...menuRef.current.querySelectorAll<HTMLElement>("button, a")];
      if (controls.length === 0) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="foundation-menu-shell">
      <button
        ref={triggerRef}
        className="foundation-menu-trigger"
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Закрыть" : "Меню"}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <motion.button
              className="foundation-menu-scrim"
              type="button"
              aria-label="Закрыть меню"
              onClick={close}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.nav
              ref={menuRef}
              id={menuId}
              className="foundation-menu-panel"
              aria-label="Навигация фонда"
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 360, damping: 30 }}
            >
              <button
                type="button"
                aria-expanded={howOpen}
                onClick={() => setHowOpen((value) => !value)}
              >
                <span>Как это работает</span>
                <span aria-hidden="true">{howOpen ? "−" : "+"}</span>
              </button>
              <AnimatePresence initial={false}>
                {howOpen && (
                  <motion.ol
                    className="foundation-menu-steps"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <li>Ответьте на 11 коротких вопросов</li>
                    <li>Получите мэтч с подопечным</li>
                    <li>Пройдите 4 мини-игры о заботе</li>
                  </motion.ol>
                )}
              </AnimatePresence>
              <a href="https://fond-nika.ru/programs/opeka/" target="_blank" rel="noreferrer" onClick={close}>
                Об опеке <span aria-hidden="true">↗</span>
              </a>
              <a href="https://fond-nika.ru/ourpets/" target="_blank" rel="noreferrer" onClick={close}>
                Все подопечные <span aria-hidden="true">↗</span>
              </a>
              <a className="foundation-menu-panel__donate" href="https://fond-nika.ru/donation/" target="_blank" rel="noreferrer" onClick={close}>
                Пожертвовать <span aria-hidden="true">↗</span>
              </a>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
