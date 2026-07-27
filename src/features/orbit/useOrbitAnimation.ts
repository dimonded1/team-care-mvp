import { useEffect, useRef } from "react";

export interface OrbitPlanetConfig {
  id: string;
  period: number;
  phase: number;
  radiusX: number;
  radiusY: number;
}

interface UseOrbitAnimationOptions {
  configs: OrbitPlanetConfig[];
  paused: boolean;
  reducedMotion: boolean;
  entering: boolean;
  onPosition?: (id: string, position: OrbitPosition) => void;
}

export interface OrbitPosition {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  angle: number;
}

let preservedElapsedSeconds = 0;
let preservedAt = 0;
let hasVisitedOrbit = false;

export function hasOrbitBeenVisited() {
  return hasVisitedOrbit;
}

export function markOrbitVisited() {
  hasVisitedOrbit = true;
}

export function useOrbitAnimation({
  configs,
  paused,
  reducedMotion,
  entering,
  onPosition,
}: UseOrbitAnimationOptions) {
  const elementRefs = useRef(new Map<string, HTMLDivElement>());
  const elapsedRef = useRef(preservedElapsedSeconds);
  const lastFrameRef = useRef<number | null>(null);
  const positionsRef = useRef(new Map<string, OrbitPosition>());
  const pausedRef = useRef(paused);
  const callbackRef = useRef(onPosition);

  pausedRef.current = paused;
  callbackRef.current = onPosition;

  useEffect(() => {
    const now = performance.now();
    const firstElement = elementRefs.current.values().next().value;
    const orbitHost = firstElement?.parentElement ?? null;
    const orbitSize = {
      width: orbitHost?.clientWidth ?? 0,
      height: orbitHost?.clientHeight ?? 0,
    };
    const resizeObserver = orbitHost && typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(([entry]) => {
          orbitSize.width = entry.contentRect.width;
          orbitSize.height = entry.contentRect.height;
        })
      : null;
    if (resizeObserver && orbitHost) resizeObserver.observe(orbitHost);

    if (preservedAt > 0 && !paused && !reducedMotion) {
      elapsedRef.current += Math.max(0, (now - preservedAt) / 1000);
    }
    preservedAt = now;

    const render = (timestamp: number) => {
      if (lastFrameRef.current === null) lastFrameRef.current = timestamp;
      const deltaSeconds = Math.min(0.05, Math.max(0, (timestamp - lastFrameRef.current) / 1000));
      lastFrameRef.current = timestamp;

      if (!pausedRef.current && !reducedMotion && !entering) {
        elapsedRef.current += deltaSeconds;
      }

      for (const config of configs) {
        const angle = reducedMotion
          ? config.phase
          : config.phase
            + (elapsedRef.current / 32) * Math.PI * 2
            + Math.sin((elapsedRef.current / config.period) * Math.PI * 2 + config.phase) * 0.08;
        const depth = (Math.sin(angle) + 1) / 2;
        const position = {
          x: Math.cos(angle) * orbitSize.width * (config.radiusX / 100),
          y: Math.sin(angle) * orbitSize.height * (config.radiusY / 100),
          scale: 0.88 + depth * 0.2,
          opacity: 0.76 + depth * 0.24,
          angle,
        };
        positionsRef.current.set(config.id, position);

        const element = elementRefs.current.get(config.id);
        if (element) {
          element.style.setProperty("--orbit-x", `${position.x}px`);
          element.style.setProperty("--orbit-y", `${position.y}px`);
          element.style.setProperty("--orbit-scale", String(position.scale));
          element.style.setProperty("--orbit-opacity", String(position.opacity));
          element.style.zIndex = String(10 + Math.round(depth * 10));
        }
        callbackRef.current?.(config.id, position);
      }

      preservedElapsedSeconds = elapsedRef.current;
      preservedAt = timestamp;
      frame = window.requestAnimationFrame(render);
    };

    let frame = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      preservedElapsedSeconds = elapsedRef.current;
      preservedAt = performance.now();
    };
  }, [configs, entering, paused, reducedMotion]);

  const registerPlanet = (id: string) => (element: HTMLDivElement | null) => {
    if (element) elementRefs.current.set(id, element);
    else elementRefs.current.delete(id);
  };

  return {
    registerPlanet,
    getPosition: (id: string) => positionsRef.current.get(id) ?? null,
  };
}
