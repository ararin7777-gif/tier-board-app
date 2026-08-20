"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateTier } from "@/app/boards/[boardId]/actions";
import { Input } from "@/components/ui/input";

export function TierRow({
  boardId,
  tier,
  dragHandleProps,
  children,
}: {
  boardId: string;
  tier: { id: string; label: string; color: string };
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  children?: React.ReactNode;
}) {
  const [label, setLabel] = useState(tier.label);
  const [color, setColor] = useState(tier.color);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const saveLabel = () => {
    const trimmed = label.trim().slice(0, 3);
    if (!trimmed) {
      setLabel(tier.label);
      return;
    }
    setLabel(trimmed);
    if (trimmed === tier.label) return;
    startTransition(async () => {
      try {
        await updateTier(boardId, tier.id, { label: trimmed });
      } catch {
        toast.error("段の名前の更新に失敗しました");
        setLabel(tier.label);
      }
    });
  };

  const handleGroupBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsEditing(false);
      saveLabel();
    }
  };

  const saveColor = (value: string) => {
    setColor(value);
    startTransition(async () => {
      try {
        await updateTier(boardId, tier.id, { color: value });
      } catch {
        toast.error("色の更新に失敗しました");
        setColor(tier.color);
      }
    });
  };

  return (
    <div className="flex min-h-16 gap-2 rounded-lg border border-border p-2 sm:min-h-24 sm:gap-3 sm:p-3">
      {isEditing ? (
        <div
          onBlur={handleGroupBlur}
          className="relative min-h-16 w-14 shrink-0 self-stretch overflow-hidden rounded-lg ring-1 ring-border sm:min-h-24 sm:w-20"
        >
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value.slice(0, 3))}
            maxLength={3}
            autoFocus
            disabled={isPending}
            style={{ backgroundColor: color }}
            className="h-full w-full rounded-none border-0 text-center text-base font-bold text-white placeholder:text-white/70 focus-visible:ring-0 sm:text-lg"
          />
          <label className="absolute bottom-1 right-1 size-5 cursor-pointer rounded ring-1 ring-white/70">
            <span
              className="block size-full rounded"
              style={{ backgroundColor: color }}
            />
            <input
              type="color"
              value={color}
              onChange={(e) => saveColor(e.target.value)}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
              aria-label="段の色"
            />
          </label>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="flex min-h-16 w-14 shrink-0 touch-manipulation self-stretch items-center justify-center rounded-lg text-base font-bold text-white shadow-sm transition hover:brightness-95 active:cursor-grabbing sm:min-h-24 sm:w-20 sm:text-lg"
          style={{ backgroundColor: color }}
          {...dragHandleProps}
        >
          {label}
        </button>
      )}

      <div className="flex min-h-16 flex-1 flex-wrap content-center items-center gap-1.5 sm:min-h-24 sm:gap-2">
        {children ?? (
          <span className="text-sm text-muted-foreground">
            アイテムはまだありません
          </span>
        )}
      </div>
    </div>
  );
}
