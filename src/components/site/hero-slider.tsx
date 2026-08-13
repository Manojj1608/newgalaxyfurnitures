import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

import type { HeroBanner } from "@/lib/content-types";

export function HeroSlider({ banners }: { banners: HeroBanner[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % banners.length), 7000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) return null;
  const banner = banners[Math.min(index, banners.length - 1)]!;

  return (
    <section className="relative isolate min-h-[78vh] overflow-hidden">
      {banners.map((b, i) => (
        <img
          key={b.id}
          src={b.image_url}
          alt={b.title}
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
          {banner.button_text && banner.button_link ? (
            <div className="mt-10">
              {banner.button_link.startsWith("#") ? (
                <a
                  href={banner.button_link}
                  className="inline-flex items-center justify-center rounded-full bg-primary-foreground px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary transition-transform hover:-translate-y-0.5"
                >
                  {banner.button_text}
                </a>
              ) : (
                <Link
                  to={banner.button_link}
                  className="inline-flex items-center justify-center rounded-full bg-primary-foreground px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary transition-transform hover:-translate-y-0.5"
                >
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
                onClick={() => setIndex(i)}
                className={`h-1 rounded-full transition-all ${
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
