/* =========================================================
   LUXORA — App bootstrap (FIXED)
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  LoadingBar.init();
  MobileMenu.init();

  // Load products from local data (no Supabase dependency for demo)
  await loadProducts();

  // Initialize auth (will work in demo mode without Supabase)
  await Auth.init();

  Router.init();

  bindNavSearch();
  bindWatchesPageSearch();
  bindAuthForms();
  bindContactForm();
  bindNewsletterForm();
  bindCheckoutForm();
  bindLogout();

  const boot = document.getElementById("boot-spinner");
  if (boot) {
    setTimeout(() => boot.classList.add("boot-spinner--done"), 450);
  }
});

/* ---------- Logout ---------- */
function bindLogout() {
  const btn = document.getElementById("logout-btn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    await Auth.signOut();
    Toast.show("Signed out");
    Router.goto("/home");
  });
}

/* ---------- Nav search: instant dropdown suggestions ---------- */
function bindNavSearch() {
  const input = document.getElementById("nav-search-field");
  const dropdown = document.getElementById("nav-search-dropdown");
  const form = document.getElementById("nav-search-form");
  if (!input || !dropdown || !form) return;

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      dropdown.innerHTML = "";
      dropdown.classList.remove("search-dropdown--open");
      return;
    }
    const matches = PRODUCTS.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    ).slice(0, 6);

    if (!matches.length) {
      dropdown.innerHTML = `<p class="search-dropdown__empty">No watches match "${escapeHtml(input.value)}"</p>`;
    } else {
      dropdown.innerHTML = matches
        .map(
          (p) => `
        <a class="search-dropdown__item" href="#/product/${p.id}">
          ${productMediaHTML(p)}
          <span>
            <span class="search-dropdown__name">${escapeHtml(p.name)}</span>
            <span class="search-dropdown__cat">${escapeHtml(p.category)} · ${money(p.price)}</span>
          </span>
        </a>`
        )
        .join("");
    }
    dropdown.classList.add("search-dropdown--open");
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value.trim();
    dropdown.classList.remove("search-dropdown--open");
    Router.goto(`/watches${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  });

  document.addEventListener("click", (e) => {
    if (!form.contains(e.target)) dropdown.classList.remove("search-dropdown--open");
  });
}

/* ---------- Watches page: category chips, sort, in-page search ---------- */
function bindWatchesPageSearch() {
  const searchField = document.getElementById("products-search-field");
  if (searchField) {
    searchField.addEventListener("input", () => {
      const params = Router.parse().params;
      if (searchField.value.trim()) params.set("q", searchField.value.trim());
      else params.delete("q");
      history.replaceState(null, "", `#/watches?${params.toString()}`);
      Pages.renderWatches(params);
    });
  }

  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const params = Router.parse().params;
      if (chip.dataset.cat === "all") params.delete("cat");
      else params.set("cat", chip.dataset.cat);
      Router.goto(`/watches?${params.toString()}`);
    });
  });

  const sortSelect = document.getElementById("sort-select");
  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      const params = Router.parse().params;
      params.set("sort", sortSelect.value);
      Router.goto(`/watches?${params.toString()}`);
    });
  }
}

