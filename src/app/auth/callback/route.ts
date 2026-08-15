import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// メール確認リンク経由でアクセスされ、認証コードをセッション(Cookie)に交換する
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/boards";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // コード交換に失敗しても、メールソフトの安全確認機能等が先にリンクを
  // 開いてしまい確認自体は完了しているケースが多いため、エラー表示はせず
  // 通常のログイン画面へ案内する(アカウントは既に確認済みでログイン可能)
  return NextResponse.redirect(`${origin}/login`);
}
