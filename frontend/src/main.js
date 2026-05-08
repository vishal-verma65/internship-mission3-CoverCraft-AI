/**
 * main.js — Application Entry Point
 *
 * Bootstraps every module in the order defined below after the DOM is ready.
 * This is the only file loaded via script in index.html.
 *
 * Boot order:
 *   1. Theme — apply saved theme before first paint (no flash)
 *   2. Animations — particles, scroll-reveal, ripple, hero CTA
 *   3. Notifications — container ready
 *   4. Form — inputs, tags, upload, validation, draft restore
 *   5. UI / Output — regenerate button wired
 *   6. Clipboard — copy button wired
 *   7. Downloads — TXT + PDF buttons wired
 *   8. History — render saved generations
 *   9. API key check — warn early if key is missing
 */

import { initTheme }                  from "../src/js/theme.js";
import { initParticles,
         initScrollReveal,
         initRippleButtons,
         initHeroCTA,
         initParticleVisibilityToggle } from "../src/js/animations.js";
import { initForm,
         getCurrentText,
         getCurrentMeta }              from "../src/js/formHandler.js";
import { initRegenerateButton,
         onRegenerate }               from "../src/js/ui.js";
import { initCopyButton }             from "../src/js/clipboard.js";
import { initDownloadButtons }        from "../src/js/downloader.js";
import { initHistory }                from "../src/js/history.js";
import { isApiKeyConfigured }         from "../src/js/api.js";
import { notifyError, notifyInfo }    from "../src/js/notifications.js";
import { showEmptyState }             from "../src/js/loadingManager.js";

document.addEventListener("DOMContentLoaded", () => {

  //*theme
  initTheme();

  //*animations
  initParticles();
  initParticleVisibilityToggle();
  initScrollReveal();
  initRippleButtons();
  initHeroCTA();

  //*Form (also restores draft, wires validation, PDF upload, submit)
  initForm();

  //*Output panel defaults
  showEmptyState();

  //*Regenerate — triggers a fresh form submit programmatically
  initRegenerateButton();
  onRegenerate(() => {
    const form = document.getElementById("cover-letter-form");
    if (form) form.requestSubmit();
  });

  //*Clipboard — copy button
  initCopyButton(getCurrentText);

  // *Downloads — TXT + PDF
  initDownloadButtons(getCurrentText, getCurrentMeta);

  //*History grid
  initHistory();

  //*API key sanity check — warn immediately so developer knows
  if (!isApiKeyConfigured()) {
    notifyError(
      "No Gemini API key found. Open js/config.js and add your key to get started.",
      0
    );
  }

  console.info("✦ CoverCraft AI — ready.");
});