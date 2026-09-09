"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

const FACE_API = process.env.NEXT_PUBLIC_FACE_API || "http://localhost:5011/api";

/**
 * A capture link for one applicant, and the photograph that comes back on it.
 *
 * The applicant opens the link on their own phone — they may be nowhere near
 * the office — takes their photo, and it appears on this screen without the
 * agent refreshing or polling anything.
 *
 * Isolation is the point here. Two agents can be issuing links at the same
 * moment; the photo Person A sends must land on Person A's form and nowhere
 * else. That is guaranteed by the subscriber token: the stream is opened with
 * a credential minted for exactly one session, and a token for another session
 * is refused. Nothing about this screen's identity is trusted — only the token.
 */
export function useLiveCaptureLink() {
  const [link, setLink] = useState(null);
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | creating | waiting | opened | received | error
  const [error, setError] = useState(null);

  const sourceRef = useRef(null);
  // Held in a ref so the SSE handler always calls the caller's latest callback
  // without the effect having to be torn down and rebuilt on every render.
  const onPhotoRef = useRef(null);

  const close = useCallback(() => {
    sourceRef.current?.close();
    sourceRef.current = null;
  }, []);

  // A live EventSource must not outlive the screen that opened it.
  useEffect(() => close, [close]);

  const reset = useCallback(() => {
    close();
    setLink(null);
    setSession(null);
    setStatus("idle");
    setError(null);
  }, [close]);

  /**
   * Fetches the photograph as a File so it can ride along in the pass
   * application's own FormData.
   *
   * Deliberately not a URL handed to the form: the photo has to be submitted
   * with the application, and a link that expires with the session would leave
   * the application pointing at nothing.
   */
  const downloadPhoto = useCallback(async (state, subscriberToken) => {
    const response = await axios.get(
      `${FACE_API.replace(/\/api$/, "")}${state.photoUrl}?t=${encodeURIComponent(subscriberToken)}`,
      { responseType: "blob" },
    );
    return new File([response.data], `live_${state.referenceId}.jpg`, {
      type: response.data.type || "image/jpeg",
    });
  }, []);

  /**
   * Asks face_verify for a link and starts listening for that one session.
   */
  const createLink = useCallback(
    async ({ referenceId, applicantName, onPhoto }) => {
      onPhotoRef.current = onPhoto;

      close();
      setStatus("creating");
      setError(null);
      setLink(null);

      try {
        const token =
          localStorage.getItem("accessToken") || localStorage.getItem("hep_token");

        const { data } = await axios.post(
          `${FACE_API}/face/sessions`,
          { referenceId, applicantName },
          { headers: { Authorization: `Bearer ${token}` } },
        );

        setLink(data.captureUrl);
        setSession(data);
        setStatus("waiting");

        const source = new EventSource(
          `${FACE_API}/face/sessions/${data.sessionId}/stream?t=${encodeURIComponent(
            data.subscriberToken,
          )}`,
        );
        sourceRef.current = source;

        source.addEventListener("session.state", async (event) => {
          const state = JSON.parse(event.data);

          if (state.status === "OPENED") setStatus("opened");

          if (state.status === "COMPLETED" && state.photoUrl) {
            try {
              const file = await downloadPhoto(state, data.subscriberToken);
              setStatus("received");
              onPhotoRef.current?.(file, state);
            } catch (downloadError) {
              console.error("live photo download failed:", downloadError);
              setError("The photo arrived but could not be downloaded.");
              setStatus("error");
            }
            // One photo per link, so there is nothing further to hear.
            close();
          }

          if (state.status === "EXPIRED" || state.status === "CANCELLED") {
            setStatus("error");
            setError(
              state.status === "EXPIRED"
                ? "The link expired before a photo was taken."
                : "The link was cancelled.",
            );
            close();
          }
        });

        source.onerror = () => {
          // The browser reconnects on its own; only say something if the
          // session never got going at all.
          if (sourceRef.current && source.readyState === EventSource.CLOSED) {
            setError("Lost connection to the capture service.");
          }
        };

        return data;
      } catch (createError) {
        console.error("createLink error:", createError);
        const message =
          createError?.response?.data?.message || "Could not create the capture link.";
        setError(message);
        setStatus("error");
        throw createError;
      }
    },
    [close, downloadPhoto],
  );

  return { link, session, status, error, createLink, reset };
}
