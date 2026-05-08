/**
 * loadingManager.js — Loading State Controller
 *
 * Manages all loading UX during AI generation:
 *   • Skeleton screen show / hide
 *   • Generate button spinner + disabled state
 *   • Output panel state transitions (empty → skeleton → result)
 *   • Regenerate button loading state
 *   • Action buttons disable during generation
 *
 * All DOM queries are cached on first call for performance.
 */

//* Element Cache 
// Lazily populated — avoids querying DOM before it's ready.
let _els = null;

function els() {
  if (_els) return _els;
  _els = {
    // Output panel states
    outputEmpty: document.getElementById("output-empty"),
    outputSkeleton: document.getElementById("output-skeleton"),
    outputCard: document.getElementById("output-card"),

    // Generate button
    generateBtn: document.getElementById("generate-btn"),
    btnLabel: document.querySelector("#generate-btn .btn-label"),
    btnLoader:document.querySelector("#generate-btn .btn-loader"),

    // Action buttons in output card header
    copyBtn: document.getElementById("copy-btn"),
    downloadTxt: document.getElementById("download-txt-btn"),
    downloadPdf: document.getElementById("download-pdf-btn"),
    regenBtn: document.getElementById("regenerate-btn"),

    // Form itself (disable inputs during generation)
    form: document.getElementById("cover-letter-form"),

    // Reset button
    resetBtn:document.getElementById("reset-form-btn"),
  };
  return _els;
}


let _isLoading = false;

export function isLoading() {
  return _isLoading;
}

export function showEmptyState() {
  const e = els();
  setVisible(e.outputEmpty,    true);
  setVisible(e.outputSkeleton, false);
  setVisible(e.outputCard,     false);
}

export function showSkeleton() {
  const e = els();
  setVisible(e.outputEmpty,    false);
  setVisible(e.outputSkeleton, true);
  setVisible(e.outputCard,     false);

  e.outputSkeleton?.setAttribute("aria-busy", "true");
}

export function showOutputCard() {
  const e = els();
  setVisible(e.outputEmpty,    false);
  setVisible(e.outputSkeleton, false);
  setVisible(e.outputCard,     true);

  e.outputSkeleton?.removeAttribute("aria-busy");

  if (window.innerWidth < 960) {
    e.outputCard?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

//* Generate Button 

export function setGenerateLoading(loading) {
  const e = els();
  if (!e.generateBtn) return;

  _isLoading = loading;

  if (loading) {
    e.generateBtn.disabled = true;
    e.generateBtn.setAttribute("aria-busy", "true");
    setVisible(e.btnLabel,  false);
    setVisible(e.btnLoader, true);
  } else {
    e.generateBtn.disabled = false;
    e.generateBtn.removeAttribute("aria-busy");
    setVisible(e.btnLabel,  true);
    setVisible(e.btnLoader, false);
  }
}

//* Action Buttons 

export function setActionButtonsDisabled(disabled) {
  const e = els();
  const buttons = [e.copyBtn, e.downloadTxt, e.downloadPdf, e.regenBtn];
  buttons.forEach((btn) => {
    if (!btn) return;
    btn.disabled = disabled;
    btn.style.opacity = disabled ? "0.5" : "";
    btn.style.pointerEvents = disabled ? "none" : "";
  });
}

export function setRegenLoading(loading) {
  const e = els();
  if (!e.regenBtn) return;

  if (loading) {
    e.regenBtn.disabled = true;
    e.regenBtn.setAttribute("data-original-text", e.regenBtn.innerHTML);
    e.regenBtn.innerHTML = `
      <span style="display:inline-flex;align-items:center;gap:6px;">
        <span class="spinner" style="width:12px;height:12px;border-width:1.5px;"></span>
        Regenerating…
      </span>`;
  } else {
    e.regenBtn.disabled = false;
    const original = e.regenBtn.getAttribute("data-original-text");
    if (original) e.regenBtn.innerHTML = original;
  }
}

//* Form Interactivity 

export function setFormLocked(locked) {
  const e = els();
  if (!e.form) return;

  const interactives = e.form.querySelectorAll(
    "input, textarea, button, select"
  );
  interactives.forEach((el) => {
    el.disabled = locked;
  });

  if (e.resetBtn) e.resetBtn.disabled = locked;

  e.form.style.opacity = locked ? "0.7" : "";
  e.form.style.pointerEvents = locked ? "none" : "";
}

//* Full Loading Sequence 

export function startLoading() {
  setFormLocked(true);
  setGenerateLoading(true);
  showSkeleton();
  setActionButtonsDisabled(true);
}

export function stopLoading() {
  setFormLocked(false);
  setGenerateLoading(false);
  showOutputCard();
  setActionButtonsDisabled(false);
}

export function stopLoadingWithError() {
  setFormLocked(false);
  setGenerateLoading(false);
  setActionButtonsDisabled(false);

  const e = els();
  const cardVisible = e.outputCard && !e.outputCard.hidden;
  if (!cardVisible) {
    showEmptyState();
  } else {
    setVisible(e.outputSkeleton, false);
  }
}

//* Utility 

function setVisible(el, visible) {
  if (!el) return;
  if (visible) {
    el.removeAttribute("hidden");
  } else {
    el.setAttribute("hidden", "");
  }
}