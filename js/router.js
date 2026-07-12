/* =========================================================
   LUXORA — Router (FIXED)
   A tiny hash router. Routes:
     #/home, #/watches, #/product/:id, #/cart, #/wishlist,
     #/about, #/account, #/login, #/signup, #/contact
   ========================================================= */

const Router = {
  pages: ["home", "watches", "product", "cart", "wishlist", "about", "account", "login", "signup", "contact"],

  init() {
    window.addEventListener("hashchange", () => this.route());
    this.route();
  },

  parse() {
    const raw = location.hash.replace(/^#\/?/, "") || "home";
    const [pathPart, queryPart] = raw.split("?");
    const segments = pathPart.split("/").filter(Boolean);
    const params = new URLSearchParams(queryPart || "");
    return { page: segments[0] || "home", arg: segments[1] || null, params };
  },

  route() {
    LoadingBar.start();
    const { page, arg, params } = this.parse();
    const target = this.pages.includes(page) ? page : "home";

    document.querySelectorAll(".page").forEach((sec) => sec.classList.remove("page--active"));
    const section = document.getElementById(`page-${target}`);
    if (section) section.classList.add("page--active");

    document.querySelectorAll(".nav__link").forEach((link) => {
      link.classList.toggle("nav__link--active", link.dataset.page === target);
    });

    switch (target) {
      case "home":
        Pages.renderHome();
        break;
      case "watches":
        Pages.renderWatches(params);
        break;
      case "product":
        Pages.renderProductDetail(arg);
        break;
      case "cart":
        Pages.renderCart();
        break;
      case "wishlist":
        Pages.renderWishlist();
        break;
      case "about":
        Pages.renderAbout();
        break;
      case "account":
        Pages.renderAccount();
        break;
      default:
        break;
    }

    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    LoadingBar.finish();
  },

  goto(hash) {
    location.hash = hash;
  },
};

/* ========================================================= */
/* Page render functions                                      */
/* ========================================================= */
const Pages = {
  /* -------- HOME -------- */
  renderHome() {
    HeroCarousel.init();

    const latest = [...PRODUCTS].sort((a, b) => b.id - a.id).slice(0, 5);
    const grid = document.getElementById("latest-products");
    if (grid) grid.innerHTML = latest.map((p) => productCardHTML(p)).join("");
    bindCardEvents(grid);

    const collGrid = document.getElementById("collection-grid");
    if (collGrid) {
      collGrid.innerHTML = COLLECTION_NAMES.map((name) => {
        const info = COLLECTIONS[name];
        const sample = PRODUCTS.find((p) => p.category === name);
        return `
        <a class="collection-tile" href="#/watches?cat=${encodeURIComponent(name)}">
          <span class="collection-tile__art">${productMediaHTML(sample || { id: 1, category: name, name })}</span>
          <span class="collection-tile__scrim"></span>
          <span class="collection-tile__body">
            <span class="collection-tile__name">${name} Collection</span>
            <span class="collection-tile__desc">${info.tagline}</span>
            <span class="collection-tile__link">Explore &rarr;</span>
          </span>
        </a>`;
      }).join("");
    }
  },

  /* -------- ABOUT -------- */
  renderAbout() {
    const art = document.getElementById("about-art");
    if (art) art.innerHTML = watchIconSVG({ id: 7, category: "Premium", name: "LUXORA Meridian" });

    const gallery = document.getElementById("about-gallery");
    if (gallery) {
      gallery.innerHTML = [3, 9, 15]
        .map((id) => {
          const p = getProductById(id) || PRODUCTS[0];
          return `<div class="watch-plate">${productMediaHTML(p, { variant: id })}</div>`;
        })
        .join("");
    }
  },

  /* -------- WATCHES -------- */
  renderWatches(params) {
    const cat = params.get("cat") || "";
    const query = (params.get("q") || "").trim().toLowerCase();
    const sort = params.get("sort") || "featured";

    document.querySelectorAll(".chip").forEach((chip) => {
      chip.classList.toggle("chip--active", chip.dataset.cat === (cat || "all"));
    });
    const sortSelect = document.getElementById("sort-select");
    if (sortSelect) sortSelect.value = sort;
    const searchField = document.getElementById("products-search-field");
    if (searchField) searchField.value = params.get("q") || "";

    let list = PRODUCTS.slice();
    if (cat) list = list.filter((p) => p.category === cat);
    if (query) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query)
      );
    }
    switch (sort) {
      case "price-asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list.sort((a, b) => b.price - a.price);
        break;
      default:
        break;
    }

    const grid = document.getElementById("product-grid");
    const empty = document.getElementById("products-empty");
    const heading = document.getElementById("products-heading");
    if (heading) {
      heading.textContent = cat ? `${cat} Collection` : query ? `Results for "${escapeHtml(params.get("q"))}"` : "All Watches";
    }
    if (grid) {
      grid.innerHTML = list.map((p) => productCardHTML(p)).join("");
      bindCardEvents(grid);
    }
    if (empty) empty.style.display = list.length ? "none" : "block";
  },

  /* -------- PRODUCT DETAIL -------- */
  renderProductDetail(id) {
    const product = getProductById(id);
    const container = document.getElementById("product-detail-container");
    const crumb = document.getElementById("pdp-breadcrumb");
    if (!container) return;

    if (!product) {
      container.innerHTML = `<p class="empty-state">That watch could not be found. <a href="#/watches">Back to Watches</a></p>`;
      if (crumb) crumb.innerHTML = "";
      return;
    }

    if (crumb) {
      crumb.innerHTML = `
        <a href="#/home">Home</a><span>/</span>
        <a href="#/watches?cat=${encodeURIComponent(product.category)}">${product.category}</a><span>/</span>
        <span aria-current="page">${escapeHtml(product.name)}</span>`;
    }

    const wished = Wishlist.has(product.id);
    const inStock = product.inStock;

    container.innerHTML = `
      <div class="pdp__thumbs" id="pdp-thumbs">
        ${[0, 1, 2, 3]
          .map(
            (v, i) => `<button type="button" class="pdp__thumb${i === 0 ? " pdp__thumb--active" : ""}" data-variant="${v}" aria-label="View ${i + 1}">${productMediaHTML(product, { variant: v })}</button>`
          )
          .join("")}
      </div>
      <div class="pdp__image" id="pdp-main-image">
        <button type="button" class="pdp__image-nav pdp__image-nav--prev" aria-label="Previous image">&larr;</button>
        <div id="pdp-main-art" style="width:100%;height:100%">${productMediaHTML(product, { variant: 0 })}</div>
        <button type="button" class="pdp__image-nav pdp__image-nav--next" aria-label="Next image">&rarr;</button>
      </div>
      <div class="pdp__info">
        <p class="pdp__category">${product.category} Collection</p>
        <h1 class="pdp__title">${escapeHtml(product.name)}</h1>
        <div class="pdp__meta-row">
          <span class="stock-pill ${inStock ? "stock-pill--in" : "stock-pill--out"}">${inStock ? "In Stock" : "Out of Stock"}</span>
          <span class="pdp__sku">SKU ${product.sku}</span>
        </div>
        <div class="pdp__price">
          <span class="price price--lg">${money(product.price)}</span>
          ${product.oldPrice ? `<span class="price price--old">${money(product.oldPrice)}</span>` : ""}
        </div>
        <p class="pdp__desc">${escapeHtml(product.description)}</p>
        <ul class="pdp__features">
          ${product.features.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}
        </ul>
        <div class="option-group">
          <span class="option-group__label">Quantity</span>
          <div class="qty-stepper" id="pdp-qty-stepper">
            <button type="button" class="qty-btn" data-step="-1" aria-label="Decrease quantity">&minus;</button>
            <input type="number" id="pdp-qty" value="1" min="1" max="20" aria-label="Quantity" />
            <button type="button" class="qty-btn" data-step="1" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <div class="pdp__actions">
          <button class="btn btn--primary" id="pdp-add-to-cart" data-id="${product.id}" ${inStock ? "" : "disabled"}>Add to Cart</button>
          <button class="btn btn--ghost" id="pdp-buy-now" data-id="${product.id}" ${inStock ? "" : "disabled"}>Buy Now</button>
        </div>
        <button type="button" class="pdp__wish-link${wished ? " pdp__wish-link--active" : ""}" id="pdp-wish-btn" data-id="${product.id}">
          ${heartSVG(wished)} ${wished ? "Saved to Wishlist" : "Add to Wishlist"}
        </button>
        <br />
        <a class="pdp__back" href="#/watches?cat=${encodeURIComponent(product.category)}">&larr; Back to ${product.category}</a>
      </div>
    `;

    // Thumbnail gallery
    const mainArt = container.querySelector("#pdp-main-art");
    let activeVariant = 0;
    container.querySelectorAll(".pdp__thumb").forEach((thumb) => {
      thumb.addEventListener("click", () => {
        container.querySelectorAll(".pdp__thumb").forEach((t) => t.classList.remove("pdp__thumb--active"));
        thumb.classList.add("pdp__thumb--active");
        activeVariant = Number(thumb.dataset.variant);
        mainArt.innerHTML = productMediaHTML(product, { variant: activeVariant });
      });
    });
    const thumbsList = container.querySelectorAll(".pdp__thumb");
    const stepImage = (dir) => {
      let idx = [...thumbsList].findIndex((t) => t.classList.contains("pdp__thumb--active"));
      idx = (idx + dir + thumbsList.length) % thumbsList.length;
      thumbsList[idx].dispatchEvent(new Event("click"));
    };
    container.querySelector(".pdp__image-nav--prev").addEventListener("click", () => stepImage(-1));
    container.querySelector(".pdp__image-nav--next").addEventListener("click", () => stepImage(1));

    // Quantity stepper
    const qtyInput = container.querySelector("#pdp-qty");
    container.querySelectorAll("#pdp-qty-stepper .qty-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const step = Number(btn.dataset.step);
        const next = Math.min(20, Math.max(1, Number(qtyInput.value) + step));
        qtyInput.value = next;
      });
    });

    // Add to cart / buy now
    container.querySelector("#pdp-add-to-cart").addEventListener("click", () => {
      const qty = Math.max(1, Number(qtyInput.value) || 1);
      Cart.add(product.id, qty);
      Toast.show(`Added ${product.name} to your cart`);
    });
    container.querySelector("#pdp-buy-now").addEventListener("click", () => {
      const qty = Math.max(1, Number(qtyInput.value) || 1);
      Cart.add(product.id, qty);
      Router.goto("/cart");
    });

    // Wishlist toggle
    container.querySelector("#pdp-wish-btn").addEventListener("click", (e) => {
      const btn = e.currentTarget;
      const active = Wishlist.toggle(product.id);
      btn.classList.toggle("pdp__wish-link--active", active);
      btn.innerHTML = `${heartSVG(active)} ${active ? "Saved to Wishlist" : "Add to Wishlist"}`;
      Toast.show(active ? "Added to wishlist" : "Removed from wishlist", "info");
    });
  },

  /* -------- CART -------- */
  renderCart() {
    if (!Auth.isLoggedIn()) {
      const listEl = document.getElementById("cart-list");
      const emptyEl = document.getElementById("cart-empty");
      const summaryEl = document.getElementById("cart-summary");
      if (listEl) listEl.innerHTML = "";
      if (summaryEl) summaryEl.style.display = "none";
      if (emptyEl) {
        emptyEl.style.display = "block";
        emptyEl.innerHTML = `Please <a href="#/login">log in</a> to view your cart.`;
      }
      return;
    }

    const lines = Cart.lines();
    const listEl = document.getElementById("cart-list");
    const emptyEl = document.getElementById("cart-empty");
    const summaryEl = document.getElementById("cart-summary");

    if (!lines.length) {
      if (listEl) listEl.innerHTML = "";
      if (emptyEl) {
        emptyEl.style.display = "block";
        emptyEl.innerHTML = `Your cart is empty. <a href="#/watches">Continue shopping &rarr;</a>`;
      }
      if (summaryEl) summaryEl.style.display = "none";
      return;
    }

    if (emptyEl) emptyEl.style.display = "none";
    if (summaryEl) summaryEl.style.display = "block";

    const nameField = document.getElementById("checkout-name");
    const emailField = document.getElementById("checkout-email");
    if (nameField && !nameField.value && Auth.user?.user_metadata?.full_name) {
      nameField.value = Auth.user.user_metadata.full_name;
    }
    if (emailField && !emailField.value && Auth.user?.email) {
      emailField.value = Auth.user.email;
    }

    if (listEl) {
      listEl.innerHTML = lines
        .map(
          (l) => `
        <li class="cart-line" data-index="${l.index}">
          <div class="cart-line__img">${productMediaHTML(l.product)}</div>
          <div class="cart-line__info">
            <a class="cart-line__name" href="#/product/${l.product.id}">${escapeHtml(l.product.name)}</a>
            <span class="cart-line__meta">${money(l.product.price)} each</span>
            <button type="button" class="cart-line__remove" data-remove="${l.index}">Remove</button>
          </div>
          <div class="qty-stepper qty-stepper--sm">
            <button type="button" class="qty-btn" data-qty-step="-1" data-index="${l.index}" data-qty="${l.qty}" aria-label="Decrease quantity">&minus;</button>
            <input type="number" class="cart-qty-input" data-index="${l.index}" value="${l.qty}" min="1" max="20" aria-label="Quantity" />
            <button type="button" class="qty-btn" data-qty-step="1" data-index="${l.index}" data-qty="${l.qty}" aria-label="Increase quantity">+</button>
          </div>
          <span class="cart-line__total">${money(l.lineTotal)}</span>
        </li>`
        )
        .join("");

      listEl.querySelectorAll("[data-qty-step]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.dataset.index;
          const step = Number(btn.dataset.qtyStep);
          const current = Number(btn.dataset.qty);
          await Cart.updateQty(id, current + step);
          Pages.renderCart();
        });
      });
      listEl.querySelectorAll(".cart-qty-input").forEach((input) => {
        input.addEventListener("change", async () => {
          const id = input.dataset.index;
          await Cart.updateQty(id, Number(input.value) || 1);
          Pages.renderCart();
        });
      });
      listEl.querySelectorAll("[data-remove]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          await Cart.remove(btn.dataset.remove);
          Toast.show("Item removed from cart", "info");
          Pages.renderCart();
        });
      });
    }

    const subtotal = Cart.subtotal();
    const shipping = Cart.shipping();
    const total = Cart.total();
    document.getElementById("cart-subtotal").textContent = money(subtotal);
    document.getElementById("cart-shipping").textContent = shipping === 0 ? "Free" : money(shipping);
    document.getElementById("cart-total").textContent = money(total);
  },

  /* -------- WISHLIST -------- */
  renderWishlist() {
    const grid = document.getElementById("wishlist-grid");
    const empty = document.getElementById("wishlist-empty");
    if (!grid) return;

    if (!Auth.isLoggedIn()) {
      grid.innerHTML = "";
      if (empty) {
        empty.style.display = "block";
        empty.innerHTML = `Please <a href="#/login">log in</a> to view your wishlist.`;
      }
      return;
    }

    const items = Wishlist.items();

    if (!items.length) {
      grid.innerHTML = "";
      if (empty) {
        empty.style.display = "block";
        empty.innerHTML = `Nothing saved yet. <a href="#/watches">Browse watches &rarr;</a>`;
      }
      return;
    }
    if (empty) empty.style.display = "none";

    grid.innerHTML = items
      .map(
        (p) => `
      <div class="wishlist-line" data-id="${p.id}">
        <div class="wishlist-line__img">${productMediaHTML(p)}</div>
        <div class="cart-line__info">
          <a class="cart-line__name" href="#/product/${p.id}">${escapeHtml(p.name)}</a>
          <span class="cart-line__meta">${money(p.price)}</span>
        </div>
        <div class="wishlist-line__actions">
          <button type="button" class="btn btn--primary btn--sm" data-add-to-cart="${p.id}">Add to Cart</button>
          <button type="button" class="wishlist-line__remove" data-remove-wish="${p.id}">Remove</button>
        </div>
      </div>`
      )
      .join("");

    bindCardEvents(grid);
    grid.querySelectorAll("[data-remove-wish]").forEach((btn) => {
      btn.addEventListener("click", () => {
        Wishlist.remove(btn.dataset.removeWish);
        Toast.show("Removed from wishlist", "info");
        Pages.renderWishlist();
      });
    });
  },

  /* -------- ACCOUNT -------- */
  async renderAccount() {
    const guest = document.getElementById("account-guest");
    const signedIn = document.getElementById("account-signed-in");
    if (!guest || !signedIn) return;

    if (!Auth.isLoggedIn()) {
      guest.style.display = "block";
      signedIn.style.display = "none";
      return;
    }
    guest.style.display = "none";
    signedIn.style.display = "block";

    document.getElementById("account-name").textContent = Auth.user.user_metadata?.full_name || "Welcome";
    document.getElementById("account-email").textContent = Auth.user.email;

    const ordersEl = document.getElementById("account-orders");
    const emptyEl = document.getElementById("account-orders-empty");
    ordersEl.innerHTML = `<p class="empty-state">Loading your orders…</p>`;

    let orders = [];
    let error = null;

    // Try Supabase first
    if (typeof sb !== "undefined" && sb.from) {
      try {
        const result = await sb
          .from("orders")
          .select("*, order_items(*)")
          .eq("user_id", Auth.user.id)
          .order("created_at", { ascending: false });
        orders = result.data || [];
        error = result.error;
      } catch (e) {
        console.warn("Supabase orders fetch failed, using localStorage:", e);
      }
    }

    // Fallback to localStorage
    if (!orders.length && !error) {
      const localOrders = JSON.parse(localStorage.getItem("luxora_orders") || "[]")
        .filter(o => o.user_id === Auth.user.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      orders = localOrders;
    }

    if (error && !orders.length) {
      ordersEl.innerHTML = `<p class="empty-state">Could not load your orders right now.</p>`;
      return;
    }

    if (!orders.length) {
      ordersEl.innerHTML = "";
      if (emptyEl) emptyEl.style.display = "block";
      return;
    }
    if (emptyEl) emptyEl.style.display = "none";

    ordersEl.innerHTML = orders
      .map(
        (o) => `
      <div class="order-card">
        <div class="order-card__head">
          <div>
            <strong>${o.order_number}</strong>
            <span class="order-card__date">${new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>
          <span class="stock-pill stock-pill--in">${o.status || "pending"}</span>
        </div>
        <ul class="order-card__items">
          ${(o.order_items || [])
            .map((it) => `<li>${it.qty} × ${escapeHtml(it.product_name)} — ${money(it.line_total || (it.unit_price * it.qty))}</li>`)
            .join("")}
        </ul>
        <div class="order-card__total">Total: <strong>${money(o.total)}</strong></div>
      </div>`
      )
      .join("");
  },
};

