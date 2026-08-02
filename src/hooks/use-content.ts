import { useEffect } from "react";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import {
  fetchBanners,
  fetchCategories,
  fetchProductBySlug,
  fetchProducts,
  fetchSections,
  fetchSettings,
} from "@/lib/content-api";

export const contentKeys = {
  products: (includeUnpublished = false) => ["products", { includeUnpublished }] as const,
  product: (slug: string) => ["product", slug] as const,
  categories: (includeHidden = false) => ["categories", { includeHidden }] as const,
  sections: (includeDisabled = false) => ["sections", { includeDisabled }] as const,
  banners: (includeInactive = false) => ["banners", { includeInactive }] as const,
  settings: () => ["site-settings"] as const,
  enquiries: () => ["enquiries"] as const,
  media: () => ["media"] as const,
  audit: () => ["audit-logs"] as const,
};

export const productsQuery = (includeUnpublished = false) =>
  queryOptions({
    queryKey: contentKeys.products(includeUnpublished),
    queryFn: () => fetchProducts({ includeUnpublished }),
    staleTime: 30_000,
  });

export const categoriesQuery = (includeHidden = false) =>
  queryOptions({
    queryKey: contentKeys.categories(includeHidden),
    queryFn: () => fetchCategories({ includeHidden }),
    staleTime: 60_000,
  });

export const sectionsQuery = (includeDisabled = false) =>
  queryOptions({
    queryKey: contentKeys.sections(includeDisabled),
    queryFn: () => fetchSections({ includeDisabled }),
    staleTime: 60_000,
  });

export const bannersQuery = (includeInactive = false) =>
  queryOptions({
    queryKey: contentKeys.banners(includeInactive),
    queryFn: () => fetchBanners({ includeInactive }),
    staleTime: 60_000,
  });

export const settingsQuery = () =>
  queryOptions({
    queryKey: contentKeys.settings(),
    queryFn: fetchSettings,
    staleTime: 60_000,
  });

export const productQuery = (slug: string) =>
  queryOptions({
    queryKey: contentKeys.product(slug),
    queryFn: () => fetchProductBySlug(slug),
  });

export function useProducts(includeUnpublished = false) {
  return useQuery(productsQuery(includeUnpublished));
}
export function useCategories(includeHidden = false) {
  return useQuery(categoriesQuery(includeHidden));
}
export function useSections(includeDisabled = false) {
  return useQuery(sectionsQuery(includeDisabled));
}
export function useBanners(includeInactive = false) {
  return useQuery(bannersQuery(includeInactive));
}
export function useSettings() {
  return useQuery(settingsQuery());
}

const WATCHED: { table: string; keys: string[] }[] = [
  { table: "products", keys: ["products", "product"] },
  { table: "categories", keys: ["categories"] },
  { table: "homepage_sections", keys: ["sections"] },
  { table: "hero_banners", keys: ["banners"] },
  { table: "site_settings", keys: ["site-settings"] },
];

/**
 * Single realtime hub: any admin change to content invalidates the matching
 * query keys, so every surface (homepage, catalogue, search, nav, product
 * page) refreshes automatically without a reload.
 */
export function useContentRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase.channel("content-sync");
    for (const { table, keys } of WATCHED) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        for (const key of keys) {
          queryClient.invalidateQueries({ queryKey: [key] });
        }
      });
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
