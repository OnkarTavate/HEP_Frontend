"use client";

import React from "react";

const COLOR_MAP = {
  blue: {
    sharp:
      "conic-gradient(from 0deg, rgba(59,130,246,0.12) 0deg, rgba(59,130,246,0.12) 140deg, #1e3a8a 175deg, #1d4ed8 210deg, #2563eb 245deg, #3b82f6 285deg, #60a5fa 325deg, #93c5fd 350deg, #ffffff 360deg)",
    blur:
      "conic-gradient(from 0deg, transparent 0deg, transparent 130deg, #1d4ed8 170deg, #3b82f6 230deg, #60a5fa 300deg, #93c5fd 360deg)",
    shadow: "drop-shadow(0 0 16px rgba(59, 130, 246, 0.7))",
    badgeText: "text-blue-400",
    badgeDot: "bg-blue-400",
    ring: "focus-visible:ring-blue-400/60",
  },
  cyan: {
    sharp:
      "conic-gradient(from 0deg, rgba(6,182,212,0.12) 0deg, rgba(6,182,212,0.12) 140deg, #164e63 175deg, #0e7490 210deg, #0891b2 245deg, #06b6d4 285deg, #22d3ee 325deg, #a5f3fc 350deg, #ffffff 360deg)",
    blur:
      "conic-gradient(from 0deg, transparent 0deg, transparent 130deg, #0e7490 170deg, #06b6d4 230deg, #22d3ee 300deg, #a5f3fc 360deg)",
    shadow: "drop-shadow(0 0 16px rgba(6, 182, 212, 0.7))",
    badgeText: "text-cyan-400",
    badgeDot: "bg-cyan-400",
    ring: "focus-visible:ring-cyan-400/60",
  },
  emerald: {
    sharp:
      "conic-gradient(from 0deg, rgba(16,185,129,0.12) 0deg, rgba(16,185,129,0.12) 140deg, #064e3b 175deg, #047857 210deg, #059669 245deg, #10b981 285deg, #34d399 325deg, #a7f3d0 350deg, #ffffff 360deg)",
    blur:
      "conic-gradient(from 0deg, transparent 0deg, transparent 130deg, #047857 170deg, #10b981 230deg, #34d399 300deg, #a7f3d0 360deg)",
    shadow: "drop-shadow(0 0 16px rgba(16, 185, 129, 0.7))",
    badgeText: "text-emerald-400",
    badgeDot: "bg-emerald-400",
    ring: "focus-visible:ring-emerald-400/60",
  },
  yellow: {
    sharp:
      "conic-gradient(from 0deg, rgba(251,191,36,0.12) 0deg, rgba(251,191,36,0.12) 140deg, #78350f 175deg, #b45309 210deg, #d97706 245deg, #f59e0b 285deg, #fbbf24 325deg, #fef08a 350deg, #ffffff 360deg)",
    blur:
      "conic-gradient(from 0deg, transparent 0deg, transparent 130deg, #92400e 170deg, #d97706 215deg, #f59e0b 265deg, #fbbf24 320deg, #fef08a 360deg)",
    shadow: "drop-shadow(0 0 18px rgba(245, 158, 11, 0.7))",
    badgeText: "text-amber-300",
    badgeDot: "bg-amber-400",
    ring: "focus-visible:ring-amber-400/60",
  },
  amber: {
    sharp:
      "conic-gradient(from 0deg, rgba(251,191,36,0.12) 0deg, rgba(251,191,36,0.12) 140deg, #78350f 175deg, #b45309 210deg, #d97706 245deg, #f59e0b 285deg, #fbbf24 325deg, #fef08a 350deg, #ffffff 360deg)",
    blur:
      "conic-gradient(from 0deg, transparent 0deg, transparent 130deg, #92400e 170deg, #d97706 215deg, #f59e0b 265deg, #fbbf24 320deg, #fef08a 360deg)",
    shadow: "drop-shadow(0 0 18px rgba(245, 158, 11, 0.7))",
    badgeText: "text-amber-300",
    badgeDot: "bg-amber-400",
    ring: "focus-visible:ring-amber-400/60",
  },
  purple: {
    sharp:
      "conic-gradient(from 0deg, rgba(168,85,247,0.12) 0deg, rgba(168,85,247,0.12) 140deg, #581c87 175deg, #7e22ce 210deg, #9333ea 245deg, #a855f7 285deg, #c084fc 325deg, #e9d5ff 350deg, #ffffff 360deg)",
    blur:
      "conic-gradient(from 0deg, transparent 0deg, transparent 130deg, #581c87 170deg, #7e22ce 215deg, #a855f7 265deg, #c084fc 320deg, #e9d5ff 360deg)",
    shadow: "drop-shadow(0 0 18px rgba(168, 85, 247, 0.7))",
    badgeText: "text-purple-400",
    badgeDot: "bg-purple-400",
    ring: "focus-visible:ring-purple-400/60",
  },
  rose: {
    sharp:
      "conic-gradient(from 0deg, rgba(244,63,94,0.12) 0deg, rgba(244,63,94,0.12) 140deg, #881337 175deg, #be123c 210deg, #e11d48 245deg, #f43f5e 285deg, #fb7185 325deg, #fecdd3 350deg, #ffffff 360deg)",
    blur:
      "conic-gradient(from 0deg, transparent 0deg, transparent 130deg, #881337 170deg, #be123c 215deg, #f43f5e 265deg, #fb7185 320deg, #fecdd3 360deg)",
    shadow: "drop-shadow(0 0 18px rgba(244, 63, 94, 0.7))",
    badgeText: "text-rose-400",
    badgeDot: "bg-rose-400",
    ring: "focus-visible:ring-rose-400/60",
  },
  orange: {
    sharp:
      "conic-gradient(from 0deg, rgba(249,115,22,0.12) 0deg, rgba(249,115,22,0.12) 140deg, #7c2d12 175deg, #c2410c 210deg, #ea580c 245deg, #f97316 285deg, #fb923c 325deg, #fed7aa 350deg, #ffffff 360deg)",
    blur:
      "conic-gradient(from 0deg, transparent 0deg, transparent 130deg, #7c2d12 170deg, #c2410c 215deg, #f97316 265deg, #fb923c 320deg, #fed7aa 360deg)",
    shadow: "drop-shadow(0 0 18px rgba(249, 115, 22, 0.7))",
    badgeText: "text-orange-400",
    badgeDot: "bg-orange-400",
    ring: "focus-visible:ring-orange-400/60",
  },
};

