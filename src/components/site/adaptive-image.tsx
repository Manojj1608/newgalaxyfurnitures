import { useState } from "react";

import { PLACEHOLDER_IMAGE } from "@/lib/content-types";

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

  return (
    <div
      className={`product-media ${className}`}
      style={{ aspectRatio: String(applied) }}
    >
      <img
        src={src}
        alt={alt}
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
