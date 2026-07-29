import { supabase } from "@/integrations/supabase/client";
import type { Product, ProductImage } from "./products-config";

const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10; // ~10 years

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Product[];
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as Product | null;
}


export async function uploadProductImage(file: File): Promise<ProductImage> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("product-images").upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const { data, error: urlErr } = await supabase.storage
    .from("product-images")
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (urlErr || !data) throw urlErr ?? new Error("Failed to sign URL");
  return { url: data.signedUrl, path };
}

export async function deleteProductImage(path: string): Promise<void> {
  await supabase.storage.from("product-images").remove([path]);
}
