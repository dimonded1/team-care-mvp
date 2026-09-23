import type { Animal } from "../types/app";
import { assetUrl } from "./assets";
import { loadCardImage, waitForCardResource } from "./cardResources";

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;
const FOUNDATION_URL = "fond-nika.ru/ourpets";

const COLORS = {
  green: "#123c25",
  greenDark: "#082b1a",
  greenDeep: "#031e12",
  orange: "#ff6d2f",
  cream: "#fffaf0",
} as const;

export interface ResultCardContent {
  name: string;
  nameGenitive: string;
  photo: string;
  status: string;
  accent: string;
  message: string;
  url: string;
  photoFocus: {
    x: number;
    y: number;
  };
}

export type ResultCardOverrides = Partial<Omit<ResultCardContent, "name" | "nameGenitive" | "photo">>;

export function getResultCardContent(
  animal: Animal,
  overrides: ResultCardOverrides = {},
): ResultCardContent {
  return {
    name: animal.name,
    nameGenitive: animal.nameGenitive,
    photo: animal.photo,
    status: "ИЩЕТ ДОМ",
    accent: "СЕГОДНЯ",
    message: "моя звезда —",
    url: FOUNDATION_URL,
    photoFocus: { x: 0.5, y: 0.42 },
    ...overrides,
  };
}

