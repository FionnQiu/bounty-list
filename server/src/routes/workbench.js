import { Router } from "express";
import { getConnection, query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { serializeBounty } from "../utils/serializers.js";
import { BOUNTY_STATUS } from "../utils/statusMachine.js";

const router = Router();
let bountyStatusSchemaReady = false;

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeStoredStatus(status) {
  const raw = normalizeText(status);
  return raw === "open" ? BOUNTY_STATUS.RECRUITING : raw;
}

function toInteger(value) {
  const num = Number(value);
  return Number.isInteger(num) ? num : NaN;
}

function toScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) {
    return NaN;
  }

  return Math.round(score);
}

function serializeWorkbenchApplication(row) {
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

function isMissingTableError(error) {
  return error?.code === "ER_NO_SUCH_TABLE" || Number(error?.errno) === 1146;
}

function isMissingColumnError(error) {
  return error?.code === "ER_BAD_FIELD_ERROR" || Number(error?.errno) === 1054;
}

function isStatusEnumError(error) {
  return (
    error?.code === "ER_TRUNCATED_WRONG_VALUE_FOR_FIELD" ||
    error?.code === "WARN_DATA_TRUNCATED" ||
    Number(error?.errno) === 1366 ||
    Number(error?.errno) === 1265
  );
}

async function ensureBountyStatusSchema(connection) {
  if (bountyStatusSchemaReady) {
    return;
  }

  const [rows] = await connection.execute(
    `SELECT COLUMN_TYPE AS column_type
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = 'bounties'
       AND column_name = 'status'
     LIMIT 1`,
  );

  const columnType = String(rows?.[0]?.column_type || "").toLowerCase();
  const requiredValues = ["'recruiting'", "'in_progress'", "'pending_confirm'", "'completed'", "'closed'"];
  const alreadyReady = requiredValues.every((value) => columnType.includes(value));
  if (alreadyReady) {
    bountyStatusSchemaReady = true;
    return;
  }

  await connection.execute(
    `ALTER TABLE bounties
     MODIFY COLUMN status ENUM('open','draft','recruiting','in_progress','pending_confirm','completed','closed')
     NOT NULL DEFAULT 'recruiting'`,
  );
  await connection.execute(
    `UPDATE bounties
     SET status = CASE
       WHEN status IN ('open', 'draft') THEN 'recruiting'
       ELSE status
     END
     WHERE status IN ('open', 'draft')`,
  );
  await connection.execute(
    `ALTER TABLE bounties
     MODIFY COLUMN status ENUM('recruiting','in_progress','pending_confirm','completed','closed')
     NOT NULL DEFAULT 'recruiting'`,
  );
  bountyStatusSchemaReady = true;
}

async function getBountySummaryById(id) {
  const rows = await query(
    `SELECT b.*, c.name AS category_name, u.username AS publisher_username, u.avatar_url AS publisher_avatar_url
     FROM bounties b
     JOIN bounty_categories c ON c.id = b.category_id
     JOIN users u ON u.id = b.publisher_id
     WHERE b.id = :id
     LIMIT 1`,
    { id },
  );

  return rows[0] || null;
}

async function hasTable(tableName) {
  try {
    const rows = await query(
      `SELECT COUNT(*) AS total
       FROM information_schema.tables
       WHERE table_schema = DATABASE()
         AND table_name = :tableName
       LIMIT 1`,
      { tableName },
    );

    return Number(rows[0]?.total || 0) > 0;
  } catch {
    return false;
  }
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
        payload.actorRole || "publisher",
        payload.note || null,
      ],
    );
  } catch (error) {
    if (isMissingTableError(error)) {
      return;
    }

    if (!isMissingColumnError(error)) {
      throw error;
    }

    try {
      await connection.execute(
        `INSERT INTO bounty_status_logs (bounty_id, from_status, to_status, actor_id, note)
         VALUES (?, ?, ?, ?, ?)`,
        [payload.bountyId, payload.fromStatus, payload.toStatus, payload.actorId, payload.note || null],
      );
      return;
    } catch (fallbackError) {
      if (isMissingTableError(fallbackError)) {
        return;
      }
      if (!isMissingColumnError(fallbackError)) {
        throw fallbackError;
      }
    }

    try {
      await connection.execute(
        `INSERT INTO bounty_status_logs (bounty_id, from_status, to_status, actor_id)
         VALUES (?, ?, ?, ?)`,
        [payload.bountyId, payload.fromStatus, payload.toStatus, payload.actorId],
      );
      return;
    } catch (finalFallbackError) {
      if (isMissingTableError(finalFallbackError) || isMissingColumnError(finalFallbackError)) {
        return;
      }
      throw finalFallbackError;
    }
  }
}

