import { useState, useEffect } from "react";
import api from "../api/axios";
import { Link, useNavigate } from "react-router";

const FALLBACK_IMAGE = "https://placehold.co/200x200?text=No+Image";
const formatPrice = (p) => `$${Number(p).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const validId = (id) => id && id !== "undefined" && id !== "null";

export default function Cart() {
    const userId = localStorage.getItem("userId");
    const [cart, setCart] = useState(null);
    const [busyId, setBusyId] = useState(null);
    const [toast, setToast] = useState(null);
    const navigate = useNavigate();
    const loggedIn = validId(userId);

    // Theme is shared with Home and ProductDetails (same localStorage key)
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

    const loadCart = async () => {
        if (!userId) return;
        try {
            const res = await api.get(`/cart/${userId}`);
            setCart(res.data.cart || { items: [] });
        } catch (err) {
            console.error(err);
            setCart({ items: [] });
        }
    };

    useEffect(() => {
        loadCart();
    }, [userId]);

    useEffect(() => {
        try {
            localStorage.setItem("theme", theme);
        } catch {
            /* ignore */
        }
    }, [theme]);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 2500);
        return () => clearTimeout(t);
    }, [toast]);

    const removeItem = async (productId) => {
        try {
            setBusyId(productId);
            await api.post(`/cart/remove`, { userId, productId });
            await loadCart();
            window.dispatchEvent(new Event("cartUpdated"));
            setToast({ type: "info", msg: "Item removed from cart" });
        } catch (err) {
            console.error(err);
            setToast({ type: "error", msg: "Failed to remove item." });
        } finally {
            setBusyId(null);
        }
    };

    const updateQty = async (productId, quantity) => {
        if (quantity < 1) {
            await removeItem(productId);
            return;
        }
        try {
            setBusyId(productId);
            await api.post(`/cart/update`, { userId, productId, quantity });
            await loadCart();
            window.dispatchEvent(new Event("cartUpdated"));
        } catch (err) {
            console.error(err);
            setToast({ type: "error", msg: "Failed to update quantity." });
        } finally {
            setBusyId(null);
        }
    };

    const logout = () => {
        // remove only login data, so theme and wishlist are kept
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        navigate("/login");
    };

    const items = cart ? cart.items.filter((item) => item.productId) : [];
    const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const total = items.reduce(
        (sum, item) => sum + item.productId.price * item.quantity,
        0
    );

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
            .dark-theme .bg-gray-100, .dark-theme .bg-gray-200 { background-color: #374151; }
            .dark-theme .hover\\:bg-gray-200:hover { background-color: #4b5563; }
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

    // Same header as Home and ProductDetails
    const header = (
        <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
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

                <div className="flex items-center gap-2 sm:gap-3">
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

                    <Link
                        to="/cart"
                        className="relative w-10 h-10 rounded-full border border-indigo-400 flex items-center justify-center text-lg transition"
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

    const banner = (
        <div className="relative overflow-hidden bg-slate-900 h-40 sm:h-48">
            <div className="blob absolute -top-16 -left-10 w-64 h-64 rounded-full bg-blue-500/30 blur-3xl"></div>
            <div className="blob absolute top-0 right-0 w-72 h-72 rounded-full bg-fuchsia-500/25 blur-3xl" style={{ animationDelay: "2s" }}></div>
            <div className="blob absolute -bottom-20 left-1/3 w-64 h-64 rounded-full bg-cyan-400/20 blur-3xl" style={{ animationDelay: "4s" }}></div>
            <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-6 text-slate-200">
                <nav className="flex items-center gap-2 text-sm">
                    <Link to="/" className="hover:text-white transition">Home</Link>
                    <span className="opacity-50">/</span>
                    <span className="text-white font-medium">Cart</span>
                </nav>
                <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold text-white">
                    Your{" "}
                    <span className="bg-linear-to-r from-cyan-300 via-fuchsia-300 to-amber-200 bg-clip-text text-transparent">
                        Cart
                    </span>
                </h1>
            </div>
        </div>
    );

    const shell = (children) => (
        <div className={`min-h-screen bg-slate-50 transition-colors duration-300 ${dark ? "dark-theme" : ""}`}>
            {styles}
            {header}
            {banner}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 -mt-14 sm:-mt-16 relative">
                {children}
            </div>
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
        </div>
    );

    if (!loggedIn) {
        return shell(
            <div className="fade-up bg-white rounded-3xl shadow-2xl p-10 text-center">
                <div className="text-6xl mb-3">🔒</div>
                <p className="text-lg font-semibold text-gray-700">Please login to view your cart.</p>
                <Link
                    to="/login"
                    className="inline-block mt-5 px-6 py-2.5 bg-linear-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-xl shadow hover:brightness-110 transition"
                >
                    Go to Login
                </Link>
            </div>
        );
    }

    if (!cart) {
        return shell(
            <div className="bg-white rounded-3xl shadow-2xl p-6 space-y-4 animate-pulse">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-gray-200 rounded-xl"></div>
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-2/3 bg-gray-200 rounded"></div>
                            <div className="h-4 w-1/4 bg-gray-200 rounded"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (items.length === 0) {
        return shell(
            <div className="fade-up bg-white rounded-3xl shadow-2xl p-10 text-center">
                <div className="text-6xl mb-3">🛒</div>
                <p className="text-lg font-semibold text-gray-700">Your cart is empty.</p>
                <p className="text-sm text-gray-500 mt-1">Looks like you have not added anything yet.</p>
                <Link
                    to="/"
                    className="inline-block mt-5 px-6 py-2.5 bg-linear-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-xl shadow hover:brightness-110 transition"
                >
                    Start Shopping
                </Link>
            </div>
        );
    }

    return shell(
        <div className="grid lg:grid-cols-3 gap-6 items-start">
            {/* Items */}
            <div className="lg:col-span-2 space-y-4">
                <p className="text-sm text-slate-200 lg:text-gray-500 -mt-1">
                    {cartCount} {cartCount === 1 ? "item" : "items"} in your cart
                </p>

                {items.map((item, i) => {
                    const p = item.productId;
                    const busy = busyId === p._id;
                    return (
                        <div
                            key={p._id}
                            style={{ animationDelay: `${i * 70}ms` }}
                            className={`fade-up bg-white rounded-2xl border border-gray-100 shadow-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition ${
                                busy ? "opacity-60" : "hover:shadow-2xl"
                            }`}
                        >
                            <Link
                                to={`/product/${p._id}`}
                                className="w-full sm:w-24 h-32 sm:h-24 shrink-0 rounded-xl bg-linear-to-br from-slate-50 to-slate-100 overflow-hidden"
                            >
                                <img
                                    src={p.image || FALLBACK_IMAGE}
                                    alt={p.title}
                                    onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = FALLBACK_IMAGE;
                                    }}
                                    className="w-full h-full object-contain p-2 hover:scale-110 transition-transform duration-500"
                                />
                            </Link>

                            <div className="flex-1 min-w-0">
                                <Link to={`/product/${p._id}`}>
                                    <h2 className="font-semibold text-gray-900 line-clamp-2 hover:text-indigo-600 transition-colors">
                                        {p.title}
                                    </h2>
                                </Link>
                                {p.category && (
                                    <span className="inline-block mt-1 bg-indigo-50 text-indigo-600 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                                        {p.category}
                                    </span>
                                )}
                                <p className="text-sm text-gray-500 mt-1">{formatPrice(p.price)} each</p>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-4">
                                {/* Quantity stepper */}
                                <div className="flex items-center rounded-full border border-gray-200 overflow-hidden">
                                    <button
                                        onClick={() => updateQty(p._id, item.quantity - 1)}
                                        disabled={busy}
                                        className="w-9 h-9 bg-gray-100 text-gray-900 hover:bg-gray-200 active:scale-90 transition disabled:cursor-not-allowed"
                                        aria-label="Decrease quantity"
                                    >
                                        −
                                    </button>
                                    <span className="w-10 text-center font-semibold text-gray-900">
                                        {item.quantity}
                                    </span>
                                    <button
                                        onClick={() => updateQty(p._id, item.quantity + 1)}
                                        disabled={busy}
                                        className="w-9 h-9 bg-gray-100 text-gray-900 hover:bg-gray-200 active:scale-90 transition disabled:cursor-not-allowed"
                                        aria-label="Increase quantity"
                                    >
                                        +
                                    </button>
                                </div>

                                <p className="w-24 text-right text-lg font-extrabold text-gray-900">
                                    {formatPrice(p.price * item.quantity)}
                                </p>

                                <button
                                    onClick={() => removeItem(p._id)}
                                    disabled={busy}
                                    className="w-9 h-9 rounded-full border border-rose-300 text-rose-600 bg-rose-50 hover:bg-rose-500 hover:text-white hover:border-rose-500 active:scale-90 transition disabled:cursor-not-allowed"
                                    aria-label="Remove item"
                                    title="Remove"
                                >
                                    🗑
                                </button>
                            </div>
                        </div>
                    );
                })}

                <Link to="/" className="inline-block text-indigo-600 font-medium hover:underline">
                    ← Continue shopping
                </Link>
            </div>

            {/* Order summary */}
            <aside className="fade-up bg-white rounded-3xl shadow-2xl p-6 lg:sticky lg:top-24">
                <h2 className="text-lg font-bold text-gray-900">Order Summary</h2>

                <div className="mt-4 space-y-3 text-sm text-gray-600">
                    <div className="flex justify-between">
                        <span>Subtotal ({cartCount} items)</span>
                        <span className="font-medium text-gray-900">{formatPrice(total)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Delivery</span>
                        <span className="font-medium text-emerald-600">Free</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Payment</span>
                        <span className="font-medium text-gray-900">Cash on Delivery</span>
                    </div>
                </div>

                <div className="border-t border-gray-100 my-4"></div>

                <div className="flex justify-between items-end">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="text-3xl font-extrabold bg-linear-to-r from-indigo-600 to-fuchsia-500 bg-clip-text text-transparent">
                        {formatPrice(total)}
                    </span>
                </div>

                <button
                    onClick={() => navigate("/checkout")}
                    className="mt-6 w-full py-3.5 bg-linear-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:brightness-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition"
                >
                    Proceed to Checkout →
                </button>

                <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px] text-gray-500">
                    <div className="rounded-lg bg-gray-50 py-2">🔒<br />Secure</div>
                    <div className="rounded-lg bg-gray-50 py-2">🚚<br />Fast delivery</div>
                    <div className="rounded-lg bg-gray-50 py-2">↩️<br />Easy returns</div>
                </div>
            </aside>
        </div>
    );
}