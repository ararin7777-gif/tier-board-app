"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { importFromMintier } from "@/app/boards/import-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export function ImportBoardDialog() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    if (!url.trim()) return;
    setIsImporting(true);
    try {
      await importFromMintier(url.trim());
      // 成功時はServer Action内でredirectされるため、ここには到達しない
    } catch (error) {
      if (isRedirectError(error)) {
        // Next.jsのredirect()は例外として実装されているため、そのまま渡して遷移させる
        throw error;
      }
      toast.error(
        error instanceof Error ? error.message : "インポートに失敗しました",
      );
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        <Download className="size-4" />
        インポート
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>外部Tier表をインポート</DialogTitle>
          <DialogDescription>
            mintier.jpで作成したTier表のURLを入力すると、タイトル・段・画像をまとめて取り込みます(数十秒かかる場合があります)。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="import-url">Tier表のURL</Label>
          <Input
            id="import-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://mintier.jp/tiers/..."
            disabled={isImporting}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={handleImport}
            disabled={isImporting || !url.trim()}
          >
            {isImporting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                インポート中…
              </>
            ) : (
              "インポートする"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
