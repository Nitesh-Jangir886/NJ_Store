import Product from '../models/product.js';

//Create a new product
export const createProduct = async (req, res) => {
    try {
        const newProduct = await Product.create(req.body);
        res.json({
            message: 'Product created successfully',
            product: newProduct,
        })
    } catch (error) {
       console.error("CREATE PRODUCT ERROR:", error);
       res.status(500).json({
        message: 'Server Error',
        error: error.message
       })
    }
};

//Get all products
export const getProducts = async (req, res) => {
    try {
        const { search, category } = req.query;

        const filter = {};

        if (search && search.trim()) {
            // escape special regex characters so symbols don't break the search
            const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

            filter.$or = [
                { title: { $regex: safeSearch, $options: "i" } },
                { description: { $regex: safeSearch, $options: "i" } },
                { category: { $regex: safeSearch, $options: "i" } },
            ];
        }

        if (category) {
            // case-insensitive exact match, so "phones" and "Phones" both work
            filter.category = { $regex: `^${category}$`, $options: "i" };
        }

        const products = await Product.find(filter).sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

//Update a product
export const updateProduct = async (req, res) => {
    try {
      const updated = await Product.findByIdAndUpdate(
        req.params.id,
         req.body,
        { new: true }
        );
      res.json({
        message: 'Product updated successfully',
        updated,
        
      });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

//Delete a product
export const deleteProduct = async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

