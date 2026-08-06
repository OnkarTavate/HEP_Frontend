"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type CameraDevice = {
  deviceId: string;
  label: string;
};

export type UseFaceCaptureResult = {
  devices: CameraDevice[];
  selectedDeviceId: string | null;
  permissionState: "idle" | "granted" | "denied";
  error: string | null;
  loadingDevices: boolean;
  setSelectedDeviceId: (id: string) => void;
  requestPermission: () => Promise<void>;
  retry: () => Promise<void>;
};

export function useFaceCapture(open: boolean): UseFaceCaptureResult {
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<"idle" | "granted" | "denied">("idle");
  const [error, setError] = useState<string | null>(null);
  const [loadingDevices, setLoadingDevices] = useState(false);

  const loadDevices = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      setError("Camera APIs are not available in this browser.");
      return;
    }

    setLoadingDevices(true);
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const cams = all
        .filter((d) => d.kind === "videoinput")
        .map((d, idx) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${idx + 1}`,
        }));

      setDevices(cams);
      if (!cams.length) {
        setError("No webcam found on this device.");
      } else {
        setError(null);
        setSelectedDeviceId((prev) => prev || cams[0].deviceId);
      }
    } catch (err) {
      console.error("Failed to enumerate cameras", err);
      setError("Failed to access camera devices.");
    } finally {
      setLoadingDevices(false);
    }
  }, []);

const requestPermission = useCallback(async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });

    stream.getTracks().forEach((track) => track.stop());

    setPermissionState("granted");
    setError(null);

    // Now that permission is granted, labels will be populated
    await loadDevices();
  } catch (err: any) {
    console.error("Camera permission error", err);
    setPermissionState("denied");
    setError(err?.message || "Camera permission denied.");
  }
}, [loadDevices]);

  const retry = useCallback(async () => {
    setError(null);
    await requestPermission();
  }, [requestPermission]);

  useEffect(() => {
    if (!open) return;
    requestPermission().catch((err) => {
      console.error(err);
    });
  }, [open, requestPermission]);

  useEffect(() => {
    if (!open || typeof navigator === "undefined" || !navigator.mediaDevices?.addEventListener) return;

    const handler = () => {
      loadDevices().catch((err) => {
        console.error(err);
      });
    };

    navigator.mediaDevices.addEventListener("devicechange", handler);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handler);
    };
  }, [open, loadDevices]);

  const stableDevices = useMemo(() => devices, [devices]);

  return {
    devices: stableDevices,
    selectedDeviceId,
    permissionState,
    error,
    loadingDevices,
    setSelectedDeviceId,
    requestPermission,
    retry,
  };
}
