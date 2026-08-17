"use client";

import { Pencil } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { renameBoard } from "@/app/boards/actions";
import { Input } from "@/components/ui/input";

export function BoardTitle({
  boardId,
  initialTitle,
}: {
  boardId: string;
  initialTitle: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    setIsEditing(false);
    const trimmed = title.trim();
    if (!trimmed || trimmed === initialTitle) {
      setTitle(initialTitle);
      return;
    }
    startTransition(async () => {
      try {
        await renameBoard(boardId, trimmed);
      } catch {
        toast.error("タイトルの更新に失敗しました");
        setTitle(initialTitle);
      }
    });
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            inputRef.current?.blur();
          }
          if (e.key === "Escape") {
            setTitle(initialTitle);
            setIsEditing(false);
          }
        }}
        autoFocus
        disabled={isPending}
        className="h-auto max-w-xl py-1 text-2xl sm:text-4xl font-semibold"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="group flex items-center gap-2 text-2xl sm:text-4xl font-semibold"
    >
      {title}
      <Pencil className="size-5 text-muted-foreground sm:size-6 opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}
