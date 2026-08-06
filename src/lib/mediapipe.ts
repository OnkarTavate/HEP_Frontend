import type { LandmarkPoint } from "@/types/face";

type FaceLandmarkerResult = {
  faceLandmarks?: Array<Array<{ x: number; y: number; z: number }>>;
};

type FaceLandmarkerInstance = {
  detectForVideo: (video: HTMLVideoElement, timestampMs: number) => FaceLandmarkerResult;
  close: () => void;
};

let cachedLandmarker: FaceLandmarkerInstance | null = null;
let loadingPromise: Promise<FaceLandmarkerInstance> | null = null;

export async function loadFaceLandmarker(): Promise<FaceLandmarkerInstance> {
  if (cachedLandmarker) return cachedLandmarker;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const vision = await import("@mediapipe/tasks-vision");

    const filesetResolver = await vision.FilesetResolver.forVisionTasks(
      "/mediapipe"
    );

    const landmarker = await vision.FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: "/models/face_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numFaces: 2,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });

    cachedLandmarker = landmarker as FaceLandmarkerInstance;
    return cachedLandmarker;
  })();

  try {
    return await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}

export function cleanupFaceLandmarker(): void {
  if (cachedLandmarker) {
    cachedLandmarker.close();
    cachedLandmarker = null;
  }
}

export function toNormalizedLandmarks(points: Array<{ x: number; y: number; z: number }>): LandmarkPoint[] {
  return points.map((p) => ({ x: p.x, y: p.y, z: p.z }));
}
