//*String Utilities

export function countWords(text) {
  if (!text || typeof text !== "string") return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function countChars(text) {
  return (text ?? "").length;
}

export function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function truncate(str, maxLength, suffix = "…") {
  if (!str || str.length <= maxLength) return str ?? "";
  return str.slice(0, maxLength - suffix.length) + suffix;
}

export function escapeHTML(str) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return (str ?? "").replace(/[&<>"']/g, (ch) => map[ch]);
}

export function textToParagraphs(text) {
  if (!text) return "";
  return text
    .split(/\n{2,}/)                      // split on blank lines
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHTML(block)}</p>`)
    .join("\n");
}

export function normalizeWhitespace(str) {
  return (str ?? "").trim().replace(/\s+/g, " ");
}

//* Debounce / Throttle

export function debounce(fn, wait) {
  let timerId;
  return function (...args) {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn.apply(this, args), wait);
  };
}

export function throttle(fn, limit) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
}

//*DOM Utilities

//Shorthand for document.getElementById with optional fallback.
export function byId(id) {
  return document.getElementById(id);
}

//Shorthand for document.querySelector.
export function qs(selector, root = document) {
  return root.querySelector(selector);
}

//Shorthand for document.querySelectorAll, returns an Array (not NodeList).
export function qsAll(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

/**
 * Add an event listener and return a cleanup function that removes it.
 * Useful for attaching / detaching listeners in module lifecycle methods.
 */
export function on(target, event, handler, options) {
  target.addEventListener(event, handler, options);
  return () => target.removeEventListener(event, handler, options);
}

// Smoothly scroll to a CSS selector target.
export function scrollTo(selector, offsetPx = 80) {
  const el = document.querySelector(selector);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - offsetPx;
  window.scrollTo({ top, behavior: "smooth" });
}

//* Date / Time

export function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    year:   "numeric",
    month:  "short",
    day:    "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

//*File Utilities

export function triggerDownload(content, filename, mimeType = "text/plain") {
  const blob =
    content instanceof Blob
      ? content
      : new Blob([content], { type: mimeType });

  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();

  // Cleanup
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 1000);
}

//* Unique ID

//Generate a lightweight unique ID string.
export function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

//* Environment

//Returns true if the current viewport is mobile-width (< 768px).
export function isMobile() {
  return window.innerWidth < 768;
}

// Returns true if the browser supports the Clipboard API.
export function supportsClipboard() {
  return !!(navigator.clipboard && navigator.clipboard.writeText);
}