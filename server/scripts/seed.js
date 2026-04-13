import bcrypt from "bcryptjs";
import fs from "fs/promises";
import mysql from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "../src/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const categoryList = [
  "校园跑腿",
  "技能协助",
  "资料整理",
  "设备维修",
  "生活服务",
  "内容创作",
];

const userSeeds = [
  { username: "chenxi", bio: "擅长活动策划和流程推进。", phone: "13810000001", email: "chenxi@example.com" },
  { username: "linyan", bio: "擅长简历优化与视觉表达。", phone: "13810000002", email: "linyan@example.com" },
  { username: "zhoumo", bio: "擅长电脑维护和脚本处理。", phone: "13810000003", email: "zhoumo@example.com" },
  { username: "wenqing", bio: "擅长文案与演示材料打磨。", phone: "13810000004", email: "wenqing@example.com" },
  { username: "gaoyuan", bio: "校内跑腿响应快。", phone: "13810000005", email: "gaoyuan@example.com" },
  { username: "xinyue", bio: "可做短视频剪辑和海报。", phone: "13810000006", email: "xinyue@example.com" },
];

const bountySeeds = [
  {
    title: "图书馆代占座",
    description: "明早 7:20 帮忙在图书馆占一个靠窗座位。",
    rewardAmount: 35,
    category: "校园跑腿",
    status: "recruiting",
    publisher: "chenxi",
  },
  {
    title: "课程答辩 PPT 优化",
    description: "已有内容稿，需要统一视觉风格并补充封面页。",
    rewardAmount: 260,
    category: "技能协助",
    status: "in_progress",
    publisher: "wenqing",
  },
  {
    title: "采访录音转写",
    description: "45 分钟录音转文字并按主题分段。",
    rewardAmount: 200,
    category: "资料整理",
    status: "in_progress",
    publisher: "qiaomu",
    fallbackPublisher: "chenxi",
  },
  {
    title: "社团活动跟拍",
    description: "跟拍 2 小时并当天交付 20 张精修。",
    rewardAmount: 300,
    category: "内容创作",
    status: "completed",
    publisher: "linyan",
  },
  {
    title: "宿舍路由器排障",
    description: "网络频繁断线，需要现场排查。",
    rewardAmount: 90,
    category: "设备维修",
    status: "recruiting",
    publisher: "gaoyuan",
  },
  {
    title: "周末市集搭展",
    description: "协助搬运和布置展位，约 3 小时。",
    rewardAmount: 140,
    category: "生活服务",
    status: "recruiting",
    publisher: "chenxi",
  },
  {
    title: "旧笔记本重装系统",
    description: "安装系统与常用办公软件。",
    rewardAmount: 160,
    category: "设备维修",
    status: "completed",
    publisher: "zhoumo",
  },
];

const applicationSeeds = [
  { bountyIndex: 0, applicant: "gaoyuan", status: "pending", message: "我明早会去图书馆，可以顺路完成。" },
  { bountyIndex: 1, applicant: "linyan", status: "accepted", message: "今晚先给你出一版模板。" },
  { bountyIndex: 2, applicant: "xinyue", status: "accepted", message: "可以按主题整理并加时间轴。" },
  { bountyIndex: 3, applicant: "xinyue", status: "accepted", message: "可以当天完成基础精修。" },
  { bountyIndex: 4, applicant: "zhoumo", status: "pending", message: "我有工具，今晚可以去排查。" },
  { bountyIndex: 4, applicant: "linyan", status: "rejected", message: "可以明天中午过去帮看。" },
];

function hoursAgo(hours) {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date;
}

