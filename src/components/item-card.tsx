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
            className="max-h-16 max-w-20 rounded-lg bg-secondary ring-1 ring-border sm:max-h-24 sm:max-w-32"
          />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-lg bg-secondary text-base font-semibold text-muted-foreground ring-1 ring-border sm:size-24 sm:text-lg">
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
      <span className="max-w-20 truncate text-center text-xs text-muted-foreground sm:max-w-32">
        {item.name}
      </span>
    </div>
  );
}
