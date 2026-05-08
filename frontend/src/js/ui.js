import { countWords, byId }   from "./utils.js";
import { showOutputCard }      from "./loadingManager.js";
import { coverLetterToHTML }   from "./downloader.js";

let _onRegenerateCallback = null;

//* RENDER OUTPUT

/**
 * Populate the output card with a generated cover letter and show it.
 * Called by formHandler.js after a successful API response.
 */
export function renderOutput(text, meta = {}) {
  const body  = byId("output-body");
  const stats = byId("output-stats");

  if (!body) return;

  // Convert plain text to HTML with a header and a plain-text links footer
  body.innerHTML = coverLetterToHTML(
    text,
    meta.fullName    ?? "",
    meta.jobRole     ?? "",
    meta.companyName ?? ""
  );

  // Word count
  if (stats) {
    const words = countWords(text);
    stats.textContent = `${words} word${words !== 1 ? "s" : ""}`;
  }

  // Ensure card is visible (in case renderOutput is called from history restore)
  showOutputCard();

  // Re-trigger animation
  body.style.animation = "none";
  void body.offsetHeight; // reflow
  body.style.animation = "";
}

//* REGENERATE BUTTON

/**
 * Register the callback to invoke when the Regenerate button is clicked.
 * Typically this re-submits the form programmatically.
 */
export function onRegenerate(callback) {
  _onRegenerateCallback = callback;
}

export function initRegenerateButton() {
  const btn = byId("regenerate-btn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    if (typeof _onRegenerateCallback === "function") {
      _onRegenerateCallback();
    }
  });
}

//* SKELETONS MODULE
export function getSkeletonState() {
  return byId("output-skeleton");
}