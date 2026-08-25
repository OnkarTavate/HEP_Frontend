"use client";

import { Toaster } from "sonner";
import ChatbotWidget from "./ChatbotWidget";

export default function AppWidgets() {
  return (
    <>
      <ChatbotWidget />
      <Toaster position="top-center" richColors />
    </>
  );
}
