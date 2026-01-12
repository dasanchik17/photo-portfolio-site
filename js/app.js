const SANITY_PROJECT_ID = "7t351ohn";
const SANITY_DATASET = "production";
const SANITY_API_VERSION = "2025-01-01";

/* =========================
   Helpers
========================= */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function escapeHTML(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isSanityConfigured() {
  return SANITY_PROJECT_ID && SANITY_PROJECT_ID !== "REPLACE_ME";
}

function prefersReducedMotion() {
  return (
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function isMobile() {
  return window.matchMedia && window.matchMedia("(max-width: 719px)").matches;
}

function getGreetingByTime(date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "Доброе утро";
  if (h >= 12 && h < 18) return "Добрый день";
  return "Добрый вечер";
}

function setText(el, text) {
  if (!el) return;
  el.textContent = text ?? "";
}

function show(el) {
  if (el) el.classList.remove("is-hidden");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function smoothScrollTo(targetY, baseDuration = 900) {
  if (prefersReducedMotion()) {
    window.scrollTo(0, targetY);
    return;
  }

  const startY = window.pageYOffset;
  const diff = targetY - startY;
  const distance = Math.abs(diff);

  const duration = Math.min(
    1400,
    Math.max(baseDuration, baseDuration + distance * 0.16)
  );

  const start = performance.now();

  function step(now) {
    const elapsed = now - start;
    const t = Math.min(1, elapsed / duration);
    const eased = easeInOutCubic(t);
    window.scrollTo(0, startY + diff * eased);
    if (t < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

function vibro(ms = 10) {
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch (_) {}
}

/* =========================
   Sanity fetch (GROQ)
========================= */
async function fetchGROQ(query) {
  if (!isSanityConfigured()) {
    throw new Error("Sanity projectId не задан. Укажи SANITY_PROJECT_ID.");
  }

  const base = `https://${SANITY_PROJECT_ID}.apicdn.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}`;
  const url = `${base}?query=${encodeURIComponent(query)}`;

  const res = await fetch(url, { method: "GET" });

  const raw = await res.text().catch(() => "");
  let json = null;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch (_) {}

  if (!res.ok) {
    const desc = json?.error?.description || raw || `HTTP ${res.status}`;
    throw new Error(`Ошибка Sanity: ${res.status}. ${desc}`);
  }
  if (json?.error) throw new Error(json.error?.description || "Ошибка Sanity");

  return json?.result;
}

/* =========================
   DEMO fallback
========================= */
const DEMO = {
  siteSettings: {
    photographerName: "Габлия Рамина",
    aboutText:
      "Я — фотограф из Абхазии. Снимаю портреты, пары, семьи и бренды в спокойной editorial эстетике: тёплый свет, чистая композиция, мягкая цветокоррекция. Мне важны не “идеальные позы”, а естественные жесты и честные эмоции — чтобы фотографии выглядели дорого и оставались актуальными через годы.",
    photographerPhotoUrl:
      "https://images.unsplash.com/photo-1520975748761-7d6d033b7f59?auto=format&fit=crop&w=1200&q=80",
    locationsText:
      "Снимаю по Абхазии: Сухум, Гагра, Пицунда, Новый Афон и окрестности. Любимые сценарии — утренний берег, мягкий вечерний свет в горах, спокойные городские улицы и уютные интерьеры. Возможны выезды в Сочи/Адлер по договорённости.",
    contacts: {
      phone: "+7 (999) 000-00-00",
      email: "ramina.photo@example.com",
      instagram: "https://instagram.com/",
      telegram: "https://t.me/",
      whatsapp: "https://wa.me/",
    },
  },
  portfolio: [],
  prices: [],
  certificates: [],
};

/* =========================
   GROQ queries
========================= */
const QUERIES = {
  siteSettings:
    `*[_type == "siteSettings"][0]{` +
    `photographerName,aboutText,"photographerPhotoUrl": photographerPhoto.asset->url,locationsText,` +
    `contacts{phone,email,instagram,telegram,whatsapp}` +
    `}`,

  portfolio:
    `*[_type == "portfolioItem"]|order(order asc){` +
    `title,"coverUrl": coverImage.asset->url,"galleryUrls": gallery[].asset->url,videoUrl,order` +
    `}`,

  prices:
    `*[_type == "pricePackage"]|order(order asc){` +
    `title,price,features,order` +
    `}`,

  certificates:
    `*[_type == "certificate"]|order(_createdAt desc)[0..2]{` +
    `title,year,"imageUrl": image.asset->url` +
    `}`,
};

/* =========================
   Mobile ripple (WOW tap)
========================= */
function addRipple(el) {
  if (!el || prefersReducedMotion()) return;

  el.addEventListener(
    "pointerdown",
    (e) => {
      if (!isMobile()) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const ripple = document.createElement("span");
      ripple.style.position = "absolute";
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.style.width = "10px";
      ripple.style.height = "10px";
      ripple.style.borderRadius = "999px";
      ripple.style.transform = "translate(-50%, -50%) scale(0)";
      ripple.style.background =
        "radial-gradient(circle, rgba(111,122,74,.22), transparent 62%)";
      ripple.style.pointerEvents = "none";
      ripple.style.opacity = "1";
      ripple.style.filter = "blur(.2px)";
      ripple.style.transition =
        "transform 520ms cubic-bezier(.16,1,.3,1), opacity 520ms cubic-bezier(.16,1,.3,1)";

      el.appendChild(ripple);

      requestAnimationFrame(() => {
        ripple.style.transform = "translate(-50%, -50%) scale(18)";
        ripple.style.opacity = "0";
      });

      setTimeout(() => ripple.remove(), 560);
    },
    { passive: true }
  );
}

function setupRipples() {
  $$(".btn, .panel, .dock__item, .work, .package, .cert, .card").forEach(
    addRipple
  );
}

/* =========================
   3D Tilt: Gyroscope (mobile) + Pointer fallback
========================= */
function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function ensureGlow(el) {
  if (!el) return;
  if (el.querySelector(".tilt__glow")) return;
  const glow = document.createElement("span");
  glow.className = "tilt__glow";
  el.appendChild(glow);
}

function setTilt(el, rx, ry, mx = 50, my = 35) {
  if (!el) return;
  el.classList.add("is-tilting");
  el.style.setProperty("--mx", `${mx}%`);
  el.style.setProperty("--my", `${my}%`);
  el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
}

function resetTilt(el) {
  if (!el) return;
  el.classList.remove("is-tilting");
  el.style.transform = "";
  el.style.removeProperty("--mx");
  el.style.removeProperty("--my");
}

function collectTiltTargets() {
  const heroFrame = document.querySelector(".frame"); // hero контейнер
  const cards = [
    ...document.querySelectorAll(".work, .package, .cert, .panel, .card"),
  ];

  const targets = [heroFrame, ...cards].filter(Boolean);

  targets.forEach((el) => {
    el.classList.add("tilt");
    const cs = getComputedStyle(el);
    if (cs.position === "static") el.style.position = "relative";
    ensureGlow(el);
  });

  return { heroFrame, cards, targets };
}

async function requestGyroPermissionIfNeeded() {
  try {
    const DOE = window.DeviceOrientationEvent;
    if (!DOE) return true;

    if (typeof DOE.requestPermission === "function") {
      const state = await DOE.requestPermission();
      return state === "granted";
    }
    return true;
  } catch (_) {
    return false;
  }
}

function setupPointerTilt(targets) {
  if (!targets?.length) return;
  if (prefersReducedMotion()) return;

  const strength = 8; // deg
  const ease = 0.14;

  targets.forEach((el) => {
    let raf = 0;
    let curX = 0;
    let curY = 0;
    let tgtX = 0;
    let tgtY = 0;
    let mx = 50;
    let my = 35;

    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      const y = clamp((e.clientY - rect.top) / rect.height, 0, 1);

      tgtX = (0.5 - y) * strength;
      tgtY = (x - 0.5) * strength;

      mx = x * 100;
      my = y * 100;

      if (!raf) raf = requestAnimationFrame(tick);
    };

    const tick = () => {
      curX = lerp(curX, tgtX, ease);
      curY = lerp(curY, tgtY, ease);
      setTilt(el, curX, curY, mx, my);
      raf = 0;
    };

    const onLeave = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      curX = curY = tgtX = tgtY = 0;
      resetTilt(el);
    };

    // Pointer tilt — только когда hover есть (чтобы не мешать скроллу на мобиле)
    if (window.matchMedia("(hover: hover)").matches) {
      el.addEventListener("pointermove", onMove, { passive: true });
      el.addEventListener("pointerleave", onLeave, { passive: true });
      el.addEventListener("pointercancel", onLeave, { passive: true });
    }
  });
}

function setupGyroTilt(heroEl, cardEls) {
  if (prefersReducedMotion()) return;
  if (!isMobile()) return;

  const heroMax = 8;
  const cardMax = 6;
  const smooth = 0.12;

  let enabled = false;
  let hasData = false;

  let hX = 0,
    hY = 0,
    hTX = 0,
    hTY = 0;
  let cX = 0,
    cY = 0,
    cTX = 0,
    cTY = 0;

  let visibleCards = new Set();

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!(e.target instanceof HTMLElement)) return;
        if (e.isIntersecting) visibleCards.add(e.target);
        else visibleCards.delete(e.target);
      });
    },
    { threshold: 0.12, rootMargin: "120px 0px 120px 0px" }
  );

  (cardEls || []).forEach((el) => io.observe(el));

  function applyFrame() {
    if (!enabled) return;

    if (heroEl) {
      hX = lerp(hX, hTX, smooth);
      hY = lerp(hY, hTY, smooth);
      setTilt(heroEl, hX, hY, 50 + hY * 3, 35 - hX * 3);
    }

    cX = lerp(cX, cTX, smooth);
    cY = lerp(cY, cTY, smooth);
    const mx = 50 + cY * 3;
    const my = 35 - cX * 3;

    visibleCards.forEach((el) => {
      setTilt(el, cX, cY, mx, my);
    });

    requestAnimationFrame(applyFrame);
  }

  function onOrientation(e) {
    if (e.beta == null || e.gamma == null) return;
    hasData = true;

    const beta = clamp(e.beta, -35, 35);
    const gamma = clamp(e.gamma, -35, 35);

    hTX = clamp((-beta / 35) * heroMax, -heroMax, heroMax);
    hTY = clamp((gamma / 35) * heroMax, -heroMax, heroMax);

    cTX = clamp((-beta / 35) * cardMax, -cardMax, cardMax);
    cTY = clamp((gamma / 35) * cardMax, -cardMax, cardMax);
  }

  async function enable() {
    if (enabled) return;
    const ok = await requestGyroPermissionIfNeeded();
    if (!ok) return;

    enabled = true;
    window.addEventListener("deviceorientation", onOrientation, true);

    // если за 2.2 сек данных нет — отключим, чтобы не грузить
    setTimeout(() => {
      if (!hasData) {
        try {
          window.removeEventListener("deviceorientation", onOrientation, true);
        } catch (_) {}
      }
    }, 2200);

    requestAnimationFrame(applyFrame);
  }

  // iOS: разрешение — только после действия пользователя
  const btn = document.getElementById("welcomeClose");
  const once = async () => {
    document.removeEventListener("pointerdown", once, true);
    btn?.removeEventListener("click", once, true);
    await enable();
  };

  btn?.addEventListener("click", once, {
    capture: true,
    passive: true,
    once: true,
  });
  document.addEventListener("pointerdown", once, {
    capture: true,
    passive: true,
    once: true,
  });
}

