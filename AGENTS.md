# Lotus Portfolio 工作規則

遵守工作區根目錄 AGENTS.md；本案需求以原始企劃書及使用者後續決策為準。

- 先讀 README.md、專案首頁.md、docs/status/任務與進度.md 及本次相關設計文件。
- 所有程式、Git、node_modules、鎖定檔、測試與產物在本案資料夾管理，不使用其他專案的環境、程式或資料庫。
- 本地文件與未公開內容可保留缺口；公開頁面不得虛構日期、客戶、成果、角色、截圖、網址或個資。
- 不從其他接案專案自動匯入作品內容，未確認可公開的細節不得展示。
- portfolio records、UI 翻譯、聯絡資訊及社群連結集中在結構化資料；元件不持有個人內容。
- 公開站必須靜態匯出，不使用 Server Actions 或部署時動態 API，不提供履歷下載。最新內容管理方向為本機 PostgreSQL 與自訂後台，管理 API 和資料庫不得成為 github.io 訪客的執行依賴。
- 所有動態效果都須尊重 reduced-motion；3D 載入失敗不阻止閱讀與操作。
- 公開元件經由本案內容介面讀取發布快照；後台必須易用，不使用 Django 原版 admin 頁面或僅換主題。Supabase／雲端後台延後，具體 API 與 UI 架構依核准規格執行。
- 原始企劃書與履歷核對只保存在本機 `private/requirements/`，不可提交至公開 Git。需修改需求時另寫決策，勿覆寫原稿。
- 正式發布、遠端倉庫建立與對外內容確認，須由使用者授權。完成本地建置不等於上線。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
