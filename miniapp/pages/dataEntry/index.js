const carbonService = require("../../services/carbon");

Page({
  data: {
    year: "",
    regionCode: "",
    activityDataText: "",
    loading: false,
    error: "",
    success: ""
  },

  onYearChange(e) {
    this.setData({ year: e.detail.value });
  },

  onRegionChange(e) {
    this.setData({ regionCode: e.detail.value });
  },

  onActivityChange(e) {
    this.setData({ activityDataText: e.detail.value });
  },

  async onSubmit() {
    const { year, regionCode, activityDataText } = this.data;
    if (!year || !regionCode) {
      this.setData({ error: "请填写年份和行政区划代码" });
      return;
    }
    let activityData = {};
    if (activityDataText) {
      try {
        activityData = JSON.parse(activityDataText);
      } catch (e) {
        this.setData({ error: "活动数据 JSON 格式不正确" });
        return;
      }
    }
    this.setData({ loading: true, error: "", success: "" });
    try {
      const payload = { year: Number(year), regionCode, activityData };
      const res = await carbonService.createCarbonRecord(payload);
      if (res && !res.error) {
        this.setData({
          success: "数据提交成功！",
          activityDataText: ""
        });
      } else {
        this.setData({ error: res.error || "提交失败" });
      }
    } catch (e) {
      console.error("提交失败", e);
      this.setData({ error: "无法连接服务器，请稍后重试" });
    } finally {
      this.setData({ loading: false });
    }
  }
});

