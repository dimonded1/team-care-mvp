import { useEffect, useId, useRef, useState } from "react";
import { assetUrl } from "../lib/assets";
import "./CareBots.css";

const bots = [
  { name: "Telegram", href: "https://t.me/nika_opeka_bot", icon: "telegram.png" },
  { name: "MAX", href: "https://max.ru/id7735129412_bot", icon: "max.png" },
] as const;

export function CareBots() {
  const root = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <aside ref={root} className="care-bots" aria-label="Связаться по вопросам опеки"
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <button ref={trigger} className="care-bots__trigger" type="button" aria-label={open ? "Закрыть выбор бота" : "Боты опеки"} aria-expanded={open} aria-controls={id}
        onClick={() => setOpen((value) => !value)}>
        {open
          ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="m5 5 14 14M19 5 5 19"/></svg>
          : <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 3h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9l-6 5V5a2 2 0 0 1 2-2Z"/></svg>}
      </button>
      <nav id={id} className="care-bots__links" aria-label="Боты опеки" hidden={!open}>
          {bots.map((bot) => <a key={bot.name} href={bot.href} target="_blank" rel="noopener noreferrer" onClick={() => { setOpen(false); trigger.current?.focus(); }}>
            <span>Бот в {bot.name}</span>
            <img src={assetUrl(`assets/messengers/${bot.icon}`)} alt="" width="48" height="48" />
          </a>)}
      </nav>
    </aside>
  );
}
