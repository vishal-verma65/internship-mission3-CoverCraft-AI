/**
 * downloader.js — Cover Letter Export Module
 *
 * Handles downloading the generated cover letter as:
 *   • Plain text (.txt)
 *   • PDF (.pdf) — generated client-side via a print-ready HTML window
 *
 * All downloads use triggerDownload() from utils.js.
 */

import { notifySuccess, notifyError, notifyInfo } from "./notifications.js";


function buildFilename(fullName, companyName, ext) {
  const clean = (str) =>
    (str || "")
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 30);
  const name    = clean(fullName)    || "Candidate";
  const company = clean(companyName) || "Company";
  return `CoverLetter_${name}_${company}.${ext}`;
}

function setButtonActive(btn, label) {
  if (!btn) return;
  const original = btn.innerHTML;
  btn.disabled   = true;
  btn.innerHTML  = `
    <span class="spinner" style="width:12px;height:12px;border-width:1.5px;"></span>
    ${label}
  `;
  return () => {
    btn.disabled  = false;
    btn.innerHTML = original;
  };
}


export function downloadAsTXT(text, fullName = "", companyName = "") {
  if (!text?.trim()) {
    notifyError("No cover letter to download. Generate one first.");
    return;
  }
  const filename = buildFilename(fullName, companyName, "txt");
  triggerDownload(text, filename, "text/plain;charset=utf-8");
  notifySuccess(`Downloaded as "${filename}"`);
}


export function downloadAsPDF(text, fullName = "", companyName = "", jobRole = "") {
  if (!text?.trim()) {
    notifyError("No cover letter to download. Generate one first.");
    return;
  }

  const htmlContent = buildPDFHTML(text, fullName, companyName, jobRole);
  const filename    = buildFilename(fullName, companyName, "pdf");

  const printWindow = window.open("", "_blank", "width=800,height=900");

  if (!printWindow) {
    notifyInfo(
      "Pop-up blocked. Downloading as HTML instead. Open and print to get a PDF."
    );
    triggerDownload(
      htmlContent,
      buildFilename(fullName, companyName, "html"),
      "text/html;charset=utf-8"
    );
    return;
  }

  printWindow.document.write(htmlContent);
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
    notifySuccess(`Print dialog opened — save as "${filename}"`);
  };
}

//* Body / Links Splitter 

/**
 * Splits the cover letter text into body paragraphs and a links footer.
 *
 * The links footer is detected as the trailing block of lines that look
 * like "Label : URL" entries (produced by promptBuilder's buildLinksBlock).
 * These are separated out so they can be rendered as a distinct styled
 * section.
 *
 * IMPORTANT: We match ONLY lines that contain a protocol-or-www URL, or a
 * clear "Label : URL" pattern. Plain words (like a sign-off name) must NOT
 * be caught here.
 */
function splitBodyAndLinks(text) {
  const lines = text.split("\n");

  // A links-footer line is one of:
  //   • Any line with a protocol URL:  "GitHub    : https://github.com/..."
  //   • A known label + bare domain:   "Portfolio : vishalvermaprofile.netlify.app"
  //   • A bare protocol URL on its own line
  // We anchor on known label names so plain sign-off text is never caught.
  const LINK_LINE_RE =
    /^(?:(?:https?:\/\/|www\.)\S+|(?:Portfolio|GitHub)\s*:\s*\S+)$/i;

  // Walk from the bottom up to find where the links block starts
  let splitIdx = lines.length;
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (trimmed === "") continue; // skip blank separators within the footer
    if (LINK_LINE_RE.test(trimmed)) {
      splitIdx = i;
    } else {
      break;
    }
  }

  const bodyText  = lines.slice(0, splitIdx).join("\n").trimEnd();
  const linkLines = lines
    .slice(splitIdx)
    .map((l) => l.trim())
    .filter(Boolean);

  return { bodyText, linkLines };
}

//* Link line parser 

//Parses a "Label : URL" or bare URL string into { label, url }.
function parseLinkLine(line) {
  // The label separator produced by buildLinksBlock is always "Label : URL"
  // (a space-colon-space or space-colon pattern with a plain-word label).
  // We match a label of only letters/spaces FOLLOWED BY " : " or ": ",
  // then capture everything after as the URL — including any colons in
  // "https://..." so we never split inside the URL itself.
  const match = line.match(/^([A-Za-z][A-Za-z ]{0,18})\s*:\s+(.+)$/);
  if (match) {
    return { label: match[1].trim(), url: match[2].trim() };
  }
  // No label — the whole line is a URL
  return { label: "", url: line.trim() };
}

