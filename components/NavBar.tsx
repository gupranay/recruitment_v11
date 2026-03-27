"use client";

import React, { useEffect, useState } from "react";
import Profile from "./Profile";
import Link from "next/link";
import ThemeSelector from "./ThemeSelector";

export default function NavBar() {
  const [showBrand, setShowBrand] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("landing-hero");
    if (!hero) {
      const handleScroll = () => {
        setShowBrand(window.scrollY > window.innerHeight * 0.3);
      };
      handleScroll(); // Set initial state
      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => window.removeEventListener("scroll", handleScroll);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowBrand(!entry.isIntersecting);
      },
      { threshold: 0.15 },
    );
    observer.observe(hero);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="flex justify-between items-center h-20">
      <div className="flex items-center">
        <Link
          href="/"
          className={`group inline-flex items-center gap-3 transition-opacity duration-300 ${
            showBrand ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          aria-hidden={!showBrand}
        >
          <span className="relative font-display text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white">
            Recruitify
            <span className="pointer-events-none absolute -bottom-1 left-0 h-px w-0 bg-neutral-950/60 transition-all group-hover:w-full dark:bg-white/60" />
          </span>
          {/* Visually hidden pill to keep markup stable while removing the badge */}
          <span
            style={{ display: "none" }}
            className="hidden sm:inline-flex items-center rounded-full border border-black/10 bg-white/60 px-2.5 py-1 text-[11px] tracking-[0.2em] text-neutral-900/70 dark:border-white/12 dark:bg-black/40 dark:text-white/65"
          >
            RECRUITING
          </span>
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <ThemeSelector className="scale-95 origin-right" />
        <Profile />
      </div>
    </div>
  );
}
