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

export async function removeBackground(source: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  const { width, height } = getSourceSize(source);
  const segmenter = await loadSelfieSegmentation();

  const results = await new Promise<{
    image: HTMLCanvasElement | HTMLImageElement | ImageBitmap;
    segmentationMask: HTMLCanvasElement | HTMLImageElement | ImageBitmap;
  }>((resolve, reject) => {
    segmenter.onResults((value) => resolve(value));
    segmenter.send({ image: source }).catch(reject);
  });

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to remove image background.");

  // Create a blurred mask
  const maskCanvas = createCanvas(width, height);
  const maskCtx = maskCanvas.getContext("2d")!;

  // Blur the segmentation mask
  maskCtx.filter = "blur(1.5px)";
  maskCtx.drawImage(results.segmentationMask, 0, 0);
  
  maskCtx.globalAlpha = 0.35;
  maskCtx.drawImage(maskCanvas, 0, 0); // Slightly dilate/feather
  maskCtx.globalAlpha = 1;
  maskCtx.filter = "none";

  // Use blurred mask as alpha
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(maskCanvas, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.drawImage(source, 0, 0);
  ctx.globalCompositeOperation = "source-over";

  return canvas;
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