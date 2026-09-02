"use client";

import { usePathname, useRouter } from "next/navigation";

export default function ReportSearchForm({ children, className = "" }) {
  const pathname = usePathname();
  const router = useRouter();
  function handleSubmit(event) {
    event.preventDefault();

    const params = new URLSearchParams();
    const formData = new FormData(event.currentTarget);

    formData.forEach((value, key) => {
      if (typeof value !== "string") return;
      const trimmedValue = value.trim();
      if (trimmedValue) params.set(key, trimmedValue);
    });

    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <form
      className={className}
      onSubmit={handleSubmit}
    >
      {children}
    </form>
  );
}