//* Local HTML escape 
function escapeHTMLLocal(str) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return (str ?? "").replace(/[&<>"']/g, (ch) => map[ch]);
}

//* PDF: link line → anchor HTML 

/**
 * Converts a parsed link line into a styled <div> with an <a> anchor.
 * Used only in the PDF renderer.
 */
function linkLineToAnchor(line) {
  const { label, url } = parseLinkLine(line);
  const escapedHref    = escapeHTMLLocal(url);
  const escapedDisp    = escapeHTMLLocal(url);

  if (label) {
    return `
      <div class="link-row">
        <span class="link-label">${escapeHTMLLocal(label)}</span>
        <a href="${escapedHref}" target="_blank" rel="noopener noreferrer">${escapedDisp}</a>
      </div>`;
  }

  return `
    <div class="link-row">
      <a href="${escapedHref}" target="_blank" rel="noopener noreferrer">${escapedDisp}</a>
    </div>`;
}

//* PDF: body paragraph renderer (NO inline linkification)

/**
 * Converts a plain paragraph to a safe HTML <p>.
 * URLs in the body are intentionally left as plain text in the PDF —
 * all links live only in the footer block.
 */
function paragraphToHTML(paragraph) {
  return `<p>${escapeHTMLLocal(paragraph)}</p>`;
}

//* PDF HTML Template

function buildPDFHTML(text, fullName, companyName, jobRole) {
  const today = new Date().toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric",
  });

  const { bodyText, linkLines } = splitBodyAndLinks(text);

  // Body paragraphs — plain text only, no inline URL linkification
  const paragraphs = bodyText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(paragraphToHTML)
    .join("\n");

  // Links footer — each link on its own line as a styled anchor
  const linksHTML = linkLines.length
    ? `<div class="links-footer">${linkLines.map(linkLineToAnchor).join("")}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Cover Letter — ${escapeHTMLLocal(fullName)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 11.5pt;
      line-height: 1.8;
      color: #1a1a1a;
      background: #fff;
    }

    .page {
      max-width: 680px;
      margin: 0 auto;
      padding: 60px 60px 80px;
    }

    /* Header */
    .header {
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 18px;
      margin-bottom: 28px;
    }
    .header-name {
      font-size: 22pt;
      font-weight: bold;
      letter-spacing: -0.5px;
      color: #0d0d0d;
      margin-bottom: 4px;
    }
    .header-meta {
      font-size: 10pt;
      color: #555;
      font-family: 'Arial', sans-serif;
    }
    .header-meta span { margin-right: 18px; }

    /* Date & Recipient */
    .date-line {
      font-size: 10.5pt;
      color: #444;
      margin-bottom: 22px;
      font-family: 'Arial', sans-serif;
    }
    .recipient {
      margin-bottom: 28px;
    }
    .recipient-company { font-weight: bold; font-size: 11pt; }
    .recipient-role    { font-size: 10.5pt; color: #555; }

    /* Body */
    .body p {
      margin-bottom: 16px;
      text-align: justify;
      orphans: 3;
      widows: 3;
    }
    .body p:last-child { margin-bottom: 0; }

    /* Links footer block */
    .links-footer {
      margin-top: 28px;
      padding-top: 16px;
      border-top: 1px solid #ddd;
      font-family: 'Arial', sans-serif;
      font-size: 10pt;
    }

    /* Each link on its own line */
    .link-row {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 6px;
      line-height: 1.5;
    }
    .link-row:last-child { margin-bottom: 0; }

    .link-label {
      min-width: 80px;
      font-weight: 600;
      color: #333;
      flex-shrink: 0;
    }

    .links-footer a {
      color: #1a56db;
      text-decoration: underline;
      word-break: break-all;
    }
    .links-footer a:hover { color: #1e40af; }

    /* Page footer */
    .footer {
      margin-top: 36px;
      font-size: 10pt;
      color: #888;
      font-family: 'Arial', sans-serif;
      border-top: 1px solid #ddd;
      padding-top: 12px;
      text-align: right;
    }

    @media print {
      body { padding: 0; }
      .page { padding: 0; max-width: 100%; }
      .footer { display: none; }

      a[href]::after { content: none; }

      @page {
        margin: 2cm 2.5cm;
        size: A4;
      }
    }
  </style>
</head>
<body>
  <div class="page">

    <div class="header">
      <div class="header-name">${escapeHTMLLocal(fullName) || "Applicant"}</div>
      <div class="header-meta">
        <span>Cover Letter</span>
        <span>Applying for: <strong>${escapeHTMLLocal(jobRole) || "Open Role"}</strong></span>
      </div>
    </div>

    <div class="date-line">${today}</div>

    <div class="recipient">
      <div class="recipient-company">Hiring Team</div>
      <div class="recipient-role">${escapeHTMLLocal(companyName) || "Company"}</div>
    </div>

    <div class="body">
      ${paragraphs}
    </div>

    ${linksHTML}

    <div class="footer">
      Generated by CoverCraft AI · ${today}
    </div>

  </div>
</body>
</html>`;
}

