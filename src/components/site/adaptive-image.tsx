import { useEffect, useRef, useState } from "react";

import { PLACEHOLDER_IMAGE } from "@/lib/content-types";

/**
 * 2.19: matches the real grid — 4-up on desktop, 2-up on tablet, 1-up on mobile.
 *
 * Deliberately module-private and repeated in product-card.tsx rather than
 * exported: a component file that also exports a constant trips
 * `react-refresh/only-export-components`, which would add a 7th warning and
 * breach the recorded lint baseline (2.22).
 */
const PRODUCT_IMAGE_SIZES = "(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw";

/** Nominal intrinsic width used to derive a height from the applied ratio. */
const NOMINAL_WIDTH = 1200;

/**
 * Image frame that adapts its height to the uploaded image's real aspect ratio
 * (clamped to a premium range) so nothing is stretched, cropped or floating in
 * a large empty box.
 */
export function AdaptiveImage({
  src,
  alt,
  className = "",
  imgClassName = "",
  minRatio = 0.75, // tallest allowed (3:4 portrait)
  maxRatio = 1.5, // widest allowed (3:2 landscape)
  fallbackRatio = 1,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  minRatio?: number;
  maxRatio?: number;
  fallbackRatio?: number;
}) {
  const [ratio, setRatio] = useState<number | null>(null);
  const applied = Math.min(maxRatio, Math.max(minRatio, ratio ?? fallbackRatio));
  const imgRef = useRef<HTMLImageElement>(null);

  /**
   * Defect 1.18: this measurement used to run in a `ref` callback, i.e. during
   * commit, so every cached-complete image forced an extra render on mount.
   * Measuring in an effect is post-commit, and committing only when the CLAMPED
   * APPLIED ratio actually changes removes the redundant render entirely for the
   * common case. A genuinely different ratio still costs one re-render — that is
   * inherent to measuring after load, and is not claimed away.
   */
  useEffect(() => {
    const el = imgRef.current;
    if (!el?.complete || !el.naturalWidth || !el.naturalHeight) return;
    const measured = el.naturalWidth / el.naturalHeight;
    const nextApplied = Math.min(maxRatio, Math.max(minRatio, measured));
    if (nextApplied !== applied) setRatio(measured);
  }, [src, applied, minRatio, maxRatio]);

  return (
    <div className={`product-media ${className}`} style={{ aspectRatio: String(applied) }}>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        // 2.19: intrinsic sizing hints matching the reserved frame, so the grid
        // does not shift as real ratios arrive.
        width={NOMINAL_WIDTH}
        height={Math.round(NOMINAL_WIDTH / applied)}
        sizes={PRODUCT_IMAGE_SIZES}
        decoding="async"
        onLoad={(e) => {
          const el = e.currentTarget;
          if (el.naturalWidth && el.naturalHeight) {
            setRatio(el.naturalWidth / el.naturalHeight);
          }
        }}
        onError={(e) => {
          e.currentTarget.src = PLACEHOLDER_IMAGE;
        }}
        className={`product-media-img ${imgClassName}`}
      />
    </div>
  );
}
