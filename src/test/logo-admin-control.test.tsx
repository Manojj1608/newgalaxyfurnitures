/**
 * F2 — the managed-asset logo control (2.4, defect 1.4).
 *
 * Renders the REAL `SettingsPanel` and drives the real control. `FakeSupabase` is
 * the sole fake and stands in only for storage/network; every assertion is about
 * what our code did — which upload path it used, what it put in the draft, and
 * what payload it eventually sent to the real `saveSettings`.
 *
 * Validates: Requirements 2.4, 3.11, 3.13
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { FakeSupabase, postgrestError } from "@/test/supabase-fake";

let fake: FakeSupabase;

vi.mock("@/integrations/supabase/client", () => ({
  get supabase() {
    return fake;
  },
}));

afterEach(cleanup);
beforeEach(() => vi.resetModules());

const SETTINGS_ROW = {
  id: true,
  company_name: "New Galaxy Furniture",
  tagline: "Timeless pieces",
  logo_url: null as string | null,
  about_text: "About the showroom.",
};

async function renderPanel(over: Partial<typeof SETTINGS_ROW> = {}, storageFails = false) {
  fake = new FakeSupabase({
    tables: {
      site_settings: (op) =>
        op.kind === "update"
          ? { data: [{ id: true }], error: null }
          : { data: { ...SETTINGS_ROW, ...over }, error: null },
      media: { data: [{ id: "m1" }], error: null },
    },
    storage: storageFails ? { upload: postgrestError("storage upload denied") } : undefined,
  });
  const { SettingsPanel } = await import("@/components/admin/settings-panel");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <SettingsPanel />
    </QueryClientProvider>,
  );
  await waitFor(() => expect(screen.getByText("Site settings")).toBeInTheDocument());
  return view;
}

const pngFile = () => new File([new Uint8Array([1, 2, 3, 4])], "logo.png", { type: "image/png" });
const pdfFile = () =>
  new File([new Uint8Array([1, 2, 3, 4])], "logo.pdf", { type: "application/pdf" });

const logoInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;
const saveButton = () => screen.getByRole("button", { name: "Save changes" });
const lastPayload = () =>
  fake.opsFor("site_settings", "update").at(-1)?.values as Record<string, unknown> | undefined;

async function upload(file: File) {
  await act(async () => {
    fireEvent.change(logoInput(), { target: { files: [file] } });
  });
}

describe("2.4 — the logo is a managed asset, not a free-text URL", () => {
  it("replaces the free-text field with an upload control and a live preview", async () => {
    await renderPanel();

    // 1.4: no "Logo URL" text input remains.
    expect(screen.queryByText("Logo URL")).toBeNull();
    expect(screen.getByText("Logo")).toBeInTheDocument();
    expect(logoInput()).toBeInTheDocument();
    expect(logoInput().accept).toBe("image/*");
    expect(screen.getByRole("button", { name: "Upload logo" })).toBeInTheDocument();
    // No logo configured yet, so the preview is the existing monogram (3.1).
    expect(
      [...document.querySelectorAll("svg")].some((s) => s.getAttribute("viewBox") === "0 0 64 64"),
    ).toBe(true);
  });

  it("offers Replace and Remove once a logo is configured", async () => {
    await renderPanel({ logo_url: "https://img.test/logo.png" });

    expect(screen.getByRole("button", { name: "Replace logo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
    const preview = document.querySelector("img")!;
    expect(preview.getAttribute("src")).toBe("https://img.test/logo.png");
  });

  it("uploads through the single shared pipeline and stages the result as a draft", async () => {
    await renderPanel();
    expect(saveButton()).toBeDisabled();

    await upload(pngFile());

    // 3.11: exactly one upload, through the merged pipeline's bucket.
    const uploads = fake.storageOps.filter((o) => o.kind === "upload");
    expect(uploads).toHaveLength(1);
    expect(uploads[0]!.bucket).toBe("product-images");
    // The shared pipeline also records the file in the media library.
    expect(fake.opsFor("media", "insert")).toHaveLength(1);

    // Draft model: staged, enabling Save, but nothing persisted yet.
    expect(saveButton()).toBeEnabled();
    expect(fake.opsFor("site_settings", "update")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Replace logo" })).toBeInTheDocument();
  });

  it("persists the uploaded logo only through the existing save flow", async () => {
    await renderPanel();
    await upload(pngFile());

    await act(async () => fireEvent.click(saveButton()));

    await waitFor(() => expect(lastPayload()).toBeDefined());
    const payload = lastPayload()!;
    expect(Object.keys(payload)).toEqual(["logo_url"]);
    expect(String(payload["logo_url"])).toContain("https://example.test/public/");
  });

  it("rejects an invalid file without attempting an upload or touching the draft", async () => {
    await renderPanel({ logo_url: "https://img.test/logo.png" });

    await upload(pdfFile());

    // Validation runs first, so nothing was sent anywhere.
    expect(fake.storageOps.filter((o) => o.kind === "upload")).toHaveLength(0);
    expect(saveButton()).toBeDisabled();
    // The previously saved logo still renders (2.4: failure preserves it).
    expect(document.querySelector("img")!.getAttribute("src")).toBe("https://img.test/logo.png");
  });

  it("leaves the previous logo intact when the upload itself fails", async () => {
    await renderPanel({ logo_url: "https://img.test/logo.png" }, true);

    await upload(pngFile());

    expect(saveButton()).toBeDisabled();
    expect(document.querySelector("img")!.getAttribute("src")).toBe("https://img.test/logo.png");
    expect(fake.opsFor("site_settings", "update")).toHaveLength(0);
  });

  it('Remove clears the column ("" → null) so the monogram returns', async () => {
    await renderPanel({ logo_url: "https://img.test/logo.png" });

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    // Preview reverts immediately to the monogram (3.1).
    expect(document.querySelector("img")).toBeNull();
    expect(
      [...document.querySelectorAll("svg")].some((s) => s.getAttribute("viewBox") === "0 0 64 64"),
    ).toBe(true);

    await act(async () => fireEvent.click(saveButton()));

    await waitFor(() => expect(lastPayload()).toBeDefined());
    expect(lastPayload()).toEqual({ logo_url: null });
    // Recorded trade-off: the storage object is deliberately NOT deleted, so no
    // remove is issued against storage.
    expect(fake.storageOps.filter((o) => o.kind === "remove")).toHaveLength(0);
  });
});
