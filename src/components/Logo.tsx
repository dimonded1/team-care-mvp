interface LogoProps {
  light?: boolean;
}

export function Logo({ light = false }: LogoProps) {
  return (
    <img
      className="brand-logo"
      src={light ? "/assets/brand/logo-nika-white.png" : "/assets/brand/logo-nika-green.jpg"}
      alt="Фонд помощи бездомным животным НИКА"
    />
  );
}
