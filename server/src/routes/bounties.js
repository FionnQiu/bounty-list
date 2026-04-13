import { Router } from "express";
import { getConnection, query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { serializeBounty } from "../utils/serializers.js";
import {
  ACTOR_ROLE,
  BOUNTY_STATUS,
  canTransitionStatus,
  formatBountyStatusLabel,
  isBountyStatusValid,
  normalizeBountyStatus,
  resolveActorRole,
} from "../utils/statusMachine.js";

const router = Router();

function normalizeText(value) {
  return String(value || "").trim();
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : NaN;
}

function normalizeStoredStatus(status) {
  const raw = normalizeBountyStatus(status);
  if (raw === "open") {
    return BOUNTY_STATUS.RECRUITING;
  }
  return raw;
}

function isMissingTableError(error) {
  return error?.code === "ER_NO_SUCH_TABLE" || Number(error?.errno) === 1146;
}

async function insertStatusLogSafely(connection, payload) {
  try {
    await connection.execute(
      `INSERT INTO bounty_status_logs (bounty_id, from_status, to_status, actor_id, actor_role, note)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        payload.bountyId,
        payload.fromStatus,
        payload.toStatus,
        payload.actorId,
        payload.actorRole,
        payload.note || null,
      ],
    );
  } catch (error) {
    if (isMissingTableError(error)) {
      return;
    }
    throw error;
  }
}

function serializeApplication(row) {
  return {
    id: row.id,
    bountyId: row.bounty_id,
    applicantId: row.applicant_id,
    applicantUsername: row.applicant_username,
    applicantAvatarUrl: row.applicant_avatar_url,
    status: row.status,
    message: row.message,
    conversationId: row.conversation_id || null,
    createdAt: row.created_at,
  };
}

async function getBountyWithPublisherById(id) {
  const rows = await query(
    `SELECT b.*, c.name AS category_name, u.username AS publisher_username, u.avatar_url AS publisher_avatar_url,
            u.bio AS publisher_bio, u.email AS publisher_email, u.phone AS publisher_phone,
            (
              SELECT ba.applicant_id
              FROM bounty_applications ba
              WHERE ba.bounty_id = b.id AND ba.status = 'accepted'
              ORDER BY ba.id DESC
              LIMIT 1
            ) AS accepted_applicant_id
     FROM bounties b
     JOIN bounty_categories c ON c.id = b.category_id
     JOIN users u ON u.id = b.publisher_id
     WHERE b.id = :id
     LIMIT 1`,
    { id },
  );

  return rows[0] || null;
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize || 12), 1), 30);
    const offset = (page - 1) * pageSize;

    const keyword = normalizeText(req.query.keyword);
    const status = normalizeBountyStatus(req.query.status);
    const categoryId = normalizeText(req.query.categoryId);
    const sort = normalizeText(req.query.sort) || "latest";

    const where = ["1 = 1"];
    const filterParams = {};

    if (keyword) {
      where.push("(b.title LIKE :keyword OR b.description LIKE :keyword)");
      filterParams.keyword = `%${keyword}%`;
    }

    if (categoryId) {
      const categoryNum = Number(categoryId);
      if (Number.isInteger(categoryNum) && categoryNum > 0) {
        where.push("b.category_id = :categoryId");
        filterParams.categoryId = categoryNum;
      }
    }

    if (status) {
      const normalizedStatus = status === "open" ? BOUNTY_STATUS.RECRUITING : status;
      if (normalizedStatus === BOUNTY_STATUS.RECRUITING) {
        // 兼容历史数据中的 open 状态
        where.push("(b.status = :statusRecruiting OR b.status = :statusOpen)");
        filterParams.statusRecruiting = BOUNTY_STATUS.RECRUITING;
        filterParams.statusOpen = "open";
      } else if (isBountyStatusValid(normalizedStatus)) {
        where.push("b.status = :status");
        filterParams.status = normalizedStatus;
      }
    }

    const orderByMap = {
      latest: "b.created_at DESC",
      reward_desc: "b.reward_amount DESC",
      reward_asc: "b.reward_amount ASC",
    };
    const orderBy = orderByMap[sort] || orderByMap.latest;

    const rows = await query(
      `SELECT b.*, c.name AS category_name, u.username AS publisher_username, u.avatar_url AS publisher_avatar_url
       FROM bounties b
       JOIN bounty_categories c ON c.id = b.category_id
       JOIN users u ON u.id = b.publisher_id
       WHERE ${where.join(" AND ")}
       ORDER BY ${orderBy}
       LIMIT ${pageSize} OFFSET ${offset}`,
      filterParams,
    );

    const totalRows = await query(
      `SELECT COUNT(*) AS total
       FROM bounties b
       WHERE ${where.join(" AND ")}`,
      filterParams,
    );

    const categories = await query(
      "SELECT id, name FROM bounty_categories ORDER BY sort_order ASC, id ASC",
    );

    return res.json({
      success: true,
      message: "获取悬赏列表成功",
      data: {
        items: rows.map(serializeBounty),
        categories,
        pagination: {
          page,
          pageSize,
          total: totalRows[0].total,
          totalPages: Math.ceil(totalRows[0].total / pageSize),
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "获取悬赏列表失败",
      data: { error: error.message },
    });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const bountyId = Number(req.params.id);
    if (!Number.isInteger(bountyId) || bountyId <= 0) {
      return res.status(400).json({
        success: false,
        message: "悬赏参数不合法",
      });
    }

    const bounty = await getBountyWithPublisherById(bountyId);

    if (!bounty) {
      return res.status(404).json({
        success: false,
        message: "悬赏不存在",
      });
    }

    const applicationRows = await query(
      `SELECT a.*, c.id AS conversation_id
       FROM bounty_applications a
       LEFT JOIN conversations c
         ON c.bounty_id = a.bounty_id
        AND c.applicant_id = a.applicant_id
        AND c.publisher_id = :publisherId
       WHERE a.bounty_id = :bountyId
         AND a.applicant_id = :applicantId
       LIMIT 1`,
      {
        bountyId,
        applicantId: req.user.id,
        publisherId: bounty.publisher_id,
      },
    );

    const viewerApplication = applicationRows[0]
      ? {
          id: applicationRows[0].id,
          status: applicationRows[0].status,
          message: applicationRows[0].message,
          conversationId: applicationRows[0].conversation_id,
        }
      : null;

    let publisherApplications = [];
    if (req.user.id === bounty.publisher_id) {
      const rows = await query(
        `SELECT a.*, u.username AS applicant_username, u.avatar_url AS applicant_avatar_url, c.id AS conversation_id
         FROM bounty_applications a
         JOIN users u ON u.id = a.applicant_id
         LEFT JOIN conversations c
           ON c.bounty_id = a.bounty_id
          AND c.publisher_id = :publisherId
          AND c.applicant_id = a.applicant_id
         WHERE a.bounty_id = :bountyId
         ORDER BY FIELD(a.status, 'pending', 'accepted', 'contacting', 'rejected', 'withdrawn'), a.created_at DESC, a.id DESC`,
        {
          bountyId,
          publisherId: bounty.publisher_id,
        },
      );
      publisherApplications = rows.map(serializeApplication);
    }

    let statusLogRows = [];
    try {
      statusLogRows = await query(
        `SELECT l.id, l.from_status, l.to_status, l.actor_id, l.actor_role, l.note, l.created_at, u.username AS actor_username
         FROM bounty_status_logs l
         JOIN users u ON u.id = l.actor_id
         WHERE l.bounty_id = :bountyId
         ORDER BY l.created_at DESC, l.id DESC
         LIMIT 20`,
        { bountyId },
      );
    } catch (error) {
      if (!isMissingTableError(error)) {
        throw error;
      }
    }

    return res.json({
      success: true,
      message: "获取悬赏详情成功",
      data: {
        bounty: {
          ...serializeBounty(bounty),
          publisher: {
            id: bounty.publisher_id,
            username: bounty.publisher_username,
            avatarUrl: bounty.publisher_avatar_url,
            bio: bounty.publisher_bio,
            email: bounty.publisher_email,
            phone: bounty.publisher_phone,
          },
        },
        viewer: {
          isPublisher: req.user.id === bounty.publisher_id,
          isAcceptedApplicant: bounty.accepted_applicant_id === req.user.id,
          application: viewerApplication,
        },
        applications: publisherApplications,
        statusLogs: statusLogRows.map((row) => ({
          id: row.id,
          fromStatus: normalizeStoredStatus(row.from_status),
          toStatus: normalizeStoredStatus(row.to_status),
          fromStatusLabel: formatBountyStatusLabel(normalizeStoredStatus(row.from_status)),
          toStatusLabel: formatBountyStatusLabel(normalizeStoredStatus(row.to_status)),
          actorId: row.actor_id,
          actorRole: row.actor_role,
          actorUsername: row.actor_username,
          note: row.note,
          createdAt: row.created_at,
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "获取悬赏详情失败",
      data: { error: error.message },
    });
  }
});

router.post("/:id/conversation", requireAuth, async (req, res) => {
  const connection = await getConnection();

  try {
    const bountyId = Number(req.params.id);
    if (!Number.isInteger(bountyId) || bountyId <= 0) {
      return res.status(400).json({
        success: false,
        message: "悬赏参数不合法",
      });
    }

    await connection.beginTransaction();

    const [bountyRows] = await connection.execute(
      `SELECT id, publisher_id, title, status
       FROM bounties
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [bountyId],
    );

    if (bountyRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "悬赏不存在",
      });
    }

    const bounty = bountyRows[0];
    const bountyStatus = normalizeStoredStatus(bounty.status);

    if (bounty.publisher_id === req.user.id) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "不能和自己发布的悬赏创建会话",
      });
    }

    if (bountyStatus !== BOUNTY_STATUS.RECRUITING) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "当前悬赏不在招募中，无法进入对话",
      });
    }

    const [conversationRows] = await connection.execute(
      `SELECT id
       FROM conversations
       WHERE bounty_id = ? AND publisher_id = ? AND applicant_id = ?
       LIMIT 1`,
      [bountyId, bounty.publisher_id, req.user.id],
    );

    let conversationId = conversationRows[0]?.id || null;

    if (!conversationId) {
      const [insertResult] = await connection.execute(
        `INSERT IGNORE INTO conversations (bounty_id, publisher_id, applicant_id)
         VALUES (?, ?, ?)`,
        [bountyId, bounty.publisher_id, req.user.id],
      );

      if (insertResult.insertId) {
        conversationId = insertResult.insertId;
      } else {
        const [latestRows] = await connection.execute(
          `SELECT id
           FROM conversations
           WHERE bounty_id = ? AND publisher_id = ? AND applicant_id = ?
           LIMIT 1`,
          [bountyId, bounty.publisher_id, req.user.id],
        );
        conversationId = latestRows[0]?.id || null;
      }
    }

    if (!conversationId) {
      throw new Error("会话创建失败");
    }

    await connection.commit();

    return res.json({
      success: true,
      message: "进入对话成功",
      data: {
        conversation: {
          id: conversationId,
          bountyId,
          bountyTitle: bounty.title,
        },
      },
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({
      success: false,
      message: "进入对话失败",
      data: { error: error.message },
    });
  } finally {
    connection.release();
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const title = normalizeText(req.body.title);
    const description = normalizeText(req.body.description);
    const rewardAmount = toNumber(req.body.rewardAmount);
    const categoryId = Number(req.body.categoryId);

    const statusInput = normalizeStoredStatus(req.body.status);
    const nextStatus = statusInput || BOUNTY_STATUS.RECRUITING;

    if (!title || !description || !Number.isFinite(rewardAmount) || rewardAmount <= 0 || !Number.isInteger(categoryId) || categoryId <= 0) {
      return res.status(400).json({
        success: false,
        message: "请完整填写悬赏信息",
      });
    }

    if (nextStatus !== BOUNTY_STATUS.RECRUITING) {
      return res.status(400).json({
        success: false,
        message: "新悬赏仅支持招募中状态",
      });
    }

    const categoryRows = await query(
      "SELECT id FROM bounty_categories WHERE id = :id LIMIT 1",
      { id: categoryId },
    );

    if (categoryRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "分类不存在",
      });
    }

    const result = await query(
      `INSERT INTO bounties (publisher_id, category_id, title, description, reward_amount, status)
       VALUES (:publisherId, :categoryId, :title, :description, :rewardAmount, :status)`,
      {
        publisherId: req.user.id,
        categoryId,
        title,
        description,
        rewardAmount,
        status: nextStatus,
      },
    );

    return res.status(201).json({
      success: true,
      message: "悬赏发布成功",
      data: { id: result.insertId },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "发布悬赏失败",
      data: { error: error.message },
    });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  const connection = await getConnection();

  try {
    const bountyId = Number(req.params.id);
    if (!Number.isInteger(bountyId) || bountyId <= 0) {
      return res.status(400).json({
        success: false,
        message: "悬赏参数不合法",
      });
    }

    await connection.beginTransaction();

    const [bountyRows] = await connection.execute(
      `SELECT b.*,
              (
                SELECT ba.applicant_id
                FROM bounty_applications ba
                WHERE ba.bounty_id = b.id AND ba.status = 'accepted'
                ORDER BY ba.id DESC
                LIMIT 1
              ) AS accepted_applicant_id
       FROM bounties b
       WHERE b.id = ?
       LIMIT 1
       FOR UPDATE`,
      [bountyId],
    );

    if (bountyRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "悬赏不存在",
      });
    }

    const bounty = bountyRows[0];
    const currentStatus = normalizeStoredStatus(bounty.status);
    const acceptedApplicantId = bounty.accepted_applicant_id || null;
    const actorRole = resolveActorRole({
      userId: req.user.id,
      publisherId: bounty.publisher_id,
      acceptedApplicantId,
    });

    if (actorRole === ACTOR_ROLE.OTHER) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "无权更新该悬赏",
      });
    }

    const statusInput = normalizeStoredStatus(req.body.status || currentStatus);
    if (!isBountyStatusValid(statusInput)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "悬赏状态不合法",
      });
    }

    if (!canTransitionStatus({ fromStatus: currentStatus, toStatus: statusInput, actorRole })) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "当前角色无权执行该状态迁移",
      });
    }

    if (statusInput === BOUNTY_STATUS.IN_PROGRESS && !acceptedApplicantId) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "当前悬赏尚未确认接单人，不能切换到该状态",
      });
    }

    let nextTitle = bounty.title;
    let nextDescription = bounty.description;
    let nextRewardAmount = Number(bounty.reward_amount);
    let nextCategoryId = bounty.category_id;

    if (actorRole === ACTOR_ROLE.PUBLISHER) {
      nextTitle = normalizeText(req.body.title || bounty.title);
      nextDescription = normalizeText(req.body.description || bounty.description);
      nextRewardAmount = toNumber(req.body.rewardAmount ?? bounty.reward_amount);
      nextCategoryId = Number(req.body.categoryId ?? bounty.category_id);

      if (
        !nextTitle ||
        !nextDescription ||
        !Number.isFinite(nextRewardAmount) ||
        nextRewardAmount <= 0 ||
        !Number.isInteger(nextCategoryId) ||
        nextCategoryId <= 0
      ) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "请完整填写并检查悬赏信息",
        });
      }

      const [categoryRows] = await connection.execute(
        "SELECT id FROM bounty_categories WHERE id = ? LIMIT 1",
        [nextCategoryId],
      );

      if (categoryRows.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "分类不存在",
        });
      }
    }

    await connection.execute(
      `UPDATE bounties
       SET title = ?,
           description = ?,
           reward_amount = ?,
           category_id = ?,
           status = ?
       WHERE id = ?`,
      [
        nextTitle,
        nextDescription,
        nextRewardAmount,
        nextCategoryId,
        statusInput,
        bountyId,
      ],
    );

    if (statusInput !== currentStatus) {
      await insertStatusLogSafely(connection, {
        bountyId,
        fromStatus: currentStatus,
        toStatus: statusInput,
        actorId: req.user.id,
        actorRole,
        note: normalizeText(req.body.statusNote) || null,
      });
    }

    await connection.commit();

    const updatedRow = await getBountyWithPublisherById(bountyId);

    return res.json({
      success: true,
      message: "悬赏已更新",
      data: {
        bounty: serializeBounty(updatedRow),
      },
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({
      success: false,
      message: "更新悬赏失败",
      data: { error: error.message },
    });
  } finally {
    connection.release();
  }
});

