interface LogoProps {
  light?: boolean;
}

export function Logo({ light = false }: LogoProps) {
  return (
    <img
      className="brand-logo"
      src={assetUrl(
        light ? "assets/brand/logo-nika-white-2026.png" : "assets/brand/logo-nika-green-2026.png",
      )}
      alt="Благотворительный фонд помощи животным НИКА"
    />
  );
}
import { assetUrl } from "../lib/assets";