function init3DTilt() {
  const { heroFrame, cards, targets } = collectTiltTargets();
  setupPointerTilt(targets);
  setupGyroTilt(heroFrame, cards);
}

/* =========================
   Skeletons
========================= */
function renderPortfolioSkeleton(count = 6) {
  const grid = $("#portfolioGrid");
  if (!grid) return;
  grid.innerHTML = Array.from({ length: count })
    .map(
      () => `
    <div class="skeleton reveal mobile-wiggle">
      <div class="skel-media"></div>
      <div class="skel-line"></div>
      <div class="skel-line short"></div>
    </div>
  `
    )
    .join("");
}
function renderPricingSkeleton(count = 3) {
  const wrap = $("#pricingList");
  if (!wrap) return;
  wrap.innerHTML = Array.from({ length: count })
    .map(
      () => `
    <div class="skeleton reveal mobile-wiggle" style="padding: 1rem;">
      <div class="skel-line" style="margin: .4rem 0 .7rem;"></div>
      <div class="skel-line short" style="margin: 0 0 .9rem;"></div>
      <div class="skel-line"></div>
      <div class="skel-line short"></div>
      <div class="skel-line tiny"></div>
    </div>
  `
    )
    .join("");
}
function renderCertSkeleton(count = 3) {
  const wrap = $("#certGrid");
  if (!wrap) return;
  wrap.innerHTML = Array.from({ length: count })
    .map(
      () => `
    <div class="skeleton reveal mobile-wiggle">
      <div class="skel-media" style="aspect-ratio: 16/10;"></div>
      <div class="skel-line"></div>
      <div class="skel-line short"></div>
    </div>
  `
    )
    .join("");
}
function renderContactsSkeleton() {
  const wrap = $("#contactsPanels");
  if (!wrap) return;
  wrap.innerHTML = Array.from({ length: 4 })
    .map(
      () => `
    <div class="skeleton reveal mobile-wiggle" style="padding: 1rem;">
      <div class="skel-line short" style="margin: .2rem 0 .7rem;"></div>
      <div class="skel-line tiny" style="margin: 0;"></div>
    </div>
  `
    )
    .join("");
}