router.get("/overview", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const hasRatingsTable = await hasTable("bounty_ratings");

    const publishedSql = `SELECT b.*, c.name AS category_name, u.username AS publisher_username, u.avatar_url AS publisher_avatar_url,
              (
                SELECT COUNT(*)
                FROM bounty_applications a
                WHERE a.bounty_id = b.id
                  AND a.status IN ('pending', 'contacting')
              ) AS pending_applications,
              accepted.applicant_id AS accepted_applicant_id,
              accepted_user.username AS accepted_applicant_username,
              accepted_user.avatar_url AS accepted_applicant_avatar_url,
              conv.id AS accepted_conversation_id,
              ${hasRatingsTable ? "CASE WHEN my_rating.id IS NULL THEN 0 ELSE 1 END" : "0"} AS has_rated_accepted
       FROM bounties b
       JOIN bounty_categories c ON c.id = b.category_id
       JOIN users u ON u.id = b.publisher_id
       LEFT JOIN (
         SELECT a1.bounty_id, a1.applicant_id
         FROM bounty_applications a1
         JOIN (
           SELECT bounty_id, MAX(id) AS latest_id
           FROM bounty_applications
           WHERE status = 'accepted'
           GROUP BY bounty_id
         ) latest ON latest.latest_id = a1.id
       ) accepted ON accepted.bounty_id = b.id
       LEFT JOIN users accepted_user ON accepted_user.id = accepted.applicant_id
       LEFT JOIN conversations conv
         ON conv.bounty_id = b.id
        AND conv.publisher_id = b.publisher_id
        AND conv.applicant_id = accepted.applicant_id
       ${hasRatingsTable
    ? `LEFT JOIN bounty_ratings my_rating
         ON my_rating.bounty_id = b.id
        AND my_rating.rater_id = :userId
        AND my_rating.target_user_id = accepted.applicant_id`
    : ""}
       WHERE b.publisher_id = :userId
       ORDER BY b.updated_at DESC, b.id DESC
       LIMIT 120`;

    const publishedRows = await query(publishedSql, { userId });

    const acceptedSql = `SELECT b.*, c.name AS category_name, u.username AS publisher_username, u.avatar_url AS publisher_avatar_url,
              a.status AS application_status,
              conv.id AS conversation_id,
              ${hasRatingsTable ? "CASE WHEN my_rating.id IS NULL THEN 0 ELSE 1 END" : "0"} AS has_rated_publisher
       FROM bounty_applications a
       JOIN bounties b ON b.id = a.bounty_id
       JOIN bounty_categories c ON c.id = b.category_id
       JOIN users u ON u.id = b.publisher_id
       LEFT JOIN conversations conv
         ON conv.bounty_id = b.id
        AND conv.publisher_id = b.publisher_id
        AND conv.applicant_id = a.applicant_id
       ${hasRatingsTable
    ? `LEFT JOIN bounty_ratings my_rating
         ON my_rating.bounty_id = b.id
        AND my_rating.rater_id = :userId
        AND my_rating.target_user_id = b.publisher_id`
    : ""}
       WHERE a.applicant_id = :userId
         AND a.status = 'accepted'
         AND b.status IN ('in_progress', 'pending_confirm', 'completed')
       ORDER BY b.updated_at DESC, b.id DESC
       LIMIT 120`;

    const acceptedRows = await query(acceptedSql, { userId });

    const pendingRatingsAsPublisherSql = `SELECT b.id AS bounty_id,
              b.title,
              b.reward_amount,
              b.status,
              b.created_at,
              b.updated_at,
              c.id AS category_id,
              c.name AS category_name,
              b.publisher_id,
              publisher.username AS publisher_username,
              publisher.avatar_url AS publisher_avatar_url,
              accepted.applicant_id AS target_user_id,
              target_user.username AS target_username,
              target_user.avatar_url AS target_avatar_url,
              conv.id AS conversation_id
       FROM bounties b
       JOIN bounty_categories c ON c.id = b.category_id
       JOIN users publisher ON publisher.id = b.publisher_id
       JOIN (
         SELECT a1.bounty_id, a1.applicant_id
         FROM bounty_applications a1
         JOIN (
           SELECT bounty_id, MAX(id) AS latest_id
           FROM bounty_applications
           WHERE status = 'accepted'
           GROUP BY bounty_id
         ) latest ON latest.latest_id = a1.id
       ) accepted ON accepted.bounty_id = b.id
       JOIN users target_user ON target_user.id = accepted.applicant_id
       LEFT JOIN conversations conv
         ON conv.bounty_id = b.id
        AND conv.publisher_id = b.publisher_id
        AND conv.applicant_id = accepted.applicant_id
       ${hasRatingsTable
    ? `LEFT JOIN bounty_ratings my_rating
         ON my_rating.bounty_id = b.id
        AND my_rating.rater_id = :userId
        AND my_rating.target_user_id = accepted.applicant_id`
    : ""}
       WHERE b.publisher_id = :userId
         AND b.status = :completed
         ${hasRatingsTable ? "AND my_rating.id IS NULL" : ""}
       ORDER BY b.updated_at DESC, b.id DESC`;

    const pendingRatingsAsPublisherRows = await query(pendingRatingsAsPublisherSql, {
      userId,
      completed: BOUNTY_STATUS.COMPLETED,
    });

    const pendingRatingsAsApplicantSql = `SELECT b.id AS bounty_id,
              b.title,
              b.reward_amount,
              b.status,
              b.created_at,
              b.updated_at,
              c.id AS category_id,
              c.name AS category_name,
              b.publisher_id,
              publisher.username AS publisher_username,
              publisher.avatar_url AS publisher_avatar_url,
              b.publisher_id AS target_user_id,
              publisher.username AS target_username,
              publisher.avatar_url AS target_avatar_url,
              conv.id AS conversation_id
       FROM bounty_applications a
       JOIN bounties b ON b.id = a.bounty_id
       JOIN bounty_categories c ON c.id = b.category_id
       JOIN users publisher ON publisher.id = b.publisher_id
       LEFT JOIN conversations conv
         ON conv.bounty_id = b.id
        AND conv.publisher_id = b.publisher_id
        AND conv.applicant_id = a.applicant_id
       ${hasRatingsTable
    ? `LEFT JOIN bounty_ratings my_rating
         ON my_rating.bounty_id = b.id
        AND my_rating.rater_id = :userId
        AND my_rating.target_user_id = b.publisher_id`
    : ""}
       WHERE a.applicant_id = :userId
         AND a.status = 'accepted'
         AND b.status = :completed
         ${hasRatingsTable ? "AND my_rating.id IS NULL" : ""}
       ORDER BY b.updated_at DESC, b.id DESC`;

    const pendingRatingsAsApplicantRows = await query(pendingRatingsAsApplicantSql, {
      userId,
      completed: BOUNTY_STATUS.COMPLETED,
    });

    const publishedItems = publishedRows.map((row) => ({
      ...serializeBounty(row),
      pendingApplications: Number(row.pending_applications || 0),
      acceptedApplicant: row.accepted_applicant_id
        ? {
            id: row.accepted_applicant_id,
            username: row.accepted_applicant_username,
            avatarUrl: row.accepted_applicant_avatar_url,
            conversationId: row.accepted_conversation_id || null,
          }
        : null,
      canComplete: normalizeStoredStatus(row.status) === BOUNTY_STATUS.PENDING_CONFIRM,
      canRateAccepted:
        normalizeStoredStatus(row.status) === BOUNTY_STATUS.COMPLETED &&
        Boolean(row.accepted_applicant_id) &&
        Number(row.has_rated_accepted || 0) === 0,
    }));

    const acceptedItems = acceptedRows.map((row) => ({
      ...serializeBounty(row),
      applicationStatus: row.application_status,
      conversationId: row.conversation_id || null,
      canSubmitForReview: normalizeStoredStatus(row.status) === BOUNTY_STATUS.IN_PROGRESS,
      canRatePublisher:
        normalizeStoredStatus(row.status) === BOUNTY_STATUS.COMPLETED &&
        Number(row.has_rated_publisher || 0) === 0,
    }));

    const pendingRatings = [
      ...pendingRatingsAsPublisherRows.map((row) => ({
        role: "publisher",
        bounty: serializeBounty({
          id: row.bounty_id,
          title: row.title,
          description: "",
          reward_amount: row.reward_amount,
          status: row.status,
          created_at: row.created_at,
          updated_at: row.updated_at,
          category_id: row.category_id,
          category_name: row.category_name,
          publisher_id: row.publisher_id,
          publisher_username: row.publisher_username,
          publisher_avatar_url: row.publisher_avatar_url,
        }),
        targetUser: {
          id: row.target_user_id,
          username: row.target_username,
          avatarUrl: row.target_avatar_url,
        },
        conversationId: row.conversation_id || null,
      })),
      ...pendingRatingsAsApplicantRows.map((row) => ({
        role: "applicant",
        bounty: serializeBounty({
          id: row.bounty_id,
          title: row.title,
          description: "",
          reward_amount: row.reward_amount,
          status: row.status,
          created_at: row.created_at,
          updated_at: row.updated_at,
          category_id: row.category_id,
          category_name: row.category_name,
          publisher_id: row.publisher_id,
          publisher_username: row.publisher_username,
          publisher_avatar_url: row.publisher_avatar_url,
        }),
        targetUser: {
          id: row.target_user_id,
          username: row.target_username,
          avatarUrl: row.target_avatar_url,
        },
        conversationId: row.conversation_id || null,
      })),
    ];

    const pendingReviewCount = publishedItems.reduce(
      (sum, item) => sum + Number(item.pendingApplications || 0),
      0,
    );

    return res.json({
      success: true,
      message: "获取工作台数据成功",
      data: {
        publishedItems,
        acceptedItems,
        pendingRatings,
        stats: {
          publishedCount: publishedItems.length,
          acceptedCount: acceptedItems.length,
          pendingReviewCount,
          pendingRatingCount: pendingRatings.length,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "获取工作台数据失败",
      data: { error: error.message },
    });
  }
});

