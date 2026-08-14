"use client";

import { Plus } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { addTier } from "@/app/boards/[boardId]/actions";
import { Button } from "@/components/ui/button";

export function AddTierButton({ boardId }: { boardId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      try {
        await addTier(boardId);
      } catch {
        toast.error("段の追加に失敗しました");
      }
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={isPending}
      className="self-start"
    >
      <Plus className="size-4" />
      段を追加
    </Button>
  );
}