async function main() {
  const shouldReset = process.argv.includes("--reset");
  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    charset: config.db.charset,
    multipleStatements: true,
  });

  try {
    if (shouldReset) {
      await connection.query(`
        SET FOREIGN_KEY_CHECKS = 0;
        DROP TABLE IF EXISTS bounty_status_logs;
        DROP TABLE IF EXISTS bounty_ratings;
        DROP TABLE IF EXISTS conversation_messages;
        DROP TABLE IF EXISTS conversations;
        DROP TABLE IF EXISTS bounty_applications;
        DROP TABLE IF EXISTS bounties;
        DROP TABLE IF EXISTS bounty_categories;
        DROP TABLE IF EXISTS users;
        SET FOREIGN_KEY_CHECKS = 1;
      `);
    }

    const schemaPath = path.resolve(__dirname, "../database/schema.sql");
    const schemaSql = await fs.readFile(schemaPath, "utf8");
    await connection.query(schemaSql);

    const passwordHash = await bcrypt.hash("123456", 10);

    for (let index = 0; index < categoryList.length; index += 1) {
      await connection.execute(
        "INSERT INTO bounty_categories (name, sort_order) VALUES (?, ?) ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order)",
        [categoryList[index], index + 1],
      );
    }

    const [categoryRows] = await connection.execute("SELECT id, name FROM bounty_categories");
    const categoryMap = new Map(categoryRows.map((row) => [row.name, row.id]));

    for (const user of userSeeds) {
      await connection.execute(
        `INSERT INTO users (username, password_hash, avatar_url, bio, phone, email)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           username = VALUES(username),
           avatar_url = VALUES(avatar_url),
           bio = VALUES(bio)`,
        [
          user.username,
          passwordHash,
          `https://api.dicebear.com/8.x/thumbs/svg?seed=${encodeURIComponent(`${user.username}-${user.phone}`)}`,
          user.bio,
          user.phone,
          user.email,
        ],
      );
    }

    const [userRows] = await connection.execute("SELECT id, username FROM users");
    const userMap = new Map(userRows.map((row) => [row.username, row.id]));

    const bountyIds = [];
    for (let index = 0; index < bountySeeds.length; index += 1) {
      const seed = bountySeeds[index];
      const publisherUsername = userMap.has(seed.publisher)
        ? seed.publisher
        : seed.fallbackPublisher || userSeeds[0].username;

      const [result] = await connection.execute(
        `INSERT INTO bounties (publisher_id, category_id, title, description, reward_amount, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userMap.get(publisherUsername),
          categoryMap.get(seed.category),
          seed.title,
          seed.description,
          seed.rewardAmount,
          seed.status,
          hoursAgo(72 - index * 4),
          hoursAgo(36 - index * 2),
        ],
      );
      bountyIds.push(result.insertId);
    }

    const conversationMap = new Map();

    for (const seed of applicationSeeds) {
      const bountyId = bountyIds[seed.bountyIndex];
      const applicantId = userMap.get(seed.applicant);
      const [bountyRows] = await connection.execute(
        "SELECT publisher_id, title FROM bounties WHERE id = ? LIMIT 1",
        [bountyId],
      );
      const bounty = bountyRows[0];

      const [insertResult] = await connection.execute(
        `INSERT INTO bounty_applications (bounty_id, applicant_id, message, status, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [bountyId, applicantId, seed.message, seed.status, hoursAgo(28 - seed.bountyIndex)],
      );

      const [conversationResult] = await connection.execute(
        `INSERT INTO conversations (bounty_id, publisher_id, applicant_id, created_at)
         VALUES (?, ?, ?, ?)`,
        [bountyId, bounty.publisher_id, applicantId, hoursAgo(24 - seed.bountyIndex)],
      );

      conversationMap.set(insertResult.insertId, {
        conversationId: conversationResult.insertId,
        publisherId: bounty.publisher_id,
        applicantId,
      });

      await connection.execute(
        `INSERT INTO conversation_messages (conversation_id, sender_id, content, created_at)
         VALUES (?, ?, ?, ?)`,
        [conversationResult.insertId, applicantId, seed.message, hoursAgo(22 - seed.bountyIndex)],
      );
    }

    for (const [, value] of conversationMap.entries()) {
      await connection.execute(
        `INSERT INTO conversation_messages (conversation_id, sender_id, content, created_at)
         VALUES (?, ?, ?, ?)`,
        [value.conversationId, value.publisherId, "收到，稍后确认细节。", hoursAgo(8)],
      );
    }

    for (const [index, bountyId] of bountyIds.entries()) {
      const seed = bountySeeds[index];
      if (seed.status === "recruiting") {
        continue;
      }

      const fromStatus = seed.status === "completed" ? "in_progress" : "recruiting";
      await connection.execute(
        `INSERT INTO bounty_status_logs (bounty_id, from_status, to_status, actor_id, actor_role, note, created_at)
         VALUES (?, ?, ?, ?, 'publisher', ?, ?)`,
        [
          bountyId,
          fromStatus,
          seed.status,
          userMap.get(seed.publisher) || userMap.get(userSeeds[0].username),
          "初始化演示数据",
          hoursAgo(12 - index),
        ],
      );
    }

    console.log("数据库初始化完成（schema + seed）。");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
