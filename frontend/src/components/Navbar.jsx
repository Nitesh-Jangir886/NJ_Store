import { Link, useNavigate, useLocation } from "react-router";
import { useState, useEffect } from "react";
import api from "../api/axios";

export default function Navbar() {
    const navigate = useNavigate();
    useLocation(); // re-render on route change so login/logout state updates
    const [cartCount, setCartCount] = useState(0);
    const userId = localStorage.getItem("userId");

    useEffect(() => {
        const loadCart = async () => {
            if (!userId) {
                setCartCount(0);
                return;
            }
            try {
                const res = await api.get(`/cart/${userId}`);
                const items = res.data.cart?.items || [];
                const total = items.reduce((sum, item) => sum + item.quantity, 0);
                setCartCount(total);
            } catch (err) {
                console.error(err);
                setCartCount(0);
            }
        };

        loadCart();
        window.addEventListener("cartUpdated", loadCart);

        return () => {
            window.removeEventListener("cartUpdated", loadCart);
        };
    }, [userId]);

    const logout = () => {
        localStorage.clear();
        setCartCount(0);
        navigate("/login");
    };

    return (
        <nav className="flex justify-between p-4 shadow">
            <Link to="/" className="text-xl font-bold">NJ Store</Link>

            <div className="flex gap-4 items-center">
                <Link to="/cart" className="relative text-xl">
                    🛒
                    {cartCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-600 text-white rounded px-1 text-xs">
                            {cartCount}
                        </span>
                    )}
                </Link>

                {!userId ? (
                    <>
                        <Link to="/login" className="text-lg">Login</Link>
                        <Link to="/signup" className="text-lg">Sign Up</Link>
                    </>
                ) : (
                    <button onClick={logout} className="text-lg">Logout</button>
                )}
            </div>
        </nav>
    );
}