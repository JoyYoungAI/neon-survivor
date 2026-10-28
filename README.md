# 🚀 Neon Survivor 霓虹生存者

> **基於 pstack 嚴謹工程架構開發的跨平台 HTML5 行動端動作生存遊戲**  
> 支援 iOS / Android 雙平台、直橫向無損自適應、Cloudflare Pages 託管、匿名排行榜與自動高光戰報截圖。

🎮 **線上即玩 (Live Demo)**：[https://neon-survivor-7oo.pages.dev](https://neon-survivor-7oo.pages.dev)  
📦 **GitHub 倉庫**：[https://github.com/JoyYoungAI/neon-survivor](https://github.com/JoyYoungAI/neon-survivor)

---

## 🌟 滿足專案 10 大核心需求

1. **📱 手機遊戲最佳化**：
   - 專為觸控螢幕設計，支援指尖平滑拖曳滑動操作與微慣性 Lerp 追蹤。
   - 整合行動端觸覺回饋（Haptics / `navigator.vibrate`），碰撞時提供真實打擊感。
2. **🍎/🤖 支援雙手機平台 (iOS & Android)**：
   - **iOS Safari**：妥善處理頂部瀏海與底部導覽條 Safe Area（`env(safe-area-inset-*)`），首觸解鎖 Web Audio Context 避免靜音。
   - **Android Chrome**：採用動態視窗高 `100dvh`，克服網址列收合展開時畫面抖動問題。
3. **🔄 直向 / 橫向自適應 (Portrait & Landscape)**：
   - 採用 Phaser 3 的 `Scale.RESIZE` 與自研動態邊界錨定系統。
   - **直向**：狹窄縱深跑道，專注於單手微操與極限閃避。
   - **橫向**：寬螢幕廣闊星域，提供更大戰略空間與兩側 HUD 最佳化排版。
4. **🌐 免安裝，主流瀏覽器即開即玩**：
   - 純 Web 前端標準技術（HTML5 Canvas + WebGL），內建 PWA Web App Manifest，支援「加入主畫面」全螢幕運行。
5. **✨ 美麗科幻字型與排版**：
   - 引入 Google Fonts 高質感科幻字型：`Orbitron`（未來感戰報標題）、`Russo One`（街機街機分數字型）與 `Outfit`（內文）。
   - 實作 `document.fonts.ready` 預載守衛，徹底杜絕 Canvas 文字排版掉字或閃爍。
6. **🎮 搭配開源遊戲引擎**：
   - 選用開源界金牌 2D 遊戲引擎 **Phaser 3**（MIT License）。
   - 零外部圖像相依：採用程序化幾何霓虹向量紋理（戰機、脈衝刺球、能量鑽石、粒子煙花），秒開零破圖。
7. **☁️ 代管於 Cloudflare**：
   - 前端靜態資產部署於 **Cloudflare Pages**。
   - 後端無伺服器 API 整合 **Cloudflare Pages Functions** (`/functions/api/leaderboard.ts`)。
8. **🏆 匿名排行榜機制**：
   - 免註冊、免登入。遊戲結束自動帶入專屬代號（如 `Pilot-742`）或自訂暱稱提交分數。
   - Cloudflare KV 存取 Top 10 全球高分榜，具備前端離線自動降級與本地記憶體快取。
9. **📸 遊戲結束自動精彩戰報截圖**：
   - 當生命值歸零時，即時凍結遊戲畫布緩衝區。
   - 由 `SnapshotService` 自動合成高光戰報圖卡（包含最終成績、存活秒數、能量水晶數、日期戳印與防偽水印）。
   - 串接原生 **Web Share API**（可一鍵分享至 Instagram、LINE、相簿），若瀏覽器不支援則自動降級為 PNG 圖片下載。
10. **🛠️ 100% 遵循 pstack 嚴謹工程標準**：
    - **Throughput Checkpoint**：依序落實阻塞前置步驟、獨立工項與狀態機邊界劃分。
    - **Model the Domain**：使用嚴格型別定義遊戲狀態機（Boot、Menu、Playing、GameOver）。
    - **Boundary Discipline**：API 端點輸入消毒、防作弊邊界防禦與離線降級。
    - **Prove It Works**：以單元測試與自動化建置實機驗證（Node 原生測試套件 3/3 通過）。
    - **Laziness Protocol**：無過度包裝與多餘相依，純粹、精準、高效。

---

## 🛠️ 開發與建置指令

### 本地開發預覽
```bash
npm run dev
# 伺服器啟動於 http://localhost:3000
```

### 執行自動化測試
```bash
npm test
# 執行 API 邊界校驗與排行榜排序測試
```

### 靜態建置 (Production Build)
```bash
npm run build
# 產出優化後的 dist/ 目錄
```

### 部署至 Cloudflare Pages
```bash
# 方式 A：透過 Wrangler CLI 一鍵部署
npx wrangler pages deploy dist --project-name neon-survivor

# 方式 B：將 GitHub 倉庫連結至 Cloudflare Pages Dashboard
# 建置命令：npm run build
# 輸出目錄：dist
```
