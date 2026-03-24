const authService = require("../../services/auth");

Page({
  data: {
    username: "",
    password: "",
    loading: false,
    error: ""
  },

  onUsernameChange(e) {
    this.setData({ username: e.detail.value });
  },

  onPasswordChange(e) {
    this.setData({ password: e.detail.value });
  },

  async onSubmit() {
    const { username, password } = this.data;
    if (!username || !password) {
      this.setData({ error: "请输入账号和密码" });
      return;
    }
    this.setData({ loading: true, error: "" });
    try {
      const res = await authService.login({ email: username, password });
      if (res && res.success) {
        wx.switchTab
          ? wx.switchTab({ url: "/pages/dashboard/index" })
          : wx.redirectTo({ url: "/pages/dashboard/index" });
      } else {
        this.setData({ error: res.message || "登录失败" });
      }
    } catch (e) {
      console.error("登录失败", e);
      this.setData({ error: "无法连接服务器，请稍后重试" });
    } finally {
      this.setData({ loading: false });
    }
  }
});

