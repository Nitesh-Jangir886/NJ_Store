import { useState, useEffect } from "react";
import api from "../api/axios";
import { Link, useParams, useNavigate } from "react-router";

const FALLBACK_IMAGE = "https://placehold.co/600x400?text=No+Image";
const formatPrice = (p) => `$${Number(p).toLocaleString()}`;
const validId = (id) => id && id !== "undefined" && id !== "null";

const deliveryRange = () => {
    const fmt = (d) =>
        d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
    const a = new Date();
    a.setDate(a.getDate() + 3);
    const b = new Date();
    b.setDate(b.getDate() + 5);
    return `${fmt(a)} – ${fmt(b)}`;
};

export default function ProductDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [related, setRelated] = useState([]);
    const [notFound, setNotFound] = useState(false);
    const [adding, setAdding] = useState(false);
    const [toast, setToast] = useState(null);
    const [zoom, setZoom] = useState({ on: false, x: 50, y: 50 });

    // Header state
    const [userId, setUserId] = useState(() => localStorage.getItem("userId"));
    const [cartCount, setCartCount] = useState(0);
    const loggedIn = validId(userId);

    // Theme is shared with the Home page (same localStorage key)
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

    // Wishlist is shared with the Home page too
    const [wishlist, setWishlist] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("wishlist")) || [];
        } catch {
            return [];
        }
    });

    const loadProduct = async () => {
        try {
            const res = await api.get("/products/");
            const p = res.data.find((item) => item._id === id);
            if (p) {
                setProduct(p);
                setRelated(
                    res.data
                        .filter((item) => item.category === p.category && item._id !== p._id)
                        .slice(0, 4)
                );
            } else {
                setNotFound(true);
            }
        } catch (err) {
            console.error(err);
            setNotFound(true);
        }
    };

    useEffect(() => {
        setProduct(null);
        setNotFound(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
        loadProduct();
    }, [id]);

    useEffect(() => {
        try {
            localStorage.setItem("theme", theme);
        } catch {
            /* ignore */
        }
    }, [theme]);

    // Cart count for the header
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

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 2500);
        return () => clearTimeout(t);
    }, [toast]);

    const logout = () => {
        // remove only login data, so theme and wishlist are kept
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        setUserId(null);
        setCartCount(0);
        navigate("/login");
    };

    const toggleWishlist = () => {
        const next = wishlist.includes(product._id)
            ? wishlist.filter((w) => w !== product._id)
            : [...wishlist, product._id];
        setWishlist(next);
        try {
            localStorage.setItem("wishlist", JSON.stringify(next));
        } catch {
            /* ignore */
        }
        setToast({
            type: "info",
            msg: next.includes(product._id) ? "Added to wishlist" : "Removed from wishlist",
        });
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setToast({ type: "success", msg: "Link copied!" });
        } catch {
            setToast({ type: "error", msg: "Could not copy the link." });
        }
    };

    const addToCart = async () => {
        const uid = localStorage.getItem("userId");
        if (!validId(uid)) {
            setToast({ type: "error", msg: "Please login to add items to cart." });
            return;
        }

        try {
            setAdding(true);
            await api.post("/cart/add", { userId: uid, productId: product._id });
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
            setAdding(false);
        }
    };

    const onMove = (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setZoom({
            on: true,
            x: ((e.clientX - r.left) / r.width) * 100,
            y: ((e.clientY - r.top) / r.height) * 100,
        });
    };

    const styles = (
        <style>{`
            /* Hide the old global navbar on this page (we use the new header) */
            #root > nav { display: none !important; }

            @keyframes fadeUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
            @keyframes toastIn { from { opacity: 0; transform: translate(-50%, 20px) } to { opacity: 1; transform: translate(-50%, 0) } }
            @keyframes floaty { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-18px) } }
            @keyframes badgePop { 0% { transform: scale(.4) } 70% { transform: scale(1.25) } 100% { transform: scale(1) } }
            .fade-up { animation: fadeUp .5s ease both }
            .toast-in { animation: toastIn .3s ease both }
            .blob { animation: floaty 7s ease-in-out infinite }
            .badge-pop { animation: badgePop .35s ease both }

            .dark-theme { background-color: #0b1120; color-scheme: dark; }
            .dark-theme .bg-white { background-color: #111827; }
            .dark-theme .bg-white\\/80 { background-color: rgba(17,24,39,.85); }
            .dark-theme .bg-gray-50, .dark-theme .bg-slate-50 { background-color: #1f2937; }
            .dark-theme .bg-gray-200 { background-color: #374151; }
            .dark-theme .from-slate-50 { --tw-gradient-from: #1e293b; }
            .dark-theme .to-slate-100 { --tw-gradient-to: #0f172a; }
            .dark-theme .border-gray-100 { border-color: #1f2937; }
            .dark-theme .border-gray-200 { border-color: #374151; }
            .dark-theme .text-gray-900, .dark-theme .text-slate-900, .dark-theme .text-slate-800 { color: #f1f5f9; }
            .dark-theme .text-gray-700 { color: #cbd5e1; }
            .dark-theme .text-gray-600, .dark-theme .text-gray-500 { color: #94a3b8; }
            .dark-theme .text-gray-400 { color: #64748b; }
            .dark-theme .text-indigo-600 { color: #a5b4fc; }
            .dark-theme .bg-indigo-50 { background-color: rgba(99,102,241,.18); }
            .dark-theme .bg-rose-50 { background-color: rgba(244,63,94,.15); }
            .dark-theme .text-rose-600 { color: #fda4af; }
            .dark-theme .border-rose-300 { border-color: rgba(244,63,94,.5); }
            .dark-theme .hover\\:bg-gray-50:hover { background-color: #1f2937; }
            .dark-theme .hover\\:text-indigo-600:hover { color: #a5b4fc; }
        `}</style>
    );

    // Same header as the Home page
    const header = (
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
    );

    if (notFound) {
        return (
            <div className={`min-h-screen bg-slate-50 ${dark ? "dark-theme" : ""}`}>
                {styles}
                {header}
                <div className="min-h-[70vh] flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-6xl mb-3">🔍</div>
                        <p className="text-lg font-semibold text-gray-700">Product not found.</p>
                        <Link
                            to="/"
                            className="inline-block mt-5 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                        >
                            Back to shop
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className={`min-h-screen bg-slate-50 ${dark ? "dark-theme" : ""}`}>
                {styles}
                {header}
                <div className="px-4 sm:px-6 py-8 sm:py-12">
                    <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-lg overflow-hidden grid md:grid-cols-2 animate-pulse">
                        <div className="h-72 sm:h-104 bg-gray-200"></div>
                        <div className="p-8 space-y-4">
                            <div className="h-5 w-24 bg-gray-200 rounded-full"></div>
                            <div className="h-8 w-4/5 bg-gray-200 rounded"></div>
                            <div className="h-10 w-1/3 bg-gray-200 rounded"></div>
                            <div className="h-24 bg-gray-200 rounded"></div>
                            <div className="h-12 bg-gray-200 rounded-xl"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const outOfStock = product.stock !== undefined && product.stock <= 0;
    const lowStock = product.stock > 0 && product.stock <= 5;
    const liked = wishlist.includes(product._id);

    return (
        <div className={`min-h-screen bg-slate-50 transition-colors duration-300 ${dark ? "dark-theme" : ""}`}>
            {styles}
            {header}

            {/* Soft gradient banner behind the card */}
            <div className="relative overflow-hidden bg-slate-900 h-44 sm:h-56">
                <div className="blob absolute -top-16 -left-10 w-64 h-64 rounded-full bg-blue-500/30 blur-3xl"></div>
                <div className="blob absolute top-0 right-0 w-72 h-72 rounded-full bg-fuchsia-500/25 blur-3xl" style={{ animationDelay: "2s" }}></div>
                <div className="blob absolute -bottom-20 left-1/3 w-64 h-64 rounded-full bg-cyan-400/20 blur-3xl" style={{ animationDelay: "4s" }}></div>

                <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-5 text-sm text-slate-200">
                    {/* Breadcrumb */}
                    <nav className="flex items-center gap-2 flex-wrap">
                        <Link to="/" className="hover:text-white transition">Home</Link>
                        <span className="opacity-50">/</span>
                        {product.category && (
                            <>
                                <span>{product.category}</span>
                                <span className="opacity-50">/</span>
                            </>
                        )}
                        <span className="text-white font-medium truncate max-w-40 sm:max-w-xs">
                            {product.title}
                        </span>
                    </nav>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-28 md:pb-16 -mt-24 sm:-mt-32 relative">
                {/* Main card */}
                <div className="fade-up bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2">

                    {/* Image side with hover zoom */}
                    <div className="relative bg-linear-to-br from-slate-50 to-slate-100 p-6 sm:p-10 flex items-center justify-center">
                        <div
                            className="w-full h-64 sm:h-96 overflow-hidden rounded-2xl cursor-zoom-in"
                            onMouseMove={onMove}
                            onMouseLeave={() => setZoom({ on: false, x: 50, y: 50 })}
                        >
                            <img
                                src={product.image || FALLBACK_IMAGE}
                                alt={product.title}
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = FALLBACK_IMAGE;
                                }}
                                style={{
                                    transformOrigin: `${zoom.x}% ${zoom.y}%`,
                                    transform: zoom.on ? "scale(1.8)" : "scale(1)",
                                }}
                                className={`w-full h-full object-contain transition-transform duration-200 ${
                                    outOfStock ? "opacity-50 grayscale" : ""
                                }`}
                            />
                        </div>

                        {outOfStock && (
                            <span className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                Sold out
                            </span>
                        )}

                        {/* Floating actions */}
                        <div className="absolute top-4 right-4 flex flex-col gap-2">
                            <button
                                onClick={toggleWishlist}
                                aria-label="Toggle wishlist"
                                className="w-10 h-10 rounded-full bg-white/80 backdrop-blur shadow flex items-center justify-center hover:scale-110 transition"
                            >
                                {liked ? "❤️" : "🤍"}
                            </button>
                            <button
                                onClick={copyLink}
                                aria-label="Copy link"
                                className="w-10 h-10 rounded-full bg-white/80 backdrop-blur shadow flex items-center justify-center hover:scale-110 transition"
                            >
                                🔗
                            </button>
                        </div>
                        <p className="hidden md:block absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] text-gray-400">
                            Hover to zoom
                        </p>
                    </div>

                    {/* Details side */}
                    <div className="p-6 sm:p-10 flex flex-col">
                        {product.category && (
                            <span className="self-start bg-indigo-50 text-indigo-600 text-xs font-semibold px-3 py-1 rounded-full">
                                {product.category}
                            </span>
                        )}

                        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-3 leading-tight">
                            {product.title}
                        </h1>

                        <p className="text-4xl font-extrabold mt-4 bg-linear-to-r from-indigo-600 to-fuchsia-500 bg-clip-text text-transparent">
                            {formatPrice(product.price)}
                        </p>

                        <div className="border-t border-gray-100 my-5"></div>

                        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-[0.2em]">
                            Description
                        </h2>
                        <p className="text-gray-700 mt-2 leading-relaxed">
                            {product.description}
                        </p>

                        {product.stock !== undefined && (
                            <p
                                className={`mt-5 text-sm font-medium ${
                                    product.stock > 0 ? "text-green-600" : "text-red-500"
                                }`}
                            >
                                {product.stock > 0
                                    ? `✔ In stock (${product.stock} available)`
                                    : "✖ Out of stock"}
                                {lowStock && (
                                    <span className="ml-2 text-amber-600">🔥 Hurry, almost gone</span>
                                )}
                            </p>
                        )}

                        {/* Delivery info */}
                        <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 space-y-1.5">
                            <p>🚚 Estimated delivery: <span className="font-semibold text-gray-900">{deliveryRange()}</span></p>
                            <p>💵 Cash on Delivery available</p>
                            <p>↩️ Easy returns within 7 days</p>
                        </div>

                        <button
                            onClick={addToCart}
                            disabled={adding || outOfStock}
                            className="mt-6 w-full px-8 py-3.5 bg-linear-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:brightness-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {adding ? "Adding..." : outOfStock ? "Out of Stock" : "🛒 Add to Cart"}
                        </button>

                        {/* Trust badges */}
                        <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px] sm:text-xs text-gray-500">
                            <div className="rounded-lg bg-gray-50 py-2">🔒<br />Secure checkout</div>
                            <div className="rounded-lg bg-gray-50 py-2">✅<br />Genuine product</div>
                            <div className="rounded-lg bg-gray-50 py-2">🎧<br />24/7 support</div>
                        </div>
                    </div>
                </div>

                {/* Related products */}
                {related.length > 0 && (
                    <section className="mt-12">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5">
                            You may also like
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
                            {related.map((r, i) => (
                                <Link
                                    key={r._id}
                                    to={`/product/${r._id}`}
                                    style={{ animationDelay: `${i * 80}ms` }}
                                    className="fade-up group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                                >
                                    <div className="bg-linear-to-br from-slate-50 to-slate-100 overflow-hidden">
                                        <img
                                            src={r.image || FALLBACK_IMAGE}
                                            alt={r.title}
                                            onError={(e) => {
                                                e.currentTarget.onerror = null;
                                                e.currentTarget.src = FALLBACK_IMAGE;
                                            }}
                                            className="w-full h-32 sm:h-40 object-contain p-3 group-hover:scale-110 transition-transform duration-500"
                                        />
                                    </div>
                                    <div className="p-3">
                                        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 min-h-10 group-hover:text-indigo-600 transition-colors">
                                            {r.title}
                                        </h3>
                                        <p className="mt-1 font-extrabold text-gray-900">
                                            {formatPrice(r.price)}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            {/* Sticky buy bar on phones */}
            <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/80 backdrop-blur-xl border-t border-gray-200 px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 truncate">{product.title}</p>
                    <p className="font-extrabold text-gray-900">{formatPrice(product.price)}</p>
                </div>
                <button
                    onClick={addToCart}
                    disabled={adding || outOfStock}
                    className="px-6 py-2.5 bg-linear-to-r from-indigo-600 to-blue-600 text-white text-sm font-semibold rounded-xl shadow active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {adding ? "Adding..." : outOfStock ? "Sold out" : "🛒 Add"}
                </button>
            </div>

            {/* Toast */}
            {toast && (
                <div
                    className={`toast-in fixed bottom-24 md:bottom-6 left-1/2 z-50 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-medium ${
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
        </div>
    );
}