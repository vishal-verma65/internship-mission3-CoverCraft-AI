/**
 * history.js — Generation History UI
 *
 * Reads history entries from storage.js and renders a responsive grid
 * of cards below the generator. Each card lets the user restore a
 * previous cover letter into the output panel with one click.
 */

import { loadHistory, clearHistory,
         formatRelativeTime }    from "./storage.js";
import { renderOutput }          from "./ui.js";
import { notifyInfo }            from "./notifications.js";
import { truncate, byId }        from "./utils.js";

// Re-export addHistoryEntry so formHandler.js can import from here
export { addHistoryEntry } from "./storage.js";

//*INIT
export function initHistory() {
  renderHistory();

  const clearBtn = byId("clear-history-btn");
  clearBtn?.addEventListener("click", () => {
    clearHistory();
    renderHistory();
    notifyInfo("History cleared.");
  });
}

//* RENDER
export function renderHistory() {
  const section = byId("history-section");
  const grid    = byId("history-grid");
  if (!section || !grid) return;

  const entries = loadHistory();

  if (!entries.length) {
    section.hidden = true;
    grid.innerHTML = "";
    return;
  }

  section.hidden = false;
  grid.innerHTML = "";

  entries.forEach((entry, index) => {
    const card = buildHistoryCard(entry, index);
    grid.appendChild(card);
  });
}

//* CARD BUILDER
function buildHistoryCard(entry, index) {
  const card = document.createElement("div");
  card.className = "history-card";
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute(
    "aria-label",
    `Restore cover letter for ${entry.jobRole} at ${entry.companyName}`
  );

  card.style.animationDelay = `${index * 60}ms`;

  const toneBadgeColor = getToneBadgeStyle(entry.tone);

  const preview = truncate(entry.coverLetter ?? "", 160);

  card.innerHTML = `
    <div class="history-card-title">
      ${escapeHTML(entry.jobRole || "Untitled Role")}
      <span style="
        font-size: 11px;
        font-weight: 500;
        padding: 2px 8px;
        border-radius: 999px;
        margin-left: 8px;
        background: ${toneBadgeColor.bg};
        color: ${toneBadgeColor.text};
        border: 1px solid ${toneBadgeColor.border};
        vertical-align: middle;
      ">${escapeHTML(entry.tone || "")}</span>
    </div>
    <div class="history-card-meta">
      ${escapeHTML(entry.companyName || "")}
      &nbsp;·&nbsp;
      ${entry.wordCount ?? 0} words
      &nbsp;·&nbsp;
      ${formatRelativeTime(entry.createdAt)}
    </div>
    <div class="history-card-preview">${escapeHTML(preview)}</div>
    <div style="
      display: flex;
      justify-content: flex-end;
      margin-top: 12px;
    ">
      <span style="
        font-size: 11.5px;
        color: var(--accent);
        font-weight: 500;
        opacity: 0.8;
      ">Click to restore →</span>
    </div>
  `;

  const restore = () => {
    renderOutput(entry.coverLetter);
    notifyInfo(`Restored: ${entry.jobRole} at ${entry.companyName}`);

    const outputPanel = document.getElementById("output-panel");
    if (outputPanel) {
      outputPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  card.addEventListener("click", restore);
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      restore();
    }
  });

  return card;
}

//* HELPERS

function getToneBadgeStyle(tone) {
  const map = {
    Professional: {
      bg:     "rgba(167,139,250,0.12)",
      text:   "var(--accent)",
      border: "rgba(167,139,250,0.3)",
    },
    Friendly: {
      bg:     "rgba(52,211,153,0.12)",
      text:   "var(--accent-2)",
      border: "rgba(52,211,153,0.3)",
    },
    Confident: {
      bg:     "rgba(251,191,36,0.12)",
      text:   "#f59e0b",
      border: "rgba(251,191,36,0.3)",
    },
    Formal: {
      bg:     "rgba(148,163,184,0.12)",
      text:   "#94a3b8",
      border: "rgba(148,163,184,0.3)",
    },
  };
  return map[tone] ?? map["Professional"];
}

function escapeHTML(str) {
  const map = {
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;",
  };
  return (str ?? "").replace(/[&<>"']/g, (c) => map[c]);
}