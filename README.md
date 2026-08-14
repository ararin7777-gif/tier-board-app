# Tier表メーカー

自分専用のTier表(ティア表)を作成・編集・共有できるWebアプリです。ゲームキャラや好きなものなど、何でも自由にランク付けできます。

## 主な機能

- メールアドレス+パスワードでのログイン(複数端末からアクセス可能)
- Tier表の作成・タイトル編集・削除(1アカウントで複数のTier表を管理)
- 段(Tier)のカスタマイズ(追加・削除・名称変更・色変更・並べ替え)。新規作成時はS/A/B/C/Dのプリセット付き
- 画像の複数枚一括アップロードによるアイテム登録
- ドラッグ&ドロップでのアイテム配置(未評価プール⇔各段、PC・スマホ両対応)
- 公開/非公開の切り替えと、未ログインの第三者でも閲覧できる共有リンク発行
- ライト/ダークモード切り替え

## 技術スタック

- [Next.js 16](https://nextjs.org/)(App Router / TypeScript / Turbopack)
- [Supabase](https://supabase.com/)(認証 / Postgres DB / Storage)
- [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [dnd-kit](https://dndkit.com/)(ドラッグ&ドロップ)
- [next-themes](https://github.com/pacocoursey/next-themes)(ダークモード)
- [Vercel](https://vercel.com/)(ホスティング)

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. Supabaseプロジェクトの準備

1. [supabase.com](https://supabase.com) で新規プロジェクトを作成
2. `supabase/schema.sql` の内容をSupabase Studioの **SQL Editor** で実行(テーブル・RLS・Storageバケットが作成されます)
3. **Project Settings → API Keys** から `Project URL` と `Publishable key`(旧: anon key)を控えておく

### 3. 環境変数の設定

`.env.example` を `.env.local` にコピーし、Supabaseの値を入力してください。

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=Supabaseのプロジェクトの値
NEXT_PUBLIC_SUPABASE_ANON_KEY=Supabaseのプロジェクトの値
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開いて確認できます。

## デプロイ(Vercel)

1. GitHubリポジトリをVercelにインポート
2. 上記の環境変数(3つ)をVercelのプロジェクト設定に登録
3. デプロイ後に発行されたURLを、Supabaseの **Authentication → URL Configuration** の「Site URL」「Redirect URLs」に追加登録する(これを忘れるとメール確認リンクが正しく機能しません)
