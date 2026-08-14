"use client";

import { Check, Copy } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { togglePublic } from "@/app/boards/[boardId]/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function PublicToggle({
  boardId,
  initialIsPublic,
  initialShareSlug,
}: {
  boardId: string;
  initialIsPublic: boolean;
  initialShareSlug: string | null;
}) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [shareSlug, setShareSlug] = useState(initialShareSlug);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (next: boolean) => {
    setIsPublic(next);
    startTransition(async () => {
      try {
        const result = await togglePublic(boardId, next);
        if (result.shareSlug) setShareSlug(result.shareSlug);
      } catch {
        toast.error("公開設定の更新に失敗しました");
        setIsPublic(!next);
      }
    });
  };

  const handleCopy = async () => {
    if (!shareSlug) return;
    const url = `${window.location.origin}/share/${shareSlug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("共有リンクをコピーしました");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-1.5">
      <div className="flex items-center gap-2">
        <Switch
          id="public-toggle"
          checked={isPublic}
          onCheckedChange={handleToggle}
          disabled={isPending}
        />
        <Label htmlFor="public-toggle" className="text-sm">
          {isPublic ? "公開中" : "非公開"}
        </Label>
      </div>
      {isPublic && shareSlug && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="h-7 gap-1 px-2 text-xs"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          リンクをコピー
        </Button>
      )}
    </div>
  );
}
