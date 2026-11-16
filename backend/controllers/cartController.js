import Cart from "../models/Cart.js";

//Add item to cart
export const addToCart = async (req, res) => {
    try {
        const { userId, productId } = req.body;

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({ userId, items: [{ productId, quantity: 1 }] });
        } else {
            const item = cart.items.find(
                (i) => i.productId.toString() === productId
            );

            if (item) {
                item.quantity += 1;
            } else {
                cart.items.push({ productId, quantity: 1 });
            }
        }

        await cart.save();
        res.json({ message: "Item added to cart successfully", cart });
    } catch (error) {
        res.status(500).json({ message: "Failed to add item to cart", error: error.message });
    }
};


//Remove item from cart
export const removeItem = async (req, res) => {
    try {
        const { userId, productId } = req.body;

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        cart.items = cart.items.filter(item => item.productId.toString() !== productId);
        await cart.save();
        res.json({ message: "Item removed from cart successfully", cart });
    } catch (error) {
        res.status(500).json({ message: "Failed to remove item from cart", error: error.message });
    }
};

//Update item in Cart

export const updateQuantity = async (req, res) => {
    try {
        const { userId, productId, quantity } = req.body;

        if (!Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({ message: "Quantity must be a whole number of at least 1" });
        }

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        const item = cart.items.find((i) => i.productId.toString() === productId);
        if (!item) {
            return res.status(404).json({ message: "Item not found in cart" });
        }

        item.quantity = quantity;

        await cart.save();
        res.json({ message: "Item quantity updated successfully", cart });
    } catch (error) {
        res.status(500).json({ message: "Failed to update item quantity", error: error.message });
    }
};

//Get cart by userId
export const getCart = async (req, res) => {
    try {
      const { userId } = req.params;

      const cart = await Cart.findOne({ userId }).populate("items.productId");
       
      res.json({ message: "Cart retrieved successfully", cart });
    } catch (error) {
        res.status(500).json({ message: "Failed to get cart", error: error.message });
    }
};