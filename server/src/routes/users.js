import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { serializeBounty, serializeUser } from '../utils/serializers.js';

const router = Router();
const phonePattern = /^1\d{10}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const avatarMimeToExt = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif'
};
const maxAvatarSize = 5 * 1024 * 1024;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const avatarUploadDir = path.resolve(__dirname, '../../uploads/avatars');

function normalizeText(value) {
  return String(value || '').trim();
}

async function hasTable(tableName) {
  const rows = await query(
    `SELECT COUNT(*) AS total
     FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name = :tableName
     LIMIT 1`,
    { tableName }
  );

  return Number(rows[0]?.total || 0) > 0;
}

function serializeRatingItem(row) {
  return {
    id: row.id,
    score: Number(row.score || 0),
    comment: row.comment || '',
    createdAt: row.created_at,
    bounty: serializeBounty({
      id: row.bounty_id,
      title: row.bounty_title,
      description: '',
      reward_amount: row.bounty_reward_amount,
      status: row.bounty_status,
      created_at: row.bounty_created_at,
      updated_at: row.bounty_updated_at,
      category_id: row.category_id,
      category_name: row.category_name,
      publisher_id: row.publisher_id,
      publisher_username: row.publisher_username,
      publisher_avatar_url: row.publisher_avatar_url
    }),
    counterpartUser: {
      id: row.counterpart_id,
      username: row.counterpart_username,
      avatarUrl: row.counterpart_avatar_url
    }
  };
}

function parseAvatarDataUrl(dataUrl) {
  if (!dataUrl) {
    return null;
  }

  const matched = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!matched) {
    return null;
  }

  const [, mime, base64Body] = matched;
  const ext = avatarMimeToExt[mime.toLowerCase()];
  if (!ext) {
    return null;
  }

  const buffer = Buffer.from(base64Body, 'base64');
  if (!buffer.length) {
    return null;
  }

  return { buffer, ext };
}

function toPublicAvatarPath(filename) {
  return `/uploads/avatars/${filename}`;
}

async function removeLocalAvatarIfNeeded(avatarUrl) {
  if (!avatarUrl || !avatarUrl.startsWith('/uploads/avatars/')) {
    return;
  }

  const localPath = path.join(avatarUploadDir, path.basename(avatarUrl));

  try {
    await unlink(localPath);
  } catch {
    // ignore cleanup failures
  }
}

