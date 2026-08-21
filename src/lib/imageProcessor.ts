import type { SelfieSegmentation as SelfieSegmentationType } from "@mediapipe/selfie_segmentation";
import { toNormalizedLandmarks } from "@/lib/mediapipe";
import {
  computeBlurScore,
  computeFrameBrightness,
  getDefaultGuide,
  validateFace,
} from "@/lib/qualityChecks";
import type { FaceValidationResult, LandmarkPoint } from "@/types/face";

const OUTPUT_SIZE = 400;
const MAX_OUTPUT_BYTES = 10 * 1024 * 1024;
const DEFAULT_FILE_STEM = "captured-photo";
const FACE_MODEL_PATH = "/models/face_landmarker.task";
const SELFIE_SEGMENTATION_PATH = "/mediapipe/selfie_segmentation";

type ProcessedPhotoResult = {
  file: File;
  validation: FaceValidationResult;
};

type FaceLandmarkerResult = {
  faceLandmarks?: Array<Array<{ x: number; y: number; z: number }>>;
};

type FaceLandmarkerInstance = {
  detect: (image: HTMLImageElement | HTMLCanvasElement | ImageBitmap) => FaceLandmarkerResult;
  close: () => void;
};

type SelfieSegmentationCtor = new (config?: {
  locateFile?: (file: string) => string;
}) => SelfieSegmentationType;

let imageLandmarkerPromise: Promise<FaceLandmarkerInstance> | null = null;
let selfieSegmentationPromise: Promise<SelfieSegmentationType> | null = null;

function assertBrowser(): void {
  if (typeof window === "undefined") {
    throw new Error("Image processing is only available in the browser.");
  }
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to generate image blob."));
        return;
      }
      resolve(blob);
    }, type);
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getSourceSize(source: CanvasImageSource): { width: number; height: number } {
  if (source instanceof HTMLCanvasElement) {
    return { width: source.width, height: source.height };
  }
  if (source instanceof HTMLImageElement) {
    return {
      width: source.naturalWidth || source.width,
      height: source.naturalHeight || source.height,
    };
  }
  if (source instanceof ImageBitmap) {
    return { width: source.width, height: source.height };
  }

  return { width: 0, height: 0 };
}

function getBoundingBox(landmarks: LandmarkPoint[]) {
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;

  for (const point of landmarks) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  };
}

function getValidationError(validation: FaceValidationResult): string {
  const failed = validation.checks.find((check) => !check.passed);
  return failed?.reason || failed?.label || "Captured photo failed face quality checks.";
}

function fileToObjectUrl(file: Blob): string {
  return URL.createObjectURL(file);
}

async function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load captured image."));
    image.src = src;
  });
}

async function toCanvas(source: string | Blob | File | HTMLCanvasElement): Promise<HTMLCanvasElement> {
  if (source instanceof HTMLCanvasElement) {
    return source;
  }

  let imageSource = source;
  let objectUrl: string | null = null;

  if (source instanceof Blob) {
    objectUrl = fileToObjectUrl(source);
    imageSource = objectUrl;
  }

  try {
    const image = await loadImageElement(String(imageSource));
    const canvas = createCanvas(image.naturalWidth || image.width, image.naturalHeight || image.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Unable to prepare captured image.");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

async function loadImageLandmarker(): Promise<FaceLandmarkerInstance> {
  if (imageLandmarkerPromise) return imageLandmarkerPromise;

  imageLandmarkerPromise = (async () => {
    const vision = await import("@mediapipe/tasks-vision");
    const filesetResolver = await vision.FilesetResolver.forVisionTasks("/mediapipe");

    const landmarker = await vision.FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: FACE_MODEL_PATH,
        delegate: "GPU",
      },
      runningMode: "IMAGE",
      numFaces: 2,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });

    return landmarker as unknown as FaceLandmarkerInstance;
  })();

  return imageLandmarkerPromise;
}

const SELFIE_SEGMENTATION_SCRIPT_SRC = `${SELFIE_SEGMENTATION_PATH}/selfie_segmentation.js`;

let selfieSegmentationScriptPromise: Promise<void> | null = null;

