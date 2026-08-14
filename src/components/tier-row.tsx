"use client";

import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteTier, moveTier, updateTier } from "@/app/boards/[boardId]/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TierRow({
  boardId,
  tier,
  isFirst,
  isLast,
  itemCount,
  children,
}: {
  boardId: string;
  tier: { id: string; label: string; color: string };
  isFirst: boolean;
  isLast: boolean;
  itemCount: number;
  children?: React.ReactNode;
}) {
  const [label, setLabel] = useState(tier.label);
  const [color, setColor] = useState(tier.color);
  const [isPending, startTransition] = useTransition();

  const saveLabel = () => {
    const trimmed = label.trim();
    if (!trimmed || trimmed === tier.label) {
      setLabel(tier.label);
      return;
    }
    startTransition(async () => {
      try {
        await updateTier(boardId, tier.id, { label: trimmed });
      } catch {
        toast.error("段の名前の更新に失敗しました");
        setLabel(tier.label);
      }
    });
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

  const handleMove = (direction: "up" | "down") => {
    startTransition(async () => {
      try {
        await moveTier(boardId, tier.id, direction);
      } catch {
        toast.error("並べ替えに失敗しました");
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteTier(boardId, tier.id);
        toast.success("段を削除しました");
      } catch {
        toast.error("段の削除に失敗しました");
      }
    });
  };

  return (
    <div className="flex min-h-16 items-center gap-3 rounded-lg border border-border p-3">
      <label className="relative shrink-0">
        <span
          className="block size-10 cursor-pointer rounded-lg ring-1 ring-border"
          style={{ backgroundColor: color }}
        />
        <input
          type="color"
          value={color}
          onChange={(e) => saveColor(e.target.value)}
          className="absolute inset-0 size-10 cursor-pointer opacity-0"
          aria-label="段の色"
        />
      </label>

      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={saveLabel}
        disabled={isPending}
        className="h-9 w-24 shrink-0 font-medium"
      />

      <div className="flex min-h-9 flex-1 flex-wrap items-center gap-2">
        {children ?? (
          <span className="text-sm text-muted-foreground">
            アイテムはまだありません
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={isFirst || isPending}
          onClick={() => handleMove("up")}
        >
          <ChevronUp className="size-4" />
          <span className="sr-only">上へ</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={isLast || isPending}
          onClick={() => handleMove("down")}
        >
          <ChevronDown className="size-4" />
          <span className="sr-only">下へ</span>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive"
              />
            }
          >
            <Trash2 className="size-4" />
            <span className="sr-only">段を削除</span>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>「{tier.label}」を削除しますか?</AlertDialogTitle>
              <AlertDialogDescription>
                {itemCount > 0
                  ? `この段にある${itemCount}件のアイテムは、未評価のプールに戻ります。`
                  : "この操作は取り消せません。"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                削除する
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
