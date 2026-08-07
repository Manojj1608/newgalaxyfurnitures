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

import { deleteProductImage, logAudit, uploadProductImage } from "@/lib/content-api";
import type { MediaRow } from "@/lib/content-types";
import { mediaQuery, useMedia } from "@/hooks/use-admin-data";

export function MediaPanel() {
  const queryClient = useQueryClient();
  const { data: media = [], isLoading } = useMedia();
  const [uploading, setUploading] = useState(false);
  const [confirm, setConfirm] = useState<MediaRow | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: mediaQuery().queryKey });

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) await uploadProductImage(file);
      toast.success(`${files.length} file(s) uploaded`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function remove(row: MediaRow) {
    try {
      await deleteProductImage(row.path);
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

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : media.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/70 p-10 text-center text-sm text-muted-foreground">
          No media yet.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {media.map((m) => (
            <div key={m.id} className="group relative overflow-hidden rounded-xl border border-border/60">
              <img src={m.url} alt={m.alt ?? ""} className="aspect-square w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-background/85 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(m.url);
                    toast.success("URL copied");
                  }}
                  className="rounded p-1 hover:bg-accent"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
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
