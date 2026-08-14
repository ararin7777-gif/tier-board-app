import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// 全角文字(日本語など)は半角文字の約2倍の幅として概算する
function labelWidthUnits(label: string): number {
  let units = 0;
  for (const ch of label) {
    units += /[^\x01-\x7E\xA1-\xDF]/.test(ch) ? 2 : 1;
  }
  return units;
}

export default async function SharedBoardPage({
  params,
}: PageProps<"/share/[slug]">) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: board } = await supabase
    .from("tier_boards")
    .select("id, title")
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

  const maxLabelUnits = Math.max(
    2,
    ...(tiers ?? []).map((t) => labelWidthUnits(t.label)),
  );
  const chipWidth = Math.max(64, maxLabelUnits * 10 + 24);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-xl font-semibold">{board.title}</h1>
        <p className="text-sm text-muted-foreground">閲覧専用の共有ビュー</p>
      </header>

      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
        {tiers?.map((tier) => (
          <div
            key={tier.id}
            className="flex min-h-16 items-center gap-3 rounded-lg border border-border p-3"
          >
            <span
              title={tier.label}
              className="flex h-10 shrink-0 items-center justify-center truncate rounded-lg px-2 text-sm font-semibold whitespace-nowrap text-white"
              style={{ backgroundColor: tier.color, width: `${chipWidth}px` }}
            >
              {tier.label}
            </span>
            <div className="flex flex-1 flex-wrap items-center gap-2">
              {itemsByTier.get(tier.id)?.map((item) => (
                <div
                  key={item.id}
                  title={item.name}
                  className="flex w-16 flex-col items-center gap-1"
                >
                  <div className="relative size-16 overflow-hidden rounded-lg bg-secondary ring-1 ring-border">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-muted-foreground">
                        {item.name.slice(0, 1) || "?"}
                      </div>
                    )}
                  </div>
                  <span className="w-full truncate text-center text-xs text-muted-foreground">
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
