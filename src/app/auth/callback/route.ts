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

  return NextResponse.redirect(
    `${origin}/login?error=confirmation_failed`,
  );
}
