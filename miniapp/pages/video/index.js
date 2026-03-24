const ENV = require("../../config/env");

Page({
  data: {
    videos: []
  },

  onLoad() {
    // 这里假设与你 Web 前端相同，视频通过静态路径暴露在后端 /Video 下
    const base = ENV.baseUrl.replace(/\/+$/, "");
    this.setData({
      videos: [
        {
          title: "系统总览演示",
          url: `${base}/Video/bj.mp4`,
          poster: ""
        },
        {
          title: "碳排放数据填报示例",
          url: `${base}/Video/%E5%9B%BE%E7%89%87%E8%BD%AC%E5%8A%A8%E5%9B%BE.mp4`,
          poster: ""
        }
      ]
    });
  }
});

