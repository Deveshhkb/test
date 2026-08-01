import { Texture } from "pixi.js";
import { isLowPowerDevice } from "./DeviceInfo";

/**
 * Largest texture edge we are willing to upload.
 *
 * Many low/mid-range Android GPUs cap GL_MAX_TEXTURE_SIZE at 4096, and some
 * older parts at 2048; an oversized image fails to upload (rendering nothing)
 * or eats hundreds of megabytes of VRAM. Backgrounds are cover-scaled anyway,
 * so a capped copy is visually identical while being safe everywhere.
 */
export function maxTextureEdge(): number {
  return isLowPowerDevice() ? 1536 : 2560;
}

/**
 * Loads an image and downsamples it to `maxEdge` before it becomes a texture.
 * Returns the full-size texture untouched when it is already small enough.
 */
export async function loadScaledTexture(
  url: string,
  maxEdge = maxTextureEdge(),
): Promise<Texture> {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Failed to load ${url}: ${response.status}`);
  const blob = await response.blob();

  if (typeof createImageBitmap !== "function") {
    return Texture.from(await blobToImage(blob));
  }

  const probe = await createImageBitmap(blob);
  const scale = Math.min(1, maxEdge / Math.max(probe.width, probe.height));
  if (scale >= 1) return Texture.from(probe);

  probe.close();
  const resized = await createImageBitmap(blob, {
    resizeWidth: Math.max(1, Math.round(probe.width * scale)),
    resizeHeight: Math.max(1, Math.round(probe.height * scale)),
    resizeQuality: "high",
  });
  return Texture.from(resized);
}

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(blob);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image decode failed"));
    };
    image.src = url;
  });
}