/**
 * The @mediapipe/selfie_segmentation npm package ships a UMD build whose
 * exports don't reliably interop with bundler `import` statements — the
 * constructor can end up missing from every expected export shape depending
 * on the bundler and build target. MediaPipe's own web demos avoid this by
 * loading the library via a plain <script> tag, which attaches
 * `window.SelfieSegmentation` directly. We do the same here.
 */
function loadSelfieSegmentationScript(): Promise<void> {
  if (typeof (window as any).SelfieSegmentation === "function") {
    return Promise.resolve();
  }

  if (selfieSegmentationScriptPromise) return selfieSegmentationScriptPromise;

  selfieSegmentationScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(
      `script[src="${SELFIE_SEGMENTATION_SCRIPT_SRC}"]`
    );

    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load selfie segmentation script."))
      );
      return;
    }

    const script = document.createElement("script");
    script.src = SELFIE_SEGMENTATION_SCRIPT_SRC;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load selfie segmentation script."));
    document.body.appendChild(script);
  });

  return selfieSegmentationScriptPromise;
}

async function loadSelfieSegmentation(): Promise<SelfieSegmentationType> {
  if (selfieSegmentationPromise) return selfieSegmentationPromise;

  selfieSegmentationPromise = (async () => {
    await loadSelfieSegmentationScript();

    const SelfieSegmentationCtor = (window as any)
      .SelfieSegmentation as SelfieSegmentationCtor | undefined;

    if (typeof SelfieSegmentationCtor !== "function") {
      throw new Error(
        "SelfieSegmentation was not found on window after loading the script."
      );
    }

    const segmenter = new SelfieSegmentationCtor({
      locateFile: (file) => `${SELFIE_SEGMENTATION_PATH}/${file}`,
    });
    segmenter.setOptions({ modelSelection: 1, selfieMode: false });
    await segmenter.initialize();
    return segmenter;
  })();

  return selfieSegmentationPromise;
}

async function detectAndValidateFace(source: HTMLCanvasElement): Promise<{
  landmarks: LandmarkPoint[];
  validation: FaceValidationResult;
}> {
  const landmarker = await loadImageLandmarker();
  const result = landmarker.detect(source);
  const faces = result.faceLandmarks || [];
  const primaryLandmarks = faces[0] ? toNormalizedLandmarks(faces[0]) : [];
  const metricsCanvas = createCanvas(160, 120);
  const brightness = computeFrameBrightness(source, metricsCanvas);
  const blurScore = computeBlurScore(source, metricsCanvas);
  const validation = validateFace(
    primaryLandmarks,
    faces.length,
    { width: source.width, height: source.height },
    brightness,
    blurScore,
    getDefaultGuide()
  );

  if (!validation.isValid || primaryLandmarks.length === 0) {
    throw new Error(getValidationError(validation));
  }

  return { landmarks: primaryLandmarks, validation };
}

export function cropFace(source: CanvasImageSource, landmarks: LandmarkPoint[]): HTMLCanvasElement {  
  const { width, height } = getSourceSize(source);
  if (!width || !height) {
    throw new Error("Captured photo has invalid dimensions.");
  }

  const bbox = getBoundingBox(landmarks);
  const faceWidth = bbox.width * width;
  const faceHeight = bbox.height * height;
  const centerX = (bbox.minX + bbox.maxX) * 0.5 * width;
  const centerY = (bbox.minY + bbox.maxY) * 0.5 * height;

  const cropWidth = faceWidth * 2.2;
  const cropHeight = faceHeight * 2.7;
  const cropSize = Math.max(cropWidth, cropHeight);
  const adjustedCenterY = centerY - faceHeight * 0.08;
  const finalSize = Math.min(cropSize, width, height);

  let sx = centerX - finalSize / 2;
  let sy = adjustedCenterY - finalSize / 2;

  sx = clamp(sx, 0, width - finalSize);
  sy = clamp(sy, 0, height - finalSize);

  console.log({
    bbox,
    centerX,
    centerY,
    width,
    height,
    cropSize,
    sx,
    sy,
  });

  const canvas = createCanvas(finalSize, finalSize);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to crop captured photo.");
  }

  ctx.drawImage(source, sx, sy, finalSize, finalSize, 0, 0, finalSize, finalSize);
  return canvas;
}

