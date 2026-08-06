"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cleanupFaceLandmarker, loadFaceLandmarker, toNormalizedLandmarks } from "@/lib/mediapipe";
import {
  computeBlurScore,
  computeFrameBrightness,
  getDefaultGuide,
  validateFace,
} from "@/lib/qualityChecks";
import type { FaceValidationResult } from "@/types/face";

type UseFaceValidationArgs = {
  open: boolean;
  videoElement: HTMLVideoElement | null;
};

const defaultResult: FaceValidationResult = {
  checks: [
    { key: "faceDetected", label: "Face detected", passed: false },
    { key: "oneFaceOnly", label: "One face only", passed: false },
    { key: "faceCentered", label: "Face centered", passed: false },
    { key: "insideGuide", label: "Inside guide", passed: false },
    { key: "lookingStraight", label: "Looking straight", passed: false },
    { key: "eyesVisible", label: "Eyes visible", passed: false },
    { key: "noHeadTilt", label: "No head tilt", passed: false },
    { key: "goodDistance", label: "Proper distance", passed: false },
    { key: "goodLighting", label: "Good lighting", passed: false },
    { key: "notBlurry", label: "Not blurry", passed: false },
  ],
  isValid: false,
  pose: { yaw: 0, pitch: 0, roll: 0 },
  faceCount: 0,
  guideAligned: false,
};

export function useFaceValidation({ open, videoElement }: UseFaceValidationArgs) {
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [validation, setValidation] = useState<FaceValidationResult>(defaultResult);

  const rafRef = useRef<number | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!open || !videoElement) return;

    let active = true;
    setIsModelLoading(true);
    setModelError(null);

    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement("canvas");
    }

    const start = async () => {
      try {
        const landmarker = await loadFaceLandmarker();
        if (!active) return;

        setIsModelLoading(false);

        const frameLoop = () => {
          if (
              !active ||
              !videoElement ||
              videoElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
              videoElement.videoWidth <= 0 ||
              videoElement.videoHeight <= 0
          ) {
              rafRef.current = requestAnimationFrame(frameLoop);
              return;
          }

          try {
            const now = performance.now();

            if (
                videoElement.videoWidth === 0 ||
                videoElement.videoHeight === 0
            ) {
                rafRef.current = requestAnimationFrame(frameLoop);
                return;
            }
            console.log(
              videoElement.readyState,
              videoElement.videoWidth,
              videoElement.videoHeight
            );
            const result = landmarker.detectForVideo(videoElement, now);
            const faces = result.faceLandmarks || [];
            const faceCount = faces.length;

            if (!faces[0]) {
              setValidation(
                validateFace(
                  [],
                  faceCount,
                  { width: videoElement.videoWidth, height: videoElement.videoHeight },
                  0,
                  0,
                  getDefaultGuide()
                )
              );
              rafRef.current = requestAnimationFrame(frameLoop);
              return;
            }

            const brightness = computeFrameBrightness(videoElement, offscreenCanvasRef.current as HTMLCanvasElement);
            const blur = computeBlurScore(videoElement, offscreenCanvasRef.current as HTMLCanvasElement);

            const validationResult = validateFace(
              toNormalizedLandmarks(faces[0]),
              faceCount,
              { width: videoElement.videoWidth, height: videoElement.videoHeight },
              brightness,
              blur,
              getDefaultGuide()
            );

            setValidation(validationResult);
          } catch (err) {
            console.error("Face validation frame error", err);
          }

          rafRef.current = requestAnimationFrame(frameLoop);
        };

        rafRef.current = requestAnimationFrame(frameLoop);
      } catch (err) {
        console.error("Failed to load Face Landmarker", err);
        if (!active) return;
        setIsModelLoading(false);
        setModelError("Unable to load face quality checks.");
      }
    };

    start().catch((err) => {
      console.error(err);
    });

    return () => {
      active = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setValidation(defaultResult);
    };
  }, [open, videoElement]);

  useEffect(() => {
    return () => {
      cleanupFaceLandmarker();
    };
  }, []);

  return useMemo(
    () => ({
      validation,
      isModelLoading,
      modelError,
    }),
    [validation, isModelLoading, modelError]
  );
}
