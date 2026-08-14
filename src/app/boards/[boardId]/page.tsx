import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddItemsDialog } from "@/components/add-items-dialog";
import { AddTierButton } from "@/components/add-tier-button";
import { Badge } from "@/components/ui/badge";
import { BoardTitle } from "@/components/board-title";
import { ItemCard } from "@/components/item-card";
import { TierRow } from "@/components/tier-row";
import { createClient } from "@/lib/supabase/server";

export default async function BoardEditorPage({
  params,
}: PageProps<"/boards/[boardId]">) {
  const { boardId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: board } = await supabase
    .from("tier_boards")
    .select("id, title, is_public")
    .eq("id", boardId)
    .single();

  if (!board || !user) {
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
      .select("id, tier_id, name, image_url, position")
      .eq("board_id", board.id)
      .order("position", { ascending: true }),
  ]);

  const itemsByTier = new Map<string, typeof items>();
  const poolItems: NonNullable<typeof items> = [];
  for (const item of items ?? []) {
    if (item.tier_id) {
      const list = itemsByTier.get(item.tier_id) ?? [];
      list.push(item);
      itemsByTier.set(item.tier_id, list);
    } else {
      poolItems.push(item);
    }
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
        <div className="flex items-center gap-2">
          <Badge variant={board.is_public ? "default" : "secondary"}>
            {board.is_public ? "公開" : "非公開"}
          </Badge>
          <AddItemsDialog boardId={board.id} userId={user.id} />
        </div>
      </header>

      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
        {tiers?.map((tier, index) => (
          <TierRow
            key={tier.id}
            boardId={board.id}
            tier={tier}
            isFirst={index === 0}
            isLast={index === (tiers?.length ?? 1) - 1}
            itemCount={itemsByTier.get(tier.id)?.length ?? 0}
          >
            {itemsByTier.get(tier.id)?.map((item) => (
              <ItemCard key={item.id} boardId={board.id} item={item} />
            ))}
          </TierRow>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border p-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          未評価のアイテム
        </h2>
        <div className="flex flex-wrap gap-3">
          {poolItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              「アイテムを追加」から画像を登録すると、ここに表示されます。
            </p>
          ) : (
            poolItems.map((item) => (
              <ItemCard key={item.id} boardId={board.id} item={item} />
            ))
          )}
        </div>
      </div>

      <AddTierButton boardId={board.id} />

      <p className="text-sm text-muted-foreground">
        (ドラッグ&ドロップでの配置・公開設定は次のフェーズで実装します)
      </p>
    </div>
  );
}
