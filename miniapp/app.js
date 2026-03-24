App({
  globalData: {
    user: null,
    token: null
  },
  onLaunch() {
    try {
      const user = wx.getStorageSync('user');
      const token = wx.getStorageSync('token');
      if (user && token) {
        this.globalData.user = user;
        this.globalData.token = token;
      }
    } catch (e) {
      console.error('加载本地会话失败', e);
    }
  }
});