router.get("/published/:id/applications", requireAuth, async (req, res) => {
  try {
    const bountyId = toInteger(req.params.id);
    if (!Number.isInteger(bountyId) || bountyId <= 0) {
      return res.status(400).json({
        success: false,
        message: "悬赏参数不合法",
      });
    }

    const bountyRows = await query(
      `SELECT id, publisher_id
       FROM bounties
       WHERE id = :id
       LIMIT 1`,
      { id: bountyId },
    );

    if (bountyRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "悬赏不存在",
      });
    }

    if (bountyRows[0].publisher_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "无权查看该悬赏申请",
      });
    }

    const rows = await query(
      `SELECT a.*, u.username AS applicant_username, u.avatar_url AS applicant_avatar_url, c.id AS conversation_id
       FROM bounty_applications a
       JOIN users u ON u.id = a.applicant_id
       LEFT JOIN conversations c
         ON c.bounty_id = a.bounty_id
        AND c.publisher_id = :publisherId
        AND c.applicant_id = a.applicant_id
       WHERE a.bounty_id = :bountyId
       ORDER BY FIELD(a.status, 'pending', 'contacting', 'accepted', 'rejected', 'withdrawn'), a.created_at DESC, a.id DESC`,
      {
        bountyId,
        publisherId: req.user.id,
      },
    );

    return res.json({
      success: true,
      message: "获取申请列表成功",
      data: {
        items: rows.map(serializeWorkbenchApplication),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "获取申请列表失败",
      data: { error: error.message },
    });
  }
});

