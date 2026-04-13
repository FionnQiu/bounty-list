export const AUTH_TEXT = {
  brand: "BountyList",
  title: "悬赏榜-在线互助平台",
  subtitle: "发布悬赏、接取悬赏、实时对话沟通。",
  keywords: ["发布", "接取", "对话"],
  authPanelAria: "身份认证",
  authSwitchAria: "登录注册切换",
  login: "登录",
  register: "注册",
  accountLabel: "手机号或邮箱",
  accountPlaceholder: "请输入手机号或邮箱",
  password: "密码",
  passwordPlaceholder: "请输入密码",
  showPassword: "显示密码",
  hidePassword: "隐藏密码",
  loginLoading: "登录中...",
  enterBounty: "进入悬赏广场",
  username: "用户名",
  usernamePlaceholder: "请输入用户名",
  phone: "手机号",
  phonePlaceholder: "请输入手机号",
  email: "邮箱",
  emailPlaceholder: "请输入邮箱",
  confirmPassword: "确认密码",
  confirmPasswordPlaceholder: "请再次输入密码",
  registerLoading: "注册中...",
  createAndEnter: "创建账号并进入",
};

export const AUTH_FALLBACK = {
  loginFailed: "登录失败，请检查账号和密码。",
  registerFailed: "注册失败，请稍后重试。",
};

export const REGISTER_ERRORS = {
  phone: "手机号必须为 11 位数字。",
  email: "邮箱格式不正确，请重新输入。",
  password: (minLength) => `密码不能少于 ${minLength} 位。`,
  confirmPasswordMin: (minLength) => `确认密码不能少于 ${minLength} 位。`,
  confirmPasswordMismatch: "两次输入的密码不一致。",
};
