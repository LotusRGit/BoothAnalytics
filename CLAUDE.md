# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 概要

Booth（日本のクリエイター向けECサービス）の注文CSVを読み込み、売上を分析するWindowsデスクトップアプリ。React + Vite でUIを構築し、Electron でデスクトップ化している。

**ソースコードはすべて `BoothAnalytics/` サブディレクトリに置かれている。**

## コマンド

```bash
# 作業ディレクトリ
cd BoothAnalytics

# 依存パッケージインストール
npm install

# ブラウザで開発（推奨・高速）
npm run dev          # http://localhost:5173

# Electronアプリとして起動
npm run electron:dev

# Lintチェック
npm run lint

# Windowsビルド（portable .exe）
npm run electron:build:exe
```

テストは存在しない。

## アーキテクチャ

### データフロー

```
CSV ファイル
  → FileUpload（PapaParseでテキスト読み込み）
  → parseBoothCSV() / mergeBoothCSVs()（正規化・重複排除）
  → App.state { rows[] }
  → Dashboard（日付フィルター・firstSaleDates算出）
  → 各分析コンポーネント（Recharts でグラフ描画）
```

`rows[]` の各要素は `{ date, product, variant, quantity, amount, orderId, itemId, imageUrl, userId }` に正規化済み。

### コンポーネント構成

- **`App.jsx`** — CSVロード前後の画面切り替え（FileUpload ↔ Dashboard）のみ
- **`Dashboard.jsx`** — 4ページのナビゲーション（全体/月次/時間帯/リピーター）と日付範囲フィルターを管理。`firstSaleDates`（商品ごとの初回売上日 Map）をここで算出し、子コンポーネントに渡す
- **`FileUpload.jsx`** — 単一ファイルとフォルダ一括読み込みの両方に対応。複数CSV は `mergeBoothCSVs()` で結合
- **`parseBoothCSV.js`** — 列名を `COLUMN_PATTERNS` で曖昧マッチ（Boothの列名が変わっても対応できるよう複数パターンを保持）。金額は `小計 > 単価×数量 > 合計` の優先順で取得
- **`useBoothThumbnail.js`** — モジュールスコープの `cache` / `pending` Map で重複フェッチを防ぐ。サムネイルは Booth 商品ページの `og:image` をスクレイピングして取得
- **`buildAnalysisPrompt.js`** — Claude API に渡す構造化テキストを生成（月別・商品別・曜日別集計を含む）
- **`AiAnalysis.jsx`** — ユーザーが入力した APIキーと `buildAnalysisPrompt()` の出力を Anthropic API へ送信

### サムネイル取得のプロキシ構成

Boothの商品ページはブラウザから直接取得できないため、プロキシ経由でHTMLを取得している。

| 実行環境 | プロキシ |
|---|---|
| `npm run dev`（ブラウザ） | Vite の `server.proxy`（`/booth-page` → `booth.pm`） |
| `npm run electron:dev` | Electron 内蔵 HTTP サーバー（ポート 57172）|
| ビルド済み exe | 同上（`window.BOOTH_PROXY_PORT` を preload でセット） |

`useBoothThumbnail.js` の `PROXY_BASE` は `window.BOOTH_PROXY_PORT` の有無で自動切り替え。

## 重要な制約

- **Vite の `base: './'`** — Electron の `file://` プロトコルで動作するために必須。変更しないこと
- **`electron/main.cjs`** — CommonJS（`.cjs`）。`import` は使えない
- **列名の自動検出** — CSVの列名変更に対応するため、`parseBoothCSV.js` の `COLUMN_PATTERNS` にパターンを追加する方式。ハードコードしない
- **ESLint** — `react-hooks/set-state-in-effect`（v7の新ルール）は既存コードへの影響を避けるため `warn` に設定済み

## CI/CD

| ワークフロー | トリガー | 内容 |
|---|---|---|
| `.github/workflows/lint.yml` | PR | ESLint実行 |
| `.github/workflows/claude-review.yml` | PR | Claude Opus 4.7 による日本語コードレビュー（要 `ANTHROPIC_API_KEY` Secret） |
| `.github/workflows/release.yml` | `v*.*.*` タグ push | Windows portable .exe をビルドして GitHub Releases に添付 |

リリース手順: `git tag v1.x.x && git push origin v1.x.x`
