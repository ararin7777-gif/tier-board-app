"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { useTransition } from "react";
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
      className="group relative flex w-16 flex-col items-center gap-1"
    >
      <div className="relative size-16 overflow-hidden rounded-lg bg-secondary ring-1 ring-border">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            sizes="64px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-muted-foreground">
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
      <span className="w-full truncate text-center text-xs text-muted-foreground">
        {item.name}
      </span>
    </div>
  );
}