type SegmentationMaskQuality = {
  valid: boolean;
  reasons: string[];

  width: number;
  height: number;

  foregroundPixels: number;
  foregroundRatio: number;

  componentCount: number;
  largestComponentPixels: number;
  largestComponentRatio: number;

  holeCount: number;

  minX: number;
  minY: number;
  maxX: number;
  maxY: number;

  bboxWidthRatio: number;
  bboxHeightRatio: number;

  centroidX: number;
  centroidY: number;

  meanConfidence: number;
  meanForegroundConfidence: number;

  touchesLeft: boolean;
  touchesRight: boolean;
  touchesTop: boolean;
  touchesBottom: boolean;

  noisyBoundaryRatio: number;
};

function analyzeSegmentationMask(
  maskData: ImageData,
  threshold = 128
): SegmentationMaskQuality {
  const { data, width, height } = maskData;
  const pixelCount = width * height;

  const binary = new Uint8Array(pixelCount);

  let foregroundPixels = 0;
  let confidenceSum = 0;
  let foregroundConfidenceSum = 0;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  let centroidXSum = 0;
  let centroidYSum = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;

      // MediaPipe mask is grayscale.
      const confidence = data[i];

      confidenceSum += confidence;

      if (confidence >= threshold) {
        const p = y * width + x;

        binary[p] = 1;
        foregroundPixels++;

        foregroundConfidenceSum += confidence;

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);

        centroidXSum += x;
        centroidYSum += y;
      }
    }
  }

  const foregroundRatio = foregroundPixels / pixelCount;

  // ---------------------------------------------------------
  // Connected components - 8 connected neighbors
  // ---------------------------------------------------------

  const visited = new Uint8Array(pixelCount);

  const components: number[] = [];

  const queueX = new Int32Array(pixelCount);
  const queueY = new Int32Array(pixelCount);

  const neighbors = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const start = y * width + x;

      if (!binary[start] || visited[start]) {
        continue;
      }

      let head = 0;
      let tail = 0;

      queueX[tail] = x;
      queueY[tail] = y;
      tail++;

      visited[start] = 1;

      let componentSize = 0;

      while (head < tail) {
        const cx = queueX[head];
        const cy = queueY[head];
        head++;

        componentSize++;

        for (const [dx, dy] of neighbors) {
          const nx = cx + dx;
          const ny = cy + dy;

          if (
            nx < 0 ||
            nx >= width ||
            ny < 0 ||
            ny >= height
          ) {
            continue;
          }

          const index = ny * width + nx;

          if (!binary[index] || visited[index]) {
            continue;
          }

          visited[index] = 1;

          queueX[tail] = nx;
          queueY[tail] = ny;
          tail++;
        }
      }

      components.push(componentSize);
    }
  }

  components.sort((a, b) => b - a);

  const componentCount = components.length;
  const largestComponentPixels = components[0] || 0;

  const largestComponentRatio =
    foregroundPixels > 0
      ? largestComponentPixels / foregroundPixels
      : 0;

  // ---------------------------------------------------------
  // Border contact
  // ---------------------------------------------------------

  let touchesLeft = false;
  let touchesRight = false;
  let touchesTop = false;
  let touchesBottom = false;

  if (foregroundPixels > 0) {
    for (let y = 0; y < height; y++) {
      if (binary[y * width]) {
        touchesLeft = true;
      }

      if (binary[y * width + width - 1]) {
        touchesRight = true;
      }
    }

    for (let x = 0; x < width; x++) {
      if (binary[x]) {
        touchesTop = true;
      }

      if (binary[(height - 1) * width + x]) {
        touchesBottom = true;
      }
    }
  }

  // ---------------------------------------------------------
  // Holes inside the mask
  //
  // Flood-fill background from the image border.
  // Any remaining background region is a hole.
  // ---------------------------------------------------------

  const backgroundVisited = new Uint8Array(pixelCount);

  let holeCount = 0;

  const bgQueueX = new Int32Array(pixelCount);
  const bgQueueY = new Int32Array(pixelCount);

  const floodBackground = (startX: number, startY: number) => {
    const start = startY * width + startX;

    if (binary[start] || backgroundVisited[start]) {
      return;
    }

    let head = 0;
    let tail = 0;

    bgQueueX[tail] = startX;
    bgQueueY[tail] = startY;
    tail++;

    backgroundVisited[start] = 1;

    while (head < tail) {
      const cx = bgQueueX[head];
      const cy = bgQueueY[head];
      head++;

      for (const [dx, dy] of neighbors) {
        const nx = cx + dx;
        const ny = cy + dy;

        if (
          nx < 0 ||
          nx >= width ||
          ny < 0 ||
          ny >= height
        ) {
          continue;
        }

        const index = ny * width + nx;

        if (
          binary[index] ||
          backgroundVisited[index]
        ) {
          continue;
        }

        backgroundVisited[index] = 1;

        bgQueueX[tail] = nx;
        bgQueueY[tail] = ny;
        tail++;
      }
    }
  };

  // Flood-fill all background connected to border.
  for (let x = 0; x < width; x++) {
    floodBackground(x, 0);
    floodBackground(x, height - 1);
  }

  for (let y = 0; y < height; y++) {
    floodBackground(0, y);
    floodBackground(width - 1, y);
  }

  // Remaining background pixels = holes.
  for (let i = 0; i < pixelCount; i++) {
    if (!binary[i] && !backgroundVisited[i]) {
      holeCount++;

      // Flood-fill this hole so it is counted only once.
      const startX = i % width;
      const startY = Math.floor(i / width);

      floodBackground(startX, startY);
    }
  }

  // ---------------------------------------------------------
  // Boundary noise
  //
  // Count foreground pixels that have many background neighbors.
  // A very high value usually indicates a noisy/stair-stepped edge.
  // ---------------------------------------------------------

  let boundaryPixels = 0;
  let noisyBoundaryPixels = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = y * width + x;

      if (!binary[index]) {
        continue;
      }

      let backgroundNeighbors = 0;

      for (const [dx, dy] of neighbors) {
        const nx = x + dx;
        const ny = y + dy;

        if (!binary[ny * width + nx]) {
          backgroundNeighbors++;
        }
      }

      if (backgroundNeighbors > 0) {
        boundaryPixels++;

        if (backgroundNeighbors >= 5) {
          noisyBoundaryPixels++;
        }
      }
    }
  }

  const noisyBoundaryRatio =
    boundaryPixels > 0
      ? noisyBoundaryPixels / boundaryPixels
      : 0;

  // ---------------------------------------------------------
  // Bounding box
  // ---------------------------------------------------------

  const bboxWidth =
    maxX >= minX ? maxX - minX + 1 : 0;

  const bboxHeight =
    maxY >= minY ? maxY - minY + 1 : 0;

  const bboxWidthRatio = bboxWidth / width;
  const bboxHeightRatio = bboxHeight / height;

  const centroidX =
    foregroundPixels > 0
      ? centroidXSum / foregroundPixels / width
      : 0;

  const centroidY =
    foregroundPixels > 0
      ? centroidYSum / foregroundPixels / height
      : 0;

  const meanConfidence =
    pixelCount > 0
      ? confidenceSum / pixelCount
      : 0;

  const meanForegroundConfidence =
    foregroundPixels > 0
      ? foregroundConfidenceSum / foregroundPixels
      : 0;

  // ---------------------------------------------------------
  // Quality rules
  // ---------------------------------------------------------

  const reasons: string[] = [];

  // No foreground at all.
  if (foregroundPixels === 0) {
    reasons.push("No foreground detected.");
  }

  // Too little foreground.
  if (
    foregroundPixels > 0 &&
    foregroundRatio < 0.03
  ) {
    reasons.push(
      `Foreground area too small (${(foregroundRatio * 100).toFixed(1)}%).`
    );
  }

  // Too much foreground.
  if (foregroundRatio > 0.90) {
    reasons.push(
      `Foreground area suspiciously large (${(foregroundRatio * 100).toFixed(1)}%).`
    );
  }

  // Multiple disconnected blocks.
  if (componentCount > 8) {
    reasons.push(
      `Too many disconnected mask components (${componentCount}).`
    );
  }

  // Main person should dominate.
  if (
    foregroundPixels > 0 &&
    largestComponentRatio < 0.80
  ) {
    reasons.push(
      `Mask is fragmented: largest component is only ${(largestComponentRatio * 100).toFixed(1)}% of foreground.`
    );
  }

  // Very noisy edge.
  if (noisyBoundaryRatio > 0.35) {
    reasons.push(
      `Mask boundary is noisy (${(noisyBoundaryRatio * 100).toFixed(1)}%).`
    );
  }

  // Too many holes.
  if (holeCount > 15) {
    reasons.push(
      `Too many enclosed holes in mask (${holeCount}).`
    );
  }

  // Bounding box sanity.
  if (
    foregroundPixels > 0 &&
    bboxHeightRatio < 0.20
  ) {
    reasons.push(
      "Foreground bounding box is unusually short."
    );
  }

  if (
    foregroundPixels > 0 &&
    bboxWidthRatio < 0.05
  ) {
    reasons.push(
      "Foreground bounding box is unusually narrow."
    );
  }

  // Extremely low foreground confidence.
  if (
    foregroundPixels > 0 &&
    meanForegroundConfidence < 150
  ) {
    reasons.push(
      `Foreground confidence is weak (${meanForegroundConfidence.toFixed(1)}).`
    );
  }

  const valid =
    foregroundPixels > 0 &&
    foregroundRatio >= 0.03 &&
    foregroundRatio <= 0.90 &&
    componentCount <= 8 &&
    largestComponentRatio >= 0.80 &&
    noisyBoundaryRatio <= 0.35 &&
    holeCount <= 15 &&
    bboxHeightRatio >= 0.20 &&
    bboxWidthRatio >= 0.05 &&
    meanForegroundConfidence >= 150;

  return {
    valid,
    reasons,

    width,
    height,

    foregroundPixels,
    foregroundRatio,

    componentCount,
    largestComponentPixels,
    largestComponentRatio,

    holeCount,

    minX,
    minY,
    maxX,
    maxY,

    bboxWidthRatio,
    bboxHeightRatio,

    centroidX,
    centroidY,

    meanConfidence,
    meanForegroundConfidence,

    touchesLeft,
    touchesRight,
    touchesTop,
    touchesBottom,

    noisyBoundaryRatio,
  };
}

