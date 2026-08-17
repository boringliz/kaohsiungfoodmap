# 高雄美食地圖

純 HTML、CSS、JavaScript 製作的響應式高雄美食攻略網站，可直接部署到 GitHub Pages。地圖採用 Leaflet + OpenStreetMap，不需要 API Key。

## 本機預覽

不要直接雙擊 `index.html`，請在這個資料夾啟動任一靜態網站伺服器，例如：

```bash
python3 -m http.server 8000
```

再開啟 `http://localhost:8000`。

## 新增餐廳

在 `data/restaurants.js` 的 `window.RESTAURANTS` 陣列加入一個物件。`id` 必須唯一；`district` 與 `category` 會自動變成篩選選項；畫面、地圖與搜尋會自動更新。

必填欄位可直接複製既有店家：`id`、`name`、`district`、`category`、`address`、`hours`、`latitude`、`longitude`、`googleMapsUrl`、`image`、`images`、`recommendedDishes`、`note`、`tags`。

若資料尚未確認，使用 `verified: false`，並在欄位中保留明確的 `TODO`，不要填入猜測資訊。

## 新增推薦路線

在 `data/routes.js` 的 `window.FOOD_ROUTES` 陣列新增路線，並將 `restaurantIds` 依照想走的順序填入餐廳 `id`。Google Maps 路線連結會自動產生。

## 替換照片

把瀏覽器可讀的 JPG、PNG 或 WebP 放進 `assets/images/`，再修改餐廳的 `image`（卡片主圖）與 `images`（詳情圖集）。路徑請維持 `./assets/images/檔名.jpg` 的相對格式。

## 部署到 GitHub Pages

1. 將整個專案完整推送到 GitHub；不要只移動或上傳 `index.html`，`styles.css`、`assets/`、`data/` 與 `js/` 必須一起存在。
2. 到 repository 的 **Settings → Pages**。
3. 在 **Build and deployment** 選擇 **Deploy from a branch**。
4. 選擇 `main` 分支與 `/ (root)`，按下 **Save**。
5. 等待 GitHub 顯示網站網址後即可開啟。

目前專案外層已包含自動入口，GitHub Pages 發布 repository 根目錄時會自動進入 `高雄美食/`。若只上傳內層網站，則應把 `高雄美食` 資料夾內的所有內容一起放到 repository 根目錄；不要只複製 HTML。