/* =========================
   Renderers
========================= */
function renderSiteSettings(settings) {
  const name = (settings.photographerName || "Габлия Рамина").replace(
    /\s+Львовна\s*$/i,
    ""
  );

  setText($("#brandName"), name);
  setText($("#heroTitle"), name.toUpperCase());
  setText($("#footerName"), name);
  setText($("#footerYear"), String(new Date().getFullYear()));

  setText($("#aboutText"), settings.aboutText || "");
  setText($("#locationsText"), settings.locationsText || "");

  const photo = $("#heroPhoto");
  if (photo) {
    photo.src =
      settings.photographerPhotoUrl ||
      "https://images.unsplash.com/photo-1520975748761-7d6d033b7f59?auto=format&fit=crop&w=1200&q=80";
  }

  renderContactsPanels(settings.contacts || {});
}

function renderContactsPanels(contacts) {
  const wrap = $("#contactsPanels");
  if (!wrap) return;

  const items = [
    {
      title: "Телефон",
      value: contacts.phone || "—",
      href: contacts.phone
        ? `tel:${String(contacts.phone).replace(/\s/g, "")}`
        : "#",
      external: false,
    },
    {
      title: "Почта",
      value: contacts.email || "—",
      href: contacts.email ? `mailto:${contacts.email}` : "#",
      external: false,
    },
    {
      title: "Инстаграм",
      value: contacts.instagram ? "профиль" : "—",
      href: contacts.instagram || "#",
      external: true,
    },
    {
      title: "Телеграм",
      value: contacts.telegram ? "чат" : "—",
      href: contacts.telegram || "#",
      external: true,
    },
    {
      title: "WhatsApp",
      value: contacts.whatsapp ? "чат" : "—",
      href: contacts.whatsapp || "#",
      external: true,
    },
  ];

  wrap.innerHTML = items
    .map((it) => {
      const disabled = !it.href || it.href === "#";
      const extra = disabled
        ? 'aria-disabled="true" onclick="return false;"'
        : it.external
        ? 'target="_blank" rel="noopener"'
        : "";
      return `
      <a class="panel reveal mobile-wiggle" href="${escapeHTML(
        it.href
      )}" ${extra}>
        <span class="panel__left">
          <span class="panel__title">${escapeHTML(it.title)}</span>
          <span class="panel__value">${escapeHTML(it.value)}</span>
        </span>
        <span class="panel__arrow" aria-hidden="true">→</span>
      </a>
    `;
    })
    .join("");
}