/** Separable box blur on the grayscale mask (smooths upscale staircase). */
function boxBlurGray(imageData: ImageData, radius: number): ImageData {
  const { data, width, height } = imageData;
  const tmp = new Float32Array(width * height);
  const out = new ImageData(width, height);

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx;
        if (nx < 0 || nx >= width) continue;
        sum += data[(y * width + nx) * 4];
        count++;
      }
      tmp[y * width + x] = sum / count;
    }
  }

  // Vertical pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        sum += tmp[ny * width + x];
        count++;
      }
      const val = Math.round(sum / count);
      const idx = (y * width + x) * 4;
      out.data[idx] = val;
      out.data[idx + 1] = val;
      out.data[idx + 2] = val;
      out.data[idx + 3] = 255;
    }
  }

  return out;
}

export async function removeBackground(
  source: HTMLCanvasElement
): Promise<HTMLCanvasElement> {
  const { width, height } = getSourceSize(source);

  const segmenter = await loadSelfieSegmentation();

  const results = await new Promise<{
    image: HTMLCanvasElement | HTMLImageElement | ImageBitmap;
    segmentationMask: HTMLCanvasElement | HTMLImageElement | ImageBitmap;
  }>((resolve, reject) => {
    segmenter.onResults((value) => resolve(value));
    segmenter.send({ image: source }).catch(reject);
  });

  // ── Step 1: upscale the raw low-res mask to full canvas size ──────────
  // imageSmoothingQuality "high" gives bilinear interpolation which is
  // better than nearest-neighbor, but still produces a gradient staircase
  // at the boundary because the mask was internally ~256×256.
  const maskCanvas = createCanvas(width, height);
  const maskCtx = maskCanvas.getContext("2d")!;
  maskCtx.imageSmoothingEnabled = true;
  maskCtx.imageSmoothingQuality = "high";
  maskCtx.drawImage(results.segmentationMask, 0, 0, width, height);

  let maskData = maskCtx.getImageData(0, 0, width, height);

  // ── Step 2: Gaussian blur (3-pass box blur approximation) ─────────────
  // Each pass with radius 3 (7×7 kernel). Three consecutive box blurs
  // approximate a Gaussian — this removes the upscale staircase artifact
  // by spreading edge confidence values smoothly across ~7 pixels.
  // A single pass or radius 1 is not enough to cover the block size that
  // comes from upscaling a 256-wide mask to 400–600px.
  maskData = boxBlurGray(maskData, 3);
  maskData = boxBlurGray(maskData, 3);
  maskData = boxBlurGray(maskData, 3);

  // ── Step 3: convert to alpha with a wide soft feather band ────────────
  // LOW=80 keeps hair/shoulder edge pixels (they have moderate confidence
  // after the blur spreads values outward). HIGH=200 means only clearly
  // foreground pixels become fully opaque. The smoothstep in between gives
  // clean anti-aliasing without visible halo.
  const alphaMask = thresholdToSharpAlpha(maskData, 80, 200);

  // ── Step 4: composite original image through the alpha mask ──────────
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, width, height);
  ctx.putImageData(alphaMask, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.drawImage(source, 0, 0, width, height);
  ctx.globalCompositeOperation = "source-over";

  return canvas;
}