/* ---------- shared markup builders ---------- */
function heartSVG(active) {
  return `<svg width="15" height="15" viewBox="0 0 24 24" fill="${active ? "currentColor" : "none"}"><path d="M12 21s-7.5-4.7-10-9.2C.5 8.1 2.4 4.5 6 4c2.1-.3 3.9.8 6 3 2.1-2.2 3.9-3.3 6-3 3.6.5 5.5 4.1 4 7.8-2.5 4.5-10 9.2-10 9.2Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
}
function cartSVG() {
  return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M3 4h2l1.6 10.6a2 2 0 0 0 2 1.7h8.8a2 2 0 0 0 2-1.6L21 8H6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9.5" cy="20" r="1.3" fill="currentColor"/><circle cx="17.5" cy="20" r="1.3" fill="currentColor"/></svg>`;
}

function productCardHTML(p) {
  const wished = Wishlist.has(p.id);
  return `
    <article class="product-card" data-id="${p.id}">
      <a class="product-card__media" href="#/product/${p.id}">
        ${productMediaHTML(p)}
        ${p.badge ? `<span class="badge">${escapeHtml(p.badge)}</span>` : !p.inStock ? `<span class="badge badge--out">Out of Stock</span>` : ""}
      </a>
      <button type="button" class="wish-btn${wished ? " wish-btn--active" : ""}" data-wish="${p.id}" aria-label="Toggle wishlist">${heartSVG(wished)}</button>
      ${p.inStock ? `<button type="button" class="quick-add-btn" data-add-to-cart="${p.id}" aria-label="Add to cart">${cartSVG()}</button>` : ""}
      <div class="product-card__body">
        <p class="product-card__category">${escapeHtml(p.category)}</p>
        <a class="product-card__name" href="#/product/${p.id}">${escapeHtml(p.name)}</a>
        <div class="product-card__price">
          <span class="price">${money(p.price)}</span>
          ${p.oldPrice ? `<span class="price price--old">${money(p.oldPrice)}</span>` : ""}
        </div>
        ${!p.inStock ? `<span class="product-card__stock">Out of Stock</span>` : ""}
      </div>
    </article>
  `;
}

function bindCardEvents(scope) {
  if (!scope) return;
  scope.querySelectorAll("[data-add-to-cart]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const id = Number(btn.dataset.addToCart);
      const product = getProductById(id);
      Cart.add(id, 1);
      Toast.show(`Added ${product.name} to your cart`);
    });
  });
  scope.querySelectorAll("[data-wish]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const id = Number(btn.dataset.wish);
      const active = Wishlist.toggle(id);
      btn.classList.toggle("wish-btn--active", active);
      btn.innerHTML = heartSVG(active);
      Toast.show(active ? "Added to wishlist" : "Removed from wishlist", "info");
    });
  });
}
