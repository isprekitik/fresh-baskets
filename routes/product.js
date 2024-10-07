import express from 'express';
import multer from 'multer';
import { check, validationResult } from 'express-validator';
import Product from '../models/Product.js';
import { sendEmail } from '../utils/sendEmail.js';
import User from '../models/User.js'; // Import User model
import authMiddleware from '../middleware/authMiddleware.js'; // Import your auth middleware

const router = express.Router();

// Multer setup for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Create a new product
router.post('/', authMiddleware, upload.single('image'), [
    check('name').notEmpty(),
    check('quantity').isNumeric(),
    check('unitPrice').isNumeric(),
    check('category').isIn(['gulay', 'prutas', 'dairy & eggs', 'herbs & spices', 'organic snacks', 'meat', 'fish', 'clothes', 'household items'])
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        // Get the user info using req.userId from the token
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const { name, quantity, unitPrice, description, category } = req.body;
        const image = req.file ? req.file.path : null;

        // Create the new product using user info
        const product = new Product({
            name,
            quantity,
            unitPrice,
            description,
            category,
            image,
            userId: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            businessName: user.businessName
        });

        await product.save();

        // Send email notification
        await sendEmail(user.email, 'Product Added Successfully', `Product ${name} has been added successfully.`);

        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update an existing product
router.put('/:id', authMiddleware, upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { name, quantity, unitPrice, description, category } = req.body;
    const image = req.file ? req.file.path : null;

    try {
        const product = await Product.findById(id);
        if (!product || product.isDeleted) return res.status(404).json({ error: 'Product not found' });

        // Fetch user info from req.userId
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        product.name = name || product.name;
        product.quantity = quantity || product.quantity;
        product.unitPrice = unitPrice || product.unitPrice;
        product.description = description || product.description;
        product.category = category || product.category;
        product.image = image || product.image;

        await product.save();

        // Send email notification
        await sendEmail(user.email, 'Product Updated', `Product ${product.name} has been updated.`);

        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Soft delete a product
router.delete('/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;

    try {
        const product = await Product.findById(id);
        if (!product || product.isDeleted) return res.status(404).json({ error: 'Product not found' });

        // Fetch user info from req.userId
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        product.isDeleted = true;
        await product.save();

        // Send email notification
        await sendEmail(user.email, 'Product Deleted', `Product ${product.name} has been deleted.`);

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Search products by category, name, or business name
router.get('/search', async (req, res) => {
    const { category, name, businessName } = req.query;

    try {
        const products = await Product.find({
            isDeleted: false,
            $or: [
                { category: new RegExp(category, 'i') },
                { name: new RegExp(name, 'i') },
                { businessName: new RegExp(businessName, 'i') }
            ]
        });

        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Decrease product quantity on order
router.post('/:id/order', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { orderQuantity } = req.body;

    try {
        const product = await Product.findById(id);
        if (!product || product.isDeleted) return res.status(404).json({ error: 'Product not found' });

        if (product.quantity < orderQuantity) return res.status(400).json({ error: 'Insufficient quantity' });

        product.quantity -= orderQuantity;
        await product.save();

        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all products
router.get('/', async (req, res) => {
    try {
        const products = await Product.find({ isDeleted: false });
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
