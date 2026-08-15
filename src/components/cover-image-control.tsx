"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { setCoverImage } from "@/app/boards/[boardId]/actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function CoverImageControl({
  boardId,
  userId,
  initialCoverImageUrl,
}: {
  boardId: string;
  userId: string;
  initialCoverImageUrl: string | null;
}) {
  const [coverImageUrl, setCoverImageUrl] = useState(initialCoverImageUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const supabase = createClient();
      const path = `${userId}/${boardId}/cover-${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage
        .from("item-images")
        .upload(path, file);

      if (error) {
        toast.error("画像のアップロードに失敗しました");
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("item-images").getPublicUrl(path);

      await setCoverImage(boardId, publicUrl);
      setCoverImageUrl(publicUrl);
      toast.success("カバー画像を設定しました");
    } catch {
      toast.error("画像のアップロードに失敗しました");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleReset = () => {
    startTransition(async () => {
      try {
        await setCoverImage(boardId, null);
        setCoverImageUrl(null);
        toast.success("カバー画像を自動表示に戻しました");
      } catch {
        toast.error("更新に失敗しました");
      }
    });
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
      <div className="relative size-9 shrink-0 overflow-hidden rounded-md bg-secondary">
        {coverImageUrl ? (
          <Image
            src={coverImageUrl}
            alt="カバー画像"
            fill
            sizes="36px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImagePlus className="size-4 text-muted-foreground" />
          </div>
        )}
      </div>
      <span className="text-sm text-muted-foreground">
        {coverImageUrl ? "カバー画像" : "カバー画像(自動)"}
      </span>
      <label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            "変更"
          )}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>
      {coverImageUrl && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          disabled={isPending}
          onClick={handleReset}
        >
          <X className="size-3" />
          <span className="sr-only">自動表示に戻す</span>
        </Button>
      )}
    </div>
  );
}
