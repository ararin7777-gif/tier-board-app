import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createBoard } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteBoardButton } from "@/components/delete-board-button";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/server";

export default async function BoardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: boards } = await supabase
    .from("tier_boards")
    .select("id, title, is_public, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Tier表一覧</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <form action={createBoard}>
            <Button type="submit">
              <Plus className="size-4" />
              新規作成
            </Button>
          </form>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>

      {!boards || boards.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-24 text-center">
          <p className="text-muted-foreground">まだTier表がありません</p>
          <form action={createBoard}>
            <Button type="submit" variant="outline">
              最初のTier表を作成
            </Button>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <div
              key={board.id}
              className="relative flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <Link
                href={`/boards/${board.id}`}
                className="flex flex-1 flex-col gap-3"
              >
                <div className="flex aspect-video items-center justify-center rounded-lg bg-secondary text-sm text-muted-foreground">
                  プレビューなし
                </div>
                <div className="flex items-start justify-between gap-2 pr-8">
                  <h2 className="font-medium">{board.title}</h2>
                  <Badge
                    variant={board.is_public ? "default" : "secondary"}
                    className="shrink-0"
                  >
                    {board.is_public ? "公開" : "非公開"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  更新:{" "}
                  {new Date(board.updated_at).toLocaleDateString("ja-JP")}
                </p>
              </Link>
              <div className="absolute right-3 top-3">
                <DeleteBoardButton boardId={board.id} boardTitle={board.title} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
