import React, { useState, useEffect, useRef } from "react";

interface TallButtonProps {
  children: React.ReactNode;
  onClick: () => void;
}

export function TallButton({ children, onClick }: TallButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(200);

  // Force height update after render
  useEffect(() => {
    const forceTall = () => {
      if (buttonRef.current) {
        buttonRef.current.style.height = `${height}px`;
        buttonRef.current.style.minHeight = `${height}px`;
      }
    };

    forceTall();
    // Apply multiple times to overcome any layout changes
    const timers = [
      setTimeout(forceTall, 100),
      setTimeout(forceTall, 500),
      setTimeout(forceTall, 1000),
    ];

    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [height]);

  return (
    <div
      ref={buttonRef}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick();
        }
      }}
      style={{
        height: `${height}px`,
        minHeight: `${height}px`,
        backgroundColor: "#3b82f6",
        color: "white",
        borderRadius: "8px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        transition: "background-color 0.2s",
        overflow: "hidden",
        width: "100%",
        gap: "24px",
        padding: "32px 16px",
      }}
      className="hover:bg-blue-700 active:bg-blue-800 active:scale-[0.98]"
    >
      {children}
    </div>
  );
}
