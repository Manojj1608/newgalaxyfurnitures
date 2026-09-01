import { useEffect, useState } from "react";

import { LOGO_IMG_CLASS, resolveLogoSrc } from "@/lib/logo";
import type { SiteSettings } from "@/lib/content-types";

/**
 * The single owner of the site's brand mark.
 *
 * Defects 1.1–1.3 and 1.5: the header inlined its own
 * `settings?.logo_url ? <img src={…}> : <NGMonogram />` ternary while
 * `index.tsx` hardcoded `NGMonogram` twice. With no single owner there was
 * nowhere to apply the merged `resolveLogoSrc` guard, an `onError` fallback or a
 * size clamp — so `src/lib/logo.ts` stayed inert and any stored value, including
 * `"   "` and `javascript:`, defeated the existing monogram fallback.
 *
 * `src/lib/logo.ts` is consumed here unmodified; this component is the wiring
 * that was missing, not a re-implementation.
 */
export function NGMonogram({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="ng-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e8cf9a" />
          <stop offset="50%" stopColor="#c9a44c" />
          <stop offset="100%" stopColor="#8f6f2c" />
        </linearGradient>
      </defs>
      <ellipse
        cx="32"
        cy="32"
        rx="29"
        ry="14"
        fill="none"
        stroke="url(#ng-gold)"
        strokeWidth="1"
        opacity="0.55"
        transform="rotate(-24 32 32)"
      />
      <ellipse
        cx="32"
        cy="32"
        rx="29"
        ry="14"
        fill="none"
        stroke="url(#ng-gold)"
        strokeWidth="1"
        opacity="0.35"
        transform="rotate(28 32 32)"
      />
      <text
        x="32"
        y="41"
        textAnchor="middle"
        fontFamily="Cormorant Garamond, serif"
        fontSize="26"
        fill="url(#ng-gold)"
        letterSpacing="1"
      >
        NG
      </text>
    </svg>
  );
}

export type BrandMarkSize = "header" | "about" | "footer";

/**
 * Module-private. The monogram sizes are exactly the three already in use
 * (3.1); the two new image classes keep `LOGO_IMG_CLASS`'s 5:1 ceiling at the
 * about and footer heights.
 */
const SIZES: Record<BrandMarkSize, { img: string; monogram: string }> = {
  header: { img: LOGO_IMG_CLASS, monogram: "h-9 w-9" },
  about: { img: "h-20 w-auto max-h-20 max-w-[400px] object-contain", monogram: "h-20 w-20" },
  footer: { img: "h-12 w-auto max-h-12 max-w-[240px] object-contain", monogram: "h-12 w-12" },
};

export function BrandMark({
  settings,
  size,
}: {
  settings: SiteSettings | null;
  size: BrandMarkSize;
}) {
  const src = resolveLogoSrc(settings?.logo_url);
  const [failed, setFailed] = useState(false);

  // A newly configured logo must get a fresh chance to load, otherwise one
  // broken URL would suppress every later one for the life of the page.
  useEffect(() => setFailed(false), [src]);

  const { img, monogram } = SIZES[size];

  if (src === null || failed) return <NGMonogram className={monogram} />;

  return (
    <img
      src={src}
      // 2.1: the mark is named in its own right rather than relying on the
      // adjacent company-name text, which only the header happens to have.
      alt={settings?.company_name ?? "New Galaxy Furniture"}
      className={img}
      onError={() => setFailed(true)}
    />
  );
}