router.post("/:id/applications", requireAuth, async (req, res) => {
  const connection = await getConnection();

  try {
    const bountyId = Number(req.params.id);
    const message = normalizeText(req.body.message);

    if (!Number.isInteger(bountyId) || bountyId <= 0) {
      return res.status(400).json({
        success: false,
        message: "悬赏参数不合法",
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "申请说明不能为空",
      });
    }

    await connection.beginTransaction();

    const [bountyRows] = await connection.execute(
      `SELECT b.id, b.publisher_id, b.title, b.status,
              (
                SELECT ba.id
                FROM bounty_applications ba
                WHERE ba.bounty_id = b.id AND ba.status = 'accepted'
                ORDER BY ba.id DESC
                LIMIT 1
              ) AS accepted_application_id,
              (
                SELECT ba.applicant_id
                FROM bounty_applications ba
                WHERE ba.bounty_id = b.id AND ba.status = 'accepted'
                ORDER BY ba.id DESC
                LIMIT 1
              ) AS accepted_applicant_id
       FROM bounties b
       WHERE b.id = ?
       LIMIT 1
       FOR UPDATE`,
      [bountyId],
    );

    if (bountyRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "悬赏不存在",
      });
    }

    const bounty = bountyRows[0];
    const bountyStatus = normalizeStoredStatus(bounty.status);

    if (bounty.publisher_id === req.user.id) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "不能申请自己发布的悬赏",
      });
    }

    if (bountyStatus !== BOUNTY_STATUS.RECRUITING) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "当前悬赏不在招募中，无法申请",
      });
    }

    const [applicationRows] = await connection.execute(
      `SELECT id, status, message
       FROM bounty_applications
       WHERE bounty_id = ? AND applicant_id = ?
       LIMIT 1
       FOR UPDATE`,
      [bountyId, req.user.id],
    );

    let application = applicationRows[0] || null;
    let changed = false;

    if (!application) {
      const [insertResult] = await connection.execute(
        `INSERT INTO bounty_applications (bounty_id, applicant_id, message, status)
         VALUES (?, ?, ?, 'pending')`,
        [bountyId, req.user.id, message],
      );

      application = {
        id: insertResult.insertId,
        status: "pending",
        message,
      };
      changed = true;
    } else if (["rejected", "withdrawn"].includes(application.status)) {
      await connection.execute(
        `UPDATE bounty_applications
         SET status = 'pending', message = ?
         WHERE id = ?`,
        [message, application.id],
      );
      application = {
        ...application,
        status: "pending",
        message,
      };
      changed = true;
    }

    const [conversationRows] = await connection.execute(
      `SELECT id
       FROM conversations
       WHERE bounty_id = ? AND publisher_id = ? AND applicant_id = ?
       LIMIT 1`,
      [bountyId, bounty.publisher_id, req.user.id],
    );

    let conversationId = conversationRows[0]?.id || null;

    if (!conversationId) {
      const [conversationResult] = await connection.execute(
        `INSERT IGNORE INTO conversations (bounty_id, publisher_id, applicant_id)
         VALUES (?, ?, ?)`,
        [bountyId, bounty.publisher_id, req.user.id],
      );

      if (conversationResult.insertId) {
        conversationId = conversationResult.insertId;
        changed = true;
      } else {
        const [latestConversationRows] = await connection.execute(
          `SELECT id
           FROM conversations
           WHERE bounty_id = ? AND publisher_id = ? AND applicant_id = ?
           LIMIT 1`,
          [bountyId, bounty.publisher_id, req.user.id],
        );
        conversationId = latestConversationRows[0]?.id || null;
      }
    }

    if (changed) {
      await connection.execute(
        `INSERT INTO conversation_messages (conversation_id, sender_id, content)
         VALUES (?, ?, ?)`,
        [conversationId, req.user.id, message],
      );
    }

    await connection.commit();

    return res.status(changed ? 201 : 200).json({
      success: true,
      message: changed ? "申请已提交，并已发起对话" : "你已申请该悬赏，已返回现有会话",
      data: {
        application,
        conversation: {
          id: conversationId,
          bountyId,
          bountyTitle: bounty.title,
        },
      },
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({
      success: false,
      message: "提交申请失败",
      data: { error: error.message },
    });
  } finally {
    connection.release();
  }
});

