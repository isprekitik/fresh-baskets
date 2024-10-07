import express from 'express';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import authMiddleware from '../middleware/authMiddleware.js';  // Import auth middleware

const router = express.Router();

// Add a product to the cart (protected route)
router.post('/', authMiddleware, async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.userId;  // Extract user ID from JWT token

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, products: [] });
    }

    const productIndex = cart.products.findIndex(item => item.productId.equals(productId));
    if (productIndex > -1) {
      cart.products[productIndex].quantity += quantity;
    } else {
      cart.products.push({ productId, quantity });
    }

    await cart.save();
    res.status(200).json(cart);
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get cart for the user (protected route)
router.get('/', authMiddleware, async (req, res) => {
  const userId = req.userId;  // Extract user ID from JWT token

  try {
    const cart = await Cart.findOne({ userId })
      .populate({
        path: 'products.productId',
        select: 'name unitPrice description',  // Select the fields you need from Product
      })
      .populate({
        path: 'userId',
        select: 'firstName lastName',  // Get user's first and last name
      });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Add computed fields for each product (total price per product)
    const cartWithComputedFields = {
      ...cart.toObject(),
      products: cart.products.map(product => ({
        ...product,
        totalPrice: product.quantity * product.productId.unitPrice,
      })),
    };

    res.status(200).json(cartWithComputedFields);
  } catch (error) {
    console.error('Error fetching cart:', error); // Logging for debugging
    res.status(500).json({ message: 'Server error', error });
  }
});

// Remove a product from the cart (protected route)
router.delete('/:productId', authMiddleware, async (req, res) => {
  const userId = req.userId;  // Extract user ID from JWT token
  const { productId } = req.params;

  try {
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.products = cart.products.filter(item => !item.productId.equals(productId));
    await cart.save();
    res.status(200).json(cart);
  } catch (error) {
    console.error('Error removing from cart:', error); // Logging for debugging
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;
