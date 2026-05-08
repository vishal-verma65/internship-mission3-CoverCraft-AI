/**
 * pdfParser.js — PDF Text Extraction via pdf.js
 *
 * Handles: file validation, PDF loading, multi-page text extraction,
 * and all error cases (corrupted, empty, oversized, wrong type).
 */

import { PDF_CONFIG } from "./config.js";

//*Configure pdf.js Worker

// pdf.js requires a worker script for off-main-thread parsing.
// We point it at the CDN-hosted worker matching our pdf.js version.
if (typeof pdfjsLib !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_CONFIG.workerSrc;
}


export class PDFParseError extends Error {
  /**
   * message Human-readable description
   * code Machine-readable error code
   */
  constructor(message, code) {
    super(message);
    this.name = "PDFParseError";
    this.code = code;
  }
}

export const PDF_ERROR_CODES = {
  WRONG_TYPE:   "WRONG_TYPE",
  TOO_LARGE:    "TOO_LARGE",
  CORRUPTED:    "CORRUPTED",
  EMPTY:        "EMPTY",
  NO_PDFJS:     "NO_PDFJS",
};

export function validatePDFFile(file) {
  if (!file) {
    throw new PDFParseError("No file provided.", PDF_ERROR_CODES.WRONG_TYPE);
  }

  // Check MIME type AND extension to reduce false positives (e.g. .docx with PDF content type).
  const isCorrectType =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");

  if (!isCorrectType) {
    throw new PDFParseError(
      `"${file.name}" is not a PDF file. Please upload a .pdf document.`,
      PDF_ERROR_CODES.WRONG_TYPE
    );
  }

  const maxBytes = PDF_CONFIG.maxFileSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new PDFParseError(
      `File is too large (${formatFileSize(file.size)}). Maximum allowed size is ${PDF_CONFIG.maxFileSizeMB}MB.`,
      PDF_ERROR_CODES.TOO_LARGE
    );
  }
}

// * Read File as ArrayBuffer 
/**
 * Reads a File into an ArrayBuffer using the FileReader API.
 * Wrapped in a Promise for clean async/await usage.
 */
function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () =>
      reject(
        new PDFParseError(
          "Failed to read the file. It may be corrupted.",
          PDF_ERROR_CODES.CORRUPTED
        )
      );
    reader.readAsArrayBuffer(file);
  });
}

//*Extract Text from a Single Page

//Extracts and returns the plain-text content of one pdf.js page object.
async function extractPageText(page) {
  const textContent = await page.getTextContent();
  // Join text items, preserving whitespace structure
  return textContent.items
    .map((item) => {
      // hasEOL signals a newline after this item
      return item.str + (item.hasEOL ? "\n" : " ");
    })
    .join("")
    .replace(/  +/g, " ") // collapse multiple spaces
    .trim();
}

//*Main: parsePDF 

//Parses a PDF File and returns extracted text from all pages.
export async function parsePDF(file, onProgress = null) {
  //ensure pdf.js loaded
  if (typeof pdfjsLib === "undefined") {
    throw new PDFParseError(
      "pdf.js library is not loaded. Check your internet connection and reload the page.",
      PDF_ERROR_CODES.NO_PDFJS
    );
  }

  //Validate
  validatePDFFile(file);

  //Read bytes
  const arrayBuffer = await readFileAsArrayBuffer(file);

  //Load PDF document
  let pdfDoc;
  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    pdfDoc = await loadingTask.promise;
  } catch (err) {
    throw new PDFParseError(
      "Could not open the PDF. The file may be corrupted, password-protected, or malformed.",
      PDF_ERROR_CODES.CORRUPTED
    );
  }

  const numPages = pdfDoc.numPages;
  if (numPages === 0) {
    throw new PDFParseError(
      "The PDF has no pages.",
      PDF_ERROR_CODES.EMPTY
    );
  }

  //Extract text from each page
  const pageTexts = [];
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    try {
      const page = await pdfDoc.getPage(pageNum);
      const text = await extractPageText(page);
      if (text) pageTexts.push(text);
    } catch {
      // Skip unreadable pages rather than failing completely
      console.warn(`[pdfParser] Could not extract text from page ${pageNum} — skipping.`);
    }

    if (typeof onProgress === "function") {
      onProgress(pageNum, numPages);
    }
  }

  //Combine & validate extracted content
  const fullText = pageTexts.join("\n\n").trim();

  if (!fullText) {
    throw new PDFParseError(
      "No text could be extracted. The PDF may contain only scanned images. Try copy-pasting your resume text manually.",
      PDF_ERROR_CODES.EMPTY
    );
  }

  //Trim to configured max characters
  if (fullText.length > PDF_CONFIG.maxExtractedChars) {
    console.info(
      `[pdfParser] Extracted text trimmed from ${fullText.length} to ${PDF_CONFIG.maxExtractedChars} chars.`
    );
    return fullText.slice(0, PDF_CONFIG.maxExtractedChars) + "\n[...truncated]";
  }

  return fullText;
}

//*Utility: human-readable file size 

//Converts bytes to a human-readable string (e.g. "2.4 MB").
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getParseSummary(text, numPages) {
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return `${numPages} page${numPages !== 1 ? "s" : ""} · ~${wordCount} words extracted`;
}