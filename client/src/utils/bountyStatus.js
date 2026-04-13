export const BOUNTY_STATUS_OPTIONS = [
  { value: "recruiting", label: "招募中" },
  { value: "in_progress", label: "进行中" },
  { value: "pending_confirm", label: "待验收" },
  { value: "completed", label: "已完成" },
  { value: "closed", label: "已关闭" },
];

const BOUNTY_STATUS_LABEL_MAP = BOUNTY_STATUS_OPTIONS.reduce((result, item) => {
  result[item.value] = item.label;
  return result;
}, {});

const APPLICATION_STATUS_LABEL_MAP = {
  pending: "待处理",
  contacting: "沟通中",
  accepted: "已通过",
  rejected: "已拒绝",
  withdrawn: "已撤回",
};

export function formatBountyStatusLabel(status) {
  return BOUNTY_STATUS_LABEL_MAP[status] || status || "未知状态";
}

export function formatApplicationStatusLabel(status) {
  return APPLICATION_STATUS_LABEL_MAP[status] || "待处理";
}
