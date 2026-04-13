# 悬赏榜 - 在线互助平台

一个基于 `Vue 3 + Vite + Express + MySQL` 的单页面互助平台示例项目，包含：

- 注册 / 登录
- 悬赏列表与悬赏详情
- 基于悬赏申请自动创建的一对一会话
- 个人中心资料维护
- 高仿真 MySQL 种子数据

## 目录结构

```text
client/   Vue 3 单页应用
server/   Express API 服务
```

## 启动步骤

1. 创建 MySQL 数据库，例如 `bounty_list`
2. 复制 `server/.env.example` 为 `server/.env` 并填写数据库配置
3. 安装依赖
4. 初始化数据库和种子数据
5. 启动前后端服务

```bash
cd server
npm install
npm run db:reset
npm run dev
```

```bash
cd client
npm install
npm run dev
```

前端开发地址默认为 `http://localhost:5173`，接口代理到 `http://localhost:3000`。

## 演示账号

初始化数据后可直接使用以下账号登录，密码均为 `123456`：

- `chenxi`
- `linyan`
- `zhoumo`
- `wenqing`

