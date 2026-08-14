import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddTierButton } from "@/components/add-tier-button";
import { Badge } from "@/components/ui/badge";
import { BoardTitle } from "@/components/board-title";
import { TierRow } from "@/components/tier-row";
import { createClient } from "@/lib/supabase/server";

export default async function BoardEditorPage({
  params,
}: PageProps<"/boards/[boardId]">) {
  const { boardId } = await params;
  const supabase = await createClient();

  const { data: board } = await supabase
    .from("tier_boards")
    .select("id, title, is_public")
    .eq("id", boardId)
    .single();

  if (!board) {
    notFound();
  }

  const [{ data: tiers }, { data: items }] = await Promise.all([
    supabase
      .from("tiers")
      .select("id, label, color, position")
      .eq("board_id", board.id)
      .order("position", { ascending: true }),
    supabase
      .from("items")
      .select("id, tier_id")
      .eq("board_id", board.id),
  ]);

  const itemCountByTier = new Map<string, number>();
  for (const item of items ?? []) {
    if (!item.tier_id) continue;
    itemCountByTier.set(item.tier_id, (itemCountByTier.get(item.tier_id) ?? 0) + 1);
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <Link
          href="/boards"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Tier表一覧に戻る
        </Link>
      </div>

      <header className="flex flex-wrap items-center justify-between gap-4">
        <BoardTitle boardId={board.id} initialTitle={board.title} />
        <Badge variant={board.is_public ? "default" : "secondary"}>
          {board.is_public ? "公開" : "非公開"}
        </Badge>
      </header>

      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
        {tiers?.map((tier, index) => (
          <TierRow
            key={tier.id}
            boardId={board.id}
            tier={tier}
            isFirst={index === 0}
            isLast={index === (tiers?.length ?? 1) - 1}
            itemCount={itemCountByTier.get(tier.id) ?? 0}
          />
        ))}
      </div>

      <AddTierButton boardId={board.id} />

      <p className="text-sm text-muted-foreground">
        (アイテムの追加・ドラッグ&ドロップ・公開設定は次のフェーズで実装します)
      </p>
    </div>
  );
}
