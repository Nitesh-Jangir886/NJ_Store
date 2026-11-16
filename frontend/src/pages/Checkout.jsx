import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import api from "../api/axios";

const FALLBACK_IMAGE = "https://placehold.co/200x200?text=No+Image";
const formatPrice = (p) =>
    `$${Number(p).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const validId = (id) => id && id !== "undefined" && id !== "null";

export default function Checkout() {
    const userId = localStorage.getItem("userId");
    const [addresses, setAddresses] = useState([]);
    const [selectedId, setSelectedId] = useState("");
    const [cart, setCart] = useState(null);
    const [placing, setPlacing] = useState(false);
    const [orderId, setOrderId] = useState(null);
    const [toast, setToast] = useState(null);
    const navigate = useNavigate();
    const loggedIn = validId(userId);

    // Theme is shared with all the other pages (same localStorage key)
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

    useEffect(() => {
        if (!validId(userId)) {
            navigate("/login");
            return;
        }

        const loadData = async () => {
            try {
                const cartRes = await api.get(`/cart/${userId}`);
                setCart(cartRes.data.cart || { items: [] });
            } catch (err) {
                console.error(err);
                setCart({ items: [] });
            }

            try {
                const addrRes = await api.get(`/address/${userId}`);
                setAddresses(addrRes.data);
                if (addrRes.data.length > 0) {
                    setSelectedId(addrRes.data[0]._id);
                }
            } catch (err) {
                console.error(err);
            }
        };

        loadData();
    }, [userId, navigate]);

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

    const logout = () => {
        // remove only login data, so theme and wishlist are kept
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        navigate("/login");
    };

    const items = cart ? cart.items.filter((i) => i.productId) : [];
    const cartCount = orderId ? 0 : items.reduce((sum, i) => sum + i.quantity, 0);
    const total = items.reduce((sum, i) => sum + i.quantity * i.productId.price, 0);

    const placeOrder = async () => {
        const selected = addresses.find((a) => a._id === selectedId);

        if (!selected) {
            setToast({ type: "error", msg: "Please select an address." });
            return;
        }

        try {
            setPlacing(true);

            const res = await api.post("/order/place", {
                userId,
                address: {
                    fullName: selected.fullName,
                    phone: selected.phone,
                    addressLine: selected.addressLine,
                    city: selected.city,
                    state: selected.state,
                    pincode: selected.pincode,
                },
            });

            window.dispatchEvent(new Event("cartUpdated"));
            setOrderId(res.data.orderId); // show the success screen right here, no redirect
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (err) {
            console.error(err);
            setToast({
                type: "error",
                msg: err.response?.data?.message || "Failed to place order.",
            });
        } finally {
            setPlacing(false);
        }
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
            .dark-theme .bg-gray-100, .dark-theme .bg-gray-200 { background-color: #374151; }
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
            .dark-theme .bg-green-100 { background-color: rgba(16,185,129,.2); }
            .dark-theme .hover\\:bg-gray-50:hover { background-color: #1f2937; }
            .dark-theme .hover\\:text-indigo-600:hover { color: #a5b4fc; }
        `}</style>
    );

    // Same header as the other pages
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

    // Progress steps: Cart -> Address -> Place order
    const steps = [
        { label: "Cart", done: true },
        { label: "Address", done: addresses.length > 0 || !!orderId },
        { label: "Place order", done: !!orderId },
    ];

    const banner = (
        <div className="relative overflow-hidden bg-slate-900 h-48 sm:h-56">
            <div className="blob absolute -top-16 -left-10 w-64 h-64 rounded-full bg-blue-500/30 blur-3xl"></div>
            <div className="blob absolute top-0 right-0 w-72 h-72 rounded-full bg-fuchsia-500/25 blur-3xl" style={{ animationDelay: "2s" }}></div>
            <div className="blob absolute -bottom-20 left-1/3 w-64 h-64 rounded-full bg-cyan-400/20 blur-3xl" style={{ animationDelay: "4s" }}></div>
            <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-6 text-slate-200">
                <nav className="flex items-center gap-2 text-sm">
                    <Link to="/" className="hover:text-white transition">Home</Link>
                    <span className="opacity-50">/</span>
                    <Link to="/cart" className="hover:text-white transition">Cart</Link>
                    <span className="opacity-50">/</span>
                    <span className="text-white font-medium">Checkout</span>
                </nav>
                <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold text-white">
                    {orderId ? "Order " : "Secure "}
                    <span className="bg-linear-to-r from-cyan-300 via-fuchsia-300 to-amber-200 bg-clip-text text-transparent">
                        {orderId ? "Confirmed" : "Checkout"}
                    </span>
                </h1>

                <div className="mt-5 flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                    {steps.map((s, i) => (
                        <div key={s.label} className="flex items-center gap-2 sm:gap-3">
                            <span
                                className={`flex items-center gap-2 rounded-full px-3 py-1 border ${
                                    s.done
                                        ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-200"
                                        : "bg-white/10 border-white/20 text-slate-200"
                                }`}
                            >
                                <span className="font-bold">{s.done ? "✔" : i + 1}</span>
                                {s.label}
                            </span>
                            {i < steps.length - 1 && <span className="opacity-40">→</span>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const shell = (children) => (
        <div className={`min-h-screen bg-slate-50 transition-colors duration-300 ${dark ? "dark-theme" : ""}`}>
            {styles}
            {header}
            {banner}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 -mt-12 sm:-mt-14 relative">
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

    // Success screen (shown inside this page, so no route can 404)
    if (orderId) {
        return shell(
            <div className="fade-up bg-white rounded-3xl shadow-2xl p-8 sm:p-12 text-center max-w-xl mx-auto">
                <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-4xl text-green-600">
                    ✓
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
                    Order Placed Successfully
                </h2>
                <p className="mt-3 text-gray-600">
                    Thank you for shopping with NJ Store. Pay with cash when your order arrives.
                </p>

                <div className="mt-6 rounded-xl bg-gray-50 border border-gray-200 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Your Order ID</p>
                    <p className="mt-1 font-semibold text-gray-900 break-all">{orderId}</p>
                </div>

                <Link
                    to="/"
                    className="inline-block mt-7 px-8 py-3 bg-linear-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:brightness-110 active:scale-95 transition"
                >
                    Continue Shopping
                </Link>
            </div>
        );
    }

    if (!loggedIn) {
        return shell(
            <div className="fade-up bg-white rounded-3xl shadow-2xl p-10 text-center">
                <div className="text-6xl mb-3">🔒</div>
                <p className="text-lg font-semibold text-gray-700">Please login to checkout.</p>
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
                    <div key={i} className="h-20 bg-gray-200 rounded-2xl"></div>
                ))}
            </div>
        );
    }

    if (items.length === 0) {
        return shell(
            <div className="fade-up bg-white rounded-3xl shadow-2xl p-10 text-center">
                <div className="text-6xl mb-3">🛒</div>
                <p className="text-lg font-semibold text-gray-700">Your cart is empty.</p>
                <Link
                    to="/"
                    className="inline-block mt-5 px-6 py-2.5 bg-linear-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-xl shadow hover:brightness-110 transition"
                >
                    Continue shopping
                </Link>
            </div>
        );
    }

    return shell(
        <div className="grid lg:grid-cols-3 gap-6 items-start">
            {/* Left: addresses */}
            <div className="lg:col-span-2 fade-up bg-white rounded-3xl shadow-2xl p-5 sm:p-7">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">📍 Select Address</h2>
                    {addresses.length > 0 && (
                        <Link
                            to="/checkout-address"
                            className="text-sm font-semibold text-indigo-600 hover:underline"
                        >
                            + Add new
                        </Link>
                    )}
                </div>

                {addresses.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-2xl">
                        <div className="text-5xl mb-2">🏠</div>
                        <p className="text-gray-600 font-medium">No saved address.</p>
                        <Link
                            to="/checkout-address"
                            className="inline-block mt-4 px-5 py-2 bg-linear-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-xl shadow hover:brightness-110 transition"
                        >
                            Add an address
                        </Link>
                    </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                    {addresses.map((addr) => {
                        const selected = selectedId === addr._id;
                        return (
                            <label
                                key={addr._id}
                                className={`relative block rounded-2xl border-2 p-4 cursor-pointer transition hover:shadow-lg ${
                                    selected
                                        ? "border-indigo-500 bg-indigo-50 shadow-md"
                                        : "border-gray-200 hover:border-indigo-300"
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="address"
                                    checked={selected}
                                    onChange={() => setSelectedId(addr._id)}
                                    className="sr-only"
                                />
                                <span
                                    className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] ${
                                        selected
                                            ? "bg-indigo-600 border-indigo-600 text-white"
                                            : "border-gray-300 text-transparent"
                                    }`}
                                >
                                    ✔
                                </span>
                                <p className="font-bold text-gray-900 pr-6">{addr.fullName}</p>
                                <p className="text-sm text-gray-500 mt-0.5">📞 {addr.phone}</p>
                                <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                                    {addr.addressLine}, {addr.city}, {addr.state} - {addr.pincode}
                                </p>
                            </label>
                        );
                    })}
                </div>

                <div className="mt-6 rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-600 flex items-center gap-3">
                    <span className="text-2xl">💵</span>
                    <div>
                        <p className="font-semibold text-gray-900">Cash on Delivery</p>
                        <p>Pay when your order arrives at your door.</p>
                    </div>
                </div>
            </div>

            {/* Right: order summary */}
            <aside className="fade-up bg-white rounded-3xl shadow-2xl p-6 lg:sticky lg:top-24">
                <h2 className="text-lg font-bold text-gray-900">Order Summary</h2>

                <div className="mt-4 space-y-3 max-h-64 overflow-y-auto pr-1">
                    {items.map((i) => (
                        <div key={i.productId._id} className="flex items-center gap-3">
                            <div className="relative w-14 h-14 shrink-0 rounded-xl bg-linear-to-br from-slate-50 to-slate-100 overflow-hidden">
                                <img
                                    src={i.productId.image || FALLBACK_IMAGE}
                                    alt={i.productId.title}
                                    onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = FALLBACK_IMAGE;
                                    }}
                                    className="w-full h-full object-contain p-1"
                                />
                                <span className="absolute top-0 right-0 min-w-5 h-5 px-1 rounded-bl-lg bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">
                                    {i.quantity}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{i.productId.title}</p>
                                <p className="text-xs text-gray-500">
                                    {formatPrice(i.productId.price)} × {i.quantity}
                                </p>
                            </div>
                            <p className="text-sm font-bold text-gray-900">
                                {formatPrice(i.productId.price * i.quantity)}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="border-t border-gray-100 my-4"></div>

                <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                        <span>Subtotal ({cartCount} items)</span>
                        <span className="font-medium text-gray-900">{formatPrice(total)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Delivery</span>
                        <span className="font-medium text-emerald-600">Free</span>
                    </div>
                </div>

                <div className="border-t border-gray-100 my-4"></div>

                <div className="flex justify-between items-end">
                    <span className="font-semibold text-gray-900">Total Amount</span>
                    <span className="text-3xl font-extrabold bg-linear-to-r from-indigo-600 to-fuchsia-500 bg-clip-text text-transparent">
                        {formatPrice(total)}
                    </span>
                </div>

                <button
                    onClick={placeOrder}
                    disabled={placing || addresses.length === 0}
                    className="mt-6 w-full py-3.5 bg-linear-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:brightness-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {placing ? (
                        <span className="inline-flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            Placing order...
                        </span>
                    ) : (
                        "Place Order (COD)"
                    )}
                </button>

                {addresses.length === 0 && (
                    <p className="mt-2 text-xs text-center text-gray-500">
                        Add an address to place your order.
                    </p>
                )}

                <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px] text-gray-500">
                    <div className="rounded-lg bg-gray-50 py-2">🔒<br />Secure</div>
                    <div className="rounded-lg bg-gray-50 py-2">🚚<br />Fast delivery</div>
                    <div className="rounded-lg bg-gray-50 py-2">↩️<br />Easy returns</div>
                </div>
            </aside>
        </div>
    );
}