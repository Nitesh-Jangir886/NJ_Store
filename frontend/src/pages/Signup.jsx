import { useState, useEffect } from "react";
import { Link } from "react-router";
import api from "../api/axios";

const validId = (id) => id && id !== "undefined" && id !== "null";

// Simple password strength: 0 to 4
const getStrength = (pw) => {
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
    return score;
};

const STRENGTH_LABELS = ["Too short", "Weak", "Okay", "Good", "Strong"];
const STRENGTH_COLORS = ["bg-gray-300", "bg-red-500", "bg-amber-500", "bg-lime-500", "bg-emerald-500"];

export default function Signup() {
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
    });
    const [msg, setMsg] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Header state
    const [userId, setUserId] = useState(() => localStorage.getItem("userId"));
    const [cartCount, setCartCount] = useState(0);
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

    const logout = () => {
        // remove only login data, so theme and wishlist are kept
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        setUserId(null);
        setCartCount(0);
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);
            const response = await api.post("/auth/signup", form);
            setMsg(response.data.message);
            setSuccess(true);
        } catch (err) {
            setMsg(err.response?.data?.message || "Unable to create account. Please try again.");
            setSuccess(false);
        } finally {
            setLoading(false);
        }
    };

    const strength = getStrength(form.password);

    const styles = (
        <style>{`
            /* Hide the old global navbar on this page (we use the new header) */
            #root > nav { display: none !important; }

            @keyframes fadeUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
            @keyframes floaty { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-18px) } }
            @keyframes badgePop { 0% { transform: scale(.4) } 70% { transform: scale(1.25) } 100% { transform: scale(1) } }
            @keyframes shimmerText { 0% { background-position: 0% 50% } 100% { background-position: 200% 50% } }
            .fade-up { animation: fadeUp .5s ease both }
            .blob { animation: floaty 7s ease-in-out infinite }
            .badge-pop { animation: badgePop .35s ease both }
            .grad-text { background-size: 200% auto; animation: shimmerText 6s linear infinite }

            .dark-theme { background-color: #0b1120; color-scheme: dark; }
            .dark-theme .bg-white { background-color: #111827; }
            .dark-theme .bg-white\\/80 { background-color: rgba(17,24,39,.85); }
            .dark-theme .bg-gray-50, .dark-theme .bg-slate-50 { background-color: #1f2937; }
            .dark-theme .bg-gray-100, .dark-theme .bg-gray-200 { background-color: #374151; }
            .dark-theme .bg-gray-300 { background-color: #4b5563; }
            .dark-theme .border-gray-100 { border-color: #1f2937; }
            .dark-theme .border-gray-200, .dark-theme .border-gray-300 { border-color: #374151; }
            .dark-theme .text-gray-900, .dark-theme .text-slate-900, .dark-theme .text-slate-800 { color: #f1f5f9; }
            .dark-theme .text-gray-700 { color: #cbd5e1; }
            .dark-theme .text-gray-600, .dark-theme .text-gray-500 { color: #94a3b8; }
            .dark-theme .text-gray-400 { color: #64748b; }
            .dark-theme .text-indigo-600 { color: #a5b4fc; }
            .dark-theme .bg-rose-50 { background-color: rgba(244,63,94,.15); }
            .dark-theme .text-rose-600 { color: #fda4af; }
            .dark-theme .border-rose-300 { border-color: rgba(244,63,94,.5); }
            .dark-theme .bg-emerald-50 { background-color: rgba(16,185,129,.15); }
            .dark-theme .text-emerald-700 { color: #6ee7b7; }
            .dark-theme .border-emerald-200 { border-color: rgba(16,185,129,.4); }
            .dark-theme .text-red-700 { color: #fca5a5; }
            .dark-theme .bg-red-50 { background-color: rgba(239,68,68,.15); }
            .dark-theme .border-red-200 { border-color: rgba(239,68,68,.4); }
            .dark-theme input::placeholder { color: #64748b; }
            .dark-theme .focus\\:bg-white:focus { background-color: #1f2937; }
        `}</style>
    );

    return (
        <div className={`min-h-screen bg-slate-50 transition-colors duration-300 ${dark ? "dark-theme" : ""}`}>
            {styles}

            {/* ================= Header (same as other pages) ================= */}
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
                                    className="px-4 py-2 rounded-full text-sm font-semibold border border-gray-200 text-slate-800 hover:border-indigo-400 hover:text-indigo-600 transition"
                                >
                                    Login
                                </Link>
                                <Link
                                    to="/signup"
                                    className="hidden sm:inline-block px-4 py-2 rounded-full text-sm font-semibold bg-linear-to-r from-indigo-600 to-blue-600 text-white shadow ring-2 ring-indigo-300/50"
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

            {/* ================= Page body ================= */}
            <div className="relative overflow-hidden bg-slate-900 min-h-[calc(100vh-4rem)] flex items-center">
                <div className="blob absolute -top-20 -left-16 w-80 h-80 rounded-full bg-blue-500/30 blur-3xl"></div>
                <div className="blob absolute top-10 right-0 w-96 h-96 rounded-full bg-fuchsia-500/25 blur-3xl" style={{ animationDelay: "2s" }}></div>
                <div className="blob absolute -bottom-24 left-1/3 w-80 h-80 rounded-full bg-cyan-400/20 blur-3xl" style={{ animationDelay: "4s" }}></div>

                <div className="relative max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 grid md:grid-cols-2 gap-10 items-center">

                    {/* Left: welcome panel (hidden on phones) */}
                    <div className="hidden md:block text-white fade-up">
                        <span className="inline-block text-xs font-medium bg-white/10 border border-white/20 rounded-full px-4 py-1 backdrop-blur">
                            🎉 Join NJ Store
                        </span>
                        <h1 className="mt-5 text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight">
                            Create your account and{" "}
                            <span className="grad-text bg-linear-to-r from-cyan-300 via-fuchsia-300 to-amber-200 bg-clip-text text-transparent">
                                start shopping
                            </span>
                        </h1>
                        <p className="mt-4 text-slate-300 max-w-md">
                            It only takes a minute. Get your own cart, saved addresses and order history.
                        </p>

                        <ul className="mt-8 space-y-3 text-sm text-slate-200">
                            <li className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">⚡</span>
                                Quick and free sign up
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">❤️</span>
                                Save your favourite products
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">🚚</span>
                                Cash on Delivery checkout
                            </li>
                        </ul>
                    </div>

                    {/* Right: signup card */}
                    <div className="fade-up bg-white rounded-3xl shadow-2xl p-6 sm:p-9 w-full max-w-md mx-auto">
                        <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-linear-to-br from-indigo-500 via-fuchsia-500 to-amber-400 flex items-center justify-center text-white font-black text-xl shadow-lg">
                            NJ
                        </div>

                        <h2 className="text-2xl font-extrabold text-center text-gray-900">
                            Create Account
                        </h2>
                        <p className="text-center text-sm text-gray-500 mt-1">
                            Fill in your details to get started
                        </p>

                        {msg && (
                            <div
                                className={`mt-5 text-center text-sm font-medium rounded-xl border px-4 py-3 ${
                                    success
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : "bg-red-50 text-red-700 border-red-200"
                                }`}
                            >
                                {success ? "✔ " : "⚠ "}
                                {msg}
                                {success && (
                                    <Link
                                        to="/login"
                                        className="block mt-2 font-semibold underline"
                                    >
                                        Go to Login →
                                    </Link>
                                )}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">👤</span>
                                <input
                                    name="name"
                                    type="text"
                                    placeholder="Enter your name"
                                    value={form.name}
                                    onChange={handleChange}
                                    className="w-full pl-11 pr-3 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                    required
                                />
                            </div>

                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">✉️</span>
                                <input
                                    name="email"
                                    type="email"
                                    placeholder="Enter your email"
                                    value={form.email}
                                    onChange={handleChange}
                                    className="w-full pl-11 pr-3 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                    required
                                />
                            </div>

                            <div>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔑</span>
                                    <input
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter your password"
                                        value={form.password}
                                        onChange={handleChange}
                                        className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? "🙈" : "👁"}
                                    </button>
                                </div>

                                {/* Password strength meter */}
                                {form.password && (
                                    <div className="mt-2">
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4].map((n) => (
                                                <span
                                                    key={n}
                                                    className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                                                        strength >= n ? STRENGTH_COLORS[strength] : "bg-gray-200"
                                                    }`}
                                                ></span>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Password strength: <span className="font-semibold">{STRENGTH_LABELS[strength]}</span>
                                        </p>
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-linear-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:brightness-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="inline-flex items-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                        Creating account...
                                    </span>
                                ) : (
                                    "Sign Up"
                                )}
                            </button>
                        </form>

                        <p className="mt-6 text-center text-sm text-gray-500">
                            Already have an account?{" "}
                            <Link to="/login" className="font-semibold text-indigo-600 hover:underline">
                                Login
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}