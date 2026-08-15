import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AddItemsDialog } from "@/components/add-items-dialog";
import { AddTierButton } from "@/components/add-tier-button";
import { BoardEditor } from "@/components/board-editor";
import { BoardTitle } from "@/components/board-title";
import { CoverImageControl } from "@/components/cover-image-control";
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

  if (!user) {
    notFound();
  }

  // RLS上、ここで取得できるのは「自分のTier表」または「他ユーザーの公開Tier表」のみ
  const { data: board } = await supabase
    .from("tier_boards")
    .select(
      "id, title, is_public, share_slug, allow_public_edit, cover_image_url, user_id",
    )
    .eq("id", boardId)
    .single();

  if (!board) {
    notFound();
  }

  const isOwner = board.user_id === user.id;

  // 他ユーザーの公開Tier表で、編集許可(allow_public_edit)が無い場合は
  // 編集画面ではなく閲覧専用の共有ビューへ案内する
  if (!isOwner) {
    if (!board.is_public) {
      notFound();
    }
    if (!board.allow_public_edit) {
      if (board.share_slug) redirect(`/share/${board.share_slug}`);
      notFound();
    }
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
        <div className="flex flex-wrap items-center gap-2">
          {isOwner ? (
            <BoardTitle boardId={board.id} initialTitle={board.title} />
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{board.title}</h1>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                他のユーザーの公開Tier表(編集可)
              </span>
            </div>
          )}
          {isOwner && (
            <CoverImageControl
              boardId={board.id}
              userId={user.id}
              initialCoverImageUrl={board.cover_image_url}
            />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isOwner && (
            <PublicToggle
              boardId={board.id}
              initialIsPublic={board.is_public}
              initialShareSlug={board.share_slug}
              initialAllowPublicEdit={board.allow_public_edit}
            />
          )}
          <AddItemsDialog boardId={board.id} userId={user.id} />
          <ThemeToggle />
        </div>
      </header>

      <BoardEditor boardId={board.id} tiers={tiers ?? []} items={items ?? []} />

      <AddTierButton boardId={board.id} />
    </div>
  );
}