router.post("/accepted/:id/request-confirm", requireAuth, async (req, res) => {
  const connection = await getConnection();

  try {
    const bountyId = toInteger(req.params.id);
    if (!Number.isInteger(bountyId) || bountyId <= 0) {
      return res.status(400).json({
        success: false,
        message: "悬赏参数不合法",
      });
    }

    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT b.id, b.publisher_id, b.status,
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

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "悬赏不存在",
      });
    }

    const bounty = rows[0];
    const acceptedApplicantId = Number(bounty.accepted_applicant_id || 0);

    if (!acceptedApplicantId || acceptedApplicantId !== req.user.id) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "仅接取者可申请验收",
      });
    }

    const currentStatus = normalizeStoredStatus(bounty.status);
    if (currentStatus !== BOUNTY_STATUS.IN_PROGRESS) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "仅进行中的悬赏可申请验收",
      });
    }

    await connection.execute(
      `UPDATE bounties
       SET status = ?
       WHERE id = ?`,
      [BOUNTY_STATUS.PENDING_CONFIRM, bountyId],
    );

    await insertStatusLogSafely(connection, {
      bountyId,
      fromStatus: currentStatus,
      toStatus: BOUNTY_STATUS.PENDING_CONFIRM,
      actorId: req.user.id,
      actorRole: "applicant",
      note: normalizeText(req.body.note) || "接取者提交验收申请",
    });

    await connection.commit();

    const summary = await getBountySummaryById(bountyId);

    return res.json({
      success: true,
      message: "已提交验收申请，等待发布者确认",
      data: {
        bounty: summary ? serializeBounty(summary) : { id: bountyId, status: BOUNTY_STATUS.PENDING_CONFIRM },
      },
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({
      success: false,
      message: "申请验收失败",
      data: { error: error.message },
    });
  } finally {
    connection.release();
  }
});

