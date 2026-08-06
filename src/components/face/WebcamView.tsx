"use client";

import React from "react";
import Webcam from "react-webcam";
import FaceGuide from "@/components/face/FaceGuide";
import type { FaceValidationResult } from "@/types/face";

type WebcamViewProps = {
  webcamRef: React.RefObject<Webcam | null>;
  deviceId: string | null;
  validation: FaceValidationResult;
};

export default function WebcamView({ webcamRef, deviceId, validation }: WebcamViewProps) {
  return (
    <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-slate-300 bg-slate-900 shadow-inner">
      <Webcam
        ref={webcamRef}
        audio={false}
        mirrored
        screenshotFormat="image/jpeg"
        screenshotQuality={0.95}
        className="h-auto w-full"
        videoConstraints={{
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        }}
      />
      <FaceGuide validation={validation} />
    </div>
  );
}
 