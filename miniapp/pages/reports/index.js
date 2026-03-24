const ENV = require("../../config/env");

Page({
  data: {
    loading: false,
    error: "",
    success: ""
  },

  async onExport() {
    this.setData({ loading: true, error: "", success: "" });
    const app = getApp();
    const token =
      (app && app.globalData && app.globalData.token) ||
      wx.getStorageSync("token") ||
      "";
    const url =
      ENV.baseUrl.replace(/\/+$/, "") + "/api/reports/excel";

    try {
      const fs = wx.getFileSystemManager();
      const tmpPath = `${wx.env.USER_DATA_PATH}/carbon_report.xlsx`;

      wx.downloadFile({
        url,
        header: token ? { Authorization: `Bearer ${token}` } : {},
        success: (res) => {
          if (res.statusCode === 200) {
            // 有的环境下 res.tempFilePath 直接可用，这里仍写入自定义路径以便命名
            fs.saveFile({
              tempFilePath: res.tempFilePath,
              filePath: tmpPath,
              success: () => {
                this.setData({
                  loading: false,
                  success: "报告下载完成，正在打开..."
                });
                wx.openDocument({
                  filePath: tmpPath,
                  fileType: "xlsx"
                });
              },
              fail: (e) => {
                console.error("保存文件失败", e);
                this.setData({
                  loading: false,
                  error: "保存报告失败"
                });
              }
            });
          } else if (res.statusCode === 401) {
            this.setData({
              loading: false,
              error: "未授权，请先登录"
            });
          } else {
            this.setData({
              loading: false,
              error: "导出失败，请稍后重试"
            });
          }
        },
        fail: (e) => {
          console.error("下载失败", e);
          this.setData({
            loading: false,
            error: "无法连接服务器，请检查网络"
          });
        }
      });
    } catch (e) {
      console.error("导出异常", e);
      this.setData({
        loading: false,
        error: "导出失败，请稍后重试"
      });
    }
  }
});

