# Lotus Portfolio & Studio

Lotus 的中英雙語作品集與本機內容後台。[公開網站](https://lotus-030226.github.io/lotus-portfolio/)採 Next.js 靜態匯出；後台是 React、Django API 與 PostgreSQL，只在本機運作。

## 使用入口

在專案根目錄執行 `python3 scripts/local.py start`。

- [個人作品集](http://127.0.0.1:3102/)／[完整作品集](http://127.0.0.1:3102/projects/)
- [本機後台](http://127.0.0.1:8100/studio/)
- [使用與維護：安裝、編輯、發布、備份及測試](docs/guides/使用與維護.md)
- [目前功能、驗證與待辦](docs/status/任務與進度.md)
- [Obsidian 專案入口](專案首頁.md)

## 資料夾分類

| 位置 | 用途 |
| --- | --- |
| `src/` | 公開網站：頁面、元件、翻譯與發布快照。 |
| `admin-ui/` | 自訂內容後台介面。 |
| `cms/` | Django API、資料模型、遷移與後端測試；本案 Python 環境在 cms/.venv。 |
| `public/` | 網站公開素材，含匯出的圖片與 GLB。 |
| `scripts/` | 本機啟動、預覽、準備更新與發布檢查工具。 |
| `tests/` | 前端單元／瀏覽器測試及測試素材。 |
| `docs/guides/` | 使用與維護操作說明。 |
| `docs/status/` | 功能現況、驗證範圍與待辦。 |
| `private/` | 本機私人資料：上傳素材、資料備份、還原版本、當前預覽、帳號及服務狀態。 |
| `private/requirements/` | 原始企劃與履歷核對，只留本機，不進公開 Git。 |
| `private/archive/` | 分類保存的舊快照、預覽、驗證素材與獨立建置。 |
| `.github/` | 手動 GitHub Pages 發布設定。 |

`node_modules/`、`.next/`、`.next-preview/`、`out/`、`admin-ui/dist/`、`test-results/` 是依賴或產物，不作文件存放區。測試截圖及效能資料輸出到 test-results，不進 Git。

package.json、鎖定檔、Next.js／TypeScript／測試工具設定、compose.yaml 及 .env 留在根目錄，供各工具正確尋找。所有操作命令皆從專案根目錄執行。

私人素材、帳密、資料庫及內部需求文件不進 Git；公開內容經後台「準備更新」產生快照，再由使用者手動發布。內容範圍依本機 `private/requirements/` 內的原始資料與使用者後續決定。
