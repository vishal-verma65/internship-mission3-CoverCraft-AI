/**
 * api.js — Mistral AI API Communication Layer
 *
 * All HTTP requests go through this module using axios (never fetch).
 * Handles: timeout, retry with exponential back-off, structured errors,
 * and rate-limit detection.
 */

import {
  API_KEY,
  API_BASE_URL,
  MISTRAL_MODEL,
  REQUEST_CONFIG,
} from "./config.js";

import axios from "axios";
export class MistralAPIError extends Error {
  /**
   * Human-readable description
   * Machine-readable code (see ERROR_CODES below)
   * HTTP status if available
   */
  constructor(message, code, status = null) {
    super(message);
    this.name = "MistralAPIError";
    this.code = code;
    this.status = status;
  }
}

export const ERROR_CODES = {
  INVALID_KEY:    "INVALID_KEY",
  RATE_LIMITED:   "RATE_LIMITED",
  NETWORK_ERROR:  "NETWORK_ERROR",
  TIMEOUT:        "TIMEOUT",
  EMPTY_RESPONSE: "EMPTY_RESPONSE",
  SERVER_ERROR:   "SERVER_ERROR",
  UNKNOWN:        "UNKNOWN",
};

const mistralAxios = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_CONFIG.timeout,
  headers: {
    "Content-Type":  "application/json",
    "Accept":        "application/json",
  },
});

mistralAxios.interceptors.request.use((config) => {
  config.headers["Authorization"] = `Bearer ${API_KEY}`;
  return config;
});

mistralAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    const structured = buildStructuredError(error);
    return Promise.reject(structured);
  }
);

function buildStructuredError(error) {
  if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
    return new MistralAPIError(
      "The request timed out. The Mistral API may be busy — please try again.",
      ERROR_CODES.TIMEOUT
    );
  }

  if (!error.response) {
    return new MistralAPIError(
      "Network error. Check your internet connection and try again.",
      ERROR_CODES.NETWORK_ERROR
    );
  }

  const status     = error.response.status;
  const apiMessage = error.response.data?.message
    ?? error.response.data?.error?.message
    ?? "Unknown API error";

  if (status === 400) {
    return new MistralAPIError(
      `Bad request: ${apiMessage}`,
      ERROR_CODES.UNKNOWN,
      status
    );
  }
  if (status === 401 || status === 403) {
    return new MistralAPIError(
      "Invalid or missing API key. Check your config.js file.",
      ERROR_CODES.INVALID_KEY,
      status
    );
  }
  if (status === 422) {
    return new MistralAPIError(
      `Unprocessable request: ${apiMessage}`,
      ERROR_CODES.UNKNOWN,
      status
    );
  }
  if (status === 429) {
    return new MistralAPIError(
      "Rate limit reached. Please wait a moment and try again.",
      ERROR_CODES.RATE_LIMITED,
      status
    );
  }
  if (status >= 500) {
    return new MistralAPIError(
      "The Mistral API is experiencing issues. Please try again shortly.",
      ERROR_CODES.SERVER_ERROR,
      status
    );
  }

  return new MistralAPIError(
    `API error (${status}): ${apiMessage}`,
    ERROR_CODES.UNKNOWN,
    status
  );
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const backoffDelay = (attempt) =>
  REQUEST_CONFIG.retryDelay * Math.pow(2, attempt);
/**
 * Send a text prompt to Mistral and return the generated text.
 *
 * Uses the /chat/completions endpoint with the standard OpenAI-compatible
 * message format that Mistral supports.
 *
 * Automatically retries on transient failures (network, 5xx, timeout).
 * Does NOT retry on auth (401/403) or rate-limit (429) errors.
 */
export async function sendPrompt(prompt, overrides = {}) {
  if (!API_KEY || API_KEY === "YOUR_MISTRAL_API_KEY") {
    throw new MistralAPIError(
      "No API key set. Open js/config.js and replace YOUR_MISTRAL_API_KEY with your real Mistral key.",
      ERROR_CODES.INVALID_KEY
    );
  }

  const payload = {
    model: overrides.model ?? MISTRAL_MODEL,
    max_tokens: overrides.maxTokens ?? REQUEST_CONFIG.maxTokens,
    temperature: overrides.temperature ?? REQUEST_CONFIG.temperature,
    top_p: overrides.topP ?? REQUEST_CONFIG.topP,
    messages: [
      { role: "user", content: prompt },
    ],
  };

  // Remove undefined keys (Mistral returns 422 on unexpected nulls)
  Object.keys(payload).forEach(
    (k) => payload[k] === undefined && delete payload[k]
  );

  const endpoint = "/chat/completions";
  let lastError;

  for (let attempt = 0; attempt <= REQUEST_CONFIG.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = backoffDelay(attempt - 1);
        console.info(`[api] Retry ${attempt}/${REQUEST_CONFIG.maxRetries} after ${delay}ms…`);
        await sleep(delay);
      }

      const response = await mistralAxios.post(endpoint, payload);
      const text     = extractTextFromResponse(response.data);
      return text;

    } catch (error) {
      lastError = error;

      // Do not retry auth or rate-limit failures
      const noRetry = [ERROR_CODES.INVALID_KEY, ERROR_CODES.RATE_LIMITED];
      if (noRetry.includes(error.code)) break;

      // If this was the last attempt, stop looping
      if (attempt === REQUEST_CONFIG.maxRetries) break;
    }
  }

  throw lastError;
}

//* Helper: extract text from Mistral response 

function extractTextFromResponse(data) {
  const choice = data?.choices?.[0];

  if (!choice) {
    throw new MistralAPIError(
      "Mistral returned no choices. The prompt may have been blocked.",
      ERROR_CODES.EMPTY_RESPONSE
    );
  }

  if (choice.finish_reason === "error") {
    throw new MistralAPIError(
      "Mistral stopped generation due to an error. Try adjusting the prompt.",
      ERROR_CODES.EMPTY_RESPONSE
    );
  }

  const text = choice.message?.content?.trim();

  if (!text) {
    throw new MistralAPIError(
      "Mistral returned an empty response. Please try again.",
      ERROR_CODES.EMPTY_RESPONSE
    );
  }

  return text;
}

//* Utility: check if API key looks valid (basic heuristic) 
export function isApiKeyConfigured() {
  return (
    typeof API_KEY === "string" &&
    API_KEY.length > 10 &&
    API_KEY !== "YOUR_MISTRAL_API_KEY"
  );
}