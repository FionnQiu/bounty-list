export function getInitialChar(value, fallback = "用") {
  const text = String(value || "").trim();
  return text ? text.charAt(0) : fallback;
}

