"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DEFAULT_TIERS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export async function createBoard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: board, error: boardError } = await supabase
    .from("tier_boards")
    .insert({ user_id: user.id })
    .select("id")
    .single();

  if (boardError || !board) {
    console.error("createBoard: tier_boards insert failed", boardError);
    throw new Error("Tier表の作成に失敗しました");
  }

  const { error: tiersError } = await supabase.from("tiers").insert(
    DEFAULT_TIERS.map((tier, index) => ({
      board_id: board.id,
      label: tier.label,
      color: tier.color,
      position: index * 10,
    })),
  );

  if (tiersError) {
    console.error("createBoard: tiers insert failed", tiersError);
    throw new Error("Tierの初期化に失敗しました");
  }

  redirect(`/boards/${board.id}`);
}

export async function deleteBoard(boardId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tier_boards")
    .delete()
    .eq("id", boardId);

  if (error) {
    throw new Error("Tier表の削除に失敗しました");
  }

  revalidatePath("/boards");
}

export async function renameBoard(boardId: string, title: string) {
  const supabase = await createClient();
  const trimmed = title.trim();
  if (!trimmed) return;

  const { error } = await supabase
    .from("tier_boards")
    .update({ title: trimmed })
    .eq("id", boardId);

  if (error) {
    throw new Error("タイトルの更新に失敗しました");
  }

  revalidatePath("/boards");
  revalidatePath(`/boards/${boardId}`);
}
