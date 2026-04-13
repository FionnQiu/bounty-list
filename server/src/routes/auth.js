import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { query } from '../db.js';
import { signToken } from '../utils/jwt.js';
import { serializeUser } from '../utils/serializers.js';

const router = Router();
const phonePattern = /^1\d{10}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeText(value) {
  return String(value || '').trim();
}

function isPhone(value) {
  return phonePattern.test(value);
}

function isEmail(value) {
  return emailPattern.test(value);
}

router.post('/register', async (req, res) => {
  try {
    const username = normalizeText(req.body.username);
    const password = String(req.body.password || '');
    const phone = normalizeText(req.body.phone);
    const email = normalizeText(req.body.email).toLowerCase();

    if (!username || !password || !phone || !email) {
      return res.status(400).json({
        success: false,
        message: '用户名、密码、手机号、邮箱不能为空'
      });
    }

    if (!isPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: '手机号格式不正确'
      });
    }

    if (!isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: '邮箱格式不正确'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密码长度不能少于 6 位'
      });
    }

    const existingPhone = await query('SELECT id FROM users WHERE phone = :phone LIMIT 1', { phone });
    if (existingPhone.length > 0) {
      return res.status(409).json({
        success: false,
        message: '手机号已被使用'
      });
    }

    const existingEmail = await query('SELECT id FROM users WHERE email = :email LIMIT 1', { email });
    if (existingEmail.length > 0) {
      return res.status(409).json({
        success: false,
        message: '邮箱已被使用'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (username, password_hash, avatar_url, bio, phone, email)
       VALUES (:username, :passwordHash, :avatarUrl, :bio, :phone, :email)`,
      {
        username,
        passwordHash,
        avatarUrl: `https://api.dicebear.com/8.x/thumbs/svg?seed=${encodeURIComponent(`${username}-${phone}`)}`,
        bio: '刚加入悬赏榜，期待和大家一起高效互助。',
        phone,
        email
      }
    );

    const users = await query('SELECT * FROM users WHERE id = :id', { id: result.insertId });

    return res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        token: signToken(users[0]),
        user: serializeUser(users[0])
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: '注册失败',
      data: { error: error.message }
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const account = normalizeText(req.body.account).toLowerCase();
    const password = String(req.body.password || '');

    if (!account || !password) {
      return res.status(400).json({
        success: false,
        message: '手机号/邮箱和密码不能为空'
      });
    }

    const byPhone = isPhone(account);
    const byEmail = isEmail(account);

    if (!byPhone && !byEmail) {
      return res.status(400).json({
        success: false,
        message: '请输入正确的手机号或邮箱'
      });
    }

    const users = await query(
      byPhone
        ? 'SELECT * FROM users WHERE phone = :account LIMIT 1'
        : 'SELECT * FROM users WHERE email = :account LIMIT 1',
      { account }
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: '账号或密码错误'
      });
    }

    const matched = await bcrypt.compare(password, users[0].password_hash);
    if (!matched) {
      return res.status(401).json({
        success: false,
        message: '账号或密码错误'
      });
    }

    return res.json({
      success: true,
      message: '登录成功',
      data: {
        token: signToken(users[0]),
        user: serializeUser(users[0])
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: '登录失败',
      data: { error: error.message }
    });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const phone = normalizeText(req.body.phone);
    const email = normalizeText(req.body.email).toLowerCase();
    const newPassword = String(req.body.newPassword || '');

    if (!phone || !email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '手机号、邮箱和新密码不能为空'
      });
    }

    if (!isPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: '手机号格式不正确'
      });
    }

    if (!isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: '邮箱格式不正确'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '新密码长度不能少于 6 位'
      });
    }

    const users = await query(
      'SELECT id FROM users WHERE phone = :phone AND email = :email LIMIT 1',
      { phone, email }
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: '手机号与邮箱不匹配任何用户'
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = :passwordHash WHERE id = :id', {
      id: users[0].id,
      passwordHash
    });

    return res.json({
      success: true,
      message: '密码已重置，请使用新密码登录'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: '重置密码失败',
      data: { error: error.message }
    });
  }
});

export default router;
