import express from 'express';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import authMiddleware from '../middleware/authMiddleware.js';  // Import auth middleware

const router = express.Router();

// Place an order (protected route)
router.post('/order', authMiddleware, async (req, res) => {
  const userId = req.user.userId;  // Extract user ID from JWT token
  const { totalAmount } = req.body;

  try {
    const cart = await Cart.findOne({ userId }).populate('products.productId');
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const order = new Order({
      userId,
      products: cart.products,
      totalAmount,
    });

    await order.save();

    await Cart.findOneAndDelete({ userId });

    res.status(201).json({ message: 'Order placed successfully', order });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get all orders for a user (protected route)
router.get('/orders', authMiddleware, async (req, res) => {
  const userId = req.user.userId;  // Extract user ID from JWT token

  try {
    const orders = await Order.find({ userId }).populate('products.productId');
    if (!orders.length) {
      return res.status(404).json({ message: 'No orders found' });
    }
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;
