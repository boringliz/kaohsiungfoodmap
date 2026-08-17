// 路線也以資料管理；restaurantIds 對應 restaurants.js 內的 id。
window.FOOD_ROUTES = [
  {
    id: "yancheng-afternoon",
    routeName: "鹽埕老茶新味散步線",
    description: "從老茶行吃到新派奶茶，兩站相距不遠，留點時間逛鹽埕老街。",
    duration: "約 2–3 小時",
    bestTime: "午後一路散步到傍晚",
    transport: "步行為主｜捷運鹽埕埔站",
    restaurantIds: ["xiangming-tea", "jinlianfa"]
  },
  {
    id: "qianjin-lunch-dessert",
    routeName: "前金午餐 × 甜湯補給線",
    description: "先把握小張海產粥的午間時段，再往三民市場吃冰，最後往漢神方向帶杯奶茶。",
    duration: "約 3–4 小時",
    bestTime: "10:30–15:00 之間出發",
    transport: "步行＋短程公車／共享單車",
    restaurantIds: ["xiaozhang-seafood-porridge", "huangjia-ice", "blike-kaohsiung"]
  }
];
