# BountyList Ubuntu 24.04 部署指南

此项目适用于单主机部署：

- Nginx 从 `client/dist` 提供 Vue 构建文件
- Nginx 将 `/api` 和 `/uploads` 代理到 Node API (`127.0.0.1:3000`)
- MySQL 运行在同一 Ubuntu 24.04 主机上
- API 通过 systemd 管理，服务名为 `bountylist-api`

## 1. 准备服务器

首先配置 DNS：

- `your-domain.com` -> 服务器公网 IP
- `www.your-domain.com` -> 服务器公网 IP

在云防火墙/安全组中只开放需要的端口：

- `22`
- `80`
- `443`

安装基础软件包：

```bash
sudo apt update
sudo apt install -y nginx mysql-server git curl build-essential certbot python3-certbot-nginx
```

安装 Node.js 20 LTS：

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

## 2. 创建部署用户和目录

```bash
sudo adduser --disabled-password --gecos "" bountylist
sudo mkdir -p /srv/bountylist
sudo chown bountylist:bountylist /srv/bountylist
```

将项目克隆到 `/srv/bountylist`（使用部署用户）。

## 3. 安装依赖并构建前端

```bash
cd /srv/bountylist/client
npm ci
npm run build

cd /srv/bountylist/server
npm ci
mkdir -p uploads/avatars
```

确保 API 用户可以写入头像上传目录：

```bash
sudo chown -R bounty:bounty /srv/bountylist/server/uploads
```

## 4. 初始化 MySQL

首先运行交互式安全加固：

```bash
sudo mysql_secure_installation
```

编辑 `deploy/mysql/init.sql` 中的密码占位符，然后执行：

```bash
sudo mysql < /srv/bountylist/deploy/mysql/init.sql
```

## 5. 配置 API 环境变量

复制示例文件并替换占位符值：

```bash
cd /srv/bountylist/server
cp .env.example .env
```

推荐的生产环境配置：

```env
HOST=127.0.0.1
PORT=3000
JWT_SECRET=替换为长随机密钥
CORS_ORIGIN=https://your-domain.com,https://www.your-domain.com
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=bounty
DB_PASSWORD=替换为你的数据库密码
DB_NAME=bounty_list
DB_CHARSET=utf8mb4_unicode_ci
```

生成强 JWT 密钥（如需要）：

```bash
openssl rand -base64 48
```

## 6. 导入数据库结构和种子数据

只有在 `.env` 指向生产数据库用户后才能运行 seed：

```bash
cd /srv/bountylist/server
npm run db:seed
```

注意：不要在生产环境中使用 `npm run db:reset`，除非你有意要清空数据。

## 7. 安装 systemd 服务

将服务模板复制到 systemd：

```bash
sudo cp /srv/bountylist/deploy/systemd/bountylist-api.service /etc/systemd/system/bountylist-api.service
sudo systemctl daemon-reload
sudo systemctl enable --now bountylist-api
sudo systemctl status bountylist-api
```

## 8. 安装 Nginx 配置

编辑 `deploy/nginx/bountylist.conf` 并替换：

- `your-domain.com`
- `www.your-domain.com`

然后安装并启用站点：

```bash
sudo cp /srv/bountylist/deploy/nginx/bountylist.conf /etc/nginx/sites-available/bountylist
sudo ln -sf /etc/nginx/sites-available/bountylist /etc/nginx/sites-enabled/bountylist
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## 9. 启用 HTTPS

DNS 解析正常后，申请证书：

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

检查自动续期：

```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

## 10. 部署后验证

服务器上的 API：

```bash
curl http://127.0.0.1:3000/api/health
```

常用检查：

- 打开 `https://your-domain.com/`
- 刷新 `/bounties`、`/messages/1`、`/profile` 确认 SPA 回退正常
- 登录并验证 API 请求成功
- 上传头像并确认 `/uploads/avatars/...` 可访问
- 查看 API 日志：`sudo journalctl -u bountylist-api -f`
- 任何配置更改后重新运行 `sudo nginx -t`

## 11. 后续更新应用

```bash
cd /srv/bountylist
git pull

cd /srv/bountylist/client
npm ci
npm run build

cd /srv/bountylist/server
npm ci

sudo systemctl restart bountylist-api
sudo systemctl reload nginx
```