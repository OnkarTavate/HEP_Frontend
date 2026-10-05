"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";

const SESSION_KEY = "apacs_vendor_material_token";
const PUBLIC_PAGE = "/vendor-material-pass";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export default function VendorMaterialLinkEntry() {
  const params = useParams();
  const token = params?.token;

  useEffect(() => {
    // Wait until Next.js provides the route parameter.
    if (token === undefined) return;

    if (typeof token !== "string" || !TOKEN_PATTERN.test(token)) {
      window.location.replace("/");
      return;
    }

    try {
      sessionStorage.setItem(SESSION_KEY, token);

      // Only continue if storage actually contains the token.
      if (sessionStorage.getItem(SESSION_KEY) !== token) {
        window.location.replace("/");
        return;
      }
    } catch {
      window.location.replace("/");
      return;
    }

    window.location.replace(PUBLIC_PAGE);
  }, [token]);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 text-sm text-slate-600">
      Opening the material application…
    </main>
  );
}