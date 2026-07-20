import type { Animal } from "../types/app";
import { assetUrl } from "./assets";

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;

export function getResultCardLayout() {
  return {
    canvas: { left: 0, top: 0, width: CARD_WIDTH, height: CARD_HEIGHT },
    safeArea: { left: 72, top: 128, width: 936, height: 1562 },
    logo: { left: 72, top: 128, width: 86, height: 128 },
    badge: { left: 714, top: 148, width: 294, height: 70 },
    photo: { left: 48, top: 292, width: 984, height: 806 },
    ribbon: { left: -56, top: 1010, width: 1192, height: 126 },
    copy: { left: 72, top: 1228, width: 936, height: 268 },
    callout: { left: 72, top: 1540, width: 936, height: 142 },
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

function asymmetricRoundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  corners: { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number },
): void {
  const topLeft = Math.min(corners.topLeft, width / 2, height / 2);
  const topRight = Math.min(corners.topRight, width / 2, height / 2);
  const bottomRight = Math.min(corners.bottomRight, width / 2, height / 2);
  const bottomLeft = Math.min(corners.bottomLeft, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + topLeft, y);
  context.lineTo(x + width - topRight, y);
  context.quadraticCurveTo(x + width, y, x + width, y + topRight);
  context.lineTo(x + width, y + height - bottomRight);
  context.quadraticCurveTo(x + width, y + height, x + width - bottomRight, y + height);
  context.lineTo(x + bottomLeft, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - bottomLeft);
  context.lineTo(x, y + topLeft);
  context.quadraticCurveTo(x, y, x + topLeft, y);
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
  focusY = 0.43,
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
  context.font = `${weight} ${minSize}px Raleway, Arial, sans-serif`;
  return minSize;
}

function drawFoundationBackground(context: CanvasRenderingContext2D): void {
  const background = context.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  background.addColorStop(0, "#28562e");
  background.addColorStop(0.54, "#1d4728");
  background.addColorStop(1, "#143820");
  context.fillStyle = background;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const warmGlow = context.createRadialGradient(1030, 40, 0, 1030, 40, 480);
  warmGlow.addColorStop(0, "rgba(247, 109, 49, 0.34)");
  warmGlow.addColorStop(0.46, "rgba(255, 181, 181, 0.10)");
  warmGlow.addColorStop(1, "rgba(255, 181, 181, 0)");
  context.fillStyle = warmGlow;
  context.fillRect(540, 0, 540, 590);

  context.save();
  context.strokeStyle = "rgba(255, 253, 248, 0.10)";
  context.lineWidth = 2;
  context.beginPath();
  context.ellipse(782, 1600, 640, 286, -0.34, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = "rgba(255, 181, 181, 0.12)";
  context.beginPath();
  context.ellipse(858, 1606, 520, 214, 0.24, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawBrandRibbon(context: CanvasRenderingContext2D, animalName: string): void {
  context.save();
  context.translate(-48, 1034);
  context.rotate(-0.055);

  context.fillStyle = "#f76d31";
  roundedRectPath(context, 0, 20, 1190, 128, 64);
  context.fill();

  context.fillStyle = "#ffb5b5";
  roundedRectPath(context, 0, 0, 1190, 118, 59);
  context.fill();

  const ribbonText = `ЗНАКОМЬТЕСЬ, ${animalName.toLocaleUpperCase("ru")}`;
  const fontSize = setFittedFont(context, ribbonText, 940, 48, 34, 850);
  context.fillStyle = "#173c22";
  context.fillText(ribbonText, 104, 60 + fontSize / 3);
  context.restore();
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

  drawFoundationBackground(context);

  drawContain(
    context,
    logo,
    layout.logo.left,
    layout.logo.top,
    layout.logo.width,
    layout.logo.height,
  );

  context.fillStyle = "rgba(255, 253, 248, 0.10)";
  roundedRectPath(
    context,
    layout.badge.left,
    layout.badge.top,
    layout.badge.width,
    layout.badge.height,
    35,
  );
  context.fill();
  context.strokeStyle = "rgba(255, 253, 248, 0.22)";
  context.lineWidth = 2;
  context.stroke();
  context.fillStyle = "#ffb5b5";
  context.beginPath();
  context.arc(layout.badge.left + 36, layout.badge.top + 35, 7, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#fffdf8";
  context.font = "800 30px Raleway, Arial, sans-serif";
  context.fillText("ИЩЕТ ДОМ", layout.badge.left + 58, layout.badge.top + 46);

  const photoCorners = { topLeft: 62, topRight: 62, bottomRight: 170, bottomLeft: 62 };
  context.save();
  asymmetricRoundedRectPath(
    context,
    layout.photo.left,
    layout.photo.top,
    layout.photo.width,
    layout.photo.height,
    photoCorners,
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
  photoShade.addColorStop(0, "rgba(9, 39, 21, 0.01)");
  photoShade.addColorStop(0.7, "rgba(9, 39, 21, 0.01)");
  photoShade.addColorStop(1, "rgba(9, 39, 21, 0.18)");
  context.fillStyle = photoShade;
  context.fillRect(layout.photo.left, layout.photo.top, layout.photo.width, layout.photo.height);
  context.restore();

  context.strokeStyle = "rgba(255, 253, 248, 0.34)";
  context.lineWidth = 3;
  asymmetricRoundedRectPath(
    context,
    layout.photo.left,
    layout.photo.top,
    layout.photo.width,
    layout.photo.height,
    photoCorners,
  );
  context.stroke();

  drawBrandRibbon(context, animal.name);

  context.fillStyle = "#ffb5b5";
  context.font = "800 30px Raleway, Arial, sans-serif";
  context.fillText("СЕГОДНЯ Я ПОМОГАЮ", layout.copy.left, layout.copy.top);

  context.fillStyle = "#fffdf8";
  context.font = "850 82px Raleway, Arial, sans-serif";
  context.fillText("фонду НИКА", layout.copy.left, layout.copy.top + 92);

  context.fillStyle = "rgba(255, 253, 248, 0.76)";
  context.font = "550 31px Raleway, Arial, sans-serif";
  context.fillText("Помогаю рассказывать о подопечных.", layout.copy.left, layout.copy.top + 150);

  context.fillStyle = "#ffb5b5";
  setFittedFont(context, `${animal.name} ищет дом.`, 760, 40, 32, 800);
  context.fillText(`${animal.name} ищет дом.`, layout.copy.left, layout.copy.top + 212);

  context.fillStyle = "#f76d31";
  roundedRectPath(
    context,
    layout.callout.left,
    layout.callout.top,
    layout.callout.width,
    layout.callout.height,
    44,
  );
  context.fill();
  context.fillStyle = "#fffdf8";
  context.font = "700 27px Raleway, Arial, sans-serif";
  context.fillText("БОЛЬШЕ ИСТОРИЙ ПОДОПЕЧНЫХ", layout.callout.left + 38, layout.callout.top + 50);
  context.font = "850 46px Raleway, Arial, sans-serif";
  context.fillText("fond-nika.ru", layout.callout.left + 38, layout.callout.top + 106);

  context.fillStyle = "rgba(255, 253, 248, 0.50)";
  context.font = "550 25px Raleway, Arial, sans-serif";
  context.fillText("Благотворительный фонд помощи бездомным животным", 72, 1798);
  context.fillText("Помогаем животным с 2011 года", 72, 1836);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Не удалось создать карточку"))),
      "image/png",
    );
  });
}
