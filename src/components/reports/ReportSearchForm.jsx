"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef } from "react";

export default function ReportSearchForm({ children, className = "" }) {
  const pathname = usePathname();
  const router = useRouter();
  const debounceTimer = useRef(null);

  function updateReport(form, { replace = false } = {}) {
    const params = new URLSearchParams();
    const formData = new FormData(form);

    formData.forEach((value, key) => {
      if (typeof value !== "string") return;
      const trimmedValue = value.trim();
      if (trimmedValue) params.set(key, trimmedValue);
    });

    params.set("page", "1");
    const href = `${pathname}?${params.toString()}`;
    if (replace) router.replace(href, { scroll: false });
    else router.push(href, { scroll: false });
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    updateReport(event.currentTarget);
  }

  function handleChange(event) {
    const form = event.currentTarget;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    // Selects and date fields are complete values, so refresh immediately.
    // Text fields wait briefly to avoid one API request for every keystroke.
    const changedField = event.target;
    const refreshImmediately =
      changedField.tagName === "SELECT" ||
      ["date", "datetime-local"].includes(changedField.type);

    if (refreshImmediately) {
      updateReport(form, { replace: true });
      return;
    }

    debounceTimer.current = setTimeout(() => {
      updateReport(form, { replace: true });
    }, 450);
  }

  return (
    <form
      className={className}
      onSubmit={handleSubmit}
      onChange={handleChange}
    >
      {children}
    </form>
  );
}
