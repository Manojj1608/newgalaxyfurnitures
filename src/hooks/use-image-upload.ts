/**
 * The single upload entry point for every admin surface.
 *
 * Defect 1.7: uploads from the product, category and hero-banner dialogs did not
 * invalidate the `media` query key, so the media library kept showing a stale
 * file list until it was refetched for some other reason. Routing every surface
 * — products, categories, banners, homepage, media, logo — through one hook that
 * invalidates on BOTH upload and delete means the library can no longer go stale.
 *
 * Defect 1.3: batch uploads go through `uploadImages`, which attempts every file
 * independently and reports exact per-file outcomes.
 */
import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { contentKeys } from "@/hooks/use-content";
import { deleteProductImage, uploadProductImage } from "@/lib/content-api";
import type { ProductImage } from "@/lib/content-types";
import { type BatchResult, summarise, uploadImages } from "@/lib/uploads";

export function useImageUpload() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const invalidateMedia = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: contentKeys.media() });
  }, [queryClient]);

  /** Uploads a single file, invalidating the media library on success. */
  const uploadOne = useCallback(
    async (file: File): Promise<ProductImage> => {
      setUploading(true);
      try {
        const image = await uploadProductImage(file);
        invalidateMedia();
        return image;
      } finally {
        setUploading(false);
      }
    },
    [invalidateMedia],
  );

  /**
   * Uploads many files independently. Always resolves; the caller inspects the
   * per-file result rather than assuming everything landed.
   */
  const uploadMany = useCallback(
    async (files: File[]): Promise<BatchResult<ProductImage>> => {
      setUploading(true);
      try {
        const result = await uploadImages(files, uploadProductImage);
        if (result.succeeded.length > 0) invalidateMedia();
        return result;
      } finally {
        setUploading(false);
      }
    },
    [invalidateMedia],
  );

  const removeOne = useCallback(
    async (path: string): Promise<void> => {
      await deleteProductImage(path);
      invalidateMedia();
    },
    [invalidateMedia],
  );

  return { uploading, uploadOne, uploadMany, removeOne, summarise, invalidateMedia };
}
