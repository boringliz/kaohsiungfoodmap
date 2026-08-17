(function () {
  "use strict";

  const restaurants = window.RESTAURANTS || [];
  const routes = window.FOOD_ROUTES || [];
  const state = { district: "全部", category: "全部", query: "" };
  const markerById = new Map();
  let map = null;
  let markerLayer = null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  const hasLocation = (restaurant) => Number.isFinite(restaurant.latitude) && Number.isFinite(restaurant.longitude);

  function init() {
    $("#hero-count").textContent = restaurants.length;
    renderFilters();
    renderRoutes();
    renderAllRestaurants();
    initMap();
    applyFilters();
    bindEvents();
  }

  function uniqueValues(key) {
    return [...new Set(restaurants.map((restaurant) => restaurant[key]).filter(Boolean))];
  }

  function renderFilters() {
    renderFilterGroup("#district-filters", ["全部", ...uniqueValues("district")], "district");
    renderFilterGroup("#category-filters", ["全部", ...uniqueValues("category")], "category");
  }

  function renderFilterGroup(selector, values, type) {
    $(selector).innerHTML = values.map((value) => `
      <button type="button" class="filter-chip ${value === "全部" ? "active" : ""}" data-filter-type="${type}" data-filter-value="${escapeHtml(value)}" aria-pressed="${value === "全部"}">${escapeHtml(value)}</button>
    `).join("");
  }

  function getFilteredRestaurants() {
    const normalizedQuery = state.query.trim().toLocaleLowerCase("zh-Hant");
    return restaurants.filter((restaurant) => {
      const districtMatches = state.district === "全部" || restaurant.district === state.district;
      const categoryMatches = state.category === "全部" || restaurant.category === state.category;
      const haystack = [restaurant.name, restaurant.district, restaurant.category, restaurant.address, ...(restaurant.recommendedDishes || []), ...(restaurant.tags || [])].join(" ").toLocaleLowerCase("zh-Hant");
      return districtMatches && categoryMatches && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }

  function applyFilters(options = {}) {
    const filtered = getFilteredRestaurants();
    $("#filtered-restaurants").innerHTML = filtered.map((restaurant) => restaurantCard(restaurant, restaurants.indexOf(restaurant) + 1)).join("");
    $("#empty-state").hidden = filtered.length > 0;
    $("#filtered-restaurants").hidden = filtered.length === 0;
    updateResultsLabel(filtered.length);
    updateMap(filtered);
    updateActiveChips();
    if (options.scroll) $("#filters").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateResultsLabel(count) {
    const parts = [];
    if (state.district !== "全部") parts.push(state.district);
    if (state.category !== "全部") parts.push(state.category);
    if (state.query.trim()) parts.push(`「${state.query.trim()}」`);
    $("#results-label").textContent = `${parts.length ? parts.join(" × ") : "全部店家"}｜共 ${count} 間`;
  }

  function updateActiveChips() {
    $$("[data-filter-type]").forEach((button) => {
      const active = state[button.dataset.filterType] === button.dataset.filterValue;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function restaurantCard(restaurant, index) {
    return `
      <article class="restaurant-card" data-restaurant-card="${escapeHtml(restaurant.id)}">
        <div class="card-image" role="button" tabindex="0" aria-label="查看 ${escapeHtml(restaurant.name)} 詳細資訊" data-detail="${escapeHtml(restaurant.id)}">
          <img src="${escapeHtml(restaurant.image)}" alt="${escapeHtml(restaurant.name)}的實際旅遊照片" loading="lazy" decoding="async" />
          <span class="card-index">KAO ${String(index).padStart(2, "0")}</span>
          ${restaurant.verified ? "" : '<span class="unverified">資訊待確認</span>'}
        </div>
        <div class="card-body">
          <div class="card-tags"><span>${escapeHtml(restaurant.district)}</span><span>${escapeHtml(restaurant.category)}</span></div>
          <h3>${escapeHtml(restaurant.name)}</h3>
          <p class="card-info"><span><b>營業</b>　${escapeHtml(restaurant.hours)}</span><span><b>地址</b>　${escapeHtml(restaurant.address)}</span></p>
          <div class="card-actions">
            <button type="button" data-map="${escapeHtml(restaurant.id)}" ${hasLocation(restaurant) ? "" : "disabled"}>${hasLocation(restaurant) ? "查看地圖" : "待補定位"}</button>
            <a href="${escapeHtml(restaurant.googleMapsUrl)}" target="_blank" rel="noopener noreferrer" aria-label="使用 Google Maps 導航到 ${escapeHtml(restaurant.name)}">Google Maps 導航</a>
          </div>
        </div>
      </article>`;
  }

  function renderAllRestaurants() {
    $("#all-restaurants").innerHTML = restaurants.map((restaurant, index) => restaurantCard(restaurant, index + 1)).join("");
  }

  function initMap() {
    if (!window.L) {
      $("#food-map").hidden = true;
      $("#map-fallback").hidden = false;
      return;
    }
    map = L.map("food-map", { scrollWheelZoom: false, zoomControl: false }).setView([22.6273, 120.3014], 13);
    L.control.zoom({ position: "topright" }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    markerLayer = L.layerGroup().addTo(map);
  }

  function updateMap(filtered) {
    const located = filtered.filter(hasLocation);
    $("#map-count").textContent = located.length;
    if (!map || !markerLayer) return;
    markerLayer.clearLayers();
    markerById.clear();
    const icon = L.divIcon({ className: "food-marker", html: "<span>食</span>", iconSize: [34, 34], iconAnchor: [17, 33], popupAnchor: [0, -34] });
    located.forEach((restaurant) => {
      const marker = L.marker([restaurant.latitude, restaurant.longitude], { icon, title: restaurant.name }).bindPopup(popupMarkup(restaurant), { maxWidth: 260 });
      marker.addTo(markerLayer);
      markerById.set(restaurant.id, marker);
    });
    if (located.length === 1) map.setView([located[0].latitude, located[0].longitude], 16, { animate: true });
    if (located.length > 1) map.fitBounds(L.latLngBounds(located.map((restaurant) => [restaurant.latitude, restaurant.longitude])), { padding: [38, 38], maxZoom: 15, animate: true });
  }

  function popupMarkup(restaurant) {
    return `<div class="popup-card"><img src="${escapeHtml(restaurant.image)}" alt="" /><div class="popup-body"><small>${escapeHtml(restaurant.district)} · ${escapeHtml(restaurant.category)}</small><h3>${escapeHtml(restaurant.name)}</h3><p>${escapeHtml(restaurant.hours)}<br>${escapeHtml(restaurant.address)}</p><a href="${escapeHtml(restaurant.googleMapsUrl)}" target="_blank" rel="noopener">Google Maps 導航</a></div></div>`;
  }

  function viewOnMap(id) {
    const restaurant = restaurants.find((item) => item.id === id);
    if (!restaurant || !hasLocation(restaurant)) return;
    state.district = "全部";
    state.category = "全部";
    state.query = "";
    $("#search-input").value = "";
    applyFilters();
    $("#map-section").scrollIntoView({ behavior: "smooth" });
    window.setTimeout(() => {
      map?.setView([restaurant.latitude, restaurant.longitude], 17, { animate: true });
      markerById.get(id)?.openPopup();
    }, 550);
  }

  function renderRoutes() {
    $("#routes-list").innerHTML = routes.map((route, routeIndex) => {
      const stops = route.restaurantIds.map((id) => restaurants.find((restaurant) => restaurant.id === id)).filter(Boolean);
      return `<article class="route-card">
        <div class="route-intro"><span class="route-number">0${routeIndex + 1}</span><h3>${escapeHtml(route.routeName)}</h3><p>${escapeHtml(route.description)}</p>
          <div class="route-meta"><div><span>大約時間</span><b>${escapeHtml(route.duration)}</b></div><div><span>店家數量</span><b>${stops.length} 間</b></div><div><span>適合時段</span><b>${escapeHtml(route.bestTime)}</b></div><div><span>交通方式</span><b>${escapeHtml(route.transport)}</b></div></div>
        </div>
        <div class="route-stops">${stops.map((restaurant, index) => `${index ? '<div class="route-arrow"></div>' : ""}<div class="route-stop"><span class="stop-num">${String(index + 1).padStart(2, "0")}</span><div><b>${escapeHtml(restaurant.name)}</b><small>${escapeHtml(restaurant.recommendedDishes.join("、"))}</small></div><button type="button" data-detail="${escapeHtml(restaurant.id)}">看店家</button></div>`).join("")}
          <a class="button route-link" href="${googleRouteUrl(stops)}" target="_blank" rel="noopener noreferrer">在 Google Maps 開啟路線 ↗</a>
        </div>
      </article>`;
    }).join("");
  }

  function googleRouteUrl(stops) {
    if (!stops.length) return "https://www.google.com/maps";
    const params = new URLSearchParams({ api: "1", origin: stops[0].address, destination: stops[stops.length - 1].address, travelmode: "walking" });
    if (stops.length > 2) params.set("waypoints", stops.slice(1, -1).map((stop) => stop.address).join("|"));
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }

  function openDetail(id) {
    const restaurant = restaurants.find((item) => item.id === id);
    if (!restaurant) return;
    const nearby = hasLocation(restaurant) ? getNearby(restaurant, 3) : [];
    $("#dialog-content").innerHTML = `
      <div class="detail-gallery">${restaurant.images.map((image, index) => `<img src="${escapeHtml(image)}" alt="${escapeHtml(restaurant.name)}照片 ${index + 1}" ${index ? 'loading="lazy"' : ""} />`).join("")}</div>
      <div class="detail-main">
        <p class="section-index">${escapeHtml(restaurant.district)} / ${escapeHtml(restaurant.category)}${restaurant.verified ? "" : " / 資訊待確認"}</p>
        <h2 id="dialog-title">${escapeHtml(restaurant.name)}</h2>
        <p class="detail-note">${escapeHtml(restaurant.note)}</p>
        <div class="detail-facts"><div class="detail-fact"><small>地址</small><b>${escapeHtml(restaurant.address)}</b></div><div class="detail-fact"><small>營業時間</small><b>${escapeHtml(restaurant.hours)}</b><small>${escapeHtml(restaurant.closure)}</small></div><div class="detail-fact"><small>適合什麼時候吃</small><b>${escapeHtml(restaurant.bestFor)}</b></div><div class="detail-fact"><small>資料狀態</small><b>${restaurant.verified ? "已依公開資料整理" : "仍有 TODO 待補"}</b></div></div>
        <h3>這次推薦</h3><ul class="dish-list">${restaurant.recommendedDishes.map((dish) => `<li>${escapeHtml(dish)}</li>`).join("")}</ul>
        <div class="detail-actions"><a class="button primary" href="${escapeHtml(restaurant.googleMapsUrl)}" target="_blank" rel="noopener noreferrer">Google Maps 導航 ↗</a>${hasLocation(restaurant) ? `<button class="button text-button" type="button" data-dialog-map="${escapeHtml(restaurant.id)}">回地圖查看位置</button>` : ""}</div>
        <section class="nearby"><p class="section-index">NEARBY PICKS</p><h3>附近還可以一起吃</h3>${nearby.length ? `<div class="nearby-list">${nearby.map(({ restaurant: item, distance }) => `<button class="nearby-item" type="button" data-detail="${escapeHtml(item.id)}"><b>${escapeHtml(item.name)}</b><small>直線距離約 ${formatDistance(distance)}</small></button>`).join("")}</div>` : "<p>這筆資料尚未有座標，暫時無法計算附近店家。</p>"}</section>
      </div>`;
    const dialog = $("#detail-dialog");
    document.body.classList.add("dialog-open");
    dialog.showModal();
  }

  function closeDialog() {
    const dialog = $("#detail-dialog");
    if (dialog.open) dialog.close();
    document.body.classList.remove("dialog-open");
  }

  function getNearby(origin, count) {
    return restaurants.filter((item) => item.id !== origin.id && hasLocation(item)).map((item) => ({ restaurant: item, distance: haversine(origin.latitude, origin.longitude, item.latitude, item.longitude) })).sort((a, b) => a.distance - b.distance).slice(0, count);
  }

  function haversine(lat1, lon1, lat2, lon2) {
    const toRadians = (degrees) => degrees * Math.PI / 180;
    const radius = 6371;
    const latDelta = toRadians(lat2 - lat1);
    const lonDelta = toRadians(lon2 - lon1);
    const a = Math.sin(latDelta / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(lonDelta / 2) ** 2;
    return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function formatDistance(kilometers) {
    return kilometers < 1 ? `${Math.round(kilometers * 1000 / 10) * 10}m` : `${kilometers.toFixed(1)}km`;
  }

  function clearFilters(scroll = false) {
    state.district = "全部";
    state.category = "全部";
    state.query = "";
    $("#search-input").value = "";
    applyFilters({ scroll });
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const filterButton = event.target.closest("[data-filter-type]");
      if (filterButton) {
        state[filterButton.dataset.filterType] = filterButton.dataset.filterValue;
        applyFilters();
        return;
      }
      const detailButton = event.target.closest("[data-detail]");
      if (detailButton) { openDetail(detailButton.dataset.detail); return; }
      const mapButton = event.target.closest("[data-map]");
      if (mapButton && !mapButton.disabled) { viewOnMap(mapButton.dataset.map); return; }
      const dialogMapButton = event.target.closest("[data-dialog-map]");
      if (dialogMapButton) { const id = dialogMapButton.dataset.dialogMap; closeDialog(); viewOnMap(id); return; }
      const quickButton = event.target.closest("[data-category]");
      if (quickButton) { state.category = quickButton.dataset.category; state.district = "全部"; state.query = ""; $("#search-input").value = ""; applyFilters({ scroll: true }); return; }
      if (event.target.closest("[data-clear]")) clearFilters();
    });
    document.addEventListener("keydown", (event) => {
      const cardImage = event.target.closest(".card-image[data-detail]");
      if (cardImage && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); openDetail(cardImage.dataset.detail); }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); $("#search-input").focus(); }
    });
    $("#search-input").addEventListener("input", (event) => { state.query = event.target.value; applyFilters(); });
    $("#clear-filter").addEventListener("click", () => clearFilters());
    $(".dialog-close").addEventListener("click", closeDialog);
    $("#detail-dialog").addEventListener("click", (event) => { if (event.target === event.currentTarget) closeDialog(); });
    $("#detail-dialog").addEventListener("close", () => document.body.classList.remove("dialog-open"));
    const menuToggle = $(".menu-toggle");
    menuToggle.addEventListener("click", () => { const open = $("#main-nav").classList.toggle("open"); menuToggle.setAttribute("aria-expanded", String(open)); });
    $$("#main-nav a").forEach((link) => link.addEventListener("click", () => { $("#main-nav").classList.remove("open"); menuToggle.setAttribute("aria-expanded", "false"); }));
  }

  init();
})();
