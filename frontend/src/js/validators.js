import { FORM_CONFIG } from "./config.js";

//*Check that a string is non-empty after trimming.
export function validateRequired(value, fieldLabel = "This field") {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return { valid: false, message: `${fieldLabel} is required.` };
  }
  return { valid: true, message: "" };
}

//*Validate an email address with a RFC-5322-ish regex.
export function validateEmail(value) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return { valid: false, message: "Email is required." };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, message: "Please enter a valid email address." };
  }
  return { valid: true, message: "" };
}

//*Validate that at least one skill tag has been added.
export function validateSkills(tags) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return { valid: false, message: "Add at least one skill." };
  }
  if (tags.length > FORM_CONFIG.maxSkillTags) {
    return {
      valid: false,
      message: `Maximum ${FORM_CONFIG.maxSkillTags} skills allowed.`,
    };
  }
  return { valid: true, message: "" };
}

//*Validate the job description textarea.
export function validateJobDescription(value) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return { valid: false, message: "Job description is required." };
  }
  if (trimmed.length < 30) {
    return {
      valid: false,
      message: "Job description is too short. Paste the full description for best results.",
    };
  }
  if (trimmed.length > FORM_CONFIG.maxJobDescriptionChars) {
    return {
      valid: false,
      message: `Job description must be under ${FORM_CONFIG.maxJobDescriptionChars.toLocaleString()} characters.`,
    };
  }
  return { valid: true, message: "" };
}

//*Validate an individual skill string before adding it as a tag.
export function validateSkillInput(skill) {
  const trimmed = (skill ?? "").trim();
  if (!trimmed) return { valid: false, message: "" }; // silent fail for empty

  if (trimmed.length < FORM_CONFIG.minSkillLength) {
    return {
      valid: false,
      message: `Skill must be at least ${FORM_CONFIG.minSkillLength} characters.`,
    };
  }
  if (trimmed.length > FORM_CONFIG.maxSkillLength) {
    return {
      valid: false,
      message: `Skill must be under ${FORM_CONFIG.maxSkillLength} characters.`,
    };
  }
  return { valid: true, message: "" };
}

//*Validate a full name — letters, spaces, hyphens, apostrophes only.
export function validateFullName(value) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return { valid: false, message: "Full name is required." };

  if (trimmed.length < 2) {
    return { valid: false, message: "Name seems too short." };
  }
  if (trimmed.length > 80) {
    return { valid: false, message: "Name is too long." };
  }

  const nameRegex = /^[\p{L}\s'\-\.]+$/u;
  if (!nameRegex.test(trimmed)) {
    return { valid: false, message: "Name contains invalid characters." };
  }
  return { valid: true, message: "" };
}

//*form data validation
export function validateForm(data) {
  const fields = {
    fullName:       validateFullName(data.fullName),
    email:          validateEmail(data.email),
    jobRole:        validateRequired(data.jobRole, "Job role"),
    companyName:    validateRequired(data.companyName, "Company name"),
    skills:         validateSkills(data.skills),
    jobDescription: validateJobDescription(data.jobDescription),
  };

  const allValid = Object.values(fields).every((r) => r.valid);
  return { allValid, fields };
}


//*error display functions
export function showFieldError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(`${fieldId}-error`);

  if (input) {
    input.classList.add("error");
    input.setAttribute("aria-invalid", "true");
  }
  if (errorEl) {
    errorEl.textContent = message;
  }
}

export function clearFieldError(fieldId) {
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(`${fieldId}-error`);

  if (input) {
    input.classList.remove("error");
    input.removeAttribute("aria-invalid");
  }
  if (errorEl) {
    errorEl.textContent = "";
  }
}

export function displayFormErrors(fields) {
  // Map: validation key → input element id
  const fieldIdMap = {
    fullName:       "full-name",
    email:          "email",
    jobRole:        "job-role",
    companyName:    "company-name",
    skills:         "skills-input",
    jobDescription: "job-description",
  };

  for (const [key, result] of Object.entries(fields)) {
    const domId = fieldIdMap[key];
    if (!domId) continue;

    if (!result.valid) {
      showFieldError(domId, result.message);
    } else {
      clearFieldError(domId);
    }
  }
}

export function clearAllErrors() {
  const ids = [
    "full-name",
    "email",
    "job-role",
    "company-name",
    "skills-input",
    "job-description",
  ];
  ids.forEach(clearFieldError);
}

//*Attach live validation to an input field (validates on blur + clears on input).
export function attachLiveValidation(fieldId, validator) {
  const input = document.getElementById(fieldId);
  if (!input) return;

  input.addEventListener("blur", () => {
    const result = validator(input.value);
    if (!result.valid) {
      showFieldError(fieldId, result.message);
    } else {
      clearFieldError(fieldId);
    }
  });

  input.addEventListener("input", () => clearFieldError(fieldId));
}