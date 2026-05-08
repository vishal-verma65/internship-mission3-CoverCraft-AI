import { saveTheme, loadTheme } from "./storage.js";
import { APP_META } from "./config.js";

let _currentTheme = APP_META.defaultTheme;

function detectSystemTheme() {
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: light)").matches
  ) {
    return "light";
  }
  return "dark";
}

function applyTheme(theme) {
  _currentTheme = theme;
  document.documentElement.setAttribute("data-theme", theme);

  const btn = document.getElementById("theme-toggle");
  if (btn) {
    btn.setAttribute(
      "aria-label",
      theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
    );
    btn.setAttribute("title", theme === "dark" ? "Light mode" : "Dark mode");
  }

  // Update meta theme-color for mobile browsers
  let metaTheme = document.querySelector('meta[name="theme-color"]');
  if (!metaTheme) {
    metaTheme = document.createElement("meta");
    metaTheme.name = "theme-color";
    document.head.appendChild(metaTheme);
  }
  metaTheme.content = theme === "dark" ? "#0a0a0f" : "#f5f5fa";
}

export function initTheme() {
  const saved = loadTheme(); 
  const system = detectSystemTheme(); 

  const initial =
    saved === "dark" || saved === "light" ? saved : system;

  applyTheme(initial);

  const toggleBtn = document.getElementById("theme-toggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", toggleTheme);

    toggleBtn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleTheme();
      }
    });
  }

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      const hasSavedPref = loadTheme() !== null;
      if (!hasSavedPref) {
        applyTheme(e.matches ? "dark" : "light");
      }
    });
}

export function toggleTheme() {
  const next = _currentTheme === "dark" ? "light" : "dark";
  applyTheme(next);
  saveTheme(next);

  const btn = document.getElementById("theme-toggle");
  if (btn) {
    btn.classList.add("toggling");
    setTimeout(() => btn.classList.remove("toggling"), 400);
  }
}

export function setTheme(theme) {
  if (theme !== "dark" && theme !== "light") return;
  applyTheme(theme);
  saveTheme(theme);
}

export function getCurrentTheme() {
  return _currentTheme;
}

export function isDark() {
  return _currentTheme === "dark";
}