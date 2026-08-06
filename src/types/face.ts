export type FaceFeedbackKey =
  | "faceDetected"
  | "oneFaceOnly"
  | "faceCentered"
  | "insideGuide"
  | "lookingStraight"
  | "eyesVisible"
  | "noHeadTilt"
  | "goodDistance"
  | "goodLighting"
  | "notBlurry";

export type FaceCheck = {
  key: FaceFeedbackKey;
  label: string;
  passed: boolean;
  reason?: string;
};

export type FacePose = {
  yaw: number;
  pitch: number;
  roll: number;
};

export type GuideOval = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
};

export type FaceValidationResult = {
  checks: FaceCheck[];
  isValid: boolean;
  pose: FacePose;
  faceCount: number;
  guideAligned: boolean;
};

export type FaceValidationMetrics = {
  yaw: number;
  pitch: number;
  roll: number;
  eyeOpennessLeft: number;
  eyeOpennessRight: number;
  brightness: number;
  blurScore: number;
  faceAreaRatio: number;
  centerDistanceNorm: number;
  insideGuide: boolean;
};

export type LandmarkPoint = {
  x: number;
  y: number;
  z?: number;
};

export type VideoFrameInfo = {
  width: number;
  height: number;
};