function renderPortfolio(items) {
  const grid = $("#portfolioGrid");
  if (!grid) return;

  const safe = (items || []).filter(Boolean);
  grid.innerHTML = safe
    .map((item, idx) => {
      const title = item.title || `Серия ${idx + 1}`;
      const cover =
        item.coverUrl || (item.galleryUrls && item.galleryUrls[0]) || "";
      const hasVideo = !!item.videoUrl;

      return `
      <article class="work reveal mobile-wiggle" tabindex="0"
        data-idx="${idx}"
        aria-label="Открыть серию: ${escapeHTML(title)}"
        role="button">
        <div class="work__media">
          <img class="work__img" src="${escapeHTML(cover)}" alt="${escapeHTML(
        title
      )}" loading="lazy" />
        </div>
        <div class="work__body">
          <h4 class="work__title">${escapeHTML(title)}</h4>
          <span class="work__tag">${hasVideo ? "видео" : "галерея"}</span>
        </div>
      </article>
    `;
    })
    .join("");
}

function renderPricing(packages) {
  const wrap = $("#pricingList");
  if (!wrap) return;

  const safe = (packages || []).filter(Boolean);
  wrap.innerHTML = safe
    .map(
      (pkg) => `
    <div class="package reveal mobile-wiggle">
      <div class="package__head">
        <h4 class="package__title">${escapeHTML(pkg.title || "Пакет")}</h4>
        <div class="package__price">${escapeHTML(pkg.price || "")}</div>
      </div>
      <ul class="package__features">
        ${(pkg.features || []).map((f) => `<li>${escapeHTML(f)}</li>`).join("")}
      </ul>
    </div>
  `
    )
    .join("");
}

