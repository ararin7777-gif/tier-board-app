"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type MintierContent = {
  id: string;
  rank: string;
  caption: string;
  src: string;
  color: string;
};

function extractTierDetail(html: string): {
  title: string;
  contents: MintierContent[];
} {
  const match = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
  );
  if (!match) {
    throw new Error("このURLからはインポートできませんでした");
  }

  let nextData: unknown;
  try {
    nextData = JSON.parse(match[1]);
  } catch {
    throw new Error("ページのデータ解析に失敗しました");
  }

  const tierDetail = (
    nextData as {
      props?: { pageProps?: { tierDetail?: unknown } };
    }
  )?.props?.pageProps?.tierDetail as
    | { title?: string; contents?: MintierContent[] }
    | undefined;

  if (!tierDetail || !Array.isArray(tierDetail.contents)) {
    throw new Error("Tier表のデータが見つかりませんでした");
  }

  return {
    title: tierDetail.title || "インポートしたTier表",
    contents: tierDetail.contents,
  };
}

function guessExtension(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

export async function importFromMintier(sourceUrl: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let html: string;
  try {
    const pageRes = await fetch(sourceUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!pageRes.ok) throw new Error();
    html = await pageRes.text();
  } catch {
    throw new Error("インポート元ページの取得に失敗しました");
  }

  const { title, contents } = extractTierDetail(html);

  // 段の並び順・色をアイテム配列の初出順で決定する
  const rankOrder: { rank: string; color: string }[] = [];
  const seenRanks = new Set<string>();
  for (const c of contents) {
    if (!seenRanks.has(c.rank)) {
      seenRanks.add(c.rank);
      rankOrder.push({ rank: c.rank, color: c.color || "#a3a399" });
    }
  }

  const { data: board, error: boardError } = await supabase
    .from("tier_boards")
    .insert({ user_id: user.id, title })
    .select("id")
    .single();

  if (boardError || !board) {
    console.error("importFromMintier: board insert failed", boardError);
    throw new Error("Tier表の作成に失敗しました");
  }

  const { data: tierRows, error: tiersError } = await supabase
    .from("tiers")
    .insert(
      rankOrder.map((r, index) => ({
        board_id: board.id,
        label: r.rank,
        color: r.color,
        position: index * 10,
      })),
    )
    .select("id, label");

  if (tiersError || !tierRows) {
    console.error("importFromMintier: tiers insert failed", tiersError);
    throw new Error("段の作成に失敗しました");
  }

  const tierIdByLabel = new Map(tierRows.map((t) => [t.label, t.id]));

  // 元の並び順を保ったまま、段ごとの表示順(position)を先に確定させる
  const positionByRank = new Map<string, number>();
  const contentsWithPosition = contents.map((c) => {
    const position = positionByRank.get(c.rank) ?? 0;
    positionByRank.set(c.rank, position + 10);
    return { ...c, position };
  });

  const results = await Promise.all(
    contentsWithPosition.map(async (c) => {
      try {
        const imgRes = await fetch(c.src);
        if (!imgRes.ok) return null;

        const contentType = imgRes.headers.get("content-type") || "image/png";
        const buffer = await imgRes.arrayBuffer();
        const ext = guessExtension(contentType);
        const path = `${user.id}/${board.id}/${crypto.randomUUID()}-imported.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("item-images")
          .upload(path, buffer, { contentType });
        if (uploadError) {
          console.error("importFromMintier: upload failed", uploadError);
          return null;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("item-images").getPublicUrl(path);

        return {
          board_id: board.id,
          tier_id: tierIdByLabel.get(c.rank) ?? null,
          name: c.caption?.trim() || "",
          image_url: publicUrl,
          position: c.position,
        };
      } catch (error) {
        console.error("importFromMintier: item import failed", error);
        return null;
      }
    }),
  );

  const itemRows = results.filter((r): r is NonNullable<typeof r> => r !== null);

  if (itemRows.length > 0) {
    const { error: itemsError } = await supabase.from("items").insert(itemRows);
    if (itemsError) {
      console.error("importFromMintier: items insert failed", itemsError);
    }
  }

  revalidatePath("/boards");
  redirect(`/boards/${board.id}`);
}
