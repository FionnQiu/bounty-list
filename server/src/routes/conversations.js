import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const rows = await query(
      `SELECT c.id,
              c.created_at,
              b.id AS bounty_id,
              b.title AS bounty_title,
              CASE WHEN b.status = 'open' THEN 'recruiting' ELSE b.status END AS bounty_status,
              b.reward_amount,
              CASE WHEN c.publisher_id = :userId THEN a.username ELSE p.username END AS partner_username,
              CASE WHEN c.publisher_id = :userId THEN a.avatar_url ELSE p.avatar_url END AS partner_avatar_url,
              (
                SELECT cm.content
                FROM conversation_messages cm
                WHERE cm.conversation_id = c.id
                ORDER BY cm.created_at DESC, cm.id DESC
                LIMIT 1
              ) AS last_message,
              (
                SELECT cm.created_at
                FROM conversation_messages cm
                WHERE cm.conversation_id = c.id
                ORDER BY cm.created_at DESC, cm.id DESC
                LIMIT 1
              ) AS last_message_at
       FROM conversations c
       JOIN bounties b ON b.id = c.bounty_id
       JOIN users p ON p.id = c.publisher_id
       JOIN users a ON a.id = c.applicant_id
       WHERE c.publisher_id = :userId OR c.applicant_id = :userId
       ORDER BY COALESCE(last_message_at, c.created_at) DESC, c.id DESC`,
      { userId: req.user.id },
    );

    return res.json({
      success: true,
      message: "获取会话列表成功",
      data: {
        items: rows.map((row) => ({
          id: row.id,
          createdAt: row.created_at,
          bounty: {
            id: row.bounty_id,
            title: row.bounty_title,
            status: row.bounty_status,
            rewardAmount: Number(row.reward_amount),
          },
          partner: {
            username: row.partner_username,
            avatarUrl: row.partner_avatar_url,
          },
          lastMessage: row.last_message,
          lastMessageAt: row.last_message_at,
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "获取会话列表失败",
      data: { error: error.message },
    });
  }
});

router.get("/:id/messages", requireAuth, async (req, res) => {
  try {
    const conversationId = Number(req.params.id);

    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      return res.status(400).json({
        success: false,
        message: "会话参数不合法",
      });
    }

    const conversations = await query(
      `SELECT c.*, b.title AS bounty_title,
              CASE WHEN b.status = 'open' THEN 'recruiting' ELSE b.status END AS bounty_status,
              b.reward_amount,
              p.username AS publisher_username, p.avatar_url AS publisher_avatar_url,
              a.username AS applicant_username, a.avatar_url AS applicant_avatar_url
       FROM conversations c
       JOIN bounties b ON b.id = c.bounty_id
       JOIN users p ON p.id = c.publisher_id
       JOIN users a ON a.id = c.applicant_id
       WHERE c.id = :conversationId
         AND (c.publisher_id = :userId OR c.applicant_id = :userId)
       LIMIT 1`,
      { conversationId, userId: req.user.id },
    );

    if (conversations.length === 0) {
      return res.status(404).json({
        success: false,
        message: "会话不存在或无权访问",
      });
    }

    const messages = await query(
      `SELECT cm.id, cm.content, cm.created_at, cm.sender_id, u.username AS sender_username, u.avatar_url AS sender_avatar_url
       FROM conversation_messages cm
       JOIN users u ON u.id = cm.sender_id
       WHERE cm.conversation_id = :conversationId
       ORDER BY cm.created_at ASC, cm.id ASC`,
      { conversationId },
    );

    const current = conversations[0];
    const applicationRows = await query(
      `SELECT id, status, message, created_at
       FROM bounty_applications
       WHERE bounty_id = :bountyId
         AND applicant_id = :applicantId
       LIMIT 1`,
      {
        bountyId: current.bounty_id,
        applicantId: current.applicant_id,
      },
    );

    const application = applicationRows[0] || null;
    const viewerRole = current.publisher_id === req.user.id ? "publisher" : "applicant";
    const isRecruiting = current.bounty_status === "recruiting" || current.bounty_status === "open";
    const canApply =
      viewerRole === "applicant" &&
      isRecruiting &&
      (!application || ["rejected", "withdrawn"].includes(application.status));
    const canAccept = Boolean(
      viewerRole === "publisher" &&
      isRecruiting &&
      application &&
      ["pending", "contacting"].includes(application.status),
    );

    return res.json({
      success: true,
      message: "获取会话消息成功",
      data: {
        conversation: {
          id: current.id,
          bounty: {
            id: current.bounty_id,
            title: current.bounty_title,
            status: current.bounty_status,
            rewardAmount: Number(current.reward_amount),
          },
          participants: {
            publisherId: current.publisher_id,
            applicantId: current.applicant_id,
            publisherUsername: current.publisher_username,
            applicantUsername: current.applicant_username,
            publisherAvatarUrl: current.publisher_avatar_url,
            applicantAvatarUrl: current.applicant_avatar_url,
          },
          interaction: {
            viewerRole,
            canApply,
            canAccept,
            application: application
              ? {
                  id: application.id,
                  status: application.status,
                  message: application.message,
                  createdAt: application.created_at,
                }
              : null,
          },
        },
        messages: messages.map((row) => ({
          id: row.id,
          content: row.content,
          createdAt: row.created_at,
          senderId: row.sender_id,
          senderUsername: row.sender_username,
          senderAvatarUrl: row.sender_avatar_url,
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "获取会话消息失败",
      data: { error: error.message },
    });
  }
});

router.post("/:id/messages", requireAuth, async (req, res) => {
  try {
    const conversationId = Number(req.params.id);
    const content = String(req.body.content || "").trim();

    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      return res.status(400).json({
        success: false,
        message: "会话参数不合法",
      });
    }

    if (!content) {
      return res.status(400).json({
        success: false,
        message: "消息内容不能为空",
      });
    }

    const conversations = await query(
      `SELECT c.id
       FROM conversations c
       WHERE c.id = :conversationId
         AND (c.publisher_id = :userId OR c.applicant_id = :userId)
       LIMIT 1`,
      { conversationId, userId: req.user.id },
    );

    if (conversations.length === 0) {
      return res.status(404).json({
        success: false,
        message: "会话不存在或无权发送消息",
      });
    }

    const result = await query(
      `INSERT INTO conversation_messages (conversation_id, sender_id, content)
       VALUES (:conversationId, :senderId, :content)`,
      {
        conversationId,
        senderId: req.user.id,
        content,
      },
    );

    const rows = await query(
      `SELECT cm.id, cm.content, cm.created_at, cm.sender_id, u.username AS sender_username, u.avatar_url AS sender_avatar_url
       FROM conversation_messages cm
       JOIN users u ON u.id = cm.sender_id
       WHERE cm.id = :id`,
      { id: result.insertId },
    );

    return res.status(201).json({
      success: true,
      message: "消息发送成功",
      data: {
        message: {
          id: rows[0].id,
          content: rows[0].content,
          createdAt: rows[0].created_at,
          senderId: rows[0].sender_id,
          senderUsername: rows[0].sender_username,
          senderAvatarUrl: rows[0].sender_avatar_url,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "发送消息失败",
      data: { error: error.message },
    });
  }
});

export default router;