function renderCertificates(certs) {
  const wrap = $("#certGrid");
  if (!wrap) return;

  const safe = (certs || []).filter(Boolean);
  wrap.innerHTML = safe
    .map(
      (c) => `
    <article class="cert reveal mobile-wiggle">
      <img class="cert__img" src="${escapeHTML(
        c.imageUrl || ""
      )}" alt="${escapeHTML(c.title || "Сертификат")}" loading="lazy" />
      <div class="cert__body">
        <h4 class="cert__title">${escapeHTML(c.title || "Сертификат")}</h4>
        <p class="cert__meta">${escapeHTML(c.year || "")}</p>
      </div>
    </article>
  `
    )
    .join("");
}

/* =========================
   Modal (portfolio)
========================= */
const modalState = { items: [], activeIndex: 0, activeSlide: 0 };

function getGallery(item) {
  const arr = Array.isArray(item.galleryUrls)
    ? item.galleryUrls.filter(Boolean)
    : [];
  if (arr.length) return arr;
  if (item.coverUrl) return [item.coverUrl];
  return [];
}

function openModal(index) {
  const modal = $("#modal");
  if (!modal) return;

  const item = modalState.items[index];
  if (!item) return;

  modalState.activeIndex = index;
  modalState.activeSlide = 0;

  setText($("#modalTitle"), item.title || "Серия");

  const video = $("#modalVideo");
  if (video) {
    if (item.videoUrl) {
      video.href = item.videoUrl;
      video.classList.remove("is-hidden");
    } else {
      video.classList.add("is-hidden");
      video.href = "#";
    }
  }

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  renderModalSlide();
  renderModalDots();

  $("#modalClose")?.focus();
}