router.post("/published/:id/complete", requireAuth, async (req, res) => {
  const connection = await getConnection();

  try {
    const bountyId = toInteger(req.params.id);
    if (!Number.isInteger(bountyId) || bountyId <= 0) {
      return res.status(400).json({
        success: false,
        message: "悬赏参数不合法",
      });
    }

    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT b.id, b.publisher_id, b.status,
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

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "悬赏不存在",
      });
    }

    const bounty = rows[0];
    if (bounty.publisher_id !== req.user.id) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "仅发布者可完成验收",
      });
    }

    const currentStatus = normalizeStoredStatus(bounty.status);
    if (currentStatus !== BOUNTY_STATUS.PENDING_CONFIRM) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "仅待验收状态的悬赏可完成验收",
      });
    }

    if (!bounty.accepted_applicant_id) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "当前悬赏没有接取者，无法验收",
      });
    }

    await connection.execute(
      `UPDATE bounties
       SET status = ?
       WHERE id = ?`,
      [BOUNTY_STATUS.COMPLETED, bountyId],
    );

    await insertStatusLogSafely(connection, {
      bountyId,
      fromStatus: currentStatus,
      toStatus: BOUNTY_STATUS.COMPLETED,
      actorId: req.user.id,
      actorRole: "publisher",
      note: normalizeText(req.body.note) || "发布者完成验收，悬赏已完成",
    });

    await connection.commit();

    const summary = await getBountySummaryById(bountyId);

    return res.json({
      success: true,
      message: "验收完成，悬赏已更新为已完成",
      data: {
        bounty: summary ? serializeBounty(summary) : { id: bountyId, status: BOUNTY_STATUS.COMPLETED },
      },
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({
      success: false,
      message: "完成验收失败",
      data: { error: error.message },
    });
  } finally {
    connection.release();
  }
});

