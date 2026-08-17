import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { CheckIcon } from "../components/Icons";
import type { EventStation } from "../data/eventStations";
import {
  restoreOfflineStationProgress,
  verifyOfflineStation,
  type OfflineStationProgress,
} from "../lib/offlineStation";

interface OfflineEventStationProps {
  station: EventStation;
  value: unknown;
  onChange: (progress: OfflineStationProgress) => void;
  onReadyChange: (ready: boolean) => void;
}

const VOLUNTEER_HOLD_MS = 1_800;

export function OfflineEventStation({
  station,
  value,
  onChange,
  onReadyChange,
}: OfflineEventStationProps) {
  const progress = restoreOfflineStationProgress(value);
  const verified = progress.status === "verified";
  const [volunteerPanelOpen, setVolunteerPanelOpen] = useState(false);
  const [holding, setHolding] = useState(false);
  const holdTimerRef = useRef<number | null>(null);
  const confirmingRef = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const stationButtonRef = useRef<HTMLButtonElement>(null);
  const volunteerPanelRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    onReadyChange(verified);
  }, [onReadyChange, verified]);

  useEffect(() => () => {
    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
  }, []);

  useEffect(() => {
    if (!verified) return;
    const frame = window.requestAnimationFrame(() => resultRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [verified]);

  useEffect(() => {
    if (!volunteerPanelOpen) return;
    const frame = window.requestAnimationFrame(() => confirmButtonRef.current?.focus());
    const handleDialogKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setVolunteerPanelOpen(false);
        window.requestAnimationFrame(() => stationButtonRef.current?.focus());
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = volunteerPanelRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleDialogKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleDialogKeyDown);
    };
  }, [volunteerPanelOpen]);

  const closeVolunteerPanel = () => {
    setVolunteerPanelOpen(false);
    window.requestAnimationFrame(() => stationButtonRef.current?.focus());
  };

  const cancelHold = () => {
    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
    setHolding(false);
  };

  const beginHold = () => {
    if (verified || holdTimerRef.current !== null) return;
    setHolding(true);
    holdTimerRef.current = window.setTimeout(() => {
      holdTimerRef.current = null;
      setHolding(false);
      setVolunteerPanelOpen(true);
    }, VOLUNTEER_HOLD_MS);
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    beginHold();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if ((event.key === "Enter" || event.key === " ") && !event.repeat) {
      event.preventDefault();
      beginHold();
    }
  };

  const confirm = () => {
    if (confirmingRef.current || verified) return;
    confirmingRef.current = true;
    const next = verifyOfflineStation(progress);
    onChange(next);
    onReadyChange(true);
    setVolunteerPanelOpen(false);
  };

  return (
    <section className={`offline-station${verified ? " offline-station--verified" : ""}`}>
      <header className="offline-station__header">
        <button
          ref={stationButtonRef}
          type="button"
          className={`offline-station__number${holding ? " is-holding" : ""}`}
          onPointerDown={handlePointerDown}
          onPointerUp={cancelHold}
          onPointerCancel={cancelHold}
          onPointerLeave={cancelHold}
          onKeyDown={handleKeyDown}
          onKeyUp={cancelHold}
          aria-label={`Станция ${station.number}`}
        >
          <span>№</span>{station.number}
        </button>
        <div>
          <p className="section-number">Офлайн-станция · около 30 секунд</p>
          <h1>{station.title}</h1>
          <p>{station.description}</p>
        </div>
      </header>

      <div className="offline-station__task">
        <span aria-hidden="true">✦</span>
        <div>
          <strong>Задача на стенде</strong>
          <p>{station.task}</p>
        </div>
      </div>

      <ol className="offline-station__steps">
        {station.steps?.map((step, index) => (
          <li key={step}>
            <span>{index + 1}</span>
            <p>{step}</p>
          </li>
        ))}
      </ol>

      {verified ? (
        <div className="offline-station__result" ref={resultRef} tabIndex={-1} role="status">
          <span aria-hidden="true"><CheckIcon /></span>
          <div>
            <strong>Цифровая печать поставлена</strong>
            <p>Станция №{station.number} пройдена. Можно продолжать маршрут.</p>
          </div>
        </div>
      ) : (
        <div className="offline-station__waiting" role="status">
          <span aria-hidden="true">◎</span>
          <div>
            <strong>Выполните задание офлайн</strong>
            <p>После проверки волонтёр поставит цифровую печать на этом устройстве.</p>
          </div>
        </div>
      )}

      {volunteerPanelOpen && !verified ? (
        <div
          ref={volunteerPanelRef}
          className="offline-station__volunteer-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="volunteer-panel-title"
        >
          <div>
            <p className="section-number">Служебная зона</p>
            <h2 id="volunteer-panel-title">Подтверждение волонтёра</h2>
            <p>Проверьте результат на стенде перед тем, как поставить цифровую печать.</p>
            <button ref={confirmButtonRef} type="button" className="button button--orange button--full" onClick={confirm}>
              Поставить цифровую печать
            </button>
            <button type="button" className="text-button" onClick={closeVolunteerPanel}>
              Закрыть
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
