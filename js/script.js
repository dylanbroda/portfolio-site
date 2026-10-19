document.getElementById("year").textContent = new Date().getFullYear();

// Mobile nav toggle
const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".nav");
if (navToggle && nav) {
  const setMenu = (open) => {
    nav.classList.toggle("open", open);
    navToggle.setAttribute("aria-expanded", String(open));
  };
  navToggle.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
  // Picking a section should close the menu rather than leave it over the page.
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) setMenu(false);
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("open")) {
      setMenu(false);
      navToggle.focus();
    }
  });
}

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Hero typewriter ---------- */
const typeLine = document.querySelector(".type-line");

// The headline is real text in the markup, so it exists without JS and for
// crawlers and link previews; it's cleared here only to be typed back in.
const typeText = typeLine ? typeLine.textContent.trim() : "";
if (typeLine && !reduceMotion) {
  typeLine.setAttribute("aria-label", typeText);
  typeLine.textContent = "";
}

function startTyping() {
  if (!typeLine) return;
  const text = typeText;
  if (reduceMotion) {
    const caret = document.createElement("span");
    caret.className = "caret";
    typeLine.appendChild(caret);
    return;
  }
  const caret = document.createElement("span");
  caret.className = "caret";
  caret.setAttribute("aria-hidden", "true");
  typeLine.appendChild(caret);

  let i = 0;
  const tick = () => {
    if (i >= text.length) return;
    caret.before(document.createTextNode(text[i]));
    i++;
    setTimeout(tick, 38 + Math.random() * 45);
  };
  setTimeout(tick, 320);
}

/* ---------- Boot sequence ---------- */
const boot = document.getElementById("boot");
const bootLog = document.getElementById("bootLog");

const BOOT_LINES = [
  ["booting portfolio.sys", "ok"],
  ["mounting /work", "ok"],
  ["loading reel.mp4", "ok"],
  ["indexing revenue + reach", "ok"],
  ["syncing growth data", "ok"],
];

const LABEL_WIDTH = 30;

function bootPrefix(label) {
  const dots = ".".repeat(Math.max(3, LABEL_WIDTH - label.length));
  return `> ${label} ${dots} `;
}

function endBoot() {
  document.body.classList.remove("booting");
  if (boot) {
    boot.classList.add("done");
    setTimeout(() => boot.remove(), 650);
  }
  startTyping();
}

if (!boot || reduceMotion) {
  if (boot) boot.remove();
  document.body.classList.remove("booting");
  startTyping();
} else {
  document.body.classList.add("booting");

  let finished = false;
  const finishOnce = () => {
    if (finished) return;
    finished = true;
    endBoot();
  };

  boot.addEventListener("click", finishOnce);
  window.addEventListener("keydown", finishOnce, { once: true });

  let i = 0;
  const step = () => {
    if (finished) return;
    if (i >= BOOT_LINES.length) {
      setTimeout(finishOnce, 380);
      return;
    }
    const [label, status] = BOOT_LINES[i];
    const line = document.createElement("span");
    line.textContent = bootPrefix(label);
    bootLog.appendChild(line);

    setTimeout(() => {
      if (finished) return;
      const badge = document.createElement("span");
      badge.className = "ok";
      badge.textContent = `[ ${status} ]`;
      line.appendChild(badge);
      line.appendChild(document.createTextNode("\n"));
      i++;
      setTimeout(step, 80 + Math.random() * 110);
    }, 110 + Math.random() * 170);
  };
  setTimeout(step, 220);
}

/* ---------- Impact counters ---------- */
// Targets are parsed out of the markup, so the HTML stays the single source of
// truth and the real figures render even if this never runs. Format is derived
// per value: decimals, thousands grouping and zero-padding are all preserved.
const impactNums = Array.from(document.querySelectorAll(".impact-num"));

if (impactNums.length) {
  const parseMetric = (text) => {
    const m = text.match(/^(\D*)([\d.,]+)(.*)$/);
    if (!m) return null;
    const [, prefix, raw, suffix] = m;
    const plain = raw.replace(/,/g, "");
    const value = parseFloat(plain);
    if (!isFinite(value)) return null;
    const dot = plain.indexOf(".");
    const intPart = dot === -1 ? plain : plain.slice(0, dot);
    return {
      prefix,
      suffix,
      target: value,
      decimals: dot === -1 ? 0 : plain.length - dot - 1,
      grouped: raw.includes(","),
      padTo: /^0\d/.test(plain) ? intPart.length : 0,
    };
  };

  const formatMetric = (v, spec) => {
    const fixed = v.toFixed(spec.decimals);
    let [int, dec] = fixed.split(".");
    if (spec.grouped) {
      int = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    } else if (spec.padTo) {
      int = int.padStart(spec.padTo, "0");
    }
    return spec.prefix + int + (dec ? `.${dec}` : "") + spec.suffix;
  };

  const DURATION = 900;
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  const countUp = (el) => {
    if (el.dataset.counted) return;
    el.dataset.counted = "1";

    const spec = parseMetric(el.textContent.trim());
    if (!spec || reduceMotion) return; // leave the true value untouched

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      el.textContent = formatMetric(spec.target, spec);
    };

    const t0 = performance.now();
    const step = (now) => {
      if (finished) return;
      const p = Math.min(1, (now - t0) / DURATION);
      if (p < 1) {
        el.textContent = formatMetric(spec.target * easeOutCubic(p), spec);
        requestAnimationFrame(step);
      } else {
        finish();
      }
    };
    requestAnimationFrame(step);

    // rAF is throttled in background tabs; a stalled count must never leave a
    // wrong figure on screen, so snap to the real value regardless.
    setTimeout(finish, DURATION + 600);
  };

  if ("IntersectionObserver" in window) {
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            countUp(entry.target);
            counterObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    impactNums.forEach((el) => counterObserver.observe(el));

    // Same reason as the reveal sweep: the observer is throttled in background
    // tabs, so anything already on screen gets counted directly.
    const sweepCounters = () => {
      impactNums.forEach((el) => {
        if (el.dataset.counted) return;
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) {
          countUp(el);
          counterObserver.unobserve(el);
        }
      });
    };

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) sweepCounters();
    });
    window.addEventListener("pageshow", sweepCounters);
    window.addEventListener("load", () => setTimeout(sweepCounters, 1000));
  }
}

