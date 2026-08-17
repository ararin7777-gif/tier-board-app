import { Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createBoard } from "./actions";
import { Badge } from "@/components/ui/badge";
import { DeleteBoardButton } from "@/components/delete-board-button";
import { ImportBoardDialog } from "@/components/import-board-dialog";
import { SignOutButton } from "@/components/sign-out-button";
import { SubmitButton } from "@/components/submit-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/server";

// インポート機能(外部Tier表の画像を多数ダウンロード・アップロードする)が
// Vercelのデフォルト実行時間制限に収まるよう、このページ配下のServer Actionの
// 最大実行時間を延長する
export const maxDuration = 60;

export default async function BoardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // RLSにより「自分のTier表(公開/非公開問わず)」+「他ユーザーの公開Tier表」が返る
  const { data: boards } = await supabase
    .from("tier_boards")
    .select(
      "id, title, is_public, allow_public_edit, cover_image_url, updated_at, user_id",
    )
    .order("updated_at", { ascending: false });

  const boardIds = (boards ?? []).map((b) => b.id);

  // カバー画像が未設定のTier表向けに、先頭の段の一番左のアイテム画像を
  // 自動プレビューとして使うためのデータをまとめて取得する
  const previewByBoard = new Map<string, string>();
  if (boardIds.length > 0) {
    const [{ data: tiers }, { data: items }] = await Promise.all([
      supabase
        .from("tiers")
        .select("id, board_id, position")
        .in("board_id", boardIds),
      supabase
        .from("items")
        .select("board_id, tier_id, image_url, position")
        .in("board_id", boardIds)
        .not("tier_id", "is", null)
        .not("image_url", "is", null),
    ]);

    const tierPositionById = new Map(
      (tiers ?? []).map((t) => [t.id, t.position]),
    );
    // 段の順番→段内でのアイテムの順番、の2段階で「最も上位・左」を判定する
    const bestRankByBoard = new Map<string, [number, number]>();

    for (const item of items ?? []) {
      if (!item.tier_id || !item.image_url) continue;
      const tierPosition = tierPositionById.get(item.tier_id);
      if (tierPosition === undefined) continue;

      const rank: [number, number] = [tierPosition, item.position];
      const best = bestRankByBoard.get(item.board_id);
      const isBetter =
        !best || rank[0] < best[0] || (rank[0] === best[0] && rank[1] < best[1]);

      if (isBetter) {
        bestRankByBoard.set(item.board_id, rank);
        previewByBoard.set(item.board_id, item.image_url);
      }
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Tier表一覧</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <form action={createBoard}>
            <SubmitButton pendingText="作成中…">
              <Plus className="size-4" />
              新規作成
            </SubmitButton>
          </form>
          <ImportBoardDialog />
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>

      {!boards || boards.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-24 text-center">
          <p className="text-muted-foreground">まだTier表がありません</p>
          <form action={createBoard}>
            <SubmitButton pendingText="作成中…" variant="outline">
              最初のTier表を作成
            </SubmitButton>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => {
            const previewUrl =
              board.cover_image_url ?? previewByBoard.get(board.id) ?? null;

            return (
              <div
                key={board.id}
                className="relative flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <Link
                  href={`/boards/${board.id}`}
                  className="flex flex-1 flex-col gap-3"
                >
                  <div className="relative aspect-video overflow-hidden rounded-lg bg-secondary">
                    {previewUrl ? (
                      <Image
                        src={previewUrl}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                        プレビューなし
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-medium">{board.title}</h2>
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge variant={board.is_public ? "default" : "secondary"}>
                        {board.is_public ? "公開" : "非公開"}
                      </Badge>
                      {board.is_public && board.allow_public_edit && (
                        <Badge variant="outline">編集可</Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    更新:{" "}
                    {new Date(board.updated_at).toLocaleDateString("ja-JP")}
                  </p>
                </Link>
                {board.user_id === user.id && (
                  <div className="absolute right-3 top-3">
                    <DeleteBoardButton
                      boardId={board.id}
                      boardTitle={board.title}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
