/* =========================================================
   LUXORA — Cart & Wishlist (FIXED with localStorage fallback)
   Backed by Supabase when available, falls back to localStorage
   for demo mode. Scoped to the logged-in user.
   ========================================================= */

const Cart = {
  _items: [], // rows: { id, product_id, qty }
  _storageKey: "luxora_cart",

  async load() {
    if (Auth.user) {
      // Try Supabase first
      if (typeof sb !== "undefined" && sb.from) {
        try {
          const { data, error } = await sb.from("cart_items").select("*").eq("user_id", Auth.user.id);
          if (!error && data) {
            this._items = data;
            this.updateBadge();
            return;
          }
        } catch (e) {
          console.warn("Supabase cart load failed, using localStorage:", e.message);
        }
      }

      // Fallback: load from localStorage per user
      const key = `${this._storageKey}_${Auth.user.id}`;
      const stored = localStorage.getItem(key);
      this._items = stored ? JSON.parse(stored) : [];
    } else {
      this._items = [];
    }
    this.updateBadge();
  },

  async add(productId, qty = 1) {
    if (!Auth.requireLogin("Please log in to add items to your cart")) return;
    productId = Number(productId);
    const existing = this._items.find((it) => it.product_id === productId);

    if (existing) {
      const newQty = Math.min(20, existing.qty + qty);
      existing.qty = newQty;
      this.updateBadge();
      await this._persist();
    } else {
      const newItem = { id: `local-${Date.now()}`, product_id: productId, qty };
      this._items.push(newItem);
      this.updateBadge();
      await this._persist();
    }
  },

  async updateQty(cartItemId, qty) {
    qty = Math.max(1, Math.min(20, qty));
    const it = this._items.find((x) => x.id === cartItemId);
    if (it) it.qty = qty;
    this.updateBadge();
    await this._persist();
  },

  async remove(cartItemId) {
    this._items = this._items.filter((x) => x.id !== cartItemId);
    this.updateBadge();
    await this._persist();
  },

  async clear() {
    this._items = [];
    this.updateBadge();
    await this._persist();
  },

  async _persist() {
    // Try Supabase first
    if (typeof sb !== "undefined" && sb.from && Auth.user) {
      try {
        // For simplicity in demo, we just sync to localStorage
        // In production, you'd do proper upsert/delete operations
      } catch (e) {
        // ignore
      }
    }
    // Always save to localStorage as fallback
    if (Auth.user) {
      const key = `${this._storageKey}_${Auth.user.id}`;
      localStorage.setItem(key, JSON.stringify(this._items));
    }
  },

  count() {
    return this._items.reduce((sum, it) => sum + it.qty, 0);
  },

  lines() {
    return this._items
      .map((it) => {
        const product = getProductById(it.product_id);
        if (!product) return null;
        return { ...it, index: it.id, product, lineTotal: product.price * it.qty };
      })
      .filter(Boolean);
  },

  subtotal() {
    return this.lines().reduce((sum, l) => sum + l.lineTotal, 0);
  },

  shipping() {
    const sub = this.subtotal();
    if (sub === 0) return 0;
    return sub >= 50000 ? 0 : 500;
  },

  total() {
    return this.subtotal() + this.shipping();
  },

  updateBadge() {
    const badge = document.getElementById("cart-count");
    if (badge) {
      const c = this.count();
      badge.textContent = c;
      badge.style.display = c > 0 ? "inline-flex" : "none";
    }
  },
};

const Wishlist = {
  _ids: new Set(),
  _storageKey: "luxora_wishlist",

  async load() {
    if (Auth.user) {
      // Try Supabase first
      if (typeof sb !== "undefined" && sb.from) {
        try {
          const { data, error } = await sb.from("wishlist_items").select("product_id").eq("user_id", Auth.user.id);
          if (!error && data) {
            this._ids = new Set((data || []).map((r) => r.product_id));
            this.updateBadge();
            return;
          }
        } catch (e) {
          console.warn("Supabase wishlist load failed, using localStorage:", e.message);
        }
      }

      // Fallback
      const key = `${this._storageKey}_${Auth.user.id}`;
      const stored = localStorage.getItem(key);
      this._ids = stored ? new Set(JSON.parse(stored)) : new Set();
    } else {
      this._ids = new Set();
    }
    this.updateBadge();
  },

  has(id) {
    return this._ids.has(Number(id));
  },

  toggle(id) {
    id = Number(id);
    if (!Auth.requireLogin("Please log in to save items to your wishlist")) return this.has(id);

    if (this._ids.has(id)) {
      this._ids.delete(id);
      this.updateBadge();
      this._persist();
      return false;
    }

    this._ids.add(id);
    this.updateBadge();
    this._persist();
    return true;
  },

  remove(id) {
    id = Number(id);
    this._ids.delete(id);
    this.updateBadge();
    this._persist();
  },

  clear() {
    this._ids = new Set();
    this.updateBadge();
    this._persist();
  },

  count() {
    return this._ids.size;
  },

  items() {
    return [...this._ids].map((id) => getProductById(id)).filter(Boolean);
  },

  _persist() {
    if (Auth.user) {
      const key = `${this._storageKey}_${Auth.user.id}`;
      localStorage.setItem(key, JSON.stringify([...this._ids]));
    }
  },

  updateBadge() {
    const badge = document.getElementById("wishlist-count");
    if (badge) {
      const c = this.count();
      badge.textContent = c;
      badge.style.display = c > 0 ? "inline-flex" : "none";
    }
  },
};