router.post("/published/:id/close", requireAuth, async (req, res) => {
  const connection = await getConnection();

  try {
    await ensureBountyStatusSchema(connection);

    const bountyId = toInteger(req.params.id);
    if (!Number.isInteger(bountyId) || bountyId <= 0) {
      return res.status(400).json({
        success: false,
        message: "悬赏参数不合法",
      });
    }

    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT b.id, b.publisher_id, b.status
       FROM bounties b
       WHERE b.id = ?
       LIMIT 1
       FOR UPDATE`,
      [bountyId],
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "悬赏不存在",
      });
    }

    const bounty = rows[0];
    if (bounty.publisher_id !== req.user.id) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "仅发布者可关闭招募",
      });
    }

    const currentStatus = normalizeStoredStatus(bounty.status);
    if (currentStatus !== BOUNTY_STATUS.RECRUITING) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "仅招募中的悬赏可关闭招募",
      });
    }

    await connection.execute(
      `UPDATE bounties
       SET status = ?
       WHERE id = ?`,
      [BOUNTY_STATUS.CLOSED, bountyId],
    );

    await insertStatusLogSafely(connection, {
      bountyId,
      fromStatus: currentStatus,
      toStatus: BOUNTY_STATUS.CLOSED,
      actorId: req.user.id,
      actorRole: "publisher",
      note: normalizeText(req.body.note) || "发布者手动关闭招募",
    });

    await connection.commit();

    const summary = await getBountySummaryById(bountyId);

    return res.json({
      success: true,
      message: "已关闭招募",
      data: {
        bounty: summary ? serializeBounty(summary) : { id: bountyId, status: BOUNTY_STATUS.CLOSED },
      },
    });
  } catch (error) {
    if (isStatusEnumError(error)) {
      bountyStatusSchemaReady = false;
    }
    try {
      await connection.rollback();
    } catch {
      // ignore rollback errors when no active transaction
    }
    return res.status(500).json({
      success: false,
      message: "关闭招募失败",
      data: { error: error.message },
    });
  } finally {
    connection.release();
  }
});

router.delete("/published/:id", requireAuth, async (req, res) => {
  const connection = await getConnection();

  try {
    const bountyId = toInteger(req.params.id);
    if (!Number.isInteger(bountyId) || bountyId <= 0) {
      return res.status(400).json({
        success: false,
        message: "悬赏参数不合法",
      });
    }

    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT b.id, b.publisher_id, b.status
       FROM bounties b
       WHERE b.id = ?
       LIMIT 1
       FOR UPDATE`,
      [bountyId],
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "悬赏不存在",
      });
    }

    const bounty = rows[0];
    if (bounty.publisher_id !== req.user.id) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "仅发布者可删除招募",
      });
    }

    const currentStatus = normalizeStoredStatus(bounty.status);
    if (currentStatus !== BOUNTY_STATUS.CLOSED) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "仅已关闭的招募可删除",
      });
    }

    const hasRatingsTable = await hasTable("bounty_ratings");
    const hasStatusLogsTable = await hasTable("bounty_status_logs");

    await connection.execute(
      `DELETE cm
       FROM conversation_messages cm
       JOIN conversations c ON c.id = cm.conversation_id
       WHERE c.bounty_id = ?`,
      [bountyId],
    );

    await connection.execute(
      `DELETE FROM conversations
       WHERE bounty_id = ?`,
      [bountyId],
    );

    await connection.execute(
      `DELETE FROM bounty_applications
       WHERE bounty_id = ?`,
      [bountyId],
    );

    if (hasRatingsTable) {
      await connection.execute(
        `DELETE FROM bounty_ratings
         WHERE bounty_id = ?`,
        [bountyId],
      );
    }

    if (hasStatusLogsTable) {
      await connection.execute(
        `DELETE FROM bounty_status_logs
         WHERE bounty_id = ?`,
        [bountyId],
      );
    }

    await connection.execute(
      `DELETE FROM bounties
       WHERE id = ?`,
      [bountyId],
    );

    await connection.commit();

    return res.json({
      success: true,
      message: "招募已删除",
      data: {
        id: bountyId,
      },
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({
      success: false,
      message: "删除招募失败",
      data: { error: error.message },
    });
  } finally {
    connection.release();
  }
});

