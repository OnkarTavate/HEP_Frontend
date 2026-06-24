/**
 * photoProcessor.js
 *
 * Client-side photo processor that auto-fixes images before upload:
 *   1. Center-crops to a valid aspect ratio (0.8–1.25, targeting 1:1)
 *   2. Resizes to fit within 200–600 px on both sides
 *   3. Compresses as JPEG, stepping down quality until ≤ 500 KB
 *
 * Returns a dataURL string (image/jpeg) ready for display and submission.
 *
 * Constraints mirror photoValidationService.js on the backend:
 *   MAX_SIZE    = 500 KB
 *   MIN_DIM     = 200 px
 *   MAX_DIM     = 600 px
 *   TARGET_RATIO = 1.0  (1:1 square — safest middle of 0.8–1.25 range)
 *   TARGET_DIM  = 400 px (fits comfortably between 200 and 600)
 */

const MAX_SIZE_BYTES = 500 * 1024; // 500 KB
const MIN_DIM = 200;
const MAX_DIM = 600;
const TARGET_DIM = 400;   // output size (square)
const TARGET_RATIO = 1.0; // width / height

/**
 * Loads a File or Blob into an HTMLImageElement.
 * @param {File|Blob|string} source  File, Blob, or dataURL string
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    if (typeof source === "string") {
      img.src = source;
    } else {
      const url = URL.createObjectURL(source);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image"));
      };
      img.src = url;
    }
  });
}

/**
 * Calculates the center-crop box that achieves targetRatio
 * from source dimensions srcW × srcH.
 *
 * @returns {{ sx, sy, sw, sh }} source crop rectangle
 */
function calcCropBox(srcW, srcH, targetRatio) {
  const srcRatio = srcW / srcH;

  let sw, sh;
  if (srcRatio > targetRatio) {
    // Image is wider than target — crop sides
    sh = srcH;
    sw = Math.round(sh * targetRatio);
  } else {
    // Image is taller than target — crop top/bottom
    sw = srcW;
    sh = Math.round(sw / targetRatio);
  }

  const sx = Math.round((srcW - sw) / 2);
  const sy = Math.round((srcH - sh) / 2);

  return { sx, sy, sw, sh };
}

/**
 * Draws the processed image onto a canvas and returns a JPEG dataURL.
 * Compresses from quality 0.92 down to 0.50 in steps until ≤ MAX_SIZE_BYTES.
 *
 * @param {HTMLImageElement} img
 * @returns {{ dataUrl: string, wasProcessed: boolean, finalSizeKB: number }}
 */
function renderAndCompress(img) {
  const { sx, sy, sw, sh } = calcCropBox(img.naturalWidth, img.naturalHeight, TARGET_RATIO);

  // Clamp output size between MIN_DIM and MAX_DIM
  const outDim = Math.min(MAX_DIM, Math.max(MIN_DIM, TARGET_DIM));

  const canvas = document.createElement("canvas");
  canvas.width = outDim;
  canvas.height = outDim;
  const ctx = canvas.getContext("2d");

  // White background (handles transparent PNGs)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outDim, outDim);

  // Draw the cropped region scaled to output size
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outDim, outDim);

  // Compress: try quality levels until we hit the size limit
  const qualitySteps = [0.92, 0.85, 0.78, 0.70, 0.62, 0.55, 0.50];
  let dataUrl = "";
  let finalSizeBytes = 0;

  for (const q of qualitySteps) {
    dataUrl = canvas.toDataURL("image/jpeg", q);
    // Estimate byte size from base64 length
    const base64 = dataUrl.split(",")[1] || "";
    finalSizeBytes = Math.ceil((base64.length * 3) / 4);
    if (finalSizeBytes <= MAX_SIZE_BYTES) break;
  }

  return {
    dataUrl,
    finalSizeKB: Math.round(finalSizeBytes / 1024),
  };
}

/**
 * processPhoto — main export.
 *
 * Takes a File/Blob/dataURL, auto-crops and compresses it to meet
 * backend requirements. Always returns a valid JPEG dataURL.
 *
 * @param {File|Blob|string} source
 * @returns {Promise<{
 *   dataUrl: string,
 *   finalSizeKB: number,
 *   originalRatio: number,
 *   wasCropped: boolean,
 *   wasResized: boolean,
 * }>}
 */
export async function processPhoto(source) {
  const img = await loadImage(source);

  const originalRatio = img.naturalWidth / img.naturalHeight;
  const wasCropped = Math.abs(originalRatio - TARGET_RATIO) > 0.01;
  const wasResized =
    img.naturalWidth > MAX_DIM ||
    img.naturalHeight > MAX_DIM ||
    img.naturalWidth < MIN_DIM ||
    img.naturalHeight < MIN_DIM;

  const { dataUrl, finalSizeKB } = renderAndCompress(img);

  return { dataUrl, finalSizeKB, originalRatio, wasCropped, wasResized };
}
