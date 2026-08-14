import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
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

  const { data: tiers } = await supabase
    .from("tiers")
    .select("id, label, color, position")
    .eq("board_id", board.id)
    .order("position", { ascending: true });

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
        <h1 className="text-xl font-semibold">{board.title}</h1>
        <Badge variant={board.is_public ? "default" : "secondary"}>
          {board.is_public ? "公開" : "非公開"}
        </Badge>
      </header>

      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
        {tiers?.map((tier) => (
          <div
            key={tier.id}
            className="flex min-h-16 items-center gap-4 rounded-lg border border-border p-3"
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-semibold text-white"
              style={{ backgroundColor: tier.color }}
            >
              {tier.label}
            </span>
            <span className="text-sm text-muted-foreground">
              アイテムはまだありません
            </span>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        (アイテムの追加・ドラッグ&ドロップ・公開設定は次のフェーズで実装します)
      </p>
    </div>
  );
}
