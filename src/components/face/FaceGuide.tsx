"use client";

import type { FaceValidationResult } from "@/types/face";

type FaceGuideProps = {
  validation: FaceValidationResult;
};

export default function FaceGuide({ validation }: FaceGuideProps) {
  const stroke = validation.guideAligned ? "#16a34a" : "#dc2626";

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <ellipse
        cx="50"
        cy="52"
        rx="22"
        ry="32"
        fill="transparent"
        stroke={stroke}
        strokeWidth="1.5"
        strokeDasharray="2.2 1.2"
      />
    </svg>
  );
}
