/* =========================================================
   LUXORA — UI helpers (FIXED)
   Toast notifications, loading bar, mobile menu, hero carousel.
   ========================================================= */

/* ---------- Toast notifications ---------- */
const Toast = {
  show(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span class="toast__icon">${type === "success" ? "✓" : type === "error" ? "!" : "•"}</span>
      <span class="toast__msg">${message}</span>
    `;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("toast--in"));
    setTimeout(() => {
      toast.classList.remove("toast--in");
      toast.classList.add("toast--out");
      setTimeout(() => toast.remove(), 300);
    }, 2600);
  },
};

/* ---------- Top loading bar ---------- */
const LoadingBar = {
  el: null,
  _t: null,
  init() {
    this.el = document.getElementById("loading-bar");
  },
  start() {
    if (!this.el) return;
    this.el.style.transition = "none";
    this.el.style.width = "0%";
    this.el.style.opacity = "1";
    void this.el.offsetWidth;
    this.el.style.transition = "width .25s ease, opacity .2s ease";
    this.el.style.width = "70%";
    clearTimeout(this._t);
    this._t = setTimeout(() => this.finish(), 250);
  },
  finish() {
    if (!this.el) return;
    this.el.style.width = "100%";
    setTimeout(() => {
      this.el.style.opacity = "0";
    }, 180);
  },
};

/* ---------- Mobile hamburger menu ---------- */
const MobileMenu = {
  init() {
    const btn = document.getElementById("hamburger");
    const nav = document.getElementById("primary-nav");
    if (!btn || !nav) return;
    btn.addEventListener("click", () => {
      const open = nav.classList.toggle("nav--open");
      btn.setAttribute("aria-expanded", open);
      btn.classList.toggle("is-active", open);
    });
    nav.querySelectorAll("a").forEach((link) =>
      link.addEventListener("click", () => {
        nav.classList.remove("nav--open");
        btn.setAttribute("aria-expanded", "false");
        btn.classList.remove("is-active");
      })
    );
  },
};

/* ---------- Hero carousel ---------- */
const HeroCarousel = {
  slides: [
    { eyebrow: "Discover Luxury", title: ["TIMELESS", "ELEGANCE"], sub: "Discover our exclusive collection of luxury watches crafted for those who appreciate precision and style.", cta: "#/watches" },
    { eyebrow: "New Arrivals", title: ["MODERN", "MASTERY"], sub: "The latest additions to the LUXORA line — contemporary cases paired with time-honoured finishing.", cta: "#/watches?sort=featured" },
    { eyebrow: "The Premium Edge", title: ["RESERVED", "FOR FEW"], sub: "Hand-finished movements and precious materials from our Premium collection, made in limited numbers.", cta: "#/watches?cat=Premium" },
  ],
  index: 0,
  timer: null,
  copyEl: null,
  dotsEl: null,

  init() {
    this.copyEl = document.getElementById("hero-copy");
    this.dotsEl = document.getElementById("hero-dots");
    if (!this.copyEl || !this.dotsEl) return;
    const artEl = document.getElementById("hero-art");
    if (artEl && !artEl.dataset.filled) {
      artEl.innerHTML = heroWatchSVG();
      artEl.dataset.filled = "1";
    }
    this.dotsEl.innerHTML = this.slides
      .map((_, i) => `<button type="button" data-i="${i}">${String(i + 1).padStart(2, "0")}</button>`)
      .join("");
    this.dotsEl.querySelectorAll("button").forEach((btn) =>
      btn.addEventListener("click", () => this.go(Number(btn.dataset.i)))
    );
    document.getElementById("hero-prev")?.addEventListener("click", () => this.go(this.index - 1));
    document.getElementById("hero-next")?.addEventListener("click", () => this.go(this.index + 1));
    this.render();
    this.play();
  },

  go(i) {
    const n = this.slides.length;
    this.index = ((i % n) + n) % n;
    this.render();
    this.play();
  },

  play() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.go(this.index + 1), 6000);
  },

  render() {
    const s = this.slides[this.index];
    this.copyEl.innerHTML = `
      <p class="eyebrow">${s.eyebrow} · Est. this season</p>
      <h1 class="hero__title">
        <span>${s.title[0]}</span>
        <span class="hero__title--gold">${s.title[1]}</span>
      </h1>
      <p class="hero__sub">${s.sub}</p>
      <a class="btn btn--primary btn--lg" href="${s.cta}">Explore Collection</a>
    `;
    this.dotsEl.querySelectorAll("button").forEach((btn, i) => btn.classList.toggle("is-active", i === this.index));
  },
};
