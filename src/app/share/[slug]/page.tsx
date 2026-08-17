import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ja-JP");
}

export default async function SharedBoardPage({
  params,
}: PageProps<"/share/[slug]">) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: board } = await supabase
    .from("tier_boards")
    .select("id, title, created_at, updated_at")
    .eq("share_slug", slug)
    .eq("is_public", true)
    .single();

  if (!board) {
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
      .not("tier_id", "is", null)
      .order("position", { ascending: true }),
  ]);

  const itemsByTier = new Map<string, NonNullable<typeof items>>();
  for (const item of items ?? []) {
    if (!item.tier_id) continue;
    const list = itemsByTier.get(item.tier_id) ?? [];
    list.push(item);
    itemsByTier.set(item.tier_id, list);
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

      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-4xl font-semibold">{board.title}</h1>
        <p className="text-sm text-muted-foreground">
          作成日: {formatDate(board.created_at)} | 更新日:{" "}
          {formatDate(board.updated_at)}
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
        {tiers?.map((tier) => (
          <div
            key={tier.id}
            className="flex min-h-24 gap-3 rounded-lg border border-border p-3"
          >
            <span
              title={tier.label}
              className="flex min-h-24 w-20 shrink-0 items-center justify-center self-stretch truncate rounded-lg px-2 text-sm font-semibold whitespace-nowrap text-white"
              style={{ backgroundColor: tier.color }}
            >
              {tier.label}
            </span>
            <div className="flex flex-1 flex-wrap content-center items-center gap-2">
              {itemsByTier.get(tier.id)?.map((item) => (
                <div
                  key={item.id}
                  title={item.name}
                  className="flex flex-col items-center gap-1"
                >
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url}
                      alt={item.name}
                      loading="lazy"
                      className="max-h-24 max-w-32 rounded-lg bg-secondary ring-1 ring-border"
                    />
                  ) : (
                    <div className="flex size-24 items-center justify-center rounded-lg bg-secondary text-lg font-semibold text-muted-foreground ring-1 ring-border">
                      {item.name.slice(0, 1) || "?"}
                    </div>
                  )}
                  <span className="max-w-32 truncate text-center text-xs text-muted-foreground">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
