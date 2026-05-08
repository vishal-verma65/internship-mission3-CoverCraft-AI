/**
 * clipboard.js — Clipboard Interaction Module
 *
 * Handles copying the generated cover letter to the clipboard.
 * Uses the modern Clipboard API with a graceful execCommand fallback
 * for older browsers.
 *
 * Provides visual feedback on the copy button (icon swap + label change)
 * and integrates with the notification system.
 */

import { notifySuccess, notifyError } from "./notifications.js";
import { supportsClipboard } from "./utils.js";

const FEEDBACK_DURATION_MS = 2000;

function showCopiedFeedback(btn) {
  if (!btn) return;

  const originalHTML = btn.innerHTML;

  btn.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M3 8l3 3 6-6" stroke="currentColor" stroke-width="1.5"
            stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    Copied!
  `;
  btn.style.color        = "var(--accent-2)";
  btn.style.borderColor  = "var(--accent-2)";
  btn.style.background   = "var(--accent-2-subtle)";
  btn.disabled           = true;

  setTimeout(() => {
    btn.innerHTML        = originalHTML;
    btn.style.color      = "";
    btn.style.borderColor = "";
    btn.style.background = "";
    btn.disabled         = false;
  }, FEEDBACK_DURATION_MS);
}

function execCommandCopy(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;

  textarea.style.cssText = `
    position: fixed;
    top: -9999px;
    left: -9999px;
    opacity: 0;
    pointer-events: none;
  `;

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let success = false;
  try {
    success = document.execCommand("copy");
  } catch {
    success = false;
  }

  document.body.removeChild(textarea);
  return success;
}

export async function copyToClipboard(text, btn = null) {
  if (!text || !text.trim()) {
    notifyError("Nothing to copy — generate a cover letter first.");
    return false;
  }

  if (supportsClipboard()) {
    try {
      await navigator.clipboard.writeText(text);
      showCopiedFeedback(btn);
      notifySuccess("Cover letter copied to clipboard!");
      return true;
    } catch (err) {
      console.warn("[clipboard] Clipboard API failed, trying fallback:", err);
    }
  }

  const success = execCommandCopy(text);
  if (success) {
    showCopiedFeedback(btn);
    notifySuccess("Cover letter copied to clipboard!");
    return true;
  }

  notifyError(
    "Could not copy to clipboard. Please select the text manually and copy it."
  );
  return false;
}

export function initCopyButton(getTextFn) {
  const btn = document.getElementById("copy-btn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const text = typeof getTextFn === "function" ? getTextFn() : "";
    await copyToClipboard(text, btn);
  });
}