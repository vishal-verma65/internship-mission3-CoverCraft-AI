
//* Mistral AI API
export const API_KEY = import.meta.env.VITE_MISTRAL_API_KEY;

export const API_BASE_URL = import.meta.env.VITE_MISTRAL_API_BASE_URL ?? "https://api.mistral.ai/v1"; // Default Mistral endpoint

export const MISTRAL_MODEL = import.meta.env.VITE_MISTRAL_MODEL ?? "mistral-small-latest"; // Fast, capable, low-cost model
  // Other options: "mistral-medium-latest", "mistral-large-latest", "open-mistral-7b"

//* Request Settings 
export const REQUEST_CONFIG = {
  timeout: 30_000, // 30 s before timing out
  maxRetries: 0, // Retry on transient failures
  retryDelay: 1_500, // ms between retries (base)
  maxTokens: 2048, // Max tokens for generated output
  temperature: 0.75, // Creativity dial (0 = strict, 1 = creative)
  topP: 0.9,
};

//* PDF Parser
export const PDF_CONFIG = {
  maxFileSizeMB: 5, // Reject PDFs larger than this
  maxExtractedChars: 8_000, // Trim resume text to this length
  workerSrc: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
};

//* Form & Validation 
export const FORM_CONFIG = {
  maxJobDescriptionChars: 3_000,
  maxSkillTags: 15,
  minSkillLength: 2,
  maxSkillLength: 40,
  autoSaveDraftKey: "covercraft_draft", // localStorage key for draft
};

//* History 
export const HISTORY_CONFIG = {
  maxEntries: 10, // Keep the N most-recent generations
  storageKey: "covercraft_history",
};

//* App Meta 
export const APP_META = {
  name: "CoverCraft AI",
  version: "1.0.0",
  defaultTheme: "dark", // "dark" | "light"
  themeStorageKey: "covercraft_theme",
};