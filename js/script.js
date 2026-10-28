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
  ["loading /reel", "ok"],
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

  const bootBar = boot.querySelector(".boot-progress");
  const bootFill = document.getElementById("bootFill");
  const bootPct = document.getElementById("bootPct");

  // Progress bar. The displayed value chases a target that jumps forward
  // unevenly as each boot line lands. Every tick closes a random share of the
  // gap at a pace that shifts now and then, with the odd stall, so it surges
  // and hesitates instead of filling at a constant rate. Steps are scaled by
  // real elapsed time, so a throttled background tab lands in the right place
  // rather than crawling.
  let shown = 0;
  let target = 0;
  let pace = 4;
  let lastTick = performance.now();
  let onFull = null;

  const render = () => {
    const v = Math.floor(shown);
    bootFill.style.width = `${shown}%`;
    bootPct.textContent = `${v}%`;
    bootBar.setAttribute("aria-valuenow", String(v));
  };

  const advanceTo = (t) => {
    target = Math.min(100, Math.max(target, t));
  };

  let finished = false;
  const finishOnce = () => {
    if (finished) return;
    finished = true;
    shown = 100;
    render();
    endBoot();
  };

  const tick = () => {
    if (finished) return;
    const now = performance.now();
    const dt = (now - lastTick) / 1000;
    lastTick = now;
    if (Math.random() < 0.08) pace = 1.5 + Math.random() * 8;
    const stalled = target < 100 && Math.random() < 0.12;
    if (!stalled) shown += (target - shown) * (1 - Math.exp(-dt * pace));
    if (target >= 100 && 100 - shown < 0.6) {
      shown = 100;
      render();
      if (onFull) onFull();
      return;
    }
    render();
    setTimeout(tick, 30 + Math.random() * 40);
  };

  boot.addEventListener("click", finishOnce);
  window.addEventListener("keydown", finishOnce, { once: true });
  // Never hold the page longer than this, whatever the timers are doing.
  setTimeout(finishOnce, 5000);

  let i = 0;
  const step = () => {
    if (finished) return;
    if (i >= BOOT_LINES.length) {
      pace = 9; // final surge to 100
      advanceTo(100);
      onFull = () => setTimeout(finishOnce, 350);
      return;
    }
    const [label, status] = BOOT_LINES[i];
    const line = document.createElement("span");
    line.textContent = bootPrefix(label);
    bootLog.appendChild(line);
    // A little creep while the line is still "working".
    advanceTo((i / BOOT_LINES.length) * 88 + 4 + Math.random() * 6);

    setTimeout(() => {
      if (finished) return;
      const badge = document.createElement("span");
      badge.className = "ok";
      badge.textContent = `[ ${status} ]`;
      line.appendChild(badge);
      line.appendChild(document.createTextNode("\n"));
      i++;
      advanceTo((i / BOOT_LINES.length) * 88 + (Math.random() * 8 - 4));
      setTimeout(step, 80 + Math.random() * 110);
    }, 110 + Math.random() * 170);
  };
  setTimeout(step, 220);
  setTimeout(tick, 220);
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

/* ---------- Hero background ---------- */
// A looping background is continuous motion: for reduced-motion visitors stop
// it and leave the poster frame showing.
const heroVideo = document.querySelector(".hero-video");
if (heroVideo && reduceMotion) {
  heroVideo.removeAttribute("autoplay");
  heroVideo.pause();
  heroVideo.currentTime = 0;
}

/* ---------- Reel carousel ---------- */
// Coverflow carousel. Only the centred video loads and plays: the others show
// their poster and get their source the first time they're brought to the
// centre, so a visitor downloads one clip at a time rather than all of them.
const carousel = document.querySelector(".carousel");

