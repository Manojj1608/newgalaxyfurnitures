import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { logAudit } from "@/lib/content-api";
import type { MediaRow } from "@/lib/content-types";
import { mediaQuery, useMedia } from "@/hooks/use-admin-data";
import { useImageUpload } from "@/hooks/use-image-upload";
import { summarise as summariseUploads } from "@/lib/uploads";
import { copyToClipboard } from "@/lib/clipboard";
import { queryStateOf } from "@/lib/query-state";
import { QueryFailed } from "@/components/site/query-state";

export function MediaPanel() {
  const queryClient = useQueryClient();
  // 1.23: isError was never read, so a failed query rendered as an empty library.
  const { data: media = [], isLoading, isError, refetch } = useMedia();
  const { uploading, uploadMany, removeOne } = useImageUpload();
  const [confirm, setConfirm] = useState<MediaRow | null>(null);
  const state = queryStateOf({ isLoading, isError, data: media });

  const refresh = () => queryClient.invalidateQueries({ queryKey: mediaQuery().queryKey });

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    // 1.3: every file is attempted independently and the report states exactly
    // what succeeded and what failed — never `files.length`.
    const result = await uploadMany(Array.from(files));
    const message = summariseUploads(result);
    if (result.failed.length === 0) toast.success(message);
    else if (result.succeeded.length === 0) toast.error(message);
    else toast.warning(message);
    refresh();
  }

  async function remove(row: MediaRow) {
    try {
      await removeOne(row.path);
      await logAudit("delete", "media", row.id, { path: row.path });
      toast.success("File deleted");
      setConfirm(null);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl text-foreground">Media library</h2>
          <p className="mt-1 text-sm text-muted-foreground">{media.length} files</p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-wood px-6 py-3 text-xs uppercase tracking-[0.24em] text-wood-foreground hover:opacity-90">
          <Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : "Upload files"}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              onFiles(e.target.files);
              e.currentTarget.value = "";
            }}
          />
        </label>
      </div>

      {state === "error" ? (
        <QueryFailed message="Could not load the media library." onRetry={() => void refetch()} />
      ) : state === "loading" ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : state === "empty" ? (
        <p className="rounded-2xl border border-dashed border-border/70 p-10 text-center text-sm text-muted-foreground">
          No media yet.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {media.map((m) => (
            <div key={m.id} className="group relative overflow-hidden rounded-xl border border-border/60">
              <img src={m.url} alt={m.alt ?? ""} className="product-media product-media-img aspect-square w-full" />
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-background/85 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  aria-label={`Copy URL for ${m.alt ?? "this file"}`}
                  onClick={async () => {
                    // 1.31: confirm only on ACTUAL success; otherwise offer a
                    // usable fallback instead of a false "URL copied".
                    if (await copyToClipboard(m.url)) toast.success("URL copied");
                    else toast.error("Could not copy automatically", { description: m.url });
                  }}
                  className="rounded p-1 hover:bg-accent"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${m.alt ?? "this file"}`}
                  onClick={() => setConfirm(m)}
                  className="rounded p-1 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this file?</AlertDialogTitle>
            <AlertDialogDescription>
              Any product or banner still using it will lose its image.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirm && remove(confirm)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export { MediaPanel as default };