router.get('/me', requireAuth, async (req, res) => {
  try {
    const users = await query('SELECT * FROM users WHERE id = :id', { id: req.user.id });

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const publishedRows = await query(
      `SELECT b.*, c.name AS category_name, u.username AS publisher_username, u.avatar_url AS publisher_avatar_url
       FROM bounties b
       JOIN bounty_categories c ON c.id = b.category_id
       JOIN users u ON u.id = b.publisher_id
       WHERE b.publisher_id = :userId
       ORDER BY b.created_at DESC
       LIMIT 60`,
      { userId: req.user.id }
    );

    const appliedRows = await query(
      `SELECT b.*, c.name AS category_name, u.username AS publisher_username, u.avatar_url AS publisher_avatar_url, a.status AS application_status,
              conv.id AS conversation_id
       FROM bounty_applications a
       JOIN bounties b ON b.id = a.bounty_id
       JOIN bounty_categories c ON c.id = b.category_id
       JOIN users u ON u.id = b.publisher_id
       LEFT JOIN conversations conv
         ON conv.bounty_id = b.id
        AND conv.publisher_id = b.publisher_id
        AND conv.applicant_id = a.applicant_id
       WHERE a.applicant_id = :userId
         AND a.status = 'accepted'
         AND b.status IN ('in_progress', 'pending_confirm', 'completed')
       ORDER BY a.created_at DESC
       LIMIT 60`,
      { userId: req.user.id }
    );

    const publishedCountRows = await query(
      'SELECT COUNT(*) AS total FROM bounties WHERE publisher_id = :userId',
      { userId: req.user.id }
    );
    const appliedCountRows = await query(
      `SELECT COUNT(*) AS total
       FROM bounty_applications a
       JOIN bounties b ON b.id = a.bounty_id
       WHERE a.applicant_id = :userId
         AND a.status = 'accepted'
         AND b.status IN ('in_progress', 'pending_confirm', 'completed')`,
      { userId: req.user.id }
    );

    return res.json({
      success: true,
      message: '获取个人中心成功',
      data: {
        user: serializeUser(users[0]),
        stats: {
          publishedCount: publishedCountRows[0].total,
          appliedCount: appliedCountRows[0].total
        },
        publishedBounties: publishedRows.map(serializeBounty),
        appliedBounties: appliedRows.map((row) => ({
          ...serializeBounty(row),
          applicationStatus: row.application_status,
          conversationId: row.conversation_id || null
        }))
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: '获取个人中心失败',
      data: { error: error.message }
    });
  }
});

router.get('/me/ratings', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const ratingsTableReady = await hasTable('bounty_ratings');

    if (!ratingsTableReady) {
      return res.json({
        success: true,
        message: '获取评价面板成功',
        data: {
          sentRatings: [],
          receivedRatings: [],
          summary: {
            sentCount: 0,
            receivedCount: 0,
            receivedAverageScore: 0
          }
        }
      });
    }

    const sentRows = await query(
      `SELECT r.id,
              r.score,
              r.comment,
              r.created_at,
              b.id AS bounty_id,
              b.title AS bounty_title,
              b.reward_amount AS bounty_reward_amount,
              b.status AS bounty_status,
              b.created_at AS bounty_created_at,
              b.updated_at AS bounty_updated_at,
              b.publisher_id,
              c.id AS category_id,
              c.name AS category_name,
              p.username AS publisher_username,
              p.avatar_url AS publisher_avatar_url,
              target.id AS counterpart_id,
              target.username AS counterpart_username,
              target.avatar_url AS counterpart_avatar_url
       FROM bounty_ratings r
       JOIN bounties b ON b.id = r.bounty_id
       JOIN bounty_categories c ON c.id = b.category_id
       JOIN users p ON p.id = b.publisher_id
       JOIN users target ON target.id = r.target_user_id
       WHERE r.rater_id = :userId
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT 200`,
      { userId }
    );

    const receivedRows = await query(
      `SELECT r.id,
              r.score,
              r.comment,
              r.created_at,
              b.id AS bounty_id,
              b.title AS bounty_title,
              b.reward_amount AS bounty_reward_amount,
              b.status AS bounty_status,
              b.created_at AS bounty_created_at,
              b.updated_at AS bounty_updated_at,
              b.publisher_id,
              c.id AS category_id,
              c.name AS category_name,
              p.username AS publisher_username,
              p.avatar_url AS publisher_avatar_url,
              rater.id AS counterpart_id,
              rater.username AS counterpart_username,
              rater.avatar_url AS counterpart_avatar_url
       FROM bounty_ratings r
       JOIN bounties b ON b.id = r.bounty_id
       JOIN bounty_categories c ON c.id = b.category_id
       JOIN users p ON p.id = b.publisher_id
       JOIN users rater ON rater.id = r.rater_id
       WHERE r.target_user_id = :userId
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT 200`,
      { userId }
    );

    const sentCountRows = await query(
      `SELECT COUNT(*) AS total
       FROM bounty_ratings
       WHERE rater_id = :userId`,
      { userId }
    );

    const receivedSummaryRows = await query(
      `SELECT COUNT(*) AS total, AVG(score) AS avg_score
       FROM bounty_ratings
       WHERE target_user_id = :userId`,
      { userId }
    );

    const receivedAverageScore = Number(receivedSummaryRows[0]?.avg_score || 0);

    return res.json({
      success: true,
      message: '获取评价面板成功',
      data: {
        sentRatings: sentRows.map(serializeRatingItem),
        receivedRatings: receivedRows.map(serializeRatingItem),
        summary: {
          sentCount: Number(sentCountRows[0]?.total || 0),
          receivedCount: Number(receivedSummaryRows[0]?.total || 0),
          receivedAverageScore: Number.isFinite(receivedAverageScore)
            ? Number(receivedAverageScore.toFixed(1))
            : 0
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: '获取评价面板失败',
      data: { error: error.message }
    });
  }
});

router.put('/me', requireAuth, async (req, res) => {
  try {
    const username = normalizeText(req.body.username);
    const bio = normalizeText(req.body.bio);
    const phone = normalizeText(req.body.phone);
    const email = normalizeText(req.body.email).toLowerCase();
    const avatarImageData = normalizeText(req.body.avatarImageData);

    const users = await query('SELECT * FROM users WHERE id = :id', { id: req.user.id });
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    if (!username || !phone || !email) {
      return res.status(400).json({
        success: false,
        message: '用户名、手机号和邮箱不能为空'
      });
    }

    if (username.length > 50) {
      return res.status(400).json({
        success: false,
        message: '用户名不能超过 50 个字符'
      });
    }

    if (!phonePattern.test(phone)) {
      return res.status(400).json({
        success: false,
        message: '手机号格式不正确'
      });
    }

    if (!emailPattern.test(email)) {
      return res.status(400).json({
        success: false,
        message: '邮箱格式不正确'
      });
    }

    const existedByPhone = await query(
      'SELECT id FROM users WHERE phone = :phone AND id <> :id LIMIT 1',
      { phone, id: req.user.id }
    );
    if (existedByPhone.length > 0) {
      return res.status(409).json({
        success: false,
        message: '手机号已被使用'
      });
    }

    const existedByEmail = await query(
      'SELECT id FROM users WHERE email = :email AND id <> :id LIMIT 1',
      { email, id: req.user.id }
    );
    if (existedByEmail.length > 0) {
      return res.status(409).json({
        success: false,
        message: '邮箱已被使用'
      });
    }

    let avatarUrl = users[0].avatar_url || null;
    if (avatarImageData) {
      const parsedAvatar = parseAvatarDataUrl(avatarImageData);
      if (!parsedAvatar) {
        return res.status(400).json({
          success: false,
          message: '头像图片格式不支持，请上传 JPG、PNG、WEBP 或 GIF。'
        });
      }

      if (parsedAvatar.buffer.length > maxAvatarSize) {
        return res.status(400).json({
          success: false,
          message: '头像图片不能超过 5MB。'
        });
      }

      await mkdir(avatarUploadDir, { recursive: true });
      const fileName = `avatar-${req.user.id}-${Date.now()}-${randomUUID()}.${parsedAvatar.ext}`;
      const filePath = path.join(avatarUploadDir, fileName);

      await writeFile(filePath, parsedAvatar.buffer);
      await removeLocalAvatarIfNeeded(avatarUrl);
      avatarUrl = toPublicAvatarPath(fileName);
    }

    await query(
      `UPDATE users
       SET username = :username,
           avatar_url = :avatarUrl,
           bio = :bio,
           phone = :phone,
           email = :email
       WHERE id = :id`,
      {
        id: req.user.id,
        username,
        avatarUrl: avatarUrl || null,
        bio: bio || null,
        phone,
        email
      }
    );

    const nextUsers = await query('SELECT * FROM users WHERE id = :id', { id: req.user.id });

    return res.json({
      success: true,
      message: '个人资料已更新',
      data: {
        user: serializeUser(nextUsers[0])
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: '更新个人资料失败',
      data: { error: error.message }
    });
  }
});

export default router;