router.post("/:id/applications/:applicationId/review", requireAuth, async (req, res) => {
  const connection = await getConnection();

  try {
    const bountyId = Number(req.params.id);
    const applicationId = Number(req.params.applicationId);
    const decision = normalizeText(req.body.decision);

    if (!Number.isInteger(bountyId) || bountyId <= 0 || !Number.isInteger(applicationId) || applicationId <= 0) {
      return res.status(400).json({
        success: false,
        message: "参数不合法",
      });
    }

    if (!["accepted", "rejected"].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: "审核结果不合法",
      });
    }

    await connection.beginTransaction();

    const [bountyRows] = await connection.execute(
      `SELECT b.id, b.publisher_id, b.title, b.status,
              (
                SELECT ba.applicant_id
                FROM bounty_applications ba
                WHERE ba.bounty_id = b.id AND ba.status = 'accepted'
                ORDER BY ba.id DESC
                LIMIT 1
              ) AS accepted_applicant_id
       FROM bounties b
       WHERE b.id = ?
       LIMIT 1
       FOR UPDATE`,
      [bountyId],
    );

    if (bountyRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "悬赏不存在",
      });
    }

    const bounty = bountyRows[0];
    const bountyStatus = normalizeStoredStatus(bounty.status);

    if (bounty.publisher_id !== req.user.id) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "只有发布者可以审核申请",
      });
    }

    const [applicationRows] = await connection.execute(
      `SELECT a.*
       FROM bounty_applications a
       WHERE a.id = ? AND a.bounty_id = ?
       LIMIT 1
       FOR UPDATE`,
      [applicationId, bountyId],
    );

    if (applicationRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "申请不存在",
      });
    }

    const targetApplication = applicationRows[0];

    const [conversationRows] = await connection.execute(
      `SELECT id
       FROM conversations
       WHERE bounty_id = ? AND publisher_id = ? AND applicant_id = ?
       LIMIT 1`,
      [bountyId, bounty.publisher_id, targetApplication.applicant_id],
    );

    let conversationId = conversationRows[0]?.id || null;

    if (decision === "accepted") {
      if (targetApplication.status === "accepted") {
        await connection.commit();
        return res.json({
          success: true,
          message: "该申请已通过",
          data: {
            applicationId,
            decision,
            conversationId,
          },
        });
      }

      if ([BOUNTY_STATUS.PENDING_CONFIRM, BOUNTY_STATUS.COMPLETED, BOUNTY_STATUS.CLOSED].includes(bountyStatus)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "当前悬赏状态不可继续同意申请",
        });
      }

      if (![BOUNTY_STATUS.RECRUITING, BOUNTY_STATUS.IN_PROGRESS].includes(bountyStatus)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "当前状态不可执行通过操作",
        });
      }

      const acceptedApplicantId = bounty.accepted_applicant_id || null;
      if (acceptedApplicantId && acceptedApplicantId !== targetApplication.applicant_id) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          message: "当前悬赏已有接取者，无法重复同意其他申请",
        });
      }

      await connection.execute(
        `UPDATE bounty_applications
         SET status = 'accepted'
         WHERE id = ?
           AND status IN ('pending', 'contacting', 'accepted')`,
        [applicationId],
      );

      await connection.execute(
        `UPDATE bounty_applications
         SET status = 'rejected'
         WHERE bounty_id = ?
           AND id <> ?
           AND status IN ('pending', 'contacting', 'accepted')`,
        [bountyId, applicationId],
      );

      if (!conversationId) {
        const [insertConversationResult] = await connection.execute(
          `INSERT IGNORE INTO conversations (bounty_id, publisher_id, applicant_id)
           VALUES (?, ?, ?)`,
          [bountyId, bounty.publisher_id, targetApplication.applicant_id],
        );

        if (insertConversationResult.insertId) {
          conversationId = insertConversationResult.insertId;
        } else {
          const [latestConversationRows] = await connection.execute(
            `SELECT id
             FROM conversations
             WHERE bounty_id = ? AND publisher_id = ? AND applicant_id = ?
             LIMIT 1`,
            [bountyId, bounty.publisher_id, targetApplication.applicant_id],
          );
          conversationId = latestConversationRows[0]?.id || null;
        }
      }

      if (bountyStatus === BOUNTY_STATUS.RECRUITING) {
        await connection.execute(
          `UPDATE bounties
           SET status = ?
           WHERE id = ?`,
          [BOUNTY_STATUS.IN_PROGRESS, bountyId],
        );

        await insertStatusLogSafely(connection, {
          bountyId,
          fromStatus: bountyStatus,
          toStatus: BOUNTY_STATUS.IN_PROGRESS,
          actorId: req.user.id,
          actorRole: ACTOR_ROLE.PUBLISHER,
          note: "审核通过申请后自动进入进行中",
        });
      }
    } else {
      await connection.execute(
        `UPDATE bounty_applications
         SET status = 'rejected'
         WHERE id = ?`,
        [applicationId],
      );
    }

    await connection.commit();

    return res.json({
      success: true,
      message: decision === "accepted" ? "已通过该申请" : "已拒绝该申请",
      data: {
        applicationId,
        decision,
        conversationId,
      },
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({
      success: false,
      message: "审核申请失败",
      data: { error: error.message },
    });
  } finally {
    connection.release();
  }
});

export default router;

