const authService = require("../../services/auth");

Page({
  data: {
    user: null
  },

  onShow() {
    try {
      const user = wx.getStorageSync("user");
      this.setData({ user: user || null });
    } catch (e) {
      console.error("读取用户信息失败", e);
      this.setData({ user: null });
    }
  },

  goLogin() {
    wx.redirectTo({ url: "/pages/login/index" });
  },

  onLogout() {
    authService.logout();
    wx.redirectTo({ url: "/pages/login/index" });
  }
});

