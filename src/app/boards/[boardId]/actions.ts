"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addTier(boardId: string) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("tiers")
    .select("position")
    .eq("board_id", boardId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPosition = (existing?.position ?? -10) + 10;

  const { error } = await supabase.from("tiers").insert({
    board_id: boardId,
    label: "新しい段",
    color: "#a3a399",
    position: nextPosition,
  });

  if (error) {
    console.error("addTier failed", error);
    throw new Error("段の追加に失敗しました");
  }

  revalidatePath(`/boards/${boardId}`);
}

export async function updateTier(
  boardId: string,
  tierId: string,
  values: { label?: string; color?: string },
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tiers")
    .update(values)
    .eq("id", tierId);

  if (error) {
    console.error("updateTier failed", error);
    throw new Error("段の更新に失敗しました");
  }

  revalidatePath(`/boards/${boardId}`);
}

export async function deleteTier(boardId: string, tierId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tiers").delete().eq("id", tierId);

  if (error) {
    console.error("deleteTier failed", error);
    throw new Error("段の削除に失敗しました");
  }

  revalidatePath(`/boards/${boardId}`);
}

export async function moveTier(
  boardId: string,
  tierId: string,
  direction: "up" | "down",
) {
  const supabase = await createClient();

  const { data: tiers, error: fetchError } = await supabase
    .from("tiers")
    .select("id, position")
    .eq("board_id", boardId)
    .order("position", { ascending: true });

  if (fetchError || !tiers) {
    console.error("moveTier: failed to fetch tiers", fetchError);
    throw new Error("段の並べ替えに失敗しました");
  }

  const index = tiers.findIndex((t) => t.id === tierId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= tiers.length) return;

  const current = tiers[index];
  const target = tiers[swapIndex];

  const [{ error: error1 }, { error: error2 }] = await Promise.all([
    supabase.from("tiers").update({ position: target.position }).eq("id", current.id),
    supabase.from("tiers").update({ position: current.position }).eq("id", target.id),
  ]);

  if (error1 || error2) {
    console.error("moveTier: swap failed", error1, error2);
    throw new Error("段の並べ替えに失敗しました");
  }

  revalidatePath(`/boards/${boardId}`);
}