function thresholdToSharpAlpha(
  maskData: ImageData,
  low: number,
  high: number
): ImageData {
  const { data, width, height } = maskData;
  const out = new ImageData(width, height);

  for (let i = 0; i < data.length; i += 4) {
    const confidence = data[i]; // mask is grayscale: R=G=B=confidence

    let alpha: number;
    if (confidence <= low) {
      alpha = 0;   // definite background
    } else if (confidence >= high) {
      alpha = 255; // definite foreground
    } else {
      // Smoothstep over the feather band — gives anti-aliased edge
      const t = (confidence - low) / (high - low);
      alpha = Math.round(t * t * (3 - 2 * t) * 255);
    }

    out.data[i] = 255;
    out.data[i + 1] = 255;
    out.data[i + 2] = 255;
    out.data[i + 3] = alpha;
  }

  return out;
}


export function applyTransparentBackground(
  source: CanvasImageSource
): HTMLCanvasElement {
  const { width, height } = getSourceSize(source);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Unable to create transparent background.");
  }

  // Canvas is transparent by default
  ctx.clearRect(0, 0, width, height);

  ctx.drawImage(source, 0, 0, width, height);

  return canvas;
}

export function resizeTo400x400(source: CanvasImageSource): HTMLCanvasElement {
  const { width, height } = getSourceSize(source);
  const canvas = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to resize processed photo.");
  }

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  const scale = Math.min(OUTPUT_SIZE / width, OUTPUT_SIZE / height);
  const drawWidth = width * scale;
  const drawHeight = height * scale;
  const dx = (OUTPUT_SIZE - drawWidth) / 2;
  const dy = (OUTPUT_SIZE - drawHeight) / 2;

  ctx.drawImage(source, dx, dy, drawWidth, drawHeight);
  return canvas;
}

export function generatePhotoFilename(passId: string): string {
  const normalized = String(passId || "")
    .trim()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "")
    .toUpperCase();

  return `${normalized || DEFAULT_FILE_STEM}.png`;
}

export async function generateFinalPhoto(
  source: string | Blob | File | HTMLCanvasElement,
  options?: { passId?: string | null }
): Promise<ProcessedPhotoResult> {
  assertBrowser();

  const sourceCanvas = await toCanvas(source);
  const { landmarks, validation } = await detectAndValidateFace(sourceCanvas);
  const cropped = cropFace(sourceCanvas, landmarks);
  const noBackground = await removeBackground(cropped);
  const onWhite = applyTransparentBackground(noBackground);
  const finalCanvas = resizeTo400x400(onWhite);
  const finalBlob = await canvasToBlob(finalCanvas, "image/png");

  if (finalBlob.size > MAX_OUTPUT_BYTES) {
    throw new Error("Processed photo exceeds the 10 MB limit.");
  }

  const file = new File(
    [finalBlob],
    generatePhotoFilename(options?.passId || DEFAULT_FILE_STEM),
    { type: "image/png" }
  );

  return {
    file,
    validation,
  };
}