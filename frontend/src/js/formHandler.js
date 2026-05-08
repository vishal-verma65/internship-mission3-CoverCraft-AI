/**
 * formHandler.js — Form State, Tag System, PDF Upload & Generation Trigger
 *
 * Responsibilities:
 *   • Collect and expose all form field values
 *   • Skills tag input system (add / remove / duplicate guard)
 *   • PDF upload zone (drag-and-drop + click, preview, extraction)
 *   • Character counter on job description textarea
 *   • Form reset
 *   • Draft auto-save (debounced)
 *   • Submit → validate → build prompt → call API → render result
 */

import { sendPrompt }                        from "./api.js";
import { buildCoverLetterPrompt,
         sanitizeInput }                     from "./promptBuilder.js";
import { parsePDF, formatFileSize,
         getParseSummary }                   from "./pdfParser.js";
import { validateForm, displayFormErrors,
         clearAllErrors, attachLiveValidation,
         validateEmail, validateFullName,
         validateRequired, validateJobDescription,
         validateSkills }                    from "./validators.js";
import { saveDraft, loadDraft, clearDraft }  from "./storage.js";
import { startLoading, stopLoading,
         stopLoadingWithError, isLoading }   from "./loadingManager.js";
import { notifyFromError, notifySuccess,
         notifyInfo, notifyError }           from "./notifications.js";
import { debounce, countWords, textToParagraphs,
         byId }                              from "./utils.js";
import { renderOutput }                      from "./ui.js";
import { addHistoryEntry }                   from "./history.js";
import { FORM_CONFIG }                       from "./config.js";

//* Module State 
//Current skills tag list 
let _tags = [];

// Extracted resume text from PDF
let _resumeText = "";

//Last successfully generated cover letter
let _lastGeneratedText = "";

// Meta for downloads
let _lastMeta = {};

//* Getters (used by clipboard.js & downloader.js)
export const getCurrentText = () => _lastGeneratedText;
export const getCurrentMeta = () => ({ ..._lastMeta });

//* INITIALISE

/**
 * Bootstrap the entire form: attach all listeners, restore draft, wire submit.
 * Call once from main.js after DOMContentLoaded.
 */
export function initForm() {
  attachLiveValidators();
  initTagInput();
  initUploadZone();
  initCharCounter();
  initResetButton();
  initDraftAutoSave();
  restoreDraft();

  const form = byId("cover-letter-form");
  if (form) {
    form.addEventListener("submit", handleSubmit);
  }
}

//* LIVE VALIDATION
function attachLiveValidators() {
  attachLiveValidation("full-name",    validateFullName);
  attachLiveValidation("email",        validateEmail);
  attachLiveValidation("job-role",     (v) => validateRequired(v, "Job role"));
  attachLiveValidation("company-name", (v) => validateRequired(v, "Company name"));
  attachLiveValidation("job-description", validateJobDescription);
}

//* SKILLS TAG SYSTEM
function initTagInput() {
  const input     = byId("skills-input");
  const container = byId("tags-container");
  if (!input || !container) return;

  container.addEventListener("click", () => input.focus());

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input.value);
      input.value = "";
    }
    if (e.key === "Backspace" && input.value === "" && _tags.length > 0) {
      removeTag(_tags[_tags.length - 1]);
    }
  });

  input.addEventListener("blur", () => {
    if (input.value.trim()) {
      addTag(input.value);
      input.value = "";
    }
  });
}

function addTag(raw) {
  const skill = raw.replace(/,/g, "").trim();
  if (!skill || skill.length < FORM_CONFIG.minSkillLength) return;
  if (skill.length > FORM_CONFIG.maxSkillLength) {
    notifyError(`Skill is too long (max ${FORM_CONFIG.maxSkillLength} chars).`);
    return;
  }
  if (_tags.length >= FORM_CONFIG.maxSkillTags) {
    notifyError(`Maximum ${FORM_CONFIG.maxSkillTags} skills allowed.`);
    return;
  }
  if (_tags.some((t) => t.toLowerCase() === skill.toLowerCase())) {
    notifyInfo(`"${skill}" is already added.`);
    return;
  }

  _tags.push(skill);
  renderTags();
  triggerDraftSave();
}

function removeTag(skill) {
  _tags = _tags.filter((t) => t !== skill);
  renderTags();
  triggerDraftSave();
}

