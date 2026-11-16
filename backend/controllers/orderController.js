import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import Product from "../models/product.js";

export const placeOrder = async (req, res) => {
  try {
    const { userId, address } = req.body;

    if (!userId || !address) {
      return res.status(400).json({ message: "userId and address are required" });
    }

    // Get cart and ignore products that were deleted
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    const cartItems = cart ? cart.items.filter((i) => i.productId) : [];

    if (cartItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Check stock before doing anything
    for (const item of cartItems) {
      if (item.productId.stock < item.quantity) {
        return res.status(400).json({
          message: `Not enough stock for "${item.productId.title}". Available: ${item.productId.stock}`,
        });
      }
    }

    // Prepare order items
    const orderItems = cartItems.map((item) => ({
      productId: item.productId._id,
      quantity: item.quantity,
      price: item.productId.price,
    }));

    // Calculate total
    const totalAmount = orderItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );

    // Create order first
    const order = await Order.create({
      userId,
      items: orderItems,
      address,
      totalAmount,
      paymentMethod: "COD",
    });

    // Then deduct stock
    for (const item of cartItems) {
      await Product.findByIdAndUpdate(item.productId._id, {
        $inc: { stock: -item.quantity },
      });
    }

    // Clear cart
    await Cart.findOneAndUpdate({ userId }, { items: [] });

    res.status(201).json({
      message: "Order placed successfully",
      orderId: order._id,
    });
  } catch (error) {
    console.error("PLACE ORDER ERROR:", error);
    res.status(500).json({ message: "Failed to place order", error: error.message });
  }
};