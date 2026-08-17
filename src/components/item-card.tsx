"use client";

import { X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteItem } from "@/app/boards/[boardId]/actions";

export function ItemCard({
  boardId,
  item,
}: {
  boardId: string;
  item: { id: string; name: string; image_url: string | null };
}) {
  const [isPending, startTransition] = useTransition();
  const [imageFailed, setImageFailed] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteItem(boardId, item.id, item.image_url);
      } catch {
        toast.error("アイテムの削除に失敗しました");
      }
    });
  };

  return (
    <div
      title={item.name}
      className="group relative flex flex-col items-center gap-1"
    >
      <div className="relative">
        {item.image_url && !imageFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.name}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="max-h-24 max-w-32 rounded-lg bg-secondary ring-1 ring-border"
          />
        ) : (
          <div className="flex size-24 items-center justify-center rounded-lg bg-secondary text-lg font-semibold text-muted-foreground ring-1 ring-border">
            {item.name.slice(0, 1) || "?"}
          </div>
        )}
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
        >
          <X className="size-3" />
        </button>
      </div>
      <span className="max-w-32 truncate text-center text-xs text-muted-foreground">
        {item.name}
      </span>
    </div>
  );
}
