import {useEffect, useState} from "react";
import api from "../api/axios";
import {useNavigate, useParams} from "react-router";

export default function EditProduct() {
    const { id } = useParams();
    const [form, setForm] = useState({
        title: "",
        description: "",
        price: "",
        image: "",
        category: "",
        stock: "",
    });

     const navigate = useNavigate();

    const allowedFields = ["title", "description", "price", "image", "category", "stock"];

    const loadProduct = async () => {
        const res = await api.get(`/products`);
        const product = res.data.find((p) => p._id === id);
        setForm(product)
    }

    useEffect(() => {
       loadProduct();
    }, []);
    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) =>{
        e.preventDefault();
        await api.put(`/products/update/${id}`, form);
        alert("Product updated successfully!");
        navigate("/admin/products");
    }

    return (
         <div className="max-w-lg mx-auto mt-10 p-6 bg-white rounded shadow">
            <h2 className="text-2xl font-bold mb-6">Edit Product</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              {
                allowedFields.map((key) => (
                    allowedFields.includes(key) &&
                    <input
                    key={key}
                    name={key}
                    value={form[key]}
                    onChange={handleChange}
                    placeholder={key}
                    className="w-full p-2 border border-gray-300 rounded"
                    />
                ))
                }

                <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">
                    Update Product 
                    </button>
            </form>
        </div>
    )
}