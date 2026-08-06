"use client";

type CapturePreviewProps = {
  imageUrl: string;
};

export default function CapturePreview({ imageUrl }: CapturePreviewProps) {
  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-slate-300 bg-white">
      <img src={imageUrl} alt="Captured face" className="h-auto w-full object-cover" />
    </div>
  );
}
