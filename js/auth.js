/* =========================================================
   LUXORA — Auth (FIXED with demo mode fallback)
   Thin wrapper around Supabase Auth with localStorage fallback
   for demo/testing without a real Supabase connection.
   ========================================================= */

const Auth = {
  user: null,
  _demoUsers: [], // in-memory demo users

  async init() {
    // Try Supabase first
    if (typeof sb !== "undefined" && sb.auth) {
      try {
        const { data: { session } } = await sb.auth.getSession();
        this.user = session?.user || null;
        if (this.user) {
          await Promise.all([Cart.load(), Wishlist.load()]);
          this.updateHeader();

          sb.auth.onAuthStateChange((_event, session) => {
            const wasUser = this.user?.id;
            this.user = session?.user || null;
            if (this.user?.id !== wasUser) {
              Promise.all([Cart.load(), Wishlist.load()]).then(() => {
                this.updateHeader();
                this.refreshActivePages();
              });
            }
          });
          return;
        }
      } catch (e) {
        console.warn("Supabase auth not available, using demo mode:", e.message);
      }
    }

    // Demo mode: check localStorage for demo session
    const demoSession = localStorage.getItem("luxora_demo_session");
    if (demoSession) {
      try {
        this.user = JSON.parse(demoSession);
        this.updateHeader();
      } catch (e) {
        this.user = null;
      }
    }
  },

  isLoggedIn() {
    return Boolean(this.user);
  },

  displayName() {
    if (!this.user) return "Account";
    return this.user.user_metadata?.full_name?.split(" ")[0] || this.user.email?.split("@")[0] || "Account";
  },

  async signUp(name, email, password) {
    // Try Supabase first
    if (typeof sb !== "undefined" && sb.auth) {
      try {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        if (data.session) this.user = data.user;
        return data;
      } catch (e) {
        if (e.message && !e.message.includes("Failed to fetch")) throw e;
      }
    }

    // Demo mode fallback
    const demoUser = {
      id: "demo-" + Date.now(),
      email: email,
      user_metadata: { full_name: name },
      created_at: new Date().toISOString(),
    };
    this._demoUsers.push({ email, password, user: demoUser });
    this.user = demoUser;
    localStorage.setItem("luxora_demo_session", JSON.stringify(demoUser));
    await Promise.all([Cart.load(), Wishlist.load()]);
    this.updateHeader();
    return { user: demoUser, session: { user: demoUser } };
  },

  async signIn(email, password) {
    // Try Supabase first
    if (typeof sb !== "undefined" && sb.auth) {
      try {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        this.user = data.user;
        return data;
      } catch (e) {
        if (e.message && !e.message.includes("Failed to fetch")) throw e;
      }
    }

    // Demo mode fallback
    const found = this._demoUsers.find(u => u.email === email && u.password === password);
    if (found) {
      this.user = found.user;
      localStorage.setItem("luxora_demo_session", JSON.stringify(found.user));
      await Promise.all([Cart.load(), Wishlist.load()]);
      this.updateHeader();
      return { user: found.user, session: { user: found.user } };
    }
    throw new Error("Invalid email or password.");
  },

  async signOut() {
    if (typeof sb !== "undefined" && sb.auth) {
      try {
        await sb.auth.signOut();
      } catch (e) {
        // ignore
      }
    }
    this.user = null;
    localStorage.removeItem("luxora_demo_session");
    await Promise.all([Cart.load(), Wishlist.load()]);
    this.updateHeader();
  },

  updateHeader() {
    const link = document.getElementById("account-link");
    if (link) link.classList.toggle("account-link--active", this.isLoggedIn());
  },

  refreshActivePages() {
    if (document.getElementById("page-account")?.classList.contains("page--active")) {
      Pages.renderAccount();
    }
    if (document.getElementById("page-cart")?.classList.contains("page--active")) {
      Pages.renderCart();
    }
    if (document.getElementById("page-wishlist")?.classList.contains("page--active")) {
      Pages.renderWishlist();
    }
  },

  requireLogin(message) {
    if (this.isLoggedIn()) return true;
    Toast.show(message || "Please log in to continue", "error");
    Router.goto("/login");
    return false;
  },
};
