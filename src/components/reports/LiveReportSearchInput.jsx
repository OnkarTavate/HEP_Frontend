"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function LiveReportSearchInput({
  name = "find",
  placeholder = "Search results",
  defaultValue = "",
  className = "",
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const didMountRef = useRef(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    const timer = window.setTimeout(() => {
      const form = inputRef.current?.form;
      const params = new URLSearchParams();
      const query = value.trim();

      if (form) {
        const formData = new FormData(form);

        formData.forEach((formValue, key) => {
          if (typeof formValue !== "string") return;

          const trimmedValue = formValue.trim();
          if (trimmedValue) params.set(key, trimmedValue);
        });
      } else {
        new URLSearchParams(window.location.search).forEach((paramValue, key) => {
          if (paramValue.trim()) params.set(key, paramValue.trim());
        });
      }

      if (query) {
        params.set(name, query);
      } else {
        params.delete(name);
      }

      params.set("page", "1");
      router.replace(`?${params.toString()}`);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [name, router, value]);

  return (
    <input
      ref={inputRef}
      name={name}
      type="search"
      placeholder={placeholder}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      className={className}
      autoComplete="off"
    />
  );
}
