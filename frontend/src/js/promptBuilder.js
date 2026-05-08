/**
 * promptBuilder.js — Dynamic Prompt Engineering
 */

const TONE_DESCRIPTORS = {
  "Professional": `Write in a polished, professional tone. Use precise language, avoid contractions, and maintain a respectful distance while demonstrating clear competence and industry awareness.`,
  "Friendly": `Write in a warm, personable tone. Use a conversational voice that feels genuine and approachable, while still being respectful and work-appropriate. Contractions are fine.`,
  "Confident": `Write in a bold, self-assured tone. Lead with accomplishments, use active voice, and project quiet confidence without arrogance. Showcase the candidate's strengths assertively.`,
  "Formal": `Write in a highly formal, traditional tone. Avoid contractions, colloquialisms, or casual phrasing. Follow classical business letter conventions with structured paragraphs.`,
};

const EXPERIENCE_CONTEXT = {
  "Entry-Level": `The candidate is early in their career. Emphasize their academic background, internships, personal projects, and strong eagerness to learn. Frame limited experience as fresh energy and potential.`,
  "Mid-Level": `The candidate has 3-7 years of experience. Highlight concrete achievements, growing ownership of projects, and specific skills that directly map to the role's requirements.`,
  "Senior": `The candidate is a senior professional. Focus on leadership, strategic impact, mentoring, cross-functional collaboration, and measurable outcomes that demonstrate their ability to drive results at scale.`,
  "Executive": `The candidate is an executive or C-suite professional. Emphasize vision, organizational transformation, P&L ownership, board-level communication, and enterprise-wide influence.`,
};