/* ---------- Account windows ---------- */
// Each window counts whole months from data-start to today, so the table never
// goes stale. An optional data-end freezes it for engagements that have ended.
document.querySelectorAll(".acct-window[data-start]").forEach((td) => {
  const start = new Date(`${td.dataset.start}T00:00:00`);
  const end = td.dataset.end ? new Date(`${td.dataset.end}T00:00:00`) : new Date();
  if (isNaN(start) || isNaN(end) || end < start) return; // keep the markup value

  let months =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months--;

  td.textContent = months < 1 ? "<1 mo" : `${String(months).padStart(2, "0")} mo`;
});

/* ---------- Featured reel ---------- */
const reelVideo = document.querySelector(".reel-video");
const reelSound = document.querySelector(".reel-sound");

if (reelVideo) {
  // An autoplaying loop is continuous motion — don't force it on anyone who
  // asked for less of it.
  if (reduceMotion) {
    reelVideo.autoplay = false;
    reelVideo.removeAttribute("autoplay");
    reelVideo.pause();
  }

  if (reelSound) {
    // volumechange is the single source of truth, so the label stays correct
    // whether the user toggles via this button or the native controls.
    const syncSoundLabel = () => {
      const on = !reelVideo.muted;
      reelSound.textContent = on ? "[ mute ]" : "[ unmute ]";
      reelSound.setAttribute("aria-pressed", String(on));
    };

    reelSound.addEventListener("click", () => {
      reelVideo.muted = !reelVideo.muted;
      if (!reelVideo.muted && reelVideo.paused) {
        reelVideo.play().catch(() => {});
      }
    });

    reelVideo.addEventListener("volumechange", syncSoundLabel);
    syncSoundLabel();
  }
}

/* ---------- Cursor binary trail ---------- */
// Mouse-only: a cursor trail is meaningless on touch, and skipped for
// reduced-motion. Spawn is gated on distance travelled, not on event rate,
// so the density stays constant regardless of how fast the pointer moves.
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

if (finePointer && !reduceMotion) {
  const layer = document.createElement("div");
  layer.className = "cursor-trail";
  layer.setAttribute("aria-hidden", "true");
  document.body.appendChild(layer);

  const MIN_DIST = 26; // px between digits
  const LIFE = 900; // ms, matches trail-fade
  const MAX_BITS = 40; // hard cap so fast movement can't flood the DOM

  let lastX = null;
  let lastY = null;

  window.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType !== "mouse") return;

      if (lastX !== null) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        if (dx * dx + dy * dy < MIN_DIST * MIN_DIST) return;
      }
      lastX = e.clientX;
      lastY = e.clientY;

      if (layer.childElementCount >= MAX_BITS) {
        layer.firstElementChild.remove();
      }

      const bit = document.createElement("span");
      bit.className = "trail-bit";
      bit.textContent = Math.random() < 0.5 ? "0" : "1";
      bit.style.left = `${e.clientX}px`;
      bit.style.top = `${e.clientY}px`;
      layer.appendChild(bit);

      setTimeout(() => bit.remove(), LIFE);
    },
    { passive: true }
  );
}

/* ---------- Scroll reveal ---------- */
const revealTargets = Array.from(
  document.querySelectorAll(
    ".work-item, .about-text, .timeline li, .impact-cell, .accounts-table tbody tr, .reel-frame"
  )
);

if (!reduceMotion && "IntersectionObserver" in window) {
  revealTargets.forEach((el) => el.classList.add("reveal"));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealTargets.forEach((el) => observer.observe(el));

  // Safety net — the observer is throttled in background tabs, so anything
  // already scrolled into view gets revealed directly. Content must never be
  // left permanently invisible because an animation hook didn't fire.
  const sweep = () => {
    revealTargets.forEach((el) => {
      if (el.classList.contains("in-view")) return;
      if (el.getBoundingClientRect().top < window.innerHeight) {
        el.classList.add("in-view");
        observer.unobserve(el);
      }
    });
  };

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) sweep();
  });
  window.addEventListener("pageshow", sweep);
  window.addEventListener("load", () => setTimeout(sweep, 1000));
}