if (carousel) {
  const slides = Array.from(carousel.querySelectorAll(".slide"));
  const videos = slides.map((s) => s.querySelector(".slide-video"));
  const countEl = carousel.querySelector(".carousel-count");
  const titleEl = carousel.querySelector(".carousel-title");
  const soundBtn = carousel.querySelector(".carousel-sound");
  const n = slides.length;
  const pad = (x) => String(x).padStart(2, "0");

  let active = 0;
  let soundOn = false;
  let inView = false;

  // Shortest signed distance around the ring, so the carousel wraps.
  const offsetOf = (i) => {
    let d = i - active;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    return d;
  };

  // Cards sit around a cylinder: each is turned by its offset times an equal
  // share of 360deg, then pushed out to the rim. The ring's centre is set back
  // by its radius so the front card stays at full size. Because every card's
  // transform has the same shape, the browser animates them along the arc.
  const layout = () => {
    const cardW = slides[0].offsetWidth;
    const narrow = window.innerWidth <= 560;
    const angle = 360 / n;
    // Radius at which neighbouring cards just meet, plus a small gap.
    const radius = (cardW / 2 / Math.tan(Math.PI / n)) * 1.08;
    const maxVisible = narrow ? 1 : 2;
    slides.forEach((slide, i) => {
      const d = offsetOf(i);
      const a = Math.abs(d);
      const hidden = a > maxVisible;
      // How squarely the card faces the viewer: 1 at the front, 0 edge-on.
      const facing = Math.cos((d * angle * Math.PI) / 180);
      slide.style.transform =
        `translateZ(${-radius}px) rotateY(${d * angle}deg) translateZ(${radius}px)`;
      slide.style.opacity = hidden ? "0" : String(Math.max(0, 0.25 + 0.75 * facing));
      slide.style.filter = a ? `brightness(${(0.35 + 0.5 * facing).toFixed(2)})` : "none";
      slide.style.zIndex = String(100 - a);
      slide.classList.toggle("is-active", d === 0);
      slide.classList.toggle("is-hidden", hidden);
      slide.setAttribute("aria-hidden", String(d !== 0));
    });
  };

  const load = (v) => {
    if (!v.getAttribute("src") && v.dataset.src) v.src = v.dataset.src;
  };

  const setSound = (on) => {
    soundOn = on;
    soundBtn.textContent = on ? "[ mute ]" : "[ unmute ]";
    soundBtn.setAttribute("aria-pressed", String(on));
    videos.forEach((v) => { v.muted = !on; });
  };

  const play = (v) => {
    load(v);
    v.muted = !soundOn;
    v.play().catch(() => {
      // Playback with sound can be refused before any user gesture; fall back
      // to muted rather than leaving the card frozen.
      if (!v.muted) {
        setSound(false);
        v.play().catch(() => {});
      }
    });
  };

  // Autoplay the centred clip while the carousel is on screen. Reduced-motion
  // visitors get posters and start a clip themselves by clicking it.
  const syncPlayback = () => {
    videos.forEach((v, i) => {
      if (i !== active && !v.paused) v.pause();
    });
    if (inView && !reduceMotion) play(videos[active]);
    else videos[active].pause();
  };

  const goTo = (i) => {
    const next = ((i % n) + n) % n;
    if (next !== active) {
      videos[active].pause();
      active = next;
      if (videos[active].getAttribute("src")) videos[active].currentTime = 0;
    }
    layout();
    countEl.textContent = `${pad(active + 1)} / ${pad(n)}`;
    titleEl.textContent = slides[active].dataset.title;
    syncPlayback();
  };

  carousel.querySelector(".carousel-prev").addEventListener("click", () => goTo(active - 1));
  carousel.querySelector(".carousel-next").addEventListener("click", () => goTo(active + 1));

  soundBtn.addEventListener("click", () => {
    setSound(!soundOn);
    if (soundOn) play(videos[active]); // the click is the gesture that allows sound
  });

  // Swipe on touch screens; a swipe must not also count as a click on a card.
  let downX = null;
  let swiped = false;
  const stage = carousel.querySelector(".carousel-stage");
  stage.addEventListener("pointerdown", (e) => { downX = e.clientX; swiped = false; });
  stage.addEventListener("pointerup", (e) => {
    if (downX === null) return;
    const dx = e.clientX - downX;
    downX = null;
    if (Math.abs(dx) > 40) {
      swiped = true;
      goTo(active + (dx < 0 ? 1 : -1));
    }
  });

  slides.forEach((slide, i) => {
    slide.addEventListener("click", () => {
      if (swiped) return;
      if (i !== active) return goTo(i);
      const v = videos[active]; // clicking the centre card toggles playback
      if (v.paused) play(v);
      else v.pause();
    });
  });

  carousel.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); goTo(active - 1); }
    if (e.key === "ArrowRight") { e.preventDefault(); goTo(active + 1); }
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        syncPlayback();
      },
      { threshold: 0.35 }
    ).observe(carousel);
  } else {
    inView = true;
  }

  let resizeFrame = 0;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(layout);
  });

  // Place the cards without animating them out from the centre on load.
  carousel.classList.add("is-static");
  goTo(0);
  // A timer rather than rAF: rAF is paused in background tabs, which would
  // leave the cards snapping between positions for good.
  setTimeout(() => carousel.classList.remove("is-static"), 60);
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
    ".work-item, .about-text, .timeline li, .impact-cell, .accounts-table tbody tr, .carousel-stage"
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