//* UI Output Renderer 

/**
 * Converts the raw cover letter string into safe HTML for the on-screen
 * output card.
 *
 * Changes from previous version:
 *   • A header block (name + date + recipient) is rendered at the top,
 *     matching the PDF layout.
 *   • Body paragraphs are plain text — no inline URL linkification.
 *   • The links footer shows each link as plain text (label + URL),
 *     one per line — NOT as <a> anchor tags.
 */
export function coverLetterToHTML(text, fullName = "", jobRole = "", companyName = "") {
  if (!text?.trim()) return "";

  const { bodyText, linkLines } = splitBodyAndLinks(text);

  //Header
  const today = new Date().toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric",
  });

  // Only render the header block if we have at least a name or role to show
  const hasHeaderData = fullName || jobRole || companyName;
  const headerHTML = hasHeaderData ? `<div style="border-bottom:1px solid var(--border,#ddd);padding-bottom:8px;margin-bottom:12px;">${fullName ? `<div style="font-size:1.1em;font-weight:700;color:var(--text-primary,#0d0d0d);margin-bottom:2px;">${escapeHTMLLocal(fullName)}</div>` : ""}<div style="font-size:0.8em;color:var(--text-secondary,#555);font-family:sans-serif;display:flex;flex-wrap:wrap;gap:0 14px;"><span>Cover Letter</span>${jobRole ? `<span>· <strong>${escapeHTMLLocal(jobRole)}</strong></span>` : ""}${companyName ? `<span>· ${escapeHTMLLocal(companyName)}</span>` : ""}</div></div><div style="font-size:0.78em;color:var(--text-tertiary,#888);font-family:sans-serif;margin-bottom:14px;">${today}</div>` : "";

  // Body paragraphs 
  const paragraphsHTML = bodyText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin-bottom:1em;line-height:1.8;">${escapeHTMLLocal(p)}</p>`)
    .join("\n");

  // Links footer — plain text, one per line, NOT anchor tags
  if (!linkLines.length) return headerHTML + paragraphsHTML;

  const linksHTML = linkLines
    .map((line) => {
      const { label, url } = parseLinkLine(line);
      const labelSpan = label
        ? `<span style="display:inline-block;min-width:80px;font-weight:600;color:var(--text-secondary,#555);font-size:0.85em;flex-shrink:0;">${escapeHTMLLocal(label)}</span>`
        : "";
      return `<div style="display:flex;align-items:baseline;gap:6px;margin-bottom:2px;font-size:0.85em;font-family:sans-serif;line-height:1.4;">${labelSpan}<span style="color:var(--text-primary,#1a1a1a);word-break:break-all;">${escapeHTMLLocal(url)}</span></div>`;
    })
    .join("");

  const footerBlock = `<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border,#ddd);">${linksHTML}</div>`;

  return headerHTML + paragraphsHTML + footerBlock;
}

//*Init Download Buttons 

export function initDownloadButtons(getTextFn, getMetaFn) {
  const txtBtn = document.getElementById("download-txt-btn");
  if (txtBtn) {
    txtBtn.addEventListener("click", () => {
      const text    = getTextFn?.() ?? "";
      const meta    = getMetaFn?.() ?? {};
      const restore = setButtonActive(txtBtn, "Saving…");
      setTimeout(() => {
        downloadAsTXT(text, meta.fullName, meta.companyName);
        restore?.();
      }, 150);
    });
  }

  const pdfBtn = document.getElementById("download-pdf-btn");
  if (pdfBtn) {
    pdfBtn.addEventListener("click", () => {
      const text = getTextFn?.() ?? "";
      const meta = getMetaFn?.() ?? {};
      downloadAsPDF(text, meta.fullName, meta.companyName, meta.jobRole);
    });
  }
}