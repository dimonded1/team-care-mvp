import type { ReactNode } from "react";
import { ArrowLeftIcon } from "./Icons";
import { Logo } from "./Logo";

interface AppHeaderProps {
  onBack?: () => void;
  right?: ReactNode;
  light?: boolean;
}

export function AppHeader({ onBack, right, light = false }: AppHeaderProps) {
  return (
    <header className={`app-header${light ? " app-header--light" : ""}`}>
      {onBack ? (
        <button className="icon-button" type="button" onClick={onBack} aria-label="Назад">
          <ArrowLeftIcon />
        </button>
      ) : (
        <Logo light={light} />
      )}
      {typeof right === "string"
        ? <span className="header-status">{right}</span>
        : right}
    </header>
  );
}
