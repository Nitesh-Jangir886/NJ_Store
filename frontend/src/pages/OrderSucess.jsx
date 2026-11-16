import { Link, useParams } from "react-router";

export default function OrderSuccess() {
    const { id } = useParams();

    return (
        <div className="min-h-[70vh] flex items-center justify-center px-4">
            <div className="bg-white shadow-md rounded-lg p-8 max-w-md w-full text-center">
                <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl text-green-600">
                    ✓
                </div>

                <h1 className="text-2xl font-bold text-green-600">
                    Order Placed Successfully
                </h1>

                <p className="mt-4 text-gray-600">Your Order ID</p>
                <p className="font-semibold break-all">{id}</p>

                <Link
                    to="/"
                    className="inline-block mt-6 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
                >
                    Continue Shopping
                </Link>
            </div>
        </div>
    );
}