import { SignOutButton } from "@/components/sign-out-button";
import { createClient } from "@/lib/supabase/server";

export default async function BoardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto flex max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tier表一覧</h1>
        <SignOutButton />
      </header>
      <p className="text-muted-foreground">
        ログイン中: {user?.email}
      </p>
      <p className="text-sm text-muted-foreground">
        (ここにTier表の一覧・新規作成機能を実装していきます)
      </p>
    </div>
  );
}
