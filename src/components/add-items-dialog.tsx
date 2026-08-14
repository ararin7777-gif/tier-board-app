"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createItems } from "@/app/boards/[boardId]/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type PendingItem = {
  id: string;
  name: string;
  status: "uploading" | "done" | "error";
  imageUrl?: string;
  previewUrl: string;
};

export function AddItemsDialog({
  boardId,
  userId,
}: {
  boardId: string;
  userId: string;
}) {
  const [open, setOpen] = useState(false);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const supabase = createClient();
    const fileArray = Array.from(files);

    const newItems: PendingItem[] = fileArray.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name.replace(/\.[^/.]+$/, ""),
      status: "uploading",
      previewUrl: URL.createObjectURL(file),
    }));

    setPendingItems((prev) => [...prev, ...newItems]);

    await Promise.all(
      fileArray.map(async (file, index) => {
        const localItem = newItems[index];
        const path = `${userId}/${boardId}/${crypto.randomUUID()}-${file.name}`;
        const { error } = await supabase.storage
          .from("item-images")
          .upload(path, file);

        if (error) {
          setPendingItems((prev) =>
            prev.map((p) =>
              p.id === localItem.id ? { ...p, status: "error" } : p,
            ),
          );
          return;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("item-images").getPublicUrl(path);

        setPendingItems((prev) =>
          prev.map((p) =>
            p.id === localItem.id
              ? { ...p, status: "done", imageUrl: publicUrl }
              : p,
          ),
        );
      }),
    );
  };

  const updateName = (id: string, name: string) => {
    setPendingItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name } : p)),
    );
  };

  const removeItem = (id: string) => {
    setPendingItems((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSubmit = async () => {
    const ready = pendingItems.filter((p) => p.status === "done" && p.imageUrl);
    if (ready.length === 0) return;

    setIsSubmitting(true);
    try {
      await createItems(
        boardId,
        ready.map((p) => ({ name: p.name, imageUrl: p.imageUrl! })),
      );
      toast.success(`${ready.length}件のアイテムを追加しました`);
      setPendingItems([]);
      setOpen(false);
    } catch {
      toast.error("アイテムの登録に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasUploading = pendingItems.some((p) => p.status === "uploading");
  const readyCount = pendingItems.filter((p) => p.status === "done").length;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setPendingItems([]);
      }}
    >
      <DialogTrigger render={<Button type="button" />}>
        <ImagePlus className="size-4" />
        アイテムを追加
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>アイテムを追加</DialogTitle>
          <DialogDescription>
            画像を複数選択してまとめてアップロードできます。名前は登録前に編集できます。
          </DialogDescription>
        </DialogHeader>

        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-8 text-sm text-muted-foreground hover:bg-secondary">
          <ImagePlus className="size-6" />
          画像を選択(複数可)
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>

        {pendingItems.length > 0 && (
          <div className="grid max-h-72 grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
            {pendingItems.map((item) => (
              <div key={item.id} className="flex flex-col gap-1">
                <div className="relative aspect-square overflow-hidden rounded-lg bg-secondary">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.previewUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  {item.status === "uploading" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Loader2 className="size-5 animate-spin text-white" />
                    </div>
                  )}
                  {item.status === "error" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-destructive/70 text-xs text-white">
                      失敗
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
                  >
                    <X className="size-3" />
                  </button>
                </div>
                <Input
                  value={item.name}
                  onChange={(e) => updateName(item.id, e.target.value)}
                  className="h-7 px-2 text-xs"
                />
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || hasUploading || readyCount === 0}
          >
            {isSubmitting ? "登録中…" : `登録する${readyCount > 0 ? `(${readyCount}件)` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
