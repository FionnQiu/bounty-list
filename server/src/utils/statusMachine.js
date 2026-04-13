export const BOUNTY_STATUS = {
  RECRUITING: "recruiting",
  IN_PROGRESS: "in_progress",
  PENDING_CONFIRM: "pending_confirm",
  COMPLETED: "completed",
  CLOSED: "closed",
};

export const BOUNTY_STATUS_VALUES = Object.values(BOUNTY_STATUS);

export const BOUNTY_STATUS_LABEL_MAP = {
  [BOUNTY_STATUS.RECRUITING]: "招募中",
  [BOUNTY_STATUS.IN_PROGRESS]: "进行中",
  [BOUNTY_STATUS.PENDING_CONFIRM]: "待验收",
  [BOUNTY_STATUS.COMPLETED]: "已完成",
  [BOUNTY_STATUS.CLOSED]: "已关闭",
};

export const ACTOR_ROLE = {
  PUBLISHER: "publisher",
  APPLICANT: "applicant",
  OTHER: "other",
  SYSTEM: "system",
};

const TRANSITION_RULES = {
  [ACTOR_ROLE.PUBLISHER]: {
    [BOUNTY_STATUS.RECRUITING]: new Set([BOUNTY_STATUS.IN_PROGRESS, BOUNTY_STATUS.CLOSED]),
    [BOUNTY_STATUS.IN_PROGRESS]: new Set([]),
    [BOUNTY_STATUS.PENDING_CONFIRM]: new Set([BOUNTY_STATUS.COMPLETED]),
    [BOUNTY_STATUS.COMPLETED]: new Set([]),
    [BOUNTY_STATUS.CLOSED]: new Set([]),
  },
  [ACTOR_ROLE.APPLICANT]: {
    [BOUNTY_STATUS.IN_PROGRESS]: new Set([BOUNTY_STATUS.PENDING_CONFIRM]),
  },
  [ACTOR_ROLE.SYSTEM]: {
    [BOUNTY_STATUS.RECRUITING]: new Set(BOUNTY_STATUS_VALUES),
    [BOUNTY_STATUS.IN_PROGRESS]: new Set(BOUNTY_STATUS_VALUES),
    [BOUNTY_STATUS.PENDING_CONFIRM]: new Set(BOUNTY_STATUS_VALUES),
    [BOUNTY_STATUS.COMPLETED]: new Set(BOUNTY_STATUS_VALUES),
    [BOUNTY_STATUS.CLOSED]: new Set(BOUNTY_STATUS_VALUES),
  },
};

export function formatBountyStatusLabel(status) {
  return BOUNTY_STATUS_LABEL_MAP[status] || status;
}

export function isBountyStatusValid(status) {
  return BOUNTY_STATUS_VALUES.includes(status);
}

export function normalizeBountyStatus(status) {
  return String(status || "").trim();
}

export function resolveActorRole({ userId, publisherId, acceptedApplicantId }) {
  if (userId === publisherId) {
    return ACTOR_ROLE.PUBLISHER;
  }

  if (acceptedApplicantId && userId === acceptedApplicantId) {
    return ACTOR_ROLE.APPLICANT;
  }

  return ACTOR_ROLE.OTHER;
}

export function canTransitionStatus({ fromStatus, toStatus, actorRole }) {
  if (!isBountyStatusValid(fromStatus) || !isBountyStatusValid(toStatus)) {
    return false;
  }

  if (fromStatus === toStatus) {
    return true;
  }

  const roleRules = TRANSITION_RULES[actorRole];
  if (!roleRules) {
    return false;
  }

  const nextStatusSet = roleRules[fromStatus];
  if (!nextStatusSet) {
    return false;
  }

  return nextStatusSet.has(toStatus);
}
