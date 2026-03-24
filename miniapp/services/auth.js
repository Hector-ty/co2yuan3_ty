const { post } = require("../utils/request");

const login = async (credentials) => {
  const res = await post("/auth/login", credentials);
  const data = res.data || {};
  if (data.success) {
    try {
      wx.setStorageSync("user", data.user);
      wx.setStorageSync("token", data.token);
      const app = getApp();
      if (app && app.globalData) {
        app.globalData.user = data.user;
        app.globalData.token = data.token;
      }
    } catch (e) {
      console.error("保存会话失败", e);
    }
  }
  return data;
};

const logout = () => {
  try {
    wx.removeStorageSync("user");
    wx.removeStorageSync("token");
    const app = getApp();
    if (app && app.globalData) {
      app.globalData.user = null;
      app.globalData.token = null;
    }
  } catch (e) {
    console.error("清除会话失败", e);
  }
};

module.exports = {
  login,
  logout
};

