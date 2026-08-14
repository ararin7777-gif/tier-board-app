import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddItemsDialog } from "@/components/add-items-dialog";
import { AddTierButton } from "@/components/add-tier-button";
import { BoardEditor } from "@/components/board-editor";
import { BoardTitle } from "@/components/board-title";
import { PublicToggle } from "@/components/public-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
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
    .select("id, title, is_public, share_slug")
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
          <PublicToggle
            boardId={board.id}
            initialIsPublic={board.is_public}
            initialShareSlug={board.share_slug}
          />
          <AddItemsDialog boardId={board.id} userId={user.id} />
          <ThemeToggle />
        </div>
      </header>

      <BoardEditor boardId={board.id} tiers={tiers ?? []} items={items ?? []} />

      <AddTierButton boardId={board.id} />
    </div>
  );
}
