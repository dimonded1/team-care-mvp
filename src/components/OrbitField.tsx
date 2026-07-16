const dogConstellationNodes = [
  [22, 108],
  [50, 90],
  [58, 55],
  [75, 82],
  [100, 100],
  [125, 86],
  [175, 73],
  [230, 78],
  [260, 98],
  [270, 90],
  [315, 52],
  [305, 88],
  [270, 118],
  [255, 132],
  [240, 160],
  [260, 205],
  [230, 205],
  [210, 150],
  [150, 150],
  [140, 175],
  [150, 208],
  [122, 208],
  [115, 135],
  [68, 125],
  [45, 118],
] as const;

interface OrbitFieldProps {
  variant: "matching" | "reveal" | "passport";
  showConstellation?: boolean;
  showPlanets?: boolean;
}

export function OrbitField({
  variant,
  showConstellation = false,
  showPlanets = false,
}: OrbitFieldProps) {
  return (
    <div className={`orbit-field orbit-field--${variant}`} aria-hidden="true">
      <span className="orbit-field__orbit orbit-field__orbit--one">
        {showPlanets && (
          <>
            <span className="orbit-field__planet orbit-field__planet--orange" />
            <span className="orbit-field__planet orbit-field__planet--pink" />
          </>
        )}
      </span>
      <span className="orbit-field__orbit orbit-field__orbit--two">
        {showPlanets && (
          <span className="orbit-field__planet orbit-field__planet--cream" />
        )}
      </span>
      {showConstellation && (
        <svg
          className="orbit-field__constellation"
          viewBox="0 0 340 230"
          focusable="false"
        >
          <path
            className="orbit-field__constellation-line"
            d="M22 108 50 90 58 55 75 82 100 100 125 86 175 73 230 78 260 98 270 90 315 52 305 88 270 118 255 132 240 160 260 205 230 205 210 150 150 150 140 175 150 208 122 208 115 135 68 125 45 118 22 108M100 100 115 135 150 150M125 86 150 150M230 78 210 150M260 98 255 132M68 125 75 82"
          />
          <g className="orbit-field__constellation-nodes">
            {dogConstellationNodes.map(([cx, cy], index) => (
              <circle
                key={`${cx}-${cy}`}
                cx={cx}
                cy={cy}
                r={index === 5 ? 4.2 : 3}
                style={{ animationDelay: `${220 + index * 38}ms` }}
              />
            ))}
          </g>
        </svg>
      )}
    </div>
  );
}
