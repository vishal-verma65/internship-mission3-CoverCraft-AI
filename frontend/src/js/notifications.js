/**
 * notifications.js — Toast Notification System
 *
 * Renders non-blocking toast messages in #notification-container.
 * Supports: success, error, info, warning types.
 * Auto-dismisses after a configurable duration.
 * Never uses alert(), confirm(), or prompt().
 */

const DEFAULTS = {
  duration:       3500,   // ms before auto-dismiss
  animationOut:   300,    // ms for exit animation
};


const ICONS = {
  success: "✓",
  error:   "✕",
  info:    "ℹ",
  warning: "⚠",
};

function getContainer() {
  return document.getElementById("notification-container");
}

function buildToast(message, type) {
  const toast = document.createElement("div");
  toast.className = `notification notification--${type}`;
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");

  const icon = document.createElement("span");
  icon.className = "notification-icon";
  icon.textContent = ICONS[type] ?? ICONS.info;
  icon.setAttribute("aria-hidden", "true");

  const msg = document.createElement("span");
  msg.className = "notification-msg";
  msg.textContent = message;

  // Close button
  const closeBtn = document.createElement("button");
  closeBtn.setAttribute("aria-label", "Dismiss notification");
  closeBtn.style.cssText = `
    background: none;
    border: none;
    cursor: pointer;
    color: inherit;
    opacity: 0.5;
    font-size: 14px;
    padding: 0 0 0 8px;
    flex-shrink: 0;
    line-height: 1;
    transition: opacity 0.15s;
  `;
  closeBtn.textContent = "✕";
  closeBtn.addEventListener("mouseenter", () => { closeBtn.style.opacity = "1"; });
  closeBtn.addEventListener("mouseleave", () => { closeBtn.style.opacity = "0.5"; });

  toast.appendChild(icon);
  toast.appendChild(msg);
  toast.appendChild(closeBtn);

  return { toast, closeBtn };
}

function dismissToast(toast, timerId) {
  if (timerId) clearTimeout(timerId);
  if (!toast.isConnected) return;

  toast.classList.add("exit");
  setTimeout(() => {
    if (toast.isConnected) toast.remove();
  }, DEFAULTS.animationOut);
}

export function showNotification(message, type = "info", duration = DEFAULTS.duration) {
  const container = getContainer();
  if (!container) {
    // Fallback: if container is missing for some reason log to console
    console.warn(`[notification] ${type.toUpperCase()}: ${message}`);
    return () => {};
  }

  const { toast, closeBtn } = buildToast(message, type);
  container.appendChild(toast);

  let timerId = null;

  const dismiss = () => dismissToast(toast, timerId);

  closeBtn.addEventListener("click", dismiss);

  if (duration > 0) {
    timerId = setTimeout(dismiss, duration);
  }

  return dismiss;
}

//* Convenience Methods 

export function notifySuccess(message, duration) {
  return showNotification(message, "success", duration);
}

export function notifyError(message, duration = 5000) {
  return showNotification(message, "error", duration);
}

export function notifyInfo(message, duration) {
  return showNotification(message, "info", duration);
}

export function notifyWarning(message, duration) {
  return showNotification(message, "warning", duration);
}

export function clearAllNotifications() {
  const container = getContainer();
  if (!container) return;
  const toasts = container.querySelectorAll(".notification");
  toasts.forEach((t) => dismissToast(t, null));
}

export function notifyFromError(error) {
  // Provide specific messages for known codes
  const codeMessages = {
    // API errors
    INVALID_KEY:    "Invalid API key. Open js/config.js and add your Mistral API key.",
    RATE_LIMITED:   "Rate limit hit. Wait a moment then try again.",
    NETWORK_ERROR:  "Network error. Check your connection and try again.",
    TIMEOUT:        "Request timed out. The API may be busy — please retry.",
    EMPTY_RESPONSE: "Mistral returned an empty response. Please try again.",
    SERVER_ERROR:   "Mistral API is having issues. Please try again shortly.",
    // PDF errors
    WRONG_TYPE:     "Please upload a valid PDF file.",
    TOO_LARGE:      "PDF is too large. Maximum file size is 5 MB.",
    CORRUPTED:      "Could not read the PDF. Try a different file.",
    EMPTY:          "No text found in PDF. The file may contain only images.",
    NO_PDFJS:       "PDF library failed to load. Refresh the page and try again.",
  };

  const message = error?.code
    ? (codeMessages[error.code] ?? error.message)
    : (error?.message ?? "An unexpected error occurred.");

  notifyError(message);
}