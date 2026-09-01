import { useId, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { logAudit, saveSettings } from "@/lib/content-api";
import { useSettings } from "@/hooks/use-content";
import { useImageUpload } from "@/hooks/use-image-upload";
import { validateUploadFile } from "@/lib/uploads";
import { QueryFailed } from "@/components/site/query-state";
import { BrandMark } from "@/components/site/brand-mark";

import type { SiteSettings } from "@/lib/content-types";

const TEXT_FIELDS: [keyof SiteSettings, string][] = [
  ["company_name", "Company name"],
  ["tagline", "Tagline"],
  ["phone", "Phone"],
  ["whatsapp", "WhatsApp number (digits only)"],
  ["email", "Email"],
  ["address", "Address"],
  ["showroom_hours", "Showroom hours"],
  ["maps_embed_url", "Google Maps embed URL"],
  // 1.4: `logo_url` used to live here as a plain free-text input, which is why no
  // upload, preview, replace or remove affordance could exist. It is now a real
  // managed-asset control rendered above this grid. Every other field keeps its
  // position, copy and save path (3.13).
  ["instagram_url", "Instagram"],
  ["facebook_url", "Facebook"],
  ["youtube_url", "YouTube"],
  ["pinterest_url", "Pinterest"],
];

const LONG_FIELDS: [keyof SiteSettings, string][] = [
  ["about_text", "About text"],
  ["faq_text", "FAQ"],
  ["terms_text", "Terms"],
  ["privacy_text", "Privacy policy"],
  ["return_policy_text", "Return policy"],
  ["footer_note", "Footer note"],
];

export function SettingsPanel() {
  const queryClient = useQueryClient();
  // 1.25: isError was never read, so a failed load was reported as
  // "No settings row found." — a load failure disguised as missing data.
  const { data: settings, isLoading, isError, refetch } = useSettings();
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [saving, setSaving] = useState(false);
  // 2.4: the merged shared pipeline is the ONLY upload path used here.
  const { uploading, uploadOne, summarise } = useImageUpload();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const uid = useId();

  if (isError)
    return <QueryFailed message="Could not load site settings." onRetry={() => void refetch()} />;
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  // This copy now renders ONLY when the query SUCCEEDED and returned null.
  if (!settings) return <p className="text-sm text-muted-foreground">No settings row found.</p>;

  const value = (key: keyof SiteSettings) =>
    draft?.[key as string] ?? ((settings[key] as string | null) ?? "");

  function set(key: keyof SiteSettings, v: string) {
    setDraft((d) => ({ ...(d ?? {}), [key as string]: v }));
  }

  /**
   * 2.4: upload → preview → Save. Validation runs before anything is attempted,
   * and a rejected or failed upload leaves `draft` untouched so the previously
   * saved logo keeps rendering on the storefront.
   */
  async function pickLogo(files: FileList | null) {
    const file = files?.[0];
    // Allow re-selecting the same file after a failure.
    if (logoInputRef.current) logoInputRef.current.value = "";
    if (!file) return;

    const result = validateUploadFile(file);
    if (!result.ok) return toast.error(result.message);

    try {
      const image = await uploadOne(file);
      set("logo_url", image.url);
      toast.success(summarise({ succeeded: [image], failed: [] }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Logo upload failed");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return toast.info("Nothing to save");
    setSaving(true);
    try {
      const payload: Record<string, string | null> = {};
      for (const [k, v] of Object.entries(draft)) payload[k] = v === "" ? null : v;
      if (payload["company_name"] === null) throw new Error("Company name is required");
      await saveSettings(payload);
      await logAudit("update", "site_settings", "singleton", Object.keys(payload));
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      setDraft(null);
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl text-foreground">Site settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Contact details, socials and policy copy used across the website.
          </p>
        </div>
        <Button type="submit" variant="luxury" size="lg" disabled={saving || !draft}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      {/* 2.4: the managed-asset logo control. Built only from Button, Input and
          Label — already used in this file — so no new design vocabulary enters
          the codebase (3.18). */}
      <div className="space-y-2">
        <Label htmlFor={`${uid}-logo`}>Logo</Label>
        <div className="flex flex-wrap items-center gap-4">
          {/* Previewed through the same BrandMark the storefront uses, against the
              pending draft value, so admin and storefront cannot disagree. */}
          <BrandMark
            settings={{ ...settings, logo_url: value("logo_url") } as SiteSettings}
            size="header"
          />
          <Input
            id={`${uid}-logo`}
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void pickLogo(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => logoInputRef.current?.click()}
          >
            {uploading ? "Uploading…" : value("logo_url") ? "Replace logo" : "Upload logo"}
          </Button>
          {value("logo_url") ? (
            <Button
              type="button"
              variant="ghost"
              disabled={uploading}
              onClick={() => set("logo_url", "")}
            >
              Remove
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          PNG, JPG or WebP. Applied when you save; the brand monogram is used while no logo is set.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {TEXT_FIELDS.map(([key, label]) => (
          <div key={key as string} className="space-y-2">
            <Label>{label}</Label>
            <Input value={value(key)} onChange={(e) => set(key, e.target.value)} />
          </div>
        ))}
      </div>

      <div className="grid gap-4">
        {LONG_FIELDS.map(([key, label]) => (
          <div key={key as string} className="space-y-2">
            <Label>{label}</Label>
            <Textarea rows={3} value={value(key)} onChange={(e) => set(key, e.target.value)} />
          </div>
        ))}
      </div>
    </form>
  );
}
