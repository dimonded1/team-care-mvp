import type { Animal, Mission } from "../types/app";

interface JourneyPetSceneProps {
  animal: Animal;
  mission: Mission;
}

export function JourneyPetScene({ animal, mission }: JourneyPetSceneProps) {
  const isCat = animal.species === "cat";

  return (
    <div className="journey-pet-scene">
      <div
        className={`journey-pet-scene__illustration journey-pet-scene__illustration--${animal.species}`}
        role="img"
        aria-label={`Анимированный образ подопечного ${animal.name}`}
      >
        <svg viewBox="0 0 320 360" focusable="false">
          <circle className="journey-pet-scene__halo" cx="160" cy="165" r="124" />
          <ellipse className="journey-pet-scene__shadow" cx="160" cy="307" rx="92" ry="19" />
          <g className="journey-pet-scene__tail">
            {isCat
              ? <path d="M222 252c63 4 67-72 27-76-26-2-31 31-12 42" />
              : <path d="M221 247c57-18 61-74 28-76-24-1-25 25-11 37" />}
          </g>
          <g className="journey-pet-scene__body">
            <ellipse cx="160" cy="230" rx="76" ry="82" />
            <ellipse className="journey-pet-scene__chest" cx="160" cy="238" rx="37" ry="53" />
          </g>
          <g className="journey-pet-scene__head">
            {isCat ? (
              <>
                <path d="m101 112 13-62 45 38" />
                <path d="m219 112-13-62-45 38" />
              </>
            ) : (
              <>
                <path d="M108 100C68 85 65 128 91 157l29-20" />
                <path d="M212 100c40-15 43 28 17 57l-29-20" />
              </>
            )}
            <rect x="102" y="82" width="116" height="122" rx="54" />
            <path className="journey-pet-scene__mark" d="M160 86c-22 26-21 62 0 89 21-27 22-63 0-89Z" />
            <circle className="journey-pet-scene__eye" cx="136" cy="137" r="6" />
            <circle className="journey-pet-scene__eye" cx="184" cy="137" r="6" />
            <path className="journey-pet-scene__nose" d="m152 158 8-5 8 5-8 7Z" />
            <path className="journey-pet-scene__mouth" d="M160 165c-2 12-15 14-22 8M160 165c2 12 15 14 22 8" />
            {isCat ? (
              <g className="journey-pet-scene__whiskers">
                <path d="M135 162 87 154" />
                <path d="m135 170-50 7" />
                <path d="m185 162 48-8" />
                <path d="m185 170 50 7" />
              </g>
            ) : null}
          </g>
        </svg>
      </div>
      <span className="journey-pet-scene__mission">{mission.shortTitle}</span>
      <div className="journey-pet-scene__caption">
        <strong>{animal.name}</strong>
        <span>Один день заботы</span>
      </div>
    </div>
  );
}
