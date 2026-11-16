import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import api from "../api/axios";

const FALLBACK_IMAGE = "https://placehold.co/300x200?text=No+Image";
const CATEGORIES = ["Laptops", "Mobiles", "Tablets"];

// Change the currency symbol here in one place
const formatPrice = (p) => `$${Number(p).toLocaleString()}`;

const isNew = (p) =>
  p.createdAt && Date.now() - new Date(p.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;

const validId = (id) => id && id !== "undefined" && id !== "null";

export default function Home() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  // Client-side controls
  const [sort, setSort] = useState("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [wishlistOnly, setWishlistOnly] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
  const [quickView, setQuickView] = useState(null);
  const [addingId, setAddingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [showTop, setShowTop] = useState(false);

  // Header state
  const [userId, setUserId] = useState(() => localStorage.getItem("userId"));
  const [cartCount, setCartCount] = useState(0);

  // Theme (saved in the browser, defaults to the device setting)
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "dark" || saved === "light") return saved;
    } catch {
      /* ignore */
    }
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const dark = theme === "dark";

  const [wishlist, setWishlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("wishlist")) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  // ---- Cart count for the header ----
  useEffect(() => {
    const loadCount = async () => {
      if (!validId(userId)) {
        setCartCount(0);
        return;
      }
      try {
        const res = await api.get(`/cart/${userId}`);
        const items = res.data.cart?.items || [];
        setCartCount(items.reduce((sum, item) => sum + item.quantity, 0));
      } catch (err) {
        console.error(err);
        setCartCount(0);
      }
    };

    loadCount();
    window.addEventListener("cartUpdated", loadCount);
    return () => window.removeEventListener("cartUpdated", loadCount);
  }, [userId]);

  const logout = () => {
    // remove only login data, so theme and wishlist are kept
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    setUserId(null);
    setCartCount(0);
    navigate("/login");
  };

  // ---- Load products (same debounce as before) ----
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await api.get("/products", {
          params: { search, category },
        });
        setProducts(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [search, category]);

  // ---- Toast auto-hide ----
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // ---- Scroll-to-top visibility ----
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ---- Close quick view with Escape ----
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setQuickView(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleWishlist = (id) => {
    const next = wishlist.includes(id)
      ? wishlist.filter((w) => w !== id)
      : [...wishlist, id];
    setWishlist(next);
    try {
      localStorage.setItem("wishlist", JSON.stringify(next));
    } catch {
      /* ignore storage errors */
    }
    setToast({
      type: "info",
      msg: next.includes(id) ? "Added to wishlist" : "Removed from wishlist",
    });
  };

  // ---- Add to cart (same logic as before) ----
  const addToCart = async (productId) => {
    const uid = localStorage.getItem("userId");
    if (!validId(uid)) {
      setToast({ type: "error", msg: "Please login to add items to cart." });
      return;
    }

    try {
      setAddingId(productId);
      await api.post("/cart/add", { userId: uid, productId });
      window.dispatchEvent(new Event("cartUpdated"));
      setToast({ type: "success", msg: "Item added to cart!" });
    } catch (err) {
      console.error(
        "ADD TO CART ERROR:",
        err.response?.status,
        err.response?.data || err.message
      );
      setToast({
        type: "error",
        msg:
          err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to add item to cart.",
      });
    } finally {
      setAddingId(null);
    }
  };

  // ---- Client-side filter + sort ----
  const visible = useMemo(() => {
    let list = [...products];
    if (minPrice !== "") list = list.filter((p) => p.price >= Number(minPrice));
    if (maxPrice !== "") list = list.filter((p) => p.price <= Number(maxPrice));
    if (inStockOnly) list = list.filter((p) => p.stock === undefined || p.stock > 0);
    if (wishlistOnly) list = list.filter((p) => wishlist.includes(p._id));

    if (sort === "priceLow") list.sort((a, b) => a.price - b.price);
    if (sort === "priceHigh") list.sort((a, b) => b.price - a.price);
    if (sort === "az") list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [products, minPrice, maxPrice, inStockOnly, wishlistOnly, sort, wishlist]);

  const hasFilters =
    search || category || minPrice || maxPrice || inStockOnly || wishlistOnly || sort !== "newest";

  const clearAll = () => {
    setSearch("");
    setCategory("");
    setMinPrice("");
    setMaxPrice("");
    setInStockOnly(false);
    setWishlistOnly(false);
    setSort("newest");
  };

  const isList = viewMode === "list";
  const loggedIn = validId(userId);

  return (
    <div
      className={`min-h-screen bg-slate-50 transition-colors duration-300 ${
        dark ? "dark-theme" : ""
      }`}
    >
      {/* Custom animations + dark theme overrides */}
      <style>{`
        /* Hide the old global navbar while the Home page is open */
        #root > nav { display: none !important; }

        @keyframes floaty { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-18px) } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes toastIn { from { opacity: 0; transform: translate(-50%, 20px) } to { opacity: 1; transform: translate(-50%, 0) } }
        @keyframes shimmerText { 0% { background-position: 0% 50% } 100% { background-position: 200% 50% } }
        @keyframes badgePop { 0% { transform: scale(.4) } 70% { transform: scale(1.25) } 100% { transform: scale(1) } }
        .card-in { animation: fadeUp .5s ease both }
        .toast-in { animation: toastIn .3s ease both }
        .blob { animation: floaty 7s ease-in-out infinite }
        .grad-text { background-size: 200% auto; animation: shimmerText 6s linear infinite }
        .badge-pop { animation: badgePop .35s ease both }

        /* ---------- Dark theme ---------- */
        .dark-theme { background-color: #0b1120; color-scheme: dark; }
        .dark-theme .bg-white { background-color: #111827; }
        .dark-theme .bg-white\\/95, .dark-theme .bg-white\\/90, .dark-theme .bg-white\\/80 { background-color: rgba(17,24,39,.85); }
        .dark-theme .bg-gray-50, .dark-theme .focus\\:bg-white:focus { background-color: #1f2937; }
        .dark-theme .bg-slate-50 { background-color: #0f172a; }
        .dark-theme .bg-gray-100, .dark-theme .bg-gray-200 { background-color: #374151; }
        .dark-theme .hover\\:bg-gray-200:hover { background-color: #4b5563; }
        .dark-theme .hover\\:bg-gray-50:hover { background-color: #1f2937; }
        .dark-theme .from-slate-50 { --tw-gradient-from: #1e293b; }
        .dark-theme .to-slate-100 { --tw-gradient-to: #0f172a; }
        .dark-theme .border-gray-100 { border-color: #1f2937; }
        .dark-theme .border-gray-200 { border-color: #374151; }
        .dark-theme .text-slate-800, .dark-theme .text-slate-900 { color: #f1f5f9; }
        .dark-theme .text-gray-700 { color: #cbd5e1; }
        .dark-theme .text-gray-600, .dark-theme .text-gray-500 { color: #94a3b8; }
        .dark-theme .text-gray-400 { color: #64748b; }
        .dark-theme .text-indigo-600 { color: #a5b4fc; }
        .dark-theme .bg-indigo-50 { background-color: rgba(99,102,241,.18); }
        .dark-theme .bg-rose-50 { background-color: rgba(244,63,94,.15); }
        .dark-theme .text-rose-600 { color: #fda4af; }
        .dark-theme .border-rose-300 { border-color: rgba(244,63,94,.5); }
        .dark-theme input::placeholder { color: #64748b; }
        .dark-theme .group:hover .group-hover\\:text-indigo-600 { color: #a5b4fc; }
      `}</style>

      {/* ================= Header ================= */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500 via-fuchsia-500 to-amber-400 flex items-center justify-center text-white font-black text-lg shadow-lg group-hover:rotate-6 group-hover:scale-105 transition-transform duration-300">
              NJ
            </span>
            <span className="leading-none">
              <span className="block text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">
                NJ{" "}
                <span className="bg-linear-to-r from-indigo-600 to-fuchsia-500 bg-clip-text text-transparent">
                  Store
                </span>
              </span>
              <span className="hidden sm:block text-[10px] uppercase tracking-[0.25em] text-gray-500 mt-1">
                Shop smart
              </span>
            </span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme toggle */}
            <button
              onClick={() => setTheme(dark ? "light" : "dark")}
              aria-label="Toggle theme"
              title={dark ? "Switch to light theme" : "Switch to dark theme"}
              className={`relative w-16 h-8 rounded-full border transition-colors duration-300 shrink-0 ${
                dark ? "bg-slate-700 border-slate-500" : "bg-amber-100 border-amber-300"
              }`}
            >
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs">☀️</span>
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">🌙</span>
              <span
                className={`absolute top-0.5 w-6 h-6 rounded-full shadow-md transition-all duration-300 ${
                  dark ? "left-9 bg-indigo-300" : "left-0.5 bg-white"
                }`}
              ></span>
            </button>

            {/* Cart */}
            <Link
              to="/cart"
              className="relative w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-lg hover:border-indigo-400 hover:-translate-y-0.5 transition"
              aria-label="Cart"
            >
              🛒
              {cartCount > 0 && (
                <span
                  key={cartCount}
                  className="badge-pop absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-linear-to-r from-rose-500 to-orange-500 text-white text-[11px] font-bold flex items-center justify-center shadow"
                >
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Auth buttons */}
            {!loggedIn ? (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-full text-sm font-semibold bg-linear-to-r from-indigo-600 to-blue-600 text-white shadow hover:shadow-lg hover:brightness-110 active:scale-95 transition"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="hidden sm:inline-block px-4 py-2 rounded-full text-sm font-semibold border border-gray-200 text-slate-800 hover:border-indigo-400 hover:text-indigo-600 transition"
                >
                  Sign Up
                </Link>
              </>
            ) : (
              <button
                onClick={logout}
                className="px-4 py-2 rounded-full text-sm font-semibold border border-rose-300 text-rose-600 bg-rose-50 hover:bg-rose-500 hover:text-white hover:border-rose-500 active:scale-95 transition"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-900 text-white">
        <div className="blob absolute -top-20 -left-16 w-72 h-72 rounded-full bg-blue-500/30 blur-3xl"></div>
        <div className="blob absolute top-10 right-0 w-80 h-80 rounded-full bg-fuchsia-500/25 blur-3xl" style={{ animationDelay: "2s" }}></div>
        <div className="blob absolute -bottom-24 left-1/3 w-72 h-72 rounded-full bg-cyan-400/20 blur-3xl" style={{ animationDelay: "4s" }}></div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-24 text-center">
          <span className="inline-block text-xs sm:text-sm font-medium bg-white/10 border border-white/20 rounded-full px-4 py-1 backdrop-blur">
            ✨ New arrivals every week
          </span>
          <h1 className="mt-5 text-3xl sm:text-6xl font-extrabold tracking-tight leading-tight">
            Your One-Stop{" "}
            <span className="grad-text bg-linear-to-r from-cyan-300 via-fuchsia-300 to-amber-200 bg-clip-text text-transparent">
              Online Shopping
            </span>{" "}
            Destination
          </h1>
          <p className="mt-4 text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto">
            Explore electronics, fashion, home essentials, beauty products, and more.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-slate-200">
            <span className="bg-white/10 rounded-full px-4 py-1.5">🚚 Cash on Delivery</span>
            <span className="bg-white/10 rounded-full px-4 py-1.5">🔒 Secure checkout</span>
            <span className="bg-white/10 rounded-full px-4 py-1.5">↩️ Easy returns</span>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        {/* Search panel */}
        <div className="-mt-8 relative bg-white rounded-2xl shadow-xl p-3 sm:p-5 space-y-4">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search for laptops, mobiles, tablets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-10 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {["", ...CATEGORIES].map((c) => (
              <button
                key={c || "all"}
                onClick={() => setCategory(c)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                  category === c
                    ? "bg-indigo-600 text-white border-indigo-600 shadow"
                    : "bg-white text-gray-600 border-gray-200 hover:border-indigo-400 hover:text-indigo-600"
                }`}
              >
                {c || "All"}
              </button>
            ))}
          </div>

          {/* Filters row */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                placeholder="Min $"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-24 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-gray-400">–</span>
              <input
                type="number"
                min="0"
                placeholder="Max $"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-24 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="newest">Sort: Newest</option>
              <option value="priceLow">Price: Low to High</option>
              <option value="priceHigh">Price: High to Low</option>
              <option value="az">Name: A to Z</option>
            </select>

            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="w-4 h-4 accent-indigo-600"
              />
              In stock only
            </label>

            <button
              onClick={() => setWishlistOnly(!wishlistOnly)}
              className={`text-sm px-3 py-1.5 rounded-lg border transition ${
                wishlistOnly
                  ? "bg-rose-50 text-rose-600 border-rose-300"
                  : "bg-white text-gray-600 border-gray-200 hover:border-rose-300"
              }`}
            >
              ❤️ Wishlist ({wishlist.length})
            </button>

            <div className="flex items-center gap-2 lg:ml-auto">
              {hasFilters && (
                <button
                  onClick={clearAll}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  Clear all
                </button>
              )}
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`px-3 py-1.5 text-sm ${viewMode === "grid" ? "bg-indigo-600 text-white" : "bg-white text-gray-600"}`}
                  aria-label="Grid view"
                >
                  ▦
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-1.5 text-sm ${viewMode === "list" ? "bg-indigo-600 text-white" : "bg-white text-gray-600"}`}
                  aria-label="List view"
                >
                  ☰
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Heading */}
        <div className="flex items-end justify-between mt-10 mb-5">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
            {category || "All Products"}
          </h2>
          <span className="text-sm text-gray-500">
            {visible.length} {visible.length === 1 ? "item" : "items"}
          </span>
        </div>

        {/* Skeleton loading */}
        {loading && (
          <div className={isList ? "grid grid-cols-1 gap-4" : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6"}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                <div className="h-40 sm:h-48 bg-gray-200"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-9 bg-gray-200 rounded-lg"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Products */}
        {!loading && (
          <div className={isList ? "grid grid-cols-1 gap-4" : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6"}>
            {visible.map((product, i) => {
              const out = product.stock !== undefined && product.stock <= 0;
              const low = product.stock > 0 && product.stock <= 5;
              const liked = wishlist.includes(product._id);

              return (
                <div
                  key={product._id}
                  style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
                  className={`card-in group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex ${
                    isList ? "flex-row" : "flex-col"
                  }`}
                >
                  {/* Floating action buttons */}
                  <div className="absolute top-2 right-2 z-10 flex flex-col gap-2">
                    <button
                      onClick={() => toggleWishlist(product._id)}
                      className="w-8 h-8 rounded-full bg-white/95 shadow flex items-center justify-center hover:scale-110 transition"
                      aria-label="Toggle wishlist"
                    >
                      {liked ? "❤️" : "🤍"}
                    </button>
                    <button
                      onClick={() => setQuickView(product)}
                      className="w-8 h-8 rounded-full bg-white/95 shadow flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 transition"
                      aria-label="Quick view"
                    >
                      👁
                    </button>
                  </div>

                  <Link
                    to={`/product/${product._id}`}
                    className={`block flex-1 ${isList ? "flex" : ""}`}
                  >
                    <div className={`relative bg-linear-to-br from-slate-50 to-slate-100 overflow-hidden ${isList ? "w-32 sm:w-52 shrink-0" : ""}`}>
                      <img
                        src={product.image || FALLBACK_IMAGE}
                        alt={product.title}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = FALLBACK_IMAGE;
                        }}
                        className={`w-full object-contain p-3 group-hover:scale-110 transition-transform duration-500 ${
                          isList ? "h-full min-h-32" : "h-36 sm:h-48"
                        } ${out ? "opacity-50 grayscale" : ""}`}
                      />
                      <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                        {product.category && (
                          <span className="bg-white/90 text-indigo-600 text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm">
                            {product.category}
                          </span>
                        )}
                        {isNew(product) && (
                          <span className="bg-emerald-500 text-white text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full">
                            NEW
                          </span>
                        )}
                        {out && (
                          <span className="bg-red-500 text-white text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full">
                            Sold out
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 sm:p-4">
                      <h2 className="font-semibold text-sm sm:text-base text-slate-800 line-clamp-2 min-h-10 sm:min-h-12 group-hover:text-indigo-600 transition-colors">
                        {product.title}
                      </h2>
                      {isList && product.description && (
                        <p className="hidden sm:block text-sm text-gray-500 line-clamp-2 mt-1">
                          {product.description}
                        </p>
                      )}
                      <p className="mt-2 text-lg sm:text-xl font-extrabold text-slate-900">
                        {formatPrice(product.price)}
                      </p>
                      {low && (
                        <p className="text-xs font-medium text-amber-600 mt-1">
                          🔥 Only {product.stock} left
                        </p>
                      )}
                    </div>
                  </Link>

                  <div className={`px-3 pb-3 sm:px-4 sm:pb-4 ${isList ? "self-center w-36 sm:w-48 pt-3" : ""}`}>
                    <button
                      onClick={() => addToCart(product._id)}
                      disabled={out || addingId === product._id}
                      className="w-full bg-linear-to-r from-indigo-600 to-blue-600 text-white text-sm sm:text-base font-medium px-3 py-2 sm:py-2.5 rounded-xl shadow hover:shadow-lg hover:brightness-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addingId === product._id ? "Adding..." : out ? "Out of Stock" : "🛒 Add to Cart"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && visible.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-3">📦</div>
            <p className="text-gray-600 text-lg font-medium">No products found.</p>
            <p className="text-gray-400 text-sm mt-1">Try a different search or filter.</p>
            {hasFilters && (
              <button
                onClick={clearAll}
                className="mt-5 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Quick view modal */}
      {quickView && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setQuickView(null)}
        >
          <div
            className="card-in bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto grid md:grid-cols-2 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setQuickView(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 z-10"
              aria-label="Close"
            >
              ✕
            </button>
            <div className="bg-slate-50 p-6 flex items-center justify-center">
              <img
                src={quickView.image || FALLBACK_IMAGE}
                alt={quickView.title}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = FALLBACK_IMAGE;
                }}
                className="w-full h-56 md:h-72 object-contain"
              />
            </div>
            <div className="p-6 flex flex-col">
              {quickView.category && (
                <span className="self-start bg-indigo-50 text-indigo-600 text-xs font-semibold px-3 py-1 rounded-full">
                  {quickView.category}
                </span>
              )}
              <h3 className="text-xl font-bold text-slate-900 mt-3">{quickView.title}</h3>
              <p className="text-2xl font-extrabold text-indigo-600 mt-2">
                {formatPrice(quickView.price)}
              </p>
              <p className="text-gray-600 text-sm mt-3 leading-relaxed line-clamp-5">
                {quickView.description}
              </p>
              {quickView.stock !== undefined && (
                <p className={`text-sm font-medium mt-3 ${quickView.stock > 0 ? "text-green-600" : "text-red-500"}`}>
                  {quickView.stock > 0 ? `✔ ${quickView.stock} in stock` : "✖ Out of stock"}
                </p>
              )}
              <div className="mt-auto pt-5 flex gap-2">
                <button
                  onClick={() => addToCart(quickView._id)}
                  disabled={quickView.stock !== undefined && quickView.stock <= 0}
                  className="flex-1 bg-indigo-600 text-white font-medium py-2.5 rounded-xl hover:bg-indigo-700 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🛒 Add to Cart
                </button>
                <Link
                  to={`/product/${quickView._id}`}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition"
                >
                  Details
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`toast-in fixed bottom-6 left-1/2 z-50 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-medium ${
            toast.type === "success"
              ? "bg-emerald-600"
              : toast.type === "error"
              ? "bg-red-600"
              : "bg-slate-800"
          }`}
        >
          {toast.type === "success" && "✔ "}
          {toast.type === "error" && "⚠ "}
          {toast.msg}
        </div>
      )}

      {/* Scroll to top */}
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-indigo-600 text-white shadow-xl hover:bg-indigo-700 hover:-translate-y-1 transition"
          aria-label="Scroll to top"
        >
          ↑
        </button>
      )}
    </div>
  );
}