function renderTags() {
  const list = byId("tags-list");
  if (!list) return;

  list.innerHTML = "";
  _tags.forEach((skill) => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.setAttribute("role", "listitem");

    const label = document.createElement("span");
    label.textContent = skill;

    const removeBtn = document.createElement("button");
    removeBtn.className = "tag-remove";
    removeBtn.setAttribute("aria-label", `Remove skill: ${skill}`);
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      removeTag(skill);
    });

    tag.appendChild(label);
    tag.appendChild(removeBtn);
    list.appendChild(tag);
  });
}

//* PDF UPLOAD ZONE
function initUploadZone() {
  const zone      = byId("upload-zone");
  const fileInput = byId("resume-file");
  const removeBtn = byId("remove-file");

  if (!zone || !fileInput) return;

  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("dragover");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("dragover");
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileSelected(file);
  });

  zone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
  });

  if (removeBtn) {
    removeBtn.addEventListener("click", clearUploadedFile);
  }

  const toggleBtn = byId("toggle-extracted");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const content = byId("extracted-content");
      const preview = byId("extracted-preview");
      if (!content || !preview) return;
      const isHidden = content.hidden;
      content.hidden   = !isHidden;
      toggleBtn.textContent = isHidden ? "Hide" : "Show";
    });
  }
}

async function handleFileSelected(file) {
  const zone = byId("upload-zone");

  try {
    // Show a subtle loading indicator on the zone
    zone?.setAttribute("aria-busy", "true");

    // parsePDF validates internally and throws PDFParseError on failure
    const text = await parsePDF(file, (page, total) => {
      // Optional: update zone text with progress
      const sub = zone?.querySelector(".upload-sub");
      if (sub) sub.textContent = `Extracting page ${page} of ${total}…`;
    });

    _resumeText = text;
    showFileMeta(file, text);
    notifySuccess("Resume extracted successfully!");

  } catch (err) {
    notifyFromError(err);
    _resumeText = "";
    clearUploadedFile();
  } finally {
    zone?.removeAttribute("aria-busy");
    // Reset the file input so the same file can be re-selected after removal
    const fileInput = byId("resume-file");
    if (fileInput) fileInput.value = "";
  }
}

/** Display the file preview card and extracted text block. */
function showFileMeta(file, extractedText) {
  const preview      = byId("file-preview");
  const nameDisplay  = byId("file-name-display");
  const sizeDisplay  = byId("file-size-display");
  const zone         = byId("upload-zone");
  const extPreview   = byId("extracted-preview");
  const extContent   = byId("extracted-content");

  if (preview)     { preview.hidden     = false; }
  if (zone)        { zone.hidden        = true;  }
  if (nameDisplay) { nameDisplay.textContent = file.name; }
  if (sizeDisplay) {
    const wordCount = countWords(extractedText);
    sizeDisplay.textContent =
      `${formatFileSize(file.size)} · ~${wordCount} words extracted`;
  }
  if (extPreview)  { extPreview.hidden  = false; }
  if (extContent)  { extContent.textContent = extractedText; }
}

function clearUploadedFile() {
  _resumeText = "";

  const preview    = byId("file-preview");
  const zone       = byId("upload-zone");
  const extPreview = byId("extracted-preview");
  const extContent = byId("extracted-content");
  const sub        = zone?.querySelector(".upload-sub");

  if (preview)    { preview.hidden    = true;  }
  if (zone)       { zone.hidden       = false; }
  if (extPreview) { extPreview.hidden = true;  }
  if (extContent) { extContent.textContent = ""; }
  if (sub)        { sub.textContent   = "PDF files only, max 5MB"; }
}

//* CHARACTER COUNTER
function initCharCounter() {
  const textarea = byId("job-description");
  const counter  = byId("jd-counter");
  if (!textarea || !counter) return;

  const max = FORM_CONFIG.maxJobDescriptionChars;

  const update = () => {
    const len = textarea.value.length;
    counter.textContent = `${len.toLocaleString()} / ${max.toLocaleString()}`;
    counter.style.color = len > max * 0.9
      ? "var(--danger)"
      : "var(--text-tertiary)";
  };

  textarea.addEventListener("input", update);
  update();
}

//* DRAFT AUTO-SAVE
const triggerDraftSave = debounce(_saveDraft, 800);

function initDraftAutoSave() {
  const fields = ["full-name", "email", "job-role", "company-name", "job-description"];
  fields.forEach((id) => {
    const el = byId(id);
    el?.addEventListener("input", triggerDraftSave);
  });
  // Radio groups
  document.querySelectorAll(
    'input[name="experienceLevel"], input[name="tone"]'
  ).forEach((r) => r.addEventListener("change", triggerDraftSave));
}

