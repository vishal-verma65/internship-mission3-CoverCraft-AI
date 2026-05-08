/**
 * animations.js — UI Animation Controller
 *
 * Manages:
 *   • Hero section floating particle canvas
 *   • Intersection Observer scroll-reveal (fade-up on elements)
 *   • Ripple effect on buttons
 *   • Smooth hero CTA scroll
 *
 * All animations are lightweight, GPU-friendly (transform/opacity only),
 * and respect prefers-reduced-motion.
 */

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

let canvas = null;
let ctx = null;
let rafId = null;
let particles = [];

const PARTICLE_COUNT  = 55;
const MAX_SPEED = 0.35;
const MIN_RADIUS = 1;
const MAX_RADIUS = 2.5;
const LINE_DISTANCE = 120;
const PARTICLE_ALPHA = 0.45;
const LINE_ALPHA_MAX = 0.12;


function createParticle(w, h) {
  const angle = Math.random() * Math.PI * 2;
  const speed = Math.random() * MAX_SPEED + 0.05;
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: Math.random() * (MAX_RADIUS - MIN_RADIUS) + MIN_RADIUS,
    alpha: Math.random() * 0.3 + PARTICLE_ALPHA,
  };
}

function getParticleColor() {
  const theme = document.documentElement.getAttribute("data-theme");
  return theme === "light" ? "124,58,237" : "167,139,250";
}

export function initParticles() {
  if (prefersReducedMotion()) return;

  canvas = document.getElementById("particles-canvas");
  if (!canvas) return;

  ctx = canvas.getContext("2d");
  resizeCanvas();

  // Rebuild particles on resize (debounced)
  const handleResize = debounceLocal(() => {
    resizeCanvas();
    particles = Array.from({ length: PARTICLE_COUNT }, () =>
      createParticle(canvas.width, canvas.height)
    );
  }, 200);
  window.addEventListener("resize", handleResize);

  particles = Array.from({ length: PARTICLE_COUNT }, () =>
    createParticle(canvas.width, canvas.height)
  );

  animateParticles();
}

function resizeCanvas() {
  if (!canvas) return;
  canvas.width  = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
}

function animateParticles() {
  if (!ctx || !canvas) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const color = getParticleColor();
  const w = canvas.width;
  const h = canvas.height;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];

    // Move
    p.x += p.vx;
    p.y += p.vy;

    // Wrap at edges
    if (p.x < -p.radius)  p.x = w + p.radius;
    if (p.x > w + p.radius) p.x = -p.radius;
    if (p.y < -p.radius)  p.y = h + p.radius;
    if (p.y > h + p.radius) p.y = -p.radius;

    // Draw particle dot
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${color}, ${p.alpha})`;
    ctx.fill();

    // Draw connecting lines to nearby particles
    for (let j = i + 1; j < particles.length; j++) {
      const q    = particles[j];
      const dx   = p.x - q.x;
      const dy   = p.y - q.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < LINE_DISTANCE) {
        const lineAlpha = LINE_ALPHA_MAX * (1 - dist / LINE_DISTANCE);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.strokeStyle = `rgba(${color}, ${lineAlpha})`;
        ctx.lineWidth   = 0.7;
        ctx.stroke();
      }
    }
  }

  rafId = requestAnimationFrame(animateParticles);
}

export function stopParticles() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (ctx && canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

/**
 * Observe elements matching `selector` and add the `.revealed` class
 * when they enter the viewport. Elements start with opacity:0 / translateY
 * via CSS — adding `.revealed` triggers their transition.
 */
export function initScrollReveal(selector = ".reveal-on-scroll") {
  if (prefersReducedMotion()) {
    // Just make everything visible immediately
    document.querySelectorAll(selector).forEach((el) => {
      el.style.opacity  = "1";
      el.style.transform = "none";
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target); // Fire once
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  document.querySelectorAll(selector).forEach((el) => observer.observe(el));
}

//* RIPPLE EFFECT

export function createRipple(btn, event) {
  if (prefersReducedMotion()) return;

  btn.querySelectorAll(".ripple-span").forEach((r) => r.remove());

  const rect     = btn.getBoundingClientRect();
  const size     = Math.max(rect.width, rect.height) * 2;
  const x        = event.clientX - rect.left - size / 2;
  const y        = event.clientY - rect.top  - size / 2;

  const ripple   = document.createElement("span");
  ripple.className = "ripple-span";
  ripple.style.cssText = `
    position: absolute;
    width:  ${size}px;
    height: ${size}px;
    left:   ${x}px;
    top:    ${y}px;
    border-radius: 50%;
    background: rgba(255,255,255,0.25);
    transform: scale(0);
    animation: ripple-anim 0.55s ease-out forwards;
    pointer-events: none;
    z-index: 0;
  `;

  // Inject keyframes once
  if (!document.getElementById("ripple-style")) {
    const style = document.createElement("style");
    style.id = "ripple-style";
    style.textContent = `
      @keyframes ripple-anim {
        to { transform: scale(1); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  btn.style.position = "relative";
  btn.style.overflow = "hidden";
  btn.appendChild(ripple);

  ripple.addEventListener("animationend", () => ripple.remove());
}

export function initRippleButtons(selector = ".btn-primary, .btn-secondary, .cta-btn") {
  if (prefersReducedMotion()) return;

  document.querySelectorAll(selector).forEach((btn) => {
    btn.addEventListener("click", (e) => createRipple(btn, e));
  });
}

//* HERO CTA SMOOTH SCROLL

export function initHeroCTA() {
  const cta = document.getElementById("hero-cta");
  if (!cta) return;

  cta.addEventListener("click", (e) => {
    e.preventDefault();
    const target = document.getElementById("generator");
    if (!target) return;

    const top = target.getBoundingClientRect().top + window.scrollY - 32;
    window.scrollTo({ top, behavior: "smooth" });
  });
}

//* PAUSE PARTICLES WHEN HERO IS OFF-SCREEN  (Performance optimisation)

export function initParticleVisibilityToggle() {
  const hero = document.getElementById("hero");
  if (!hero || prefersReducedMotion()) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        if (!rafId) animateParticles();
      } else {
        stopParticles();
      }
    },
    { threshold: 0 }
  );

  observer.observe(hero);
}

//* LOCAL DEBOUNCE (avoids circular import from utils.js)
function debounceLocal(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}