/* ---------- Field validation helpers ---------- */
function setFieldError(fieldEl, message) {
  const group = fieldEl.closest(".field");
  if (!group) return;
  group.classList.toggle("field--error", Boolean(message));
  const errorEl = group.querySelector(".field__error");
  if (errorEl) errorEl.textContent = message || "";
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ---------- Login & Signup (Supabase Auth) ---------- */
function bindAuthForms() {
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = loginForm.querySelector("#login-email");
      const password = loginForm.querySelector("#login-password");
      const message = document.getElementById("login-message");
      let valid = true;

      if (!isValidEmail(email.value)) {
        setFieldError(email, "Enter a valid email address.");
        valid = false;
      } else setFieldError(email, "");

      if (password.value.length < 6) {
        setFieldError(password, "Password must be at least 6 characters.");
        valid = false;
      } else setFieldError(password, "");

      if (!valid) {
        message.textContent = "Please fix the errors above.";
        message.className = "form-message form-message--error";
        return;
      }

      const submitBtn = loginForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      try {
        await Auth.signIn(email.value.trim(), password.value);
        message.className = "form-message form-message--success";
        message.textContent = `Welcome back!`;
        Toast.show("You're logged in");
        loginForm.reset();
        setTimeout(() => Router.goto("/account"), 500);
      } catch (err) {
        message.className = "form-message form-message--error";
        message.textContent = err.message || "Could not log in. Check your email and password.";
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  const signupForm = document.getElementById("signup-form");
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = signupForm.querySelector("#signup-name");
      const email = signupForm.querySelector("#signup-email");
      const password = signupForm.querySelector("#signup-password");
      const confirm = signupForm.querySelector("#signup-confirm");
      const message = document.getElementById("signup-message");
      let valid = true;

      if (name.value.trim().length < 2) {
        setFieldError(name, "Enter your full name.");
        valid = false;
      } else setFieldError(name, "");

      if (!isValidEmail(email.value)) {
        setFieldError(email, "Enter a valid email address.");
        valid = false;
      } else setFieldError(email, "");

      if (password.value.length < 6) {
        setFieldError(password, "Password must be at least 6 characters.");
        valid = false;
      } else setFieldError(password, "");

      if (confirm.value !== password.value || !confirm.value) {
        setFieldError(confirm, "Passwords do not match.");
        valid = false;
      } else setFieldError(confirm, "");

      if (!valid) {
        message.textContent = "Please fix the errors above.";
        message.className = "form-message form-message--error";
        return;
      }

      const submitBtn = signupForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      try {
        const data = await Auth.signUp(name.value.trim(), email.value.trim(), password.value);
        message.className = "form-message form-message--success";
        if (data.session) {
          message.textContent = `Account created. Welcome, ${escapeHtml(name.value.trim())}!`;
          Toast.show("Account created successfully");
          signupForm.reset();
          setTimeout(() => Router.goto("/account"), 500);
        } else {
          message.textContent = "Account created — check your email to confirm it, then log in.";
          Toast.show("Check your email to confirm your account");
          signupForm.reset();
          setTimeout(() => Router.goto("/login"), 1200);
        }
      } catch (err) {
        message.className = "form-message form-message--error";
        message.textContent = err.message || "Could not create your account.";
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
}

/* ---------- Contact form ---------- */
function bindContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = form.querySelector("#contact-name");
    const email = form.querySelector("#contact-email");
    const msg = form.querySelector("#contact-message");
    const message = document.getElementById("contact-form-message");
    let valid = true;

    if (name.value.trim().length < 2) {
      setFieldError(name, "Enter your name.");
      valid = false;
    } else setFieldError(name, "");

    if (!isValidEmail(email.value)) {
      setFieldError(email, "Enter a valid email address.");
      valid = false;
    } else setFieldError(email, "");

    if (msg.value.trim().length < 10) {
      setFieldError(msg, "Your message should be at least 10 characters.");
      valid = false;
    } else setFieldError(msg, "");

    if (!valid) {
      message.textContent = "Please fix the errors above.";
      message.className = "form-message form-message--error";
      return;
    }

    const subject = `LUXORA — message from ${escapeHtml(name.value.trim())}`;
    const body = [`Name: ${escapeHtml(name.value.trim())}`, `Email: ${escapeHtml(email.value.trim())}`, "", escapeHtml(msg.value.trim())].join("\n");
    window.location.href = `mailto:${STORE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    message.className = "form-message form-message--success";
    message.textContent = "Opening your email app to send this message…";
    Toast.show("Message ready to send");
    form.reset();
  });
}

/* ---------- Newsletter ---------- */
function bindNewsletterForm() {
  const form = document.getElementById("newsletter-form");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = form.querySelector("#newsletter-email");
    const message = document.getElementById("newsletter-message");
    if (!isValidEmail(email.value)) {
      setFieldError(email, "Enter a valid email address.");
      message.className = "form-message form-message--error";
      message.textContent = "Please enter a valid email.";
      return;
    }
    setFieldError(email, "");
    message.className = "form-message form-message--success";
    message.textContent = "You're subscribed. Look out for our next drop.";
    Toast.show("Subscribed to the newsletter");
    form.reset();
  });
}

/* ---------- Checkout ----------
   For demo purposes, checkout creates a local order record
   and opens email client. In production, connect to Supabase.
   ------------------------------------------------------------ */
function bindCheckoutForm() {
  const form = document.getElementById("checkout-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!Cart.count()) return;
    if (!Auth.requireLogin("Please log in to check out")) return;

    const name = form.querySelector("#checkout-name");
    const email = form.querySelector("#checkout-email");
    const phone = form.querySelector("#checkout-phone");
    const address = form.querySelector("#checkout-address");
    const message = document.getElementById("checkout-message");
    let valid = true;

    if (name.value.trim().length < 2) {
      setFieldError(name, "Enter your full name.");
      valid = false;
    } else setFieldError(name, "");

    if (!isValidEmail(email.value)) {
      setFieldError(email, "Enter a valid email address.");
      valid = false;
    } else setFieldError(email, "");

    if (phone.value.trim().length < 6) {
      setFieldError(phone, "Enter a valid phone number.");
      valid = false;
    } else setFieldError(phone, "");

    if (address.value.trim().length < 6) {
      setFieldError(address, "Enter a delivery address.");
      valid = false;
    } else setFieldError(address, "");

    if (!valid) {
      message.textContent = "Please fix the errors above before checking out.";
      message.className = "form-message form-message--error";
      return;
    }

    const submitBtn = document.getElementById("checkout-btn");
    submitBtn.disabled = true;

    const lines = Cart.lines();
    const subtotal = Cart.subtotal();
    const shipping = Cart.shipping();
    const total = Cart.total();
    const orderNumber = `LX${Date.now().toString().slice(-8)}`;

    try {
      // Try Supabase first, fall back to local storage
      let orderSaved = false;

      if (typeof sb !== "undefined" && sb.from) {
        try {
          const { data: order, error: orderError } = await sb
            .from("orders")
            .insert({
              user_id: Auth.user.id,
              order_number: orderNumber,
              customer_name: name.value.trim(),
              customer_email: email.value.trim(),
              customer_phone: phone.value.trim(),
              shipping_address: address.value.trim(),
              subtotal,
              shipping,
              total,
            })
            .select()
            .single();
          if (!orderError && order) {
            const itemsPayload = lines.map((l) => ({
              order_id: order.id,
              product_id: l.product.id,
              product_name: l.product.name,
              unit_price: l.product.price,
              qty: l.qty,
              line_total: l.lineTotal,
            }));
            await sb.from("order_items").insert(itemsPayload);
            orderSaved = true;
          }
        } catch (dbErr) {
          console.warn("Supabase order save failed, using local fallback:", dbErr);
        }
      }

      // Fallback: save to localStorage for demo
      if (!orderSaved) {
        const localOrders = JSON.parse(localStorage.getItem("luxora_orders") || "[]");
        localOrders.push({
          id: Date.now(),
          order_number: orderNumber,
          user_id: Auth.user.id,
          customer_name: name.value.trim(),
          customer_email: email.value.trim(),
          customer_phone: phone.value.trim(),
          shipping_address: address.value.trim(),
          subtotal,
          shipping,
          total,
          status: "pending",
          created_at: new Date().toISOString(),
          order_items: lines.map((l) => ({
            product_name: l.product.name,
            unit_price: l.product.price,
            qty: l.qty,
            line_total: l.lineTotal,
          })),
        });
        localStorage.setItem("luxora_orders", JSON.stringify(localOrders));
      }

      // Build email body
      const itemRows = lines
        .map(
          (l, i) =>
            `${i + 1}. ${l.product.name}  (SKU ${l.product.sku})\n   Qty: ${l.qty}  ×  ${money(l.product.price)}  =  ${money(l.lineTotal)}`
        )
        .join("\n\n");
      const body = [
        `NEW ORDER — ${orderNumber}`,
        "=================================",
        "",
        "ITEMS",
        "---------------------------------",
        itemRows,
        "",
        "---------------------------------",
        `Subtotal: ${money(subtotal)}`,
        `Shipping: ${shipping === 0 ? "Free" : money(shipping)}`,
        `Total:    ${money(total)}`,
        "",
        "CUSTOMER DETAILS",
        "---------------------------------",
        `Name:    ${escapeHtml(name.value.trim())}`,
        `Email:   ${escapeHtml(email.value.trim())}`,
        `Phone:   ${escapeHtml(phone.value.trim())}`,
        `Address: ${escapeHtml(address.value.trim())}`,
        "",
        "=================================",
        orderSaved ? `Order saved in Supabase — id ${orderNumber}.` : `Order saved locally — id ${orderNumber}.`,
      ].join("\n");
      const subject = `LUXORA Order ${orderNumber} — ${money(total)} — ${escapeHtml(name.value.trim())}`;
      window.location.href = `mailto:${STORE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      Toast.show(`Order ${orderNumber} placed`);
      message.className = "form-message form-message--success";
      message.textContent = `Order ${orderNumber} confirmed and saved to your account. Check My Account for order history.`;

      await Cart.clear();
      form.reset();
      setTimeout(() => {
        Pages.renderCart();
        Router.goto("/account");
      }, 900);
    } catch (err) {
      console.error("Checkout failed:", err);
      message.className = "form-message form-message--error";
      message.textContent = err.message || "Something went wrong placing your order. Please try again.";
      Toast.show("Checkout failed — please try again", "error");
    } finally {
      submitBtn.disabled = false;
    }
  });
}
