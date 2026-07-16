import type { Animal } from "../types/app";
import { assetUrl } from "./assets";

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;

export function getResultCardLayout() {
  return {
    canvas: { left: 0, top: 0, width: CARD_WIDTH, height: CARD_HEIGHT },
    photo: { left: 0, top: 0, width: CARD_WIDTH, height: 650 },
    content: { left: 0, top: 650, width: CARD_WIDTH, height: 700 },
    badge: { left: 72, top: 700, width: 636, height: 84 },
    name: { left: 72, top: 834, width: 880, height: 112 },
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

function drawCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const imageRatio = image.width / image.height;
  const targetRatio = width / height;
  const sourceWidth = imageRatio > targetRatio ? image.height * targetRatio : image.width;
  const sourceHeight = imageRatio > targetRatio ? image.height : image.width / targetRatio;
  const sourceX = (image.width - sourceWidth) / 2;
  const sourceY = (image.height - sourceHeight) / 2;
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height,
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

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  drawCover(
    context,
    photo,
    layout.photo.left,
    layout.photo.top,
    layout.photo.width,
    layout.photo.height,
  );

  context.fillStyle = "#234721";
  context.fillRect(
    layout.content.left,
    layout.content.top,
    layout.content.width,
    layout.content.height,
  );
  context.fillStyle = "#FFB5B5";
  context.beginPath();
  context.roundRect(
    layout.badge.left,
    layout.badge.top,
    layout.badge.width,
    layout.badge.height,
    layout.badge.height / 2,
  );
  context.fill();

  context.fillStyle = "#282828";
  context.font = "700 42px Raleway, Arial";
  context.fillText("ДЕНЬ ЗАБОТЫ ПРОЙДЕН", layout.badge.left + 36, layout.badge.top + 55);

  context.fillStyle = "#ffffff";
  context.font = "700 104px Raleway, Arial";
  context.fillText(animal.name, layout.name.left, layout.name.top + 92);

  context.font = "500 48px Raleway, Arial";
  wrapText(context, `Сегодня я был рядом с ${animal.name}.`, 820)
    .slice(0, 2)
    .forEach((line, index) => context.fillText(line, 72, 1028 + index * 62));

  context.globalAlpha = 0.82;
  context.font = "500 34px Raleway, Arial";
  wrapText(context, animal.shortDescription, 820)
    .slice(0, 2)
    .forEach((line, index) => context.fillText(line, 72, 1170 + index * 44));
  context.globalAlpha = 1;

  drawCover(context, logo, 860, 1120, 150, 150);
  context.font = "600 28px Raleway, Arial";
  context.fillText("fond-nika.ru", 72, 1285);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Не удалось создать карточку"))),
      "image/png",
      0.95,
    );
  });
}
