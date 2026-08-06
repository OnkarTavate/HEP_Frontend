import type {
  FaceCheck,
  FaceValidationMetrics,
  FaceValidationResult,
  GuideOval,
  LandmarkPoint,
  VideoFrameInfo,
} from "@/types/face";

const IDX = {
  noseTip: 1,
  leftEyeOuter: 33,
  rightEyeOuter: 263,
  leftEyeTop: 159,
  leftEyeBottom: 145,
  rightEyeTop: 386,
  rightEyeBottom: 374,
  chin: 152,
  forehead: 10,
};

const LIMITS = {
  maxYawDeg: 15,
  maxPitchDeg: 15,
  maxRollDeg: 10,
  minEyeOpen: 0.010,
  minBrightness: 55,
  maxBrightness: 210,
  minBlurVariance: 120,
  minFaceAreaRatio: 0.08,
  maxFaceAreaRatio: 0.45,
  maxCenterDistanceNorm: 0.2,
};

function point(landmarks: LandmarkPoint[], idx: number): LandmarkPoint {
  return landmarks[idx] ?? { x: 0, y: 0, z: 0 };
}

function distance(a: LandmarkPoint, b: LandmarkPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function ellipseContains(p: LandmarkPoint, guide: GuideOval): boolean {
  const nx = (p.x - guide.cx) / guide.rx;
  const ny = (p.y - guide.cy) / guide.ry;
  return nx * nx + ny * ny <= 1;
}

function estimatePose(landmarks: LandmarkPoint[]): { yaw: number; pitch: number; roll: number } {
  const l = point(landmarks, IDX.leftEyeOuter);
  const r = point(landmarks, IDX.rightEyeOuter);
  const n = point(landmarks, IDX.noseTip);
  const c = point(landmarks, IDX.chin);

  const eyeDx = r.x - l.x;
  const eyeDy = r.y - l.y;
  const eyeWidth = Math.max(Math.abs(eyeDx), 1e-5);

  const yawNorm = ((n.x - l.x) / (r.x - l.x + 1e-6) - 0.5) * 2;
  const yaw = yawNorm * 30;

  const eyeMidY = (l.y + r.y) / 2;
  const faceHeight = Math.max(c.y - eyeMidY, 1e-5);
  const noseToEyes = n.y - eyeMidY;
  const pitchNorm = (noseToEyes / faceHeight - 0.45) * 2;
  const pitch = pitchNorm * 20;

  const roll = (Math.atan2(eyeDy, eyeDx) * 180) / Math.PI;

  return { yaw, pitch, roll };
}

function getBoundingBox(landmarks: LandmarkPoint[]) {
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;

  for (const p of landmarks) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

export function computeFrameBrightness(source: CanvasImageSource, canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 0;

  const w = 160;
  const h = 120;
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(source, 0, 0, w, h);

  const data = ctx.getImageData(0, 0, w, h).data;
  let sum = 0;

  for (let i = 0; i < data.length; i += 4) {
    const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    sum += luma;
  }

  return sum / (w * h);
}

export function computeBlurScore(source: CanvasImageSource, canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 0;

  const w = 160;
  const h = 120;
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(source, 0, 0, w, h);

  const src = ctx.getImageData(0, 0, w, h).data;
  const gray = new Float32Array(w * h);

  for (let i = 0, j = 0; i < src.length; i += 4, j += 1) {
    gray[j] = 0.2126 * src[i] + 0.7152 * src[i + 1] + 0.0722 * src[i + 2];
  }

  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const i = y * w + x;
      const lap =
        gray[i - w] + gray[i - 1] - 4 * gray[i] + gray[i + 1] + gray[i + w];
      sum += lap;
      sumSq += lap * lap;
      count += 1;
    }
  }

  if (count === 0) return 0;
  const mean = sum / count;
  return sumSq / count - mean * mean;
}

export function getDefaultGuide(): GuideOval {
  return {
    cx: 0.5,
    cy: 0.52,
    rx: 0.22,
    ry: 0.32,
  };
}