export function extractLinksFromResume(text) {
  if (!text) return { github: null, portfolio: null };

  const lowerText = text.toLowerCase();
  let github    = null;
  let portfolio = null;

  const githubMatch = lowerText.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/(?!assets\/|raw\/)[a-z0-9][-a-z0-9._]*(?:\/[^\s,;|"'<>\[\](){}]*)?/
  );
  if (githubMatch) {
    const raw = text.slice(githubMatch.index, githubMatch.index + githubMatch[0].length)
      .replace(/[.,;:!?)\]]+$/, "");
    github = normaliseUrl(raw);
  }

  const labelledMatch = text.match(
    /(?:portfolio|website|personal\s+site|site|web|blog)\s*[:\--]\s*((?:https?:\/\/)?(?:www\.)?[a-z0-9][-a-z0-9.]+\.[a-z]{2,}(?:\/[^\s,;|"'<>\[\](){}]*)?)/i
  );
  if (labelledMatch) {
    portfolio = normaliseUrl(labelledMatch[1].trim().replace(/[,;:!?)\]]+$/, ""));
  }

  if (!portfolio) {
    const fullUrlPattern = /https?:\/\/[^\s,;|"'<>\[\](){}]+/gi;
    for (const match of text.matchAll(fullUrlPattern)) {
      const url   = match[0].replace(/[,;:!?)\]]+$/, "");
      const lower = url.toLowerCase();
      if (!lower.includes("github.com") && !lower.includes("linkedin.com")) {
        portfolio = url;
        break;
      }
    }
  }

  if (!portfolio) {
    const EXCLUDED_KEYWORDS = [
      "linkedin", "github", "gmail", "yahoo",
      "outlook", "hotmail", "twitter", "x.com",
      "facebook", "instagram", "medium",
    ];
    const barePattern =
      /(?:^|[\s|,;(\n])(?:www\.)?([a-z0-9][-a-z0-9.]*[a-z0-9]\.(?:dev|io|me|co(?:m)?|net|org|app|xyz|tech|design|codes?)(?:\/[^\s,;|"'<>\[\](){}]*)?)/gi;

    for (const match of text.matchAll(barePattern)) {
      const candidate = match[1].replace(/[.,;:!?)\]]+$/, "");
      const lower     = candidate.toLowerCase();
      if (!EXCLUDED_KEYWORDS.some((kw) => lower.includes(kw))) {
        portfolio = normaliseUrl(candidate);
        break;
      }
    }
  }

  return { github, portfolio };
}

function normaliseUrl(url) {
  if (!url) return url;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function buildLinksBlock({ github, portfolio }) {
  const lines = [];
  if (portfolio) lines.push(`Portfolio : ${portfolio}`);
  if (github)    lines.push(`GitHub    : ${github}`);
  return lines.join("\n");
}

export function buildCoverLetterPrompt({
  fullName, email, jobRole, companyName,
  skills, experienceLevel, tone, jobDescription, resumeText = "",
}) {
  const toneInstruction       = TONE_DESCRIPTORS[tone]            || TONE_DESCRIPTORS["Professional"];
  const experienceInstruction = EXPERIENCE_CONTEXT[experienceLevel] || EXPERIENCE_CONTEXT["Mid-Level"];
  const skillsList = skills.length
    ? skills.map((s, i) => `  ${i + 1}. ${s}`).join("\n")
    : "  (No skills provided — infer from resume and job description)";
  const resumeSection = resumeText
    ? `\n--- RESUME TEXT (extracted from PDF) ---\n${truncate(resumeText, 5000)}\n--- END RESUME ---\n`
    : "\n(No resume uploaded — rely on skills, experience level, and job description.)\n";

  const extractedLinks = extractLinksFromResume(resumeText);
  const linksBlock     = buildLinksBlock(extractedLinks);
  const hasLinks       = linksBlock.length > 0;

  console.log("[promptBuilder] Extracted links:", extractedLinks);

  const linksInstruction = hasLinks
    ? `
5. LINKS FOOTER
   After the sign-off line (the candidate's name), add one blank line,
   then output ONLY the following lines exactly as shown — do not alter,
   shorten, or reformat the URLs:

${linksBlock}

   Do not add any label or sentence before the links block.
   Do not add any text after the links block.
`
    : `
5. LINKS FOOTER
   No portfolio or GitHub links were found in the resume.
   Do not add any links or placeholder text at the bottom of the letter.
`;

  return `
You are an expert career coach and professional copywriter specializing in
cover letters that consistently pass ATS screening and impress human recruiters.

═══════════════════════════════════════════════════════════
CANDIDATE PROFILE
═══════════════════════════════════════════════════════════
Full Name      : ${fullName}
Email          : ${email}
Applying For   : ${jobRole}
At Company     : ${companyName}
Experience     : ${experienceLevel}

KEY SKILLS:
${skillsList}

═══════════════════════════════════════════════════════════
TONE INSTRUCTION
═══════════════════════════════════════════════════════════
${toneInstruction.trim()}

═══════════════════════════════════════════════════════════
EXPERIENCE CONTEXT
═══════════════════════════════════════════════════════════
${experienceInstruction.trim()}

═══════════════════════════════════════════════════════════
JOB DESCRIPTION
═══════════════════════════════════════════════════════════
${truncate(jobDescription, 2500)}

═══════════════════════════════════════════════════════════
RESUME CONTENT
═══════════════════════════════════════════════════════════
${resumeSection.trim()}

═══════════════════════════════════════════════════════════
WRITING REQUIREMENTS
═══════════════════════════════════════════════════════════
1. OUTPUT FORMAT
   - Return ONLY the cover letter text — no subject line, no meta-commentary,
     no "Here is your cover letter:" preamble.
   - Use proper paragraph breaks (blank line between paragraphs).
   - Do NOT use bullet points, numbered lists, or markdown formatting.
   - Length: 3-4 solid paragraphs (250-380 words total), excluding the
     sign-off and any links footer.

2. STRUCTURE
   Paragraph 1 — HOOK OPENING:
     A compelling, specific opening sentence that names the role and
     company. Avoid clichés like "I am writing to apply…". Instead,
     lead with what genuinely excites the candidate about this company
     or role.

   Paragraph 2 — PROOF OF SKILLS:
     Highlight 2-3 of the most relevant skills from the list above,
     backed by concrete examples or outcomes drawn from the resume (if
     provided) or logically inferred from the experience level.
     Mirror keywords from the job description naturally (for ATS).

   Paragraph 3 — COMPANY FIT / VALUE ADD:
     Explain why ${companyName} specifically — reference what makes
     the company unique or its stated mission (if determinable). Show
     how the candidate's values align with the company culture.

   Paragraph 4 — CONFIDENT CLOSE:
     Express enthusiasm for the opportunity, mention readiness for
     an interview, and close with a gracious but confident sign-off.
     End with the candidate's name (${fullName}).

3. QUALITY STANDARDS
   - ATS-friendly: naturally weave in keywords from the job description.
   - No repetitive phrases — vary sentence structure throughout.
   - No fluff, filler, or generic statements that could apply to any job.
   - Each sentence must earn its place by adding specific value.
   - Do not fabricate specific numbers unless they come from the resume.
   - Personalize to ${companyName} and the ${jobRole} role specifically.

4. SIGN-OFF
   Close the letter with the candidate's full name on its own line:
   ${fullName}
${linksInstruction}
Now write the cover letter:
`.trim();
}

function truncate(text, maxChars) {
  if (!text || text.length <= maxChars) return text || "";
  return text.slice(0, maxChars) + "\n[...content truncated for length...]";
}

export function sanitizeInput(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim();
}