router.post("/ratings", requireAuth, async (req, res) => {
  const connection = await getConnection();

  try {
    const hasRatingsTable = await hasTable("bounty_ratings");
    if (!hasRatingsTable) {
      return res.status(503).json({
        success: false,
        message: "评价功能尚未初始化，请先完成数据库迁移",
      });
    }

    const bountyId = toInteger(req.body.bountyId);
    const targetUserId = toInteger(req.body.targetUserId);
    const score = toScore(req.body.score);
    const comment = normalizeText(req.body.comment);

    if (!Number.isInteger(bountyId) || bountyId <= 0 || !Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({
        success: false,
        message: "评分参数不合法",
      });
    }

    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return res.status(400).json({
        success: false,
        message: "评分需为 1-5 的整数",
      });
    }

    if (comment.length > 200) {
      return res.status(400).json({
        success: false,
        message: "评语不能超过 200 字",
      });
    }

    if (targetUserId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "不能给自己评分",
      });
    }

    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT b.id, b.publisher_id, b.status,
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

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "悬赏不存在",
      });
    }

    const bounty = rows[0];
    const status = normalizeStoredStatus(bounty.status);
    if (status !== BOUNTY_STATUS.COMPLETED) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "仅已完成的悬赏可评价",
      });
    }

    const acceptedApplicantId = bounty.accepted_applicant_id;
    if (!acceptedApplicantId) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "当前悬赏暂无可评价对象",
      });
    }

    let expectedTargetUserId = null;
    if (req.user.id === bounty.publisher_id) {
      expectedTargetUserId = acceptedApplicantId;
    } else if (req.user.id === acceptedApplicantId) {
      expectedTargetUserId = bounty.publisher_id;
    } else {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "仅悬赏参与方可评价",
      });
    }

    if (targetUserId !== expectedTargetUserId) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "评价对象不匹配",
      });
    }

    const [existingRows] = await connection.execute(
      `SELECT id
       FROM bounty_ratings
       WHERE bounty_id = ?
         AND rater_id = ?
       LIMIT 1
       FOR UPDATE`,
      [bountyId, req.user.id],
    );

    if (existingRows.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: "你已提交过该悬赏评价",
      });
    }

    const [insertResult] = await connection.execute(
      `INSERT INTO bounty_ratings (bounty_id, rater_id, target_user_id, score, comment)
       VALUES (?, ?, ?, ?, ?)`,
      [bountyId, req.user.id, targetUserId, score, comment || null],
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "评价提交成功",
      data: {
        rating: {
          id: insertResult.insertId,
          bountyId,
          raterId: req.user.id,
          targetUserId,
          score,
          comment: comment || "",
        },
      },
    });
  } catch (error) {
    await connection.rollback();

    if (error?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "你已提交过该悬赏评价",
      });
    }

    return res.status(500).json({
      success: false,
      message: "提交评价失败",
      data: { error: error.message },
    });
  } finally {
    connection.release();
  }
});

export default router;
