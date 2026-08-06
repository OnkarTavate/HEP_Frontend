"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Webcam from "react-webcam";
import { Camera, CameraOff, Loader2, RefreshCw, RotateCcw, ShieldCheck, Video } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import FaceStatus from "@/components/face/FaceStatus";
import WebcamView from "@/components/face/WebcamView";
import CapturePreview from "@/components/face/CapturePreview";
import { useFaceCapture } from "@/hooks/useFaceCapture";
import { useFaceValidation } from "@/hooks/useFaceValidation";
import { generateFinalPhoto } from "@/lib/imageProcessor";

type FaceCaptureDialogProps = {
  open: boolean;
  onClose: () => void;
  onUsePhoto: (file: File) => void;
  passId?: string | null;
};

export default function FaceCaptureDialog({ open, onClose, onUsePhoto, passId }: FaceCaptureDialogProps) {
  const webcamRef = useRef<Webcam | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processedFile, setProcessedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

  const {
    devices,
    selectedDeviceId,
    permissionState,
    error,
    loadingDevices,
    setSelectedDeviceId,
    retry,
  } = useFaceCapture(open);


  const { validation, isModelLoading, modelError } = useFaceValidation({
    open: open && !previewUrl,
    videoElement,
  });

    useEffect(() => {
        if (!open) {
        setPreviewUrl(null);
        setProcessedFile(null);
        setIsProcessing(false);
        setProcessingError(null);
        setVideoElement(null);
        }
    }, [open]);

    useEffect(() => {
        return () => {
        revokePreviewUrl(previewUrl);
        };
    }, [previewUrl]);

    useEffect(() => {
        if (!open || previewUrl) return;

        const interval = setInterval(() => {
        const el = webcamRef.current?.video ?? null;
        if (
            el &&
            el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
            el.videoWidth > 0 &&
            el.videoHeight > 0
        ) {
            setVideoElement(el);
            clearInterval(interval);
        }
        }, 100);

        return () => clearInterval(interval);
    }, [open, previewUrl]);

  const captureEnabled = useMemo(() => validation.isValid && !isModelLoading && !modelError, [validation.isValid, isModelLoading, modelError]);

  const revokePreviewUrl = (url: string | null) => {
    if (url?.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  };

  const resetProcessedPreview = () => {
    revokePreviewUrl(previewUrl);
    setPreviewUrl(null);
    setProcessedFile(null);
    setProcessingError(null);
  };

  const handleCapture = async () => {
    const dataUrl = webcamRef.current?.getScreenshot();
    if (!dataUrl) return;

    revokePreviewUrl(previewUrl);
    setPreviewUrl(dataUrl);
    setProcessedFile(null);
    setProcessingError(null);
    setIsProcessing(true);

    try {
      const result = await generateFinalPhoto(dataUrl, { passId });
      const nextPreviewUrl = URL.createObjectURL(result.file);

      setProcessedFile(result.file);
      setPreviewUrl(nextPreviewUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to process captured photo.";
      setProcessingError(message);
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUsePhoto = () => {
    if (!processedFile) return;
    onUsePhoto(processedFile);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-lg font-bold text-[#0a1e4d]">Face Capture</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            {previewUrl ? (
              <CapturePreview imageUrl={previewUrl} />
            ) : isProcessing ? (
              <div className="flex min-h-[340px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
                <div className="space-y-3">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#0a1e4d]" />
                  <div>
                    <p className="font-bold text-slate-700">Preparing enrollment photo...</p>
                    <p className="mt-1 text-sm text-slate-500">Cropping the face, removing the background, and exporting a 400 × 400 PNG.</p>
                  </div>
                </div>
              </div>
            ) : permissionState === "denied" || error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                <div className="mb-2 flex items-center gap-2 font-bold">
                  <CameraOff className="h-4 w-4" /> Camera unavailable
                </div>
                <p>{error || "Camera permission denied."}</p>
                <Button variant="outline" className="mt-4" onClick={() => retry()}>
                  <RefreshCw className="mr-1 h-3.5 w-3.5" /> Retry
                </Button>
              </div>
            ) : (
              <WebcamView
                webcamRef={webcamRef}
                deviceId={selectedDeviceId}
                validation={validation}
              />
            )}

            {processingError ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                {processingError}
              </div>
            ) : null}

            {!previewUrl ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={handleCapture}
                  disabled={!captureEnabled || isProcessing}
                  className="bg-[#0a1e4d] text-white hover:bg-[#0a1e4d]/90"
                >
                  <Camera className="mr-1 h-4 w-4" /> Capture
                </Button>
                <Button type="button" variant="outline" className="" onClick={onClose}>
                  Cancel
                </Button>
                {(isModelLoading || loadingDevices) && (
                  <span className="text-xs font-semibold text-amber-600">Preparing camera checks...</span>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" className="" onClick={resetProcessedPreview}>
                  <RotateCcw className="mr-1 h-4 w-4" /> Retake
                </Button>
                <Button
                  type="button"
                  onClick={handleUsePhoto}
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <ShieldCheck className="mr-1 h-4 w-4" /> Use Photo
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
                Select camera
              </label>
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-slate-500" />
                <select
                  value={selectedDeviceId || ""}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm"
                >
                  {devices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <FaceStatus validation={validation} />

            <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
              <p className="font-bold text-slate-700">Capture guidance</p>
              <p className="mt-1">Keep only one face inside the oval, eyes open, head straight, and ensure lighting is clear.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
