import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const baseProps: IconProps = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export function ArrowLeftIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="m8.2 10.8 7.6-4.5" />
      <path d="m8.2 13.2 7.6 4.5" />
    </svg>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    </svg>
  );
}

export function FoodIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M4 11h16c0 5-3.2 9-8 9s-8-4-8-9Z" />
      <path d="M7 8.5c1.5-1.4 2.1-3 1.2-4.5" />
      <path d="M12 8.5c1.5-1.4 2.1-3 1.2-4.5" />
      <path d="M17 8.5c1.5-1.4 2.1-3 1.2-4.5" />
    </svg>
  );
}

export function HealthIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M12 21s-7-4.6-7-10.3A4.7 4.7 0 0 1 13 7.3a4.7 4.7 0 0 1 8 3.4C21 16.4 12 21 12 21Z" />
      <path d="M12 8v6" />
      <path d="M9 11h6" />
    </svg>
  );
}

export function TrustIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M4 13.5 8.8 9a2.4 2.4 0 0 1 3.4 0l1.1 1.1" />
      <path d="m20 10.5-4.8-4.4a2.4 2.4 0 0 0-3.4 0L9 8.8" />
      <path d="m7.5 14 4 4a2.2 2.2 0 0 0 3.1 0l4.1-4.1" />
      <path d="m10 16.5 1.2-1.2" />
      <path d="m13 18 1.2-1.2" />
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="m3 11 9-7 9 7" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M9.5 20v-6h5v6" />
      <path d="M18 5.8V3h2v4.4" />
    </svg>
  );
}

export function MovementIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M5 18c2.2-3.2 4.6-4.8 7.2-4.8 2.8 0 4.3 1.3 6.8 4.8" />
      <path d="M7 8.5c0 1.1-.7 2-1.6 2s-1.6-.9-1.6-2 .7-2 1.6-2S7 7.4 7 8.5Z" />
      <path d="M11 5.8c0 1.2-.8 2.2-1.8 2.2s-1.8-1-1.8-2.2.8-2.2 1.8-2.2 1.8 1 1.8 2.2Z" />
      <path d="M16.6 6.2c0 1.2-.8 2.2-1.8 2.2s-1.8-1-1.8-2.2S13.8 4 14.8 4s1.8 1 1.8 2.2Z" />
      <path d="M20.2 9c0 1.1-.7 2-1.6 2S17 10.1 17 9s.7-2 1.6-2 1.6.9 1.6 2Z" />
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="12" cy="12" r="7.5" />
      <path d="m9.8 8.5 5.6 3.5-5.6 3.5Z" />
      <path d="M5.6 6.8 3.8 5" />
      <path d="m18.4 17.2 1.8 1.8" />
    </svg>
  );
}

export function RestIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M19 15.5A7.5 7.5 0 0 1 8.5 5 7.5 7.5 0 1 0 19 15.5Z" />
      <path d="M16 4v3" />
      <path d="M14.5 5.5h3" />
    </svg>
  );
}

export function CareIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M9 4h6" />
      <path d="M10 4v4l-4.2 7.2A3.2 3.2 0 0 0 8.6 20h6.8a3.2 3.2 0 0 0 2.8-4.8L14 8V4" />
      <path d="M8.2 14h7.6" />
      <path d="M12 11.5v5" />
      <path d="M9.5 14h5" />
    </svg>
  );
}

export function SleepIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M5 17h14" />
      <path d="M6 17V9h6a4 4 0 0 1 4 4v4" />
      <path d="M8 12h3" />
      <path d="M5 20v-3" />
      <path d="M19 20v-3" />
      <path d="m16 5 3-3" />
      <path d="M16 2h3v3" />
    </svg>
  );
}

export function WaterIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M12 3s5.5 6.1 5.5 10.2a5.5 5.5 0 0 1-11 0C6.5 9.1 12 3 12 3Z" />
      <path d="M9.3 14.2c.3 1.3 1.2 2.1 2.7 2.3" />
    </svg>
  );
}

export function WipeIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="m5 8 9-4 5 12-9 4Z" />
      <path d="m7.5 7 8.8 10.3" />
      <path d="M4 14.5c1.8 0 2.8.8 3.2 2.5" />
    </svg>
  );
}

export function BrushIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M6 4h9a3 3 0 0 1 3 3v4H6Z" />
      <path d="M8 11v5.5a3.5 3.5 0 0 0 7 0V11" />
      <path d="M8.5 7h7" />
      <path d="M9 11v2" />
      <path d="M12 11v2" />
      <path d="M15 11v2" />
    </svg>
  );
}

export function VetIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M5 9.5 12 4l7 5.5V20H5Z" />
      <path d="M12 9v7" />
      <path d="M8.5 12.5h7" />
    </svg>
  );
}

export function BandageIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="m7.2 18.5-1.7-1.7a3 3 0 0 1 0-4.2l7.1-7.1a3 3 0 0 1 4.2 0l1.7 1.7a3 3 0 0 1 0 4.2l-7.1 7.1a3 3 0 0 1-4.2 0Z" />
      <path d="m9 9 6 6" />
      <circle cx="10" cy="13.8" r=".7" fill="currentColor" stroke="none" />
      <circle cx="13.8" cy="10" r=".7" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M2.8 12s3.3-5 9.2-5 9.2 5 9.2 5-3.3 5-9.2 5-9.2-5-9.2-5Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}
