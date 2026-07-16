import { useState } from "react";

interface AnimalPhotoProps {
  src: string;
  name: string;
  className?: string;
}

export function AnimalPhoto({ src, name, className = "" }: AnimalPhotoProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={`photo-fallback ${className}`} role="img" aria-label={`Фото ${name} временно недоступно`}>
        <span>{name.slice(0, 1)}</span>
      </div>
    );
  }

  return (
    <img
      className={className}
      src={src}
      alt={`Подопечный фонда НИКА — ${name}`}
      width="880"
      height="640"
      onError={() => setFailed(true)}
    />
  );
}
