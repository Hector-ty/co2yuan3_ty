const ENV = require("../config/env");

const buildUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const prefix = ENV.apiPrefix || "";
  return ENV.baseUrl.replace(/\/+$/, "") + prefix + (path.startsWith("/") ? path : `/${path}`);
};

const request = (options) => {
  const app = getApp();
  const token = (app && app.globalData && app.globalData.token) || wx.getStorageSync("token") || "";

  return new Promise((resolve, reject) => {
    wx.request({
      url: buildUrl(options.url),
      method: options.method || "GET",
      data: options.data || {},
      header: {
        "Content-Type": "application/json",
        ...(options.header || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      success(res) {
        if (res.statusCode === 401) {
          // 未授权，跳转登录
          wx.removeStorageSync("token");
          wx.removeStorageSync("user");
          if (app) {
            app.globalData.token = null;
            app.globalData.user = null;
          }
          wx.redirectTo({ url: "/pages/login/index" });
          reject(res);
          return;
        }
        resolve(res);
      },
      fail(err) {
        reject(err);
      }
    });
  });
};

const get = (url, data, options = {}) =>
  request({ url, data, method: "GET", ...options });

const post = (url, data, options = {}) =>
  request({ url, data, method: "POST", ...options });

module.exports = {
  request,
  get,
  post
};

