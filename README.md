# BountyList（悬赏协作工作台）

BountyList 是一个基于 `Vue 3 + Vite + Express + MySQL` 的悬赏协作平台，支持从发布招募、申请接取、对话协作、验收到互评的完整闭环。

## 功能概览

- 认证体系
  - 注册、登录、重置密码
  - 登录账号支持：手机号或邮箱
- 悬赏广场
  - 发布悬赏、分类筛选、关键字检索、排序、查看详情
  - 仅展示可见状态数据（招募中等）
- 对话系统
  - 桌面端：会话列表 + 会话详情分栏
  - 移动端：会话列表常驻，点击后全屏弹窗打开会话（URL 同步 `/messages/:id`）
  - 支持申请接取、同意/拒绝接取、消息发送
- 工作台
  - 我发布的：查看申请、编辑招募、关闭招募、进入对话、完成验收、删除已关闭招募、任务完成后互评
  - 我接取的：进入对话、提交验收、任务完成后互评
- 个人中心
  - 编辑头像（图片上传）、用户名、手机号、邮箱、简介
  - 查看评价面板：已发出评价 / 已获得评价

## 悬赏状态模型

系统当前使用 5 个状态：

- `recruiting`：招募中
- `in_progress`：进行中
- `pending_confirm`：待验收
- `completed`：已完成
- `closed`：已关闭（历史/手动关闭）

推荐主流程：`招募中 -> 进行中 -> 待验收 -> 已完成`

关键约束：

- 接取者提交验收：`in_progress -> pending_confirm`
- 发布者完成验收：`pending_confirm -> completed`
- 仅 `recruiting` 可关闭为 `closed`
- 仅 `closed` 可删除

## 技术栈

- 前端：Vue 3、Vue Router、Vite、Axios
- 后端：Express、mysql2、jsonwebtoken、bcryptjs
- 数据库：MySQL 8+

## 项目结构

```text
client/  前端应用（Vue 3 + Vite）
server/  后端 API（Express + MySQL）
```

## 环境要求

- Node.js 18+
- npm 9+
- MySQL 8+

## 快速开始

### 1) 配置后端环境变量

```bash
cp server/.env.example server/.env
```

Windows PowerShell：

```powershell
Copy-Item server/.env.example server/.env
```

`server/.env` 示例：

```env
PORT=3000
JWT_SECRET=change-this-secret
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456
DB_NAME=bounty_list
```

### 2) 启动后端

```bash
cd server
npm install
npm run db:reset
npm run dev
```

### 3) 启动前端

```bash
cd client
npm install
npm run dev
```

默认地址：

- 前端：[http://localhost:5173](http://localhost:5173)
- 后端：[http://localhost:3000](http://localhost:3000)
- 健康检查：[http://localhost:3000/api/health](http://localhost:3000/api/health)

## 演示账号（种子数据）

统一密码：`123456`

| 用户名 | 手机号 | 邮箱 |
|---|---|---|
| chenxi | 13810000001 | chenxi@example.com |
| linyan | 13810000002 | linyan@example.com |
| zhoumo | 13810000003 | zhoumo@example.com |
| wenqing | 13810000004 | wenqing@example.com |
| gaoyuan | 13810000005 | gaoyuan@example.com |
| xinyue | 13810000006 | xinyue@example.com |

## 常用脚本

### server

- `npm run dev`：开发模式启动后端
- `npm run start`：生产模式启动后端
- `npm run db:seed`：执行 schema + seed（不强制清空）
- `npm run db:reset`：重置并重建数据库
- `npm run db:drop-deadline`：清理历史 deadline 字段（兼容脚本）

### client

- `npm run dev`：开发模式启动前端
- `npm run build`：生产构建
- `npm run preview`：预览构建产物

## 路由与接口概览

### 前端路由

- `/login`：登录 / 注册 / 重置密码
- `/bounties`：悬赏广场
- `/bounties/:id`：悬赏详情
- `/workbench`：工作台
- `/messages/:id?`：对话页
- `/profile`：个人中心

### 后端接口分组

- `/api/auth/*`：认证（注册、登录、重置密码）
- `/api/users/*`：用户资料与评价面板
- `/api/bounties/*`：悬赏与申请
- `/api/conversations/*`：会话与消息
- `/api/workbench/*`：工作台聚合、验收、删除、互评

> 受保护接口需携带 `Authorization: Bearer <token>`。

## 关键数据库对象

- `users`
- `bounty_categories`
- `bounties`
- `bounty_applications`
- `conversations`
- `conversation_messages`
- `bounty_status_logs`
- `bounty_ratings`

## 常见问题

### 1) 前端请求失败

先确认后端是否正常运行：`http://localhost:3000/api/health`。

### 2) 数据库连接失败

检查 `server/.env` 中 `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME`。

### 3) 种子数据异常

在 `server/` 目录执行：

```bash
npm run db:reset
```

### 4) 构建校验

```bash
cd client && npm run build
cd server && node --check src/index.js
```
