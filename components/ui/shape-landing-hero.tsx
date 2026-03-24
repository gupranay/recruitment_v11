"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type HeroProps = {
  badge?: string;
  title1?: string;
  title2?: string;
};

export function HeroGeometric({
  badge = "Recruitment Management for Clubs & Orgs",
  title1 = "Run Recruitment Cycles",
  title2 = "Collaboratively & Efficiently",
}: HeroProps) {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const linesRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const badgeRef = useRef<HTMLParagraphElement | null>(null);
  const copyRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    if (!heroRef.current) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      // Animated vertical “tracks” and nodes in the background
      if (linesRef.current && !prefersReducedMotion) {
        const lineEls = linesRef.current.querySelectorAll<HTMLElement>("[data-hero-line]");

        lineEls.forEach((line, index) => {
          const duration = 10 + index * 2;

          gsap.fromTo(
            line,
            { yPercent: -20, opacity: 0.15 },
            {
              yPercent: 20,
              opacity: 0.45,
              ease: "none",
              duration,
              repeat: -1,
              yoyo: true,
            },
          );

          const nodes = line.querySelectorAll<HTMLElement>("[data-hero-node]");
          nodes.forEach((node, nodeIndex) => {
            gsap.fromTo(
              node,
              { yPercent: -40, opacity: 0 },
              {
                yPercent: 40,
                opacity: 1,
                ease: "sine.inOut",
                duration: duration * 0.8,
                repeat: -1,
                delay: nodeIndex * 0.7,
                yoyo: true,
              },
            );
          });
        });
      }

      // Intro timeline for badge, title, copy
      const tl = gsap.timeline({
        defaults: { ease: "power3.out", duration: 0.9 },
      });

      if (badgeRef.current) {
        tl.from(badgeRef.current, {
          y: prefersReducedMotion ? 0 : 28,
          opacity: 0,
          filter: prefersReducedMotion ? "none" : "blur(6px)",
        });
      }

      if (titleRef.current) {
        const words = titleRef.current.querySelectorAll("[data-hero-word]");
        tl.from(
          words,
          {
            y: prefersReducedMotion ? 0 : 40,
            opacity: 0,
            stagger: prefersReducedMotion ? 0.01 : 0.06,
          },
          "-=0.4",
        );
      }

      if (copyRef.current) {
        tl.from(
          copyRef.current,
          {
            y: prefersReducedMotion ? 0 : 20,
            opacity: 0,
          },
          "-=0.45",
        );
      }

      if (!prefersReducedMotion) {
        // Subtle parallax on scroll
        ScrollTrigger.create({
          trigger: heroRef.current,
          start: "top top",
          end: "+=60%",
          scrub: 0.8,
          onUpdate(self) {
            const progress = self.progress;
            if (linesRef.current) {
              gsap.to(linesRef.current, {
                y: progress * -60,
                ease: "power1.out",
                overwrite: "auto",
              });
            }
          },
        });
      }
    }, heroRef);

    return () => {
      ctx.revert();
    };
  }, []);

  const [titleFirstLine, titleSecondLine] = [title1, title2];

  const splitWords = (text: string) => text.split(" ");

  return (
    <section
      id="landing-hero"
      ref={heroRef}
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden aura-hero-surface"
    >
      {/* Background canvas */}
      <div className="aura-hero-bg" />

      {/* Animated vertical tracks + nodes (GSAP controlled) */}
      <div
        ref={linesRef}
        className="pointer-events-none absolute inset-y-[-15%] left-1/2 flex -translate-x-1/2 gap-16 opacity-60"
      >
        {[-140, -40, 60, 160].map((offset, i) => (
          <div
            key={i}
            data-hero-line
            className="relative flex justify-center"
            style={{ transform: `translateX(${offset}px)` }}
          >
            <div
              className="bg-white/25"
              style={{
                height: "150%",
                width: i % 2 === 0 ? 1 : 2,
                opacity: 0.3,
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center">
              <div
                data-hero-node
                className="h-2 w-2 rounded-full bg-emerald-300/90 shadow-[0_0_18px_rgba(16,185,129,0.8)]"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-3xl px-4 md:px-6 mx-auto text-center">
        <div>
          {badge ? (
            <p
              ref={badgeRef}
              role="note"
              className="mx-auto mb-3 mt-2 inline-block rounded-full border border-slate-200/80 bg-white/55 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-sm backdrop-blur-sm dark:border-white/15 dark:bg-white/10 dark:text-emerald-200/90"
            >
              {badge}
            </p>
          ) : null}
          <h1
            ref={titleRef}
            className={`font-display text-4xl sm:text-5xl md:text-6xl leading-tight tracking-tight text-slate-900 dark:text-white ${badge ? "mt-3" : "mt-6"}`}
          >
            <span className="block">
              {splitWords(titleFirstLine).map((word, index) => (
                <span key={`first-${word}-${index}`} data-hero-word className="inline-block mr-2">
                  {word}
                </span>
              ))}
            </span>
            <span className="mt-1 block text-slate-900/85 dark:text-white/85">
              {splitWords(titleSecondLine).map((word, index) => (
                <span key={`second-${word}-${index}`} data-hero-word className="inline-block mr-1.5">
                  {word}
                </span>
              ))}
            </span>
          </h1>

          <p
            ref={copyRef}
            className="mt-6 mx-auto max-w-xl text-sm sm:text-base md:text-[0.98rem] leading-relaxed text-slate-700 dark:text-white/70"
          >
            Recruitify helps clubs, organizations, and startups run recruitment
            from one system. Create cycles, set up rounds, collect feedback, and
            make decisions together without bouncing between Forms, Docs, and
            spreadsheets.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="/dash" className="cta-primary-dark text-sm">
              Get started
            </a>
            <a href="#how-it-works" className="cta-secondary-dark text-sm">
              View how it works
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
