import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

import { classifyLink } from "@/lib/links";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type { HeroBanner } from "@/lib/content-types";

/**
 * Extracted verbatim so all four CTA branches share the one styling string. The
 * classes, copy and position are exactly what they were (3.9).
 */
const CTA_CLASS =
  "inline-flex items-center justify-center rounded-full bg-primary-foreground px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary transition-transform hover:-translate-y-0.5";

export function HeroSlider({ banners }: { banners: HeroBanner[] }) {
  const [index, setIndex] = useState(0);
  // 1.10: autoplay never paused, so a slide could change mid-read or straight
  // after a manual selection.
  const [paused, setPaused] = useState(false);
  // 1.11: the visitor's motion preference was never consulted.
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (banners.length < 2) return;
    if (paused || reducedMotion) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % banners.length), 7000);
    return () => clearInterval(timer);
  }, [banners.length, paused, reducedMotion]);

  if (banners.length === 0) return null;
  const banner = banners[Math.min(index, banners.length - 1)]!;
  // 1.6: `button_link` is admin-entered free text. Anything not starting with "#"
  // used to be passed straight into a typed <Link to={…}>, producing a failed
  // navigation or an error boundary. The merged classifier decides instead.
  const cta = classifyLink(banner.button_link);

  return (
    <section
      className="relative isolate min-h-[78vh] overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      {banners.map((b, i) => (
        <img
          key={b.id}
          src={b.image_url}
          // 1.12: purely decorative background imagery — the banner title is
          // already announced by the <h1> below.
          alt=""
          aria-hidden
          fetchPriority={i === 0 ? "high" : "low"}
          loading={i === 0 ? "eager" : "lazy"}
          className={`absolute inset-0 h-full w-full object-cover object-[38%_center] transition-opacity duration-1000 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      <div className="hero-scrim absolute inset-0" />

      <div className="page-shell relative flex min-h-[78vh] flex-col justify-end pb-20 pt-32 sm:pb-28">
        <div className="max-w-2xl">
          {banner.eyebrow ? (
            <p className="text-[0.7rem] uppercase tracking-[0.4em] text-primary-foreground/85">
              {banner.eyebrow}
            </p>
          ) : null}
          <h1 className="mt-5 font-display text-[clamp(2.6rem,6vw,4.6rem)] leading-[1.03] text-primary-foreground">
            {banner.title}
          </h1>
          {banner.subtitle ? (
            <p className="mt-6 max-w-xl text-base leading-8 text-primary-foreground/85">
              {banner.subtitle}
            </p>
          ) : null}
          {banner.button_text && cta.kind !== "none" ? (
            <div className="mt-10">
              {cta.kind === "anchor" ? (
                <a href={cta.href} className={CTA_CLASS}>
                  {banner.button_text}
                </a>
              ) : cta.kind === "external" ? (
                <a href={cta.href} rel="noopener noreferrer" className={CTA_CLASS}>
                  {banner.button_text}
                </a>
              ) : (
                <Link to={cta.href} className={CTA_CLASS}>
                  {banner.button_text}
                </Link>
              )}
            </div>
          ) : null}
        </div>

        {banners.length > 1 ? (
          <div className="mt-12 flex gap-2">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                aria-label={`Show banner ${i + 1}`}
                aria-current={i === index}
                onClick={() => {
                  setIndex(i);
                  setPaused(true);
                }}
                // 1.9: the indicator keeps its exact 4px visual classes; the tap
                // target is enlarged to ~44px with an invisible pseudo-element, so
                // no pixel of the hero composition moves (3.9, 3.18).
                className={`relative h-1 rounded-full transition-all after:absolute after:inset-x-0 after:-inset-y-5 after:content-[''] ${
                  i === index ? "w-10 bg-primary-foreground" : "w-4 bg-primary-foreground/45"
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
