/**
 * Client-side resize / crop for uploads so modal selections match recommended dimensions
 * (game cover 3:4, background & tag cover 16:9, screenshots bounded to max size).
 */

const GAME_COVER_W = 600;
const GAME_COVER_H = 800;

const WIDE_W = 1920;
const WIDE_H = 1080;

const SCREENSHOT_MAX_W = 1920;
const SCREENSHOT_MAX_H = 1080;

function centerCropRect(
  sw: number,
  sh: number,
  aspectW: number,
  aspectH: number
): { sx: number; sy: number; sWidth: number; sHeight: number } {
  const targetAspect = aspectW / aspectH;
  const sourceAspect = sw / sh;
  if (sourceAspect > targetAspect) {
    const sHeight = sh;
    const sWidth = sh * targetAspect;
    const sx = (sw - sWidth) / 2;
    return { sx, sy: 0, sWidth, sHeight };
  }
  const sWidth = sw;
  const sHeight = sw / targetAspect;
  const sy = (sh - sHeight) / 2;
  return { sx: 0, sy, sWidth, sHeight };
}

function canvasToWebpOrJpeg(canvas: HTMLCanvasElement, baseName: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (webpBlob) => {
        if (webpBlob && webpBlob.size > 0) {
          const name = baseName.replace(/\.[^.]+$/, "") + ".webp";
          resolve(new File([webpBlob], name, { type: "image/webp" }));
          return;
        }
        canvas.toBlob(
          (jpegBlob) => {
            if (!jpegBlob || jpegBlob.size === 0) {
              reject(new Error("encode failed"));
              return;
            }
            const name = baseName.replace(/\.[^.]+$/, "") + ".jpg";
            resolve(new File([jpegBlob], name, { type: "image/jpeg" }));
          },
          "image/jpeg",
          0.92
        );
      },
      "image/webp",
      0.92
    );
  });
}

async function decodeToBitmap(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

/**
 * Portrait cover 3:4 (e.g. library / collection-like), 600×800.
 */
export async function normalizeGameCoverImage(file: File): Promise<File> {
  const bitmap = await decodeToBitmap(file);
  try {
    const crop = centerCropRect(bitmap.width, bitmap.height, 3, 4);
    const canvas = document.createElement("canvas");
    canvas.width = GAME_COVER_W;
    canvas.height = GAME_COVER_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no context");
    ctx.drawImage(
      bitmap,
      crop.sx,
      crop.sy,
      crop.sWidth,
      crop.sHeight,
      0,
      0,
      GAME_COVER_W,
      GAME_COVER_H
    );
    return canvasToWebpOrJpeg(canvas, file.name || "cover.webp");
  } finally {
    bitmap.close();
  }
}

/**
 * Wide image 16:9 (background, tag cover), 1920×1080.
 */
export async function normalizeWideImage(file: File): Promise<File> {
  const bitmap = await decodeToBitmap(file);
  try {
    const crop = centerCropRect(bitmap.width, bitmap.height, 16, 9);
    const canvas = document.createElement("canvas");
    canvas.width = WIDE_W;
    canvas.height = WIDE_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no context");
    ctx.drawImage(bitmap, crop.sx, crop.sy, crop.sWidth, crop.sHeight, 0, 0, WIDE_W, WIDE_H);
    return canvasToWebpOrJpeg(canvas, file.name || "background.webp");
  } finally {
    bitmap.close();
  }
}

function containSize(sw: number, sh: number, maxW: number, maxH: number): { w: number; h: number } {
  if (sw <= maxW && sh <= maxH) return { w: sw, h: sh };
  const scale = Math.min(maxW / sw, maxH / sh);
  return { w: Math.round(sw * scale), h: Math.round(sh * scale) };
}

/**
 * Screenshots: scale down to fit inside max box, preserve aspect, no crop.
 */
export async function normalizeScreenshotImage(file: File): Promise<File> {
  const bitmap = await decodeToBitmap(file);
  try {
    const { w, h } = containSize(bitmap.width, bitmap.height, SCREENSHOT_MAX_W, SCREENSHOT_MAX_H);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no context");
    ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, 0, 0, w, h);
    return canvasToWebpOrJpeg(canvas, file.name || "screenshot.webp");
  } finally {
    bitmap.close();
  }
}
