const { get } = require("../../utils/request");
const { formatNumber } = require("../../utils/format");

Page({
  data: {
    loading: true,
    error: "",
    kpi: null,
    recentList: []
  },

  onShow() {
    this.ensureLoginAndLoad();
  },

  async ensureLoginAndLoad() {
    const token = wx.getStorageSync("token");
    if (!token) {
      wx.redirectTo({ url: "/pages/login/index" });
      return;
    }
    this.loadData();
  },

  async loadData() {
    this.setData({ loading: true, error: "" });
    try {
      // 获取全部/最新碳排放数据，与 Web 端 useDataScreen 中的卡片逻辑保持大致一致（简化版）
      const res = await get("/carbon-data", { limit: 100, page: 1 });
      const list = (res.data && res.data.data) || [];
      if (!Array.isArray(list) || list.length === 0) {
        this.setData({ loading: false, kpi: null, recentList: [] });
        return;
      }

      const sorted = list
        .filter((d) => d && d.calculatedEmissions)
        .sort((a, b) => (b.year || 0) - (a.year || 0));

      if (sorted.length === 0) {
        this.setData({ loading: false, kpi: null, recentList: [] });
        return;
      }

      const latest = sorted[0].calculatedEmissions || {};
      const previous = sorted[1] ? sorted[1].calculatedEmissions || {} : {};

      const kpi = {
        totalEmissions: formatNumber(latest.totalEmissions || 0),
        perCapitaEmissions: formatNumber(latest.emissionIntensityByPerson || 0),
        perAreaEmissions: formatNumber(latest.emissionIntensityByArea || 0)
      };

      const recentList = sorted.slice(0, 10).map((item) => ({
        _id: item._id,
        year: item.year,
        accountName:
          item.account && typeof item.account === "object"
            ? item.account.unitName
            : "",
        totalEmissions: formatNumber(
          item.calculatedEmissions?.totalEmissions || 0
        )
      }));

      this.setData({
        loading: false,
        kpi,
        recentList
      });
    } catch (e) {
      console.error("加载 Dashboard 数据失败", e);
      this.setData({
        loading: false,
        error: "无法加载数据，请稍后重试"
      });
    }
  }
});

