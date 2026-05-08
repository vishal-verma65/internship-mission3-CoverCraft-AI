/**
 * storage.js — localStorage Persistence Layer
 *
 * Provides typed, error-safe wrappers around localStorage for:
 *   • Form draft auto-save / restore
 *   • Generation history (up to HISTORY_CONFIG.maxEntries)
 *   • Theme preference
 *
 * All methods are synchronous and fail silently — if localStorage is
 * unavailable (private browsing, storage quota, etc.) the app still works.
 */
import { FORM_CONFIG, HISTORY_CONFIG, APP_META } from "./config.js";

function safeGet(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function safeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // silent
  }
}

export function saveTheme(theme) {
  safeSet(APP_META.themeStorageKey, theme);
}

export function loadTheme() {
  return safeGet(APP_META.themeStorageKey, APP_META.defaultTheme);
}



//Auto-save current form state so the user doesn't lose work on reload.
export function saveDraft(draft) {
  safeSet(FORM_CONFIG.autoSaveDraftKey, {
    ...draft,
    _savedAt: Date.now(),
  });
}

export function loadDraft() {
  const draft = safeGet(FORM_CONFIG.autoSaveDraftKey, null);
  if (!draft || typeof draft !== "object") return null;
  return draft;
}

export function clearDraft() {
  safeRemove(FORM_CONFIG.autoSaveDraftKey);
}

export function hasDraft() {
  const draft = loadDraft();
  if (!draft) return false;
  // Consider a draft meaningful if at least one key field is filled
  return !!(draft.fullName || draft.jobRole || draft.companyName);
}

//* History 

export function loadHistory() {
  return safeGet(HISTORY_CONFIG.storageKey, []);
}

export function addHistoryEntry({ fullName, jobRole, companyName, tone, coverLetter }) {
  const existing = loadHistory();

  const entry = {
    id:          `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    fullName,
    jobRole,
    companyName,
    tone,
    coverLetter,
    wordCount:   countWords(coverLetter),
    createdAt:   Date.now(),
  };

  const updated = [entry, ...existing].slice(0, HISTORY_CONFIG.maxEntries);
  safeSet(HISTORY_CONFIG.storageKey, updated);

  return entry;
}

export function removeHistoryEntry(id) {
  const updated = loadHistory().filter((e) => e.id !== id);
  safeSet(HISTORY_CONFIG.storageKey, updated);
}

export function clearHistory() {
  safeRemove(HISTORY_CONFIG.storageKey);
}

export function hasHistory() {
  return loadHistory().length > 0;
}

//* Utilities 

function countWords(text) {
  return (text || "").trim().split(/\s+/).filter(Boolean).length;
}

export function formatRelativeTime(timestamp) {
  const diffMs  = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr  = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1)  return "Just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
  if (diffHr  < 24) return `${diffHr} hour${diffHr !== 1 ? "s" : ""} ago`;
  if (diffDay === 1) return "Yesterday";
  return `${diffDay} days ago`;
}

export function isStorageAvailable() {
  try {
    const testKey = "__covercraft_test__";
    localStorage.setItem(testKey, "1");
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}