function closeModal() {
  const modal = $("#modal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function renderModalSlide() {
  const item = modalState.items[modalState.activeIndex];
  if (!item) return;

  const gallery = getGallery(item);
  if (!gallery.length) return;

  const img = $("#modalImage");
  if (!img) return;

  img.src = gallery[modalState.activeSlide];
  img.alt = item.title
    ? `${item.title} — ${modalState.activeSlide + 1}/${gallery.length}`
    : `Кадр ${modalState.activeSlide + 1}`;

  updateDotsActive();
}

function renderModalDots() {
  const item = modalState.items[modalState.activeIndex];
  const wrap = $("#modalDots");
  if (!wrap || !item) return;

  const gallery = getGallery(item);
  wrap.innerHTML = gallery
    .map(
      (_, i) => `
    <button class="dot ${i === modalState.activeSlide ? "is-active" : ""}"
      aria-label="Открыть фото ${i + 1}"
      data-dot="${i}"></button>
  `
    )
    .join("");
}

function updateDotsActive() {
  $$("#modalDots .dot").forEach((d, i) =>
    d.classList.toggle("is-active", i === modalState.activeSlide)
  );
}

function nextSlide() {
  const item = modalState.items[modalState.activeIndex];
  if (!item) return;
  const gallery = getGallery(item);
  if (!gallery.length) return;
  modalState.activeSlide = (modalState.activeSlide + 1) % gallery.length;
  renderModalSlide();
}

function prevSlide() {
  const item = modalState.items[modalState.activeIndex];
  if (!item) return;
  const gallery = getGallery(item);
  if (!gallery.length) return;
  modalState.activeSlide =
    (modalState.activeSlide - 1 + gallery.length) % gallery.length;
  renderModalSlide();
}

function setupModalSwipe() {
  const area = $(".modal__media");
  if (!area) return;

  let startX = 0;
  let startY = 0;
  let active = false;
  const threshold = 34;

  area.addEventListener(
    "pointerdown",
    (e) => {
      if (!$("#modal")?.classList.contains("is-open")) return;
      active = true;
      startX = e.clientX;
      startY = e.clientY;
      try {
        area.setPointerCapture?.(e.pointerId);
      } catch (_) {}
    },
    { passive: true }
  );

  area.addEventListener(
    "pointerup",
    (e) => {
      if (!active) return;
      active = false;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (Math.abs(dy) > Math.abs(dx)) return;
      if (dx > threshold) prevSlide();
      else if (dx < -threshold) nextSlide();
    },
    { passive: true }
  );

  area.addEventListener("pointercancel", () => (active = false), {
    passive: true,
  });
}

function setupModalEvents() {
  $("#modalClose")?.addEventListener("click", closeModal);
  $("#modalPrev")?.addEventListener("click", prevSlide);
  $("#modalNext")?.addEventListener("click", nextSlide);

  $("#modal")?.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.dataset.close === "true" || t.closest("[data-close='true']"))
      closeModal();
  });

  $("#modalDots")?.addEventListener("click", (e) => {
    const btn = e.target;
    if (!(btn instanceof HTMLElement)) return;
    const i = btn.getAttribute("data-dot");
    if (i == null) return;
    const n = Number(i);
    if (!Number.isFinite(n)) return;
    modalState.activeSlide = n;
    renderModalSlide();
  });

  document.addEventListener("keydown", (e) => {
    const modalOpen = $("#modal")?.classList.contains("is-open");
    if (!modalOpen) return;

    if (e.key === "Escape") closeModal();
    if (e.key === "ArrowRight") nextSlide();
    if (e.key === "ArrowLeft") prevSlide();
  });

  $("#portfolioGrid")?.addEventListener("click", (e) => {
    const el =
      e.target instanceof HTMLElement ? e.target.closest(".work") : null;
    if (!el) return;
    const idx = Number(el.getAttribute("data-idx"));
    if (!Number.isFinite(idx)) return;
    vibro(8);
    openModal(idx);
  });

  $("#portfolioGrid")?.addEventListener("keydown", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (!t.classList.contains("work")) return;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const idx = Number(t.getAttribute("data-idx"));
      if (!Number.isFinite(idx)) return;
      openModal(idx);
    }
  });

  setupModalSwipe();
}

/* =========================
   Welcome overlay
========================= */
let welcomeScrollY = 0;

function lockScroll() {
  welcomeScrollY = window.scrollY || window.pageYOffset || 0;
  document.body.style.position = "fixed";
  document.body.style.top = `-${welcomeScrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
}

function unlockScroll() {
  const y = welcomeScrollY;
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  window.scrollTo(0, y);
}

function openWelcomeOverlay(siteName) {
  const overlay = $("#welcomeOverlay");
  if (!overlay) return;

  const card = overlay.querySelector(".welcome__card");
  const btn = $("#welcomeClose");
  const title = $("#welcomeTitle");
  const subtitle = $("#welcomeSubtitle");

  const greet = getGreetingByTime(new Date());
  setText(title, greet);

  const cleanName = (siteName || "Габлия Рамина").replace(
    /\s+Львовна\s*$/i,
    ""
  );
  setText(
    subtitle,
    `Рада видеть вас в своём творческом пространстве. ${cleanName}.`
  );

  lockScroll();

  overlay.classList.add("is-visible");
  overlay.setAttribute("aria-hidden", "false");

  const prevFocus = document.activeElement;

  const cleanup = () => {
    document.removeEventListener("keydown", onKey);
    overlay.removeEventListener("click", onOverlayClick);
    card?.removeEventListener("click", onCardClick);
    btn?.removeEventListener("click", onBtnClick);
  };

  const close = () => {
    if (!overlay.classList.contains("is-visible")) return;

    const active = document.activeElement;
    if (active && overlay.contains(active) && typeof active.blur === "function")
      active.blur();

    overlay.classList.remove("is-visible");
    overlay.setAttribute("aria-hidden", "true");

    unlockScroll();

    const brand = document.querySelector(".brand");
    if (brand && typeof brand.focus === "function") {
      brand.focus({ preventScroll: true });
    } else if (prevFocus && typeof prevFocus.focus === "function") {
      prevFocus.focus({ preventScroll: true });
    }

    cleanup();
    requestAnimationFrame(() => window.scrollTo(0, welcomeScrollY));
  };

  const onKey = (e) => {
    if (e.key === "Escape") close();
  };

  const onBtnClick = (e) => {
    e.preventDefault();
    vibro(10);
    close();
  };

  const onOverlayClick = () => close();

  const onCardClick = (e) => e.stopPropagation();

  document.addEventListener("keydown", onKey);
  btn?.addEventListener("click", onBtnClick, { passive: false });
  overlay.addEventListener("click", onOverlayClick);
  card?.addEventListener("click", onCardClick);

  requestAnimationFrame(() => {
    btn?.focus?.({ preventScroll: true });
  });
}

/* =========================
   Nav: smooth scroll + spy
========================= */
function setupSmoothScrollAndNav() {
  const nav = $("#siteNav");
  const toggle = $("#navToggle");
  const header = $(".site-header");

  const navLinks = $$(
    "#siteNav a[href^='#'], a.btn[href^='#'], .footer__link[href^='#'], .dock a[href^='#']"
  );
  const menuLinks = $$("#siteNav a[href^='#']");
  const spyLinks = $$("#siteNav a[href^='#']");
  const sections = spyLinks
    .map((a) => document.getElementById(a.getAttribute("href").slice(1)))
    .filter(Boolean);

  const closeMenu = () => {
    nav?.classList.remove("is-open");
    toggle?.setAttribute("aria-expanded", "false");
  };

  toggle?.addEventListener("click", () => {
    vibro(6);
    const open = nav?.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (!href || href === "#") return;

      const target = document.getElementById(href.slice(1));
      if (!target) return;

      e.preventDefault();
      vibro(8);

      if (menuLinks.includes(link)) closeMenu();

      const headerH = header?.offsetHeight ?? 0;
      const y =
        target.getBoundingClientRect().top + window.pageYOffset - headerH - 10;

      smoothScrollTo(y, 900);
      history.pushState(null, "", href);
    });
  });

  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const isOpen = nav?.classList.contains("is-open");
    if (!isOpen) return;

    const clickedInsideNav = t.closest("#siteNav");
    const clickedToggle = t.closest("#navToggle");
    if (!clickedInsideNav && !clickedToggle) closeMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  const setActiveLink = (id) => {
    spyLinks.forEach((a) => {
      const isActive = a.getAttribute("href") === `#${id}`;
      a.classList.toggle("is-active", isActive);
      if (isActive) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  };

  let spyTicking = false;
  function onScrollSpy() {
    if (spyTicking) return;
    spyTicking = true;

    requestAnimationFrame(() => {
      const headerH = header?.offsetHeight ?? 0;
      const marker = window.pageYOffset + headerH + 130;

      let current = sections[0]?.id;
      for (const sec of sections) {
        if (sec.offsetTop <= marker) current = sec.id;
      }
      if (current) setActiveLink(current);

      spyTicking = false;
    });
  }

  window.addEventListener("scroll", onScrollSpy, { passive: true });
  onScrollSpy();
}

/* =========================
   Reveal on scroll
========================= */
function setupReveal() {
  const els = $$(".reveal");
  if (!els.length) return;

  if (prefersReducedMotion()) {
    els.forEach((el) => el.classList.add("is-in"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "40px 0px -10% 0px" }
  );

  els.forEach((el) => io.observe(el));
}

/* Header state */
function setupHeaderScrollState() {
  const header = $(".site-header");
  if (!header) return;

  const on = () => header.classList.toggle("is-scrolled", window.scrollY > 6);
  window.addEventListener("scroll", on, { passive: true });
  on();
}

/* Hero parallax */
function setupHeroParallax() {
  if (prefersReducedMotion()) return;
  const img = $("#heroPhoto");
  const orbs = $$(".orb");

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      const y = window.scrollY || 0;

      if (img) {
        const t = Math.min(1, y / 700);
        img.style.transform = `translateY(${t * 12}px) scale(${1 + t * 0.012})`;
      }

      orbs.forEach((o, i) => {
        const k = (i + 1) * 0.007;
        o.style.transform = `translateY(${y * k}px)`;
      });

      ticking = false;
    });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

/* Scroll progress bar */
function setupScrollProgress() {
  const fill = $("#scrollbarFill");
  if (!fill) return;

  let ticking = false;
  const on = () => {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - doc.clientHeight);
      const p = Math.min(1, Math.max(0, window.scrollY / max));
      fill.style.width = `${p * 100}%`;
      ticking = false;
    });
  };

  window.addEventListener("scroll", on, { passive: true });
  on();
}

/* Mobile dock active state */
function setupDock() {
  const dock = $(".dock");
  if (!dock) return;

  requestAnimationFrame(() => dock.classList.add("is-in"));

  const items = $$(".dock__item", dock);
  const map = {
    portfolio: $("#portfolio"),
    pricing: $("#pricing"),
    contacts: $("#contacts"),
  };

  const secs = Object.entries(map)
    .map(([k, el]) => ({ k, el }))
    .filter((x) => x.el);

  if (prefersReducedMotion()) return;

  let ticking = false;
  const on = () => {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      const y = window.scrollY + 180;
      let current = "portfolio";

      for (const s of secs) {
        if (s.el.offsetTop <= y) current = s.k;
      }

      items.forEach((a) =>
        a.classList.toggle("is-active", a.dataset.dock === current)
      );

      ticking = false;
    });
  };

  window.addEventListener("scroll", on, { passive: true });
  on();

  items.forEach((a) => {
    a.addEventListener("click", () => vibro(10), { passive: true });
  });
}

/* =========================
   Load data
========================= */
async function loadAll() {
  renderPortfolioSkeleton(6);
  renderPricingSkeleton(3);
  renderCertSkeleton(3);
  renderContactsSkeleton();

  setupReveal();

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);

  openWelcomeOverlay("Габлия Рамина");

  if (isSanityConfigured()) {
    try {
      const [siteSettings, portfolio, prices, certificates] = await Promise.all(
        [
          fetchGROQ(QUERIES.siteSettings),
          fetchGROQ(QUERIES.portfolio),
          fetchGROQ(QUERIES.prices),
          fetchGROQ(QUERIES.certificates),
        ]
      );

      renderSiteSettings(siteSettings || DEMO.siteSettings);

      modalState.items = (portfolio || []).slice();
      renderPortfolio(modalState.items);

      renderPricing(prices || []);
      renderCertificates(certificates || []);

      setupReveal();
      setupRipples();
      init3DTilt();
      return;
    } catch (err) {
      console.warn("SANITY ERROR:", err);
      const msg =
        "Не удалось загрузить данные из Sanity. Показываю демо-контент. Проверь projectId/CORS и наличие документов.";
      ["portfolioError", "contactsError", "pricingError", "certError"].forEach(
        (id) => {
          const el = document.getElementById(id);
          if (el) {
            el.textContent = msg;
            show(el);
          }
        }
      );
    }
  }

  await sleep(200);
  renderSiteSettings(DEMO.siteSettings);
  setupReveal();
  setupRipples();
  init3DTilt();
}

/* =========================
   Init
========================= */
document.addEventListener("DOMContentLoaded", () => {
  setupSmoothScrollAndNav();
  setupModalEvents();

  setupHeaderScrollState();
  setupHeroParallax();
  setupReveal();
  setupScrollProgress();
  setupDock();
  setupRipples();
  init3DTilt();

  loadAll().catch((e) => {
    console.error(e);
    const pe = $("#portfolioError");
    if (pe) {
      pe.textContent =
        "Произошла ошибка при инициализации. Проверь консоль и настройки проекта.";
      show(pe);
    }
  });
});