export function getResultCardLayout() {
  return {
    canvas: { left: 0, top: 0, width: CARD_WIDTH, height: CARD_HEIGHT },
    safeArea: { left: 64, top: 56, width: 952, height: 1808 },
    logo: { left: 64, top: 56, width: 74, height: 104 },
    badge: { left: 752, top: 72, width: 264, height: 66 },
    accent: { left: 60, top: 218, width: 956, height: 182 },
    photo: { left: 28, top: 560, width: 1024, height: 1014 },
    name: { left: 64, top: 1342, width: 952, height: 196 },
    copy: { left: 64, top: 1588, width: 952, height: 92 },
    callout: { left: 64, top: 1732, width: 952, height: 108 },
  } as const;
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

function organicPhotoPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  context.beginPath();
  context.moveTo(x + width * 0.15, y + height * 0.03);
  context.bezierCurveTo(
    x + width * 0.34,
    y - height * 0.015,
    x + width * 0.54,
    y + height * 0.07,
    x + width * 0.72,
    y + height * 0.025,
  );
  context.bezierCurveTo(
    x + width * 0.94,
    y - height * 0.02,
    x + width * 1.01,
    y + height * 0.2,
    x + width * 0.97,
    y + height * 0.39,
  );
  context.bezierCurveTo(
    x + width * 0.94,
    y + height * 0.58,
    x + width * 1.02,
    y + height * 0.72,
    x + width * 0.85,
    y + height * 0.88,
  );
  context.bezierCurveTo(
    x + width * 0.7,
    y + height * 1.03,
    x + width * 0.52,
    y + height * 0.94,
    x + width * 0.34,
    y + height * 0.98,
  );
  context.bezierCurveTo(
    x + width * 0.11,
    y + height * 1.04,
    x - width * 0.02,
    y + height * 0.85,
    x + width * 0.035,
    y + height * 0.64,
  );
  context.bezierCurveTo(
    x + width * 0.08,
    y + height * 0.46,
    x - width * 0.03,
    y + height * 0.28,
    x + width * 0.045,
    y + height * 0.15,
  );
  context.bezierCurveTo(
    x + width * 0.075,
    y + height * 0.095,
    x + width * 0.1,
    y + height * 0.055,
    x + width * 0.15,
    y + height * 0.03,
  );
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
  focusY = 0.42,
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

function setFittedFont(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  minSize: number,
  font: string,
  weight = 700,
): number {
  let size = startSize;
  do {
    context.font = `${weight} ${size}px "${font}", Raleway, Arial, sans-serif`;
    if (context.measureText(text).width <= maxWidth) return size;
    size -= 2;
  } while (size >= minSize);
  context.font = `${weight} ${minSize}px "${font}", Raleway, Arial, sans-serif`;
  return minSize;
}

function drawBackground(context: CanvasRenderingContext2D): void {
  const background = context.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  background.addColorStop(0, COLORS.greenDeep);
  background.addColorStop(0.58, COLORS.greenDark);
  background.addColorStop(1, COLORS.green);
  context.fillStyle = background;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const glow = context.createRadialGradient(540, 940, 80, 540, 940, 700);
  glow.addColorStop(0, "rgba(255, 109, 47, 0.18)");
  glow.addColorStop(0.52, "rgba(255, 109, 47, 0.04)");
  glow.addColorStop(1, "rgba(255, 109, 47, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 250, CARD_WIDTH, 1420);

  const stars = [
    [84, 313, 3], [197, 179, 2], [319, 528, 3], [904, 194, 2],
    [998, 367, 4], [78, 826, 2], [1011, 885, 3], [130, 1190, 4],
    [963, 1304, 2], [212, 1514, 3], [884, 1603, 4], [997, 1810, 2],
    [528, 1740, 2], [341, 1833, 3],
  ] as const;
  stars.forEach(([x, y, radius], index) => {
    context.fillStyle = index % 4 === 0
      ? "rgba(255, 250, 240, 0.9)"
      : "rgba(255, 250, 240, 0.42)";
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  });
}

function drawSingleOrbit(
  context: CanvasRenderingContext2D,
  layout: ReturnType<typeof getResultCardLayout>,
): void {
  const centerX = layout.photo.left + layout.photo.width / 2;
  const centerY = layout.photo.top + layout.photo.height / 2;

  context.save();
  context.strokeStyle = COLORS.orange;
  context.globalAlpha = 0.76;
  context.lineWidth = 5;
  context.beginPath();
  context.ellipse(centerX, centerY, 622, 350, 0.22, 0, Math.PI * 2);
  context.stroke();

  context.globalAlpha = 1;
  context.fillStyle = COLORS.orange;
  context.beginPath();
  context.arc(1012, 1040, 16, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = COLORS.cream;
  context.lineWidth = 5;
  context.stroke();
  context.restore();
}

function drawBrand(
  context: CanvasRenderingContext2D,
  logo: HTMLImageElement,
  layout: ReturnType<typeof getResultCardLayout>,
): void {
  drawContain(
    context,
    logo,
    layout.logo.left,
    layout.logo.top,
    layout.logo.width,
    layout.logo.height,
  );

  context.save();
  context.textBaseline = "top";
  context.fillStyle = COLORS.cream;
  context.font = '800 28px "Raleway", Arial, sans-serif';
  context.fillText("ФОНД НИКА", 158, 81);
  context.font = '650 15px "Raleway", Arial, sans-serif';
  context.globalAlpha = 0.72;
  context.fillText("ПОМОЩЬ ЖИВОТНЫМ", 158, 119);
  context.restore();
}

function drawStatus(
  context: CanvasRenderingContext2D,
  content: ResultCardContent,
  layout: ReturnType<typeof getResultCardLayout>,
): void {
  const { badge } = layout;
  context.save();
  context.fillStyle = COLORS.orange;
  roundedRectPath(context, badge.left, badge.top, badge.width, badge.height, badge.height / 2);
  context.fill();

  context.fillStyle = COLORS.cream;
  context.textBaseline = "middle";
  context.textAlign = "center";
  setFittedFont(context, content.status, badge.width - 48, 28, 20, "Raleway", 850);
  context.fillText(content.status, badge.left + badge.width / 2, badge.top + badge.height / 2 + 1);
  context.restore();
}

function drawHeadline(
  context: CanvasRenderingContext2D,
  content: ResultCardContent,
  layout: ReturnType<typeof getResultCardLayout>,
): void {
  context.save();
  context.textBaseline = "top";
  context.fillStyle = COLORS.cream;

  const accent = content.accent.toLocaleUpperCase("ru");
  setFittedFont(context, accent, layout.accent.width, 110, 78, "Unbounded", 800);
  context.fillText(accent, layout.accent.left, layout.accent.top);

  const message = content.message.toLocaleUpperCase("ru");
  setFittedFont(context, message, layout.accent.width, 58, 46, "Unbounded", 700);
  context.fillText(message, layout.accent.left, layout.accent.top + 118);
  context.restore();
}

function drawPhoto(
  context: CanvasRenderingContext2D,
  photo: HTMLImageElement,
  content: ResultCardContent,
  layout: ReturnType<typeof getResultCardLayout>,
): void {
  const { photo: photoLayout } = layout;

  context.save();
  context.translate(14, 16);
  organicPhotoPath(
    context,
    photoLayout.left,
    photoLayout.top,
    photoLayout.width,
    photoLayout.height,
  );
  context.fillStyle = COLORS.orange;
  context.fill();
  context.restore();

  context.save();
  organicPhotoPath(
    context,
    photoLayout.left,
    photoLayout.top,
    photoLayout.width,
    photoLayout.height,
  );
  context.clip();
  drawCover(
    context,
    photo,
    photoLayout.left,
    photoLayout.top,
    photoLayout.width,
    photoLayout.height,
    content.photoFocus.x,
    content.photoFocus.y,
  );

  const shade = context.createLinearGradient(
    0,
    photoLayout.top + photoLayout.height * 0.52,
    0,
    photoLayout.top + photoLayout.height,
  );
  shade.addColorStop(0, "rgba(3, 30, 18, 0)");
  shade.addColorStop(0.72, "rgba(3, 30, 18, 0.38)");
  shade.addColorStop(1, "rgba(3, 30, 18, 0.68)");
  context.fillStyle = shade;
  context.fillRect(
    photoLayout.left,
    photoLayout.top + photoLayout.height * 0.52,
    photoLayout.width,
    photoLayout.height * 0.48,
  );
  context.restore();

  context.save();
  organicPhotoPath(
    context,
    photoLayout.left,
    photoLayout.top,
    photoLayout.width,
    photoLayout.height,
  );
  context.strokeStyle = COLORS.cream;
  context.lineWidth = 7;
  context.stroke();
  context.restore();
}

function drawName(
  context: CanvasRenderingContext2D,
  content: ResultCardContent,
  layout: ReturnType<typeof getResultCardLayout>,
): void {
  const name = content.name;
  context.save();
  context.textBaseline = "top";
  context.textAlign = "center";
  const centerX = layout.name.left + layout.name.width / 2;
  const fontSize = setFittedFont(
    context,
    name,
    layout.name.width,
    190,
    76,
    "NauryzRedKeds",
    700,
  );
  context.lineJoin = "round";
  context.strokeStyle = COLORS.greenDeep;
  context.lineWidth = Math.max(9, fontSize * 0.075);
  context.strokeText(name, centerX, layout.name.top);
  context.fillStyle = COLORS.cream;
  context.fillText(name, centerX, layout.name.top);
  context.restore();
}

function drawFooter(
  context: CanvasRenderingContext2D,
  content: ResultCardContent,
  layout: ReturnType<typeof getResultCardLayout>,
): void {
  context.save();
  context.strokeStyle = COLORS.orange;
  context.lineWidth = 6;
  context.beginPath();
  context.moveTo(layout.callout.left, layout.callout.top + 18);
  context.lineTo(layout.callout.left + 116, layout.callout.top + 18);
  context.stroke();

  context.textBaseline = "top";
  context.fillStyle = COLORS.cream;
  setFittedFont(context, content.url, layout.callout.width - 64, 42, 29, "Unbounded", 700);
  context.fillText(content.url, layout.callout.left, layout.callout.top + 54);

  context.restore();
}

async function ensureCardFonts(): Promise<void> {
  await Promise.all([
    document.fonts.load('700 190px "NauryzRedKeds"'),
    document.fonts.load('800 142px "Unbounded"'),
    document.fonts.load('800 42px "Raleway"'),
  ]);
  await document.fonts.ready;
}

export async function createShareCard(content: ResultCardContent, signal?: AbortSignal): Promise<Blob> {
  if (signal?.aborted) throw signal.reason ?? new Error("Создание карточки отменено");
  const layout = getResultCardLayout();
  const [photo, logo] = await Promise.all([
    loadCardImage(content.photo, signal),
    loadCardImage(assetUrl("assets/brand/logo-nika-white-2026.png"), signal),
    waitForCardResource(ensureCardFonts(), signal),
  ]);
  if (signal?.aborted) throw signal.reason ?? new Error("Создание карточки отменено");

  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas недоступен");

  drawBackground(context);
  drawSingleOrbit(context, layout);
  drawHeadline(context, content, layout);
  drawPhoto(context, photo, content, layout);
  drawName(context, content, layout);
  drawBrand(context, logo, layout);
  drawStatus(context, content, layout);
  drawFooter(context, content, layout);

  return waitForCardResource(new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Не удалось создать PNG"));
      },
      "image/png",
      1,
    );
  }), signal);
}

export async function createResultCard(
  animal: Animal,
  overrides: ResultCardOverrides = {},
  signal?: AbortSignal,
): Promise<Blob> {
  return createShareCard(getResultCardContent(animal, overrides), signal);
}
