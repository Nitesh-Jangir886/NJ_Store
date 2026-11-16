import { useState } from "react";
import { useNavigate } from "react-router";
import api from "../api/axios";

export default function CheckoutAddress() {
    const userId = localStorage.getItem("userId");
    const navigate = useNavigate();

    const [form, setForm] = useState({
        fullName: "",
        phone: "",
        addressLine: "",
        city: "",
        state: "",
        pincode: "",
    });

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const saveAddress = async (e) => {
        e.preventDefault();

        if (!userId) {
            alert("Please login first.");
            return;
        }

        try {
            await api.post("/address/add", { ...form, userId });
            navigate("/checkout");
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Failed to save address.");
        }
    };

    return (
        <div className="max-w-xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Add Address</h1>

            <form onSubmit={saveAddress}>
                {Object.keys(form).map((key) => (
                    <input
                        key={key}
                        name={key}
                        value={form[key]}
                        placeholder={key}
                        onChange={handleChange}
                        required
                        className="w-full p-2 border border-gray-300 rounded mb-4"
                    />
                ))}

                <button
                    type="submit"
                    className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                >
                    Save Address
                </button>
            </form>
        </div>
    );
}