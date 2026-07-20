import type { Animal } from "../types/app";
import { assetUrl } from "./assets";

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;

export function getResultCardLayout() {
  return {
    canvas: { left: 0, top: 0, width: CARD_WIDTH, height: CARD_HEIGHT },
    safeArea: { left: 72, top: 104, width: 936, height: 1588 },
    badge: { left: 72, top: 150, width: 600, height: 78 },
    photo: { left: 48, top: 284, width: 984, height: 806 },
    copy: { left: 72, top: 1174, width: 936, height: 518 },
    logo: { left: 72, top: 1512, width: 110, height: 164 },
  } as const;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Не удалось загрузить изображение: ${src}`));
    image.src = src;
  });
}

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const corner = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + corner, y);
  context.lineTo(x + width - corner, y);
  context.quadraticCurveTo(x + width, y, x + width, y + corner);
  context.lineTo(x + width, y + height - corner);
  context.quadraticCurveTo(x + width, y + height, x + width - corner, y + height);
  context.lineTo(x + corner, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - corner);
  context.lineTo(x, y + corner);
  context.quadraticCurveTo(x, y, x + corner, y);
  context.closePath();
}

function drawCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  focusX = 0.5,
  focusY = 0.44,
): void {
  const imageRatio = image.width / image.height;
  const targetRatio = width / height;
  const sourceWidth = imageRatio > targetRatio ? image.height * targetRatio : image.width;
  const sourceHeight = imageRatio > targetRatio ? image.height : image.width / targetRatio;
  const sourceX = Math.max(0, Math.min(image.width - sourceWidth, image.width * focusX - sourceWidth / 2));
  const sourceY = Math.max(0, Math.min(image.height - sourceHeight, image.height * focusY - sourceHeight / 2));
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function drawContain(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const scale = Math.min(width / image.width, height / image.height);
  const targetWidth = image.width * scale;
  const targetHeight = image.height * scale;
  context.drawImage(
    image,
    x + (width - targetWidth) / 2,
    y + (height - targetHeight) / 2,
    targetWidth,
    targetHeight,
  );
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (context.measureText(next).width <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  });
  if (current) lines.push(current);
  return lines;
}

function setFittedFont(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  minSize: number,
  weight: number,
): number {
  let size = startSize;
  do {
    context.font = `${weight} ${size}px Raleway, Arial, sans-serif`;
    if (context.measureText(text).width <= maxWidth) return size;
    size -= 2;
  } while (size >= minSize);
  return minSize;
}

function drawCosmicBackground(context: CanvasRenderingContext2D): void {
  const background = context.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  background.addColorStop(0, "#143c29");
  background.addColorStop(0.48, "#09281b");
  background.addColorStop(1, "#061c13");
  context.fillStyle = background;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const coralGlow = context.createRadialGradient(936, 196, 0, 936, 196, 390);
  coralGlow.addColorStop(0, "rgba(247, 109, 49, 0.30)");
  coralGlow.addColorStop(0.55, "rgba(255, 181, 181, 0.10)");
  coralGlow.addColorStop(1, "rgba(255, 181, 181, 0)");
  context.fillStyle = coralGlow;
  context.fillRect(540, 0, 540, 610);

  const greenGlow = context.createRadialGradient(96, 1560, 0, 96, 1560, 480);
  greenGlow.addColorStop(0, "rgba(120, 187, 120, 0.15)");
  greenGlow.addColorStop(1, "rgba(120, 187, 120, 0)");
  context.fillStyle = greenGlow;
  context.fillRect(0, 1120, 620, 800);

  context.save();
  context.strokeStyle = "rgba(255, 253, 248, 0.12)";
  context.lineWidth = 2;
  context.beginPath();
  context.ellipse(870, 1460, 520, 252, -0.3, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = "rgba(255, 181, 181, 0.12)";
  context.beginPath();
  context.ellipse(836, 1484, 650, 330, 0.44, 0, Math.PI * 2);
  context.stroke();
  context.restore();

  const stars = [
    [92, 118], [748, 112], [1002, 278], [48, 824], [1008, 1172],
    [864, 1264], [986, 1508], [534, 1768], [228, 1814], [916, 1810],
  ] as const;
  stars.forEach(([x, y], index) => {
    context.fillStyle = index % 3 === 0 ? "rgba(255, 181, 181, 0.68)" : "rgba(255, 253, 248, 0.5)";
    context.beginPath();
    context.arc(x, y, index % 2 === 0 ? 4 : 3, 0, Math.PI * 2);
    context.fill();
  });
}

export async function createResultCard(animal: Animal): Promise<Blob> {
  const layout = getResultCardLayout();
  const [photo, logo] = await Promise.all([
    loadImage(animal.photo),
    loadImage(assetUrl("assets/brand/logo-nika-white.png")),
  ]);
  await document.fonts.ready;

  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas недоступен");

  drawCosmicBackground(context);

  context.fillStyle = "#ffb5b5";
  roundedRectPath(
    context,
    layout.badge.left,
    layout.badge.top,
    layout.badge.width,
    layout.badge.height,
    39,
  );
  context.fill();
  context.fillStyle = "#15311f";
  context.font = "800 34px Raleway, Arial, sans-serif";
  context.fillText("ДЕНЬ ЗАБОТЫ ПРОЙДЕН", layout.badge.left + 34, layout.badge.top + 51);

  context.save();
  roundedRectPath(
    context,
    layout.photo.left,
    layout.photo.top,
    layout.photo.width,
    layout.photo.height,
    62,
  );
  context.clip();
  drawCover(
    context,
    photo,
    layout.photo.left,
    layout.photo.top,
    layout.photo.width,
    layout.photo.height,
  );
  const photoShade = context.createLinearGradient(0, layout.photo.top, 0, layout.photo.top + layout.photo.height);
  photoShade.addColorStop(0, "rgba(4, 24, 16, 0.02)");
  photoShade.addColorStop(0.7, "rgba(4, 24, 16, 0.02)");
  photoShade.addColorStop(1, "rgba(4, 24, 16, 0.28)");
  context.fillStyle = photoShade;
  context.fillRect(layout.photo.left, layout.photo.top, layout.photo.width, layout.photo.height);
  context.restore();

  context.strokeStyle = "rgba(255, 253, 248, 0.28)";
  context.lineWidth = 3;
  roundedRectPath(
    context,
    layout.photo.left,
    layout.photo.top,
    layout.photo.width,
    layout.photo.height,
    62,
  );
  context.stroke();

  context.fillStyle = "rgba(255, 253, 248, 0.72)";
  context.font = "600 42px Raleway, Arial, sans-serif";
  context.fillText("Сегодня я был рядом с", layout.copy.left, layout.copy.top);

  context.fillStyle = "#fffdf8";
  const nameSize = setFittedFont(context, animal.name, layout.copy.width, 118, 76, 800);
  context.fillText(animal.name, layout.copy.left, layout.copy.top + nameSize + 18);

  context.fillStyle = "rgba(255, 253, 248, 0.72)";
  context.font = "500 34px Raleway, Arial, sans-serif";
  wrapText(context, animal.shortDescription, 760)
    .slice(0, 2)
    .forEach((line, index) => context.fillText(line, layout.copy.left, layout.copy.top + 212 + index * 46));

  drawContain(
    context,
    logo,
    layout.logo.left,
    layout.logo.top,
    layout.logo.width,
    layout.logo.height,
  );
  context.fillStyle = "#fffdf8";
  context.font = "700 35px Raleway, Arial, sans-serif";
  context.fillText("fond-nika.ru", 218, 1618);
  context.fillStyle = "rgba(255, 253, 248, 0.52)";
  context.font = "500 27px Raleway, Arial, sans-serif";
  context.fillText("Благотворительный фонд помощи бездомным животным", 218, 1664);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Не удалось создать карточку"))),
      "image/png",
    );
  });
}