export default function GlowingBorderButton({
  children,
  onClick,
  className = "",
  innerClassName = "",
  color = "blue",
  duration = "3.6s",
  rounded = "rounded-2xl",
  innerRounded = "rounded-[13px]",
  borderWidth = "p-[2.5px]",
  title,
  type = "button",
  disabled = false,
  ...props
}) {
  const scheme = COLOR_MAP[color] || COLOR_MAP.blue;

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes glowing-border-spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `,
        }}
      />
      <div className={`relative inline-flex items-center ${className}`}>
        {/* Outer Expanded Ambient Halo Glow */}
        <div
          className={`absolute -inset-[4px] ${rounded} opacity-85 blur-lg pointer-events-none overflow-hidden transition-opacity duration-300 group-hover:opacity-100`}
          aria-hidden="true"
        >
          <div
            className="absolute inset-[-150%] w-[400%] h-[400%]"
            style={{
              background: scheme.blur,
              animation: `glowing-border-spin ${duration} linear infinite`,
            }}
          />
        </div>

        {/* Secondary tighter high-intensity bloom */}
        <div
          className={`absolute -inset-[1.5px] ${rounded} opacity-90 blur-sm pointer-events-none overflow-hidden`}
          aria-hidden="true"
        >
          <div
            className="absolute inset-[-150%] w-[400%] h-[400%]"
            style={{
              background: scheme.sharp,
              animation: `glowing-border-spin ${duration} linear infinite`,
            }}
          />
        </div>

        {/* Main interactive button shell with expanded border outline */}
        <button
          type={type}
          onClick={onClick}
          title={title}
          disabled={disabled}
          style={{ filter: scheme.shadow }}
          className={`group relative ${borderWidth} overflow-hidden ${rounded} bg-[#181920] cursor-pointer transition-all duration-200 hover:scale-[1.025] active:scale-[0.98] focus:outline-none focus-visible:ring-2 ${scheme.ring} disabled:opacity-50 disabled:pointer-events-none select-none`}
          {...props}
        >
          {/* Rotating sharp border beam */}
          <div
            className="absolute inset-[-150%] w-[400%] h-[400%] pointer-events-none"
            style={{
              background: scheme.sharp,
              animation: `glowing-border-spin ${duration} linear infinite`,
            }}
          />

          {/* Dark inner face with slightly decreased, sleek compact padding */}
          <div
            className={`relative z-10 flex items-center gap-2 px-3.5 py-1.5 ${innerRounded} bg-[#0b0c10] border border-white/[0.09] text-white text-xs font-semibold shadow-inner transition-colors duration-200 group-hover:bg-[#11131a] ${innerClassName}`}
          >
            {children}
          </div>
        </button>
      </div>
    </>
  );
}

export function LiveClock({ showSeconds = true, className = "" }) {
  const [time, setTime] = React.useState("");

  React.useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          ...(showSeconds ? { second: "2-digit" } : {}),
          hour12: true,
        })
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [showSeconds]);

  return <span className={`font-mono font-bold tracking-wider ${className}`}>{time}</span>;
}