function _saveDraft() {
  saveDraft({
    fullName:        byId("full-name")?.value   ?? "",
    email:           byId("email")?.value        ?? "",
    jobRole:         byId("job-role")?.value     ?? "",
    companyName:     byId("company-name")?.value ?? "",
    skills:          [..._tags],
    experienceLevel: getRadioValue("experienceLevel") ?? "Mid-Level",
    tone:            getRadioValue("tone")            ?? "Professional",
    jobDescription:  byId("job-description")?.value  ?? "",
  });
}

function restoreDraft() {
  const draft = loadDraft();
  if (!draft) return;

  setField("full-name",       draft.fullName);
  setField("email",           draft.email);
  setField("job-role",        draft.jobRole);
  setField("company-name",    draft.companyName);
  setField("job-description", draft.jobDescription);
  setRadio("experienceLevel", draft.experienceLevel);
  setRadio("tone",            draft.tone);

  if (Array.isArray(draft.skills) && draft.skills.length) {
    _tags = draft.skills;
    renderTags();
  }

  // Update char counter after restoring textarea
  const counter = byId("jd-counter");
  const ta      = byId("job-description");
  if (counter && ta) {
    counter.textContent =
      `${ta.value.length.toLocaleString()} / ${FORM_CONFIG.maxJobDescriptionChars.toLocaleString()}`;
  }
}

//* RESET
function initResetButton() {
  const btn = byId("reset-form-btn");
  btn?.addEventListener("click", resetForm);
}

export function resetForm() {
  const form = byId("cover-letter-form");
  form?.reset();

  _tags       = [];
  _resumeText = "";
  renderTags();
  clearAllErrors();
  clearUploadedFile();
  clearDraft();

  // Reset char counter
  const counter = byId("jd-counter");
  if (counter) counter.textContent = `0 / ${FORM_CONFIG.maxJobDescriptionChars.toLocaleString()}`;

  notifyInfo("Form reset.");
}

//* COLLECT FORM DATA

//Read all form field values into a clean data object.
export function collectFormData() {
  return {
    fullName:        sanitizeInput(byId("full-name")?.value   ?? ""),
    email:           sanitizeInput(byId("email")?.value        ?? ""),
    jobRole:         sanitizeInput(byId("job-role")?.value     ?? ""),
    companyName:     sanitizeInput(byId("company-name")?.value ?? ""),
    skills:          [..._tags],
    experienceLevel: getRadioValue("experienceLevel") ?? "Mid-Level",
    tone:            getRadioValue("tone")            ?? "Professional",
    jobDescription:  sanitizeInput(byId("job-description")?.value ?? ""),
    resumeText:      _resumeText,
  };
}

//* SUBMIT HANDLER

async function handleSubmit(e) {
  e.preventDefault();
  if (isLoading()) return;

  const data = collectFormData();

  // Validate
  const { allValid, fields } = validateForm(data);
  displayFormErrors(fields);
  if (!allValid) {
    notifyError("Please fix the highlighted fields before generating.");
    // Scroll to first error
    const firstError = document.querySelector(".form-input.error, .form-textarea.error");
    firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  clearAllErrors();

  // Build prompt
  const prompt = buildCoverLetterPrompt(data);

  startLoading();

  try {
    const generatedText = await sendPrompt(prompt);

    // Cache for clipboard / download
    _lastGeneratedText = generatedText;
    _lastMeta = {
      fullName:    data.fullName,
      companyName: data.companyName,
      jobRole:     data.jobRole,
    };

    // Render output card
    renderOutput(generatedText, {
      fullName:    data.fullName,
      jobRole:     data.jobRole,
      companyName: data.companyName,
    });

    // Save to history
    addHistoryEntry({
      fullName:    data.fullName,
      jobRole:     data.jobRole,
      companyName: data.companyName,
      tone:        data.tone,
      coverLetter: generatedText,
    });

    // Clear draft on success
    clearDraft();
    stopLoading();
    notifySuccess("Cover letter generated!");

  } catch (err) {
    stopLoadingWithError();
    notifyFromError(err);
    console.error("[formHandler] Generation error:", err);
  }
}

//* HELPERS

function getRadioValue(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value ?? null;
}

function setField(id, value) {
  const el = byId(id);
  if (el && value) el.value = value;
}

function setRadio(name, value) {
  if (!value) return;
  const radio = document.querySelector(
    `input[name="${name}"][value="${value}"]`
  );
  if (radio) radio.checked = true;
}