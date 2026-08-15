"use server";

import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function togglePublic(boardId: string, isPublic: boolean) {
  const supabase = await createClient();

  let shareSlug: string | null = null;

  if (isPublic) {
    const { data: board, error: fetchError } = await supabase
      .from("tier_boards")
      .select("share_slug")
      .eq("id", boardId)
      .single();

    if (fetchError) {
      console.error("togglePublic: fetch failed", fetchError);
      throw new Error("公開設定の更新に失敗しました");
    }

    shareSlug = board.share_slug ?? nanoid(10);
  }

  const { error } = await supabase
    .from("tier_boards")
    .update(
      isPublic
        ? { is_public: true, share_slug: shareSlug }
        : { is_public: false, allow_public_edit: false },
    )
    .eq("id", boardId);

  if (error) {
    console.error("togglePublic: update failed", error);
    throw new Error("公開設定の更新に失敗しました");
  }

  revalidatePath(`/boards/${boardId}`);
  revalidatePath("/boards");

  return { shareSlug };
}

export async function toggleAllowPublicEdit(boardId: string, allow: boolean) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("tier_boards")
    .update({ allow_public_edit: allow })
    .eq("id", boardId);

  if (error) {
    console.error("toggleAllowPublicEdit: update failed", error);
    throw new Error("編集許可設定の更新に失敗しました");
  }

  revalidatePath(`/boards/${boardId}`);
}

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

export async function createItems(
  boardId: string,
  items: { name: string; imageUrl: string }[],
) {
  if (items.length === 0) return;
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("items")
    .select("position")
    .eq("board_id", boardId)
    .is("tier_id", null)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextPosition = (existing?.position ?? -10) + 10;
  const rows = items.map((item) => {
    const row = {
      board_id: boardId,
      tier_id: null,
      name: item.name,
      image_url: item.imageUrl,
      position: nextPosition,
    };
    nextPosition += 10;
    return row;
  });

  const { error } = await supabase.from("items").insert(rows);

  if (error) {
    console.error("createItems failed", error);
    throw new Error("アイテムの登録に失敗しました");
  }

  revalidatePath(`/boards/${boardId}`);
}

export async function deleteItem(
  boardId: string,
  itemId: string,
  imageUrl: string | null,
) {
  const supabase = await createClient();
  const { error } = await supabase.from("items").delete().eq("id", itemId);

  if (error) {
    console.error("deleteItem failed", error);
    throw new Error("アイテムの削除に失敗しました");
  }

  if (imageUrl) {
    const marker = "/item-images/";
    const idx = imageUrl.indexOf(marker);
    if (idx !== -1) {
      const path = imageUrl.slice(idx + marker.length);
      await supabase.storage.from("item-images").remove([path]);
    }
  }

  revalidatePath(`/boards/${boardId}`);
}

export async function moveItems(
  boardId: string,
  updates: { id: string; tierId: string | null; position: number }[],
) {
  if (updates.length === 0) return;
  const supabase = await createClient();

  const results = await Promise.all(
    updates.map((u) =>
      supabase
        .from("items")
        .update({ tier_id: u.tierId, position: u.position })
        .eq("id", u.id),
    ),
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) {
    console.error("moveItems failed", failed.error);
    throw new Error("アイテムの移動に失敗しました");
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