export function validateFace(
  faceLandmarks: LandmarkPoint[],
  faceCount: number,
  frame: VideoFrameInfo,
  brightness: number,
  blurScore: number,
  guide: GuideOval
): FaceValidationResult {
  const checks: FaceCheck[] = [];

  const faceDetected = faceCount > 0;
  checks.push({ key: "faceDetected", label: "Face detected", passed: faceDetected, reason: faceDetected ? undefined : "Position your face in frame" });

  const oneFaceOnly = faceCount === 1;
  checks.push({ key: "oneFaceOnly", label: "One face only", passed: oneFaceOnly, reason: oneFaceOnly ? undefined : "Only one person allowed" });

  if (!faceDetected || !oneFaceOnly || faceLandmarks.length === 0) {
    return {
      checks: checks.concat([
        { key: "faceCentered", label: "Face centered", passed: false, reason: "Center your face" },
        { key: "insideGuide", label: "Inside guide", passed: false, reason: "Align inside oval" },
        { key: "lookingStraight", label: "Looking straight", passed: false, reason: "Turn your face forward" },
        { key: "eyesVisible", label: "Eyes visible", passed: false, reason: "Keep both eyes open" },
        { key: "noHeadTilt", label: "No head tilt", passed: false, reason: "Keep your head straight" },
        { key: "goodDistance", label: "Proper distance", passed: false, reason: "Move closer or farther" },
        { key: "goodLighting", label: "Good lighting", passed: false, reason: "Improve lighting" },
        { key: "notBlurry", label: "Not blurry", passed: false, reason: "Hold still" },
      ]),
      isValid: false,
      pose: { yaw: 0, pitch: 0, roll: 0 },
      faceCount,
      guideAligned: false,
    };
  }

  const bbox = getBoundingBox(faceLandmarks);
  const center = {
    x: bbox.minX + bbox.width / 2,
    y: bbox.minY + bbox.height / 2,
  };

  const centerDistanceNorm = Math.hypot(center.x - guide.cx, center.y - guide.cy);
  const faceCentered = centerDistanceNorm <= LIMITS.maxCenterDistanceNorm;

  const nose = point(faceLandmarks, IDX.noseTip);
  const leftEye = point(faceLandmarks, IDX.leftEyeOuter);
  const rightEye = point(faceLandmarks, IDX.rightEyeOuter);
  const chin = point(faceLandmarks, IDX.chin);
  const forehead = point(faceLandmarks, IDX.forehead);

  const insideGuide =
    ellipseContains(nose, guide) &&
    ellipseContains(leftEye, guide) &&
    ellipseContains(rightEye, guide) &&
    ellipseContains(chin, guide) &&
    ellipseContains(forehead, guide);

  const pose = estimatePose(faceLandmarks);
  const lookingStraight =
    Math.abs(pose.yaw) <= LIMITS.maxYawDeg && Math.abs(pose.pitch) <= LIMITS.maxPitchDeg;
  const noHeadTilt = Math.abs(pose.roll) <= LIMITS.maxRollDeg;

  const leftEyeOpenness = distance(point(faceLandmarks, IDX.leftEyeTop), point(faceLandmarks, IDX.leftEyeBottom));
  const rightEyeOpenness = distance(point(faceLandmarks, IDX.rightEyeTop), point(faceLandmarks, IDX.rightEyeBottom));
  const eyesVisible =
    leftEyeOpenness >= LIMITS.minEyeOpen && rightEyeOpenness >= LIMITS.minEyeOpen;

  const faceAreaRatio = Math.max(0, bbox.width) * Math.max(0, bbox.height);
  const goodDistance =
    faceAreaRatio >= LIMITS.minFaceAreaRatio && faceAreaRatio <= LIMITS.maxFaceAreaRatio;

  const goodLighting =
    brightness >= LIMITS.minBrightness && brightness <= LIMITS.maxBrightness;
  const notBlurry = blurScore >= LIMITS.minBlurVariance;

  const metrics: FaceValidationMetrics = {
    yaw: pose.yaw,
    pitch: pose.pitch,
    roll: pose.roll,
    eyeOpennessLeft: leftEyeOpenness,
    eyeOpennessRight: rightEyeOpenness,
    brightness,
    blurScore,
    faceAreaRatio,
    centerDistanceNorm,
    insideGuide,
  };

  checks.push({ key: "faceCentered", label: "Face centered", passed: faceCentered, reason: faceCentered ? undefined : "Center your face" });
  checks.push({ key: "insideGuide", label: "Inside guide", passed: insideGuide, reason: insideGuide ? undefined : "Align face inside oval" });
  checks.push({ key: "lookingStraight", label: "Looking straight", passed: lookingStraight, reason: lookingStraight ? undefined : "Turn your face forward" });
  checks.push({ key: "eyesVisible", label: "Eyes visible", passed: eyesVisible, reason: eyesVisible ? undefined : "Keep both eyes open" });
  checks.push({ key: "noHeadTilt", label: "No head tilt", passed: noHeadTilt, reason: noHeadTilt ? undefined : "Keep your head straight" });

  let distanceReason = "";
  if (!goodDistance) {
    distanceReason = faceAreaRatio < LIMITS.minFaceAreaRatio ? "Move closer" : "Move farther";
  }
  checks.push({ key: "goodDistance", label: "Proper distance", passed: goodDistance, reason: goodDistance ? undefined : distanceReason });

  checks.push({ key: "goodLighting", label: "Good lighting", passed: goodLighting, reason: goodLighting ? undefined : "Improve lighting" });
  checks.push({ key: "notBlurry", label: "Not blurry", passed: notBlurry, reason: notBlurry ? undefined : "Hold still" });

  const isValid = checks.every((c) => c.passed);

  void frame;
  void metrics;

  return {
    checks,
    isValid,
    pose,
    faceCount,
    guideAligned: insideGuide && faceCentered,
  };
}
