"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteTier } from "@/app/boards/[boardId]/actions";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type TierWithCount = {
  id: string;
  label: string;
  color: string;
  itemCount: number;
};

export function DeleteTierDialog({
  boardId,
  tiers,
}: {
  boardId: string;
  tiers: TierWithCount[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (tierId: string) => {
    startTransition(async () => {
      try {
        await deleteTier(boardId, tierId);
        toast.success("段を削除しました");
      } catch {
        toast.error("段の削除に失敗しました");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full gap-2 border-2 border-dashed border-destructive/40 bg-transparent text-sm font-medium text-destructive/80 hover:border-destructive hover:bg-destructive/5 hover:text-destructive"
          />
        }
      >
        <Trash2 className="size-4" />
        段の削除
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>削除する段を選択</DialogTitle>
          <DialogDescription>
            削除すると、その段にあるアイテムは未評価のプールに戻ります。
          </DialogDescription>
        </DialogHeader>
        <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {tiers.length === 0 && (
            <p className="text-sm text-muted-foreground">段がありません。</p>
          )}
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className="flex items-center gap-3 rounded-lg border border-border p-2"
            >
              <span
                title={tier.label}
                className="flex h-9 w-14 shrink-0 items-center justify-center truncate rounded-md px-1 text-sm font-bold text-white"
                style={{ backgroundColor: tier.color }}
              >
                {tier.label}
              </span>
              <span className="flex-1 text-sm text-muted-foreground">
                {tier.itemCount}件のアイテム
              </span>
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                      disabled={isPending}
                    />
                  }
                >
                  <Trash2 className="size-4" />
                  <span className="sr-only">「{tier.label}」を削除</span>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      「{tier.label}」を削除しますか?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {tier.itemCount > 0
                        ? `この段にある${tier.itemCount}件のアイテムは、未評価のプールに戻ります。`
                        : "この操作は取り消せません。"}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>キャンセル</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(tier.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      削除する
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
