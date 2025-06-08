"use client";
import * as React from "react";

export function ModernBackground() {
  const [pos, setPos] = React.useState({ x: 0, y: 0 });
  React.useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-transparent">
      {/* Top right blue blob */}
      <div className="absolute top-[-10%] right-[-15%] w-[40vw] h-[40vw] rounded-full bg-blue-400/40 dark:bg-blue-600/60 blur-3xl animate-pulse-slow" />
      {/* Bottom left green blob */}
      <div className="absolute bottom-[-12%] left-[-10%] w-[38vw] h-[38vw] rounded-full bg-green-400/30 dark:bg-green-500/50 blur-3xl animate-pulse-slower" />
      {/* Center violet blob */}
      <div className="absolute top-[40%] left-[30%] w-[32vw] h-[32vw] rounded-full bg-violet-400/20 dark:bg-violet-600/40 blur-2xl animate-pulse" />
      {/* Subtle rose accent, bottom right */}
      <div className="absolute bottom-[-8%] right-[-8%] w-[22vw] h-[22vw] rounded-full bg-rose-400/20 dark:bg-rose-500/40 blur-2xl animate-pulse-slower" />
      {/* Faint white glow, center */}
      <div className="absolute top-[50%] left-[50%] w-[60vw] h-[20vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 dark:bg-white/5 blur-2xl" />
      {/* Cursor-following interactive glow */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          left: pos.x - 120,
          top: pos.y - 120,
          width: 240,
          height: 240,
          background:
            "radial-gradient(circle, rgba(80,180,255,0.18) 0%, rgba(80,180,255,0.08) 60%, transparent 100%)",
          filter: "blur(32px)",
          transition:
            "left 0.12s cubic-bezier(.4,1,.7,1), top 0.12s cubic-bezier(.4,1,.7,1)",
          zIndex: 1,
        }}
      />
      <style jsx global>{`
        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 0.7;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.08);
          }
        }
        @keyframes pulse-slower {
          0%,
          100% {
            opacity: 0.5;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.12);
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 12s ease-in-out infinite;
        }
        .animate-pulse-slower {
          animation: pulse-slower 18s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
