import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { sendEmail } from '../utils/sendEmail.js';

const router = express.Router();

// Helper function to handle errors
const handleErrors = (res, status, message) => {
    res.status(status).json({ msg: message });
};

// Get User Info (GET)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const user = await User.findOne({
            _id: req.userId,
            isDeleted: false,
        }).select('email firstName lastName contactNumber address role businessName');

        if (!user) {
            return handleErrors(res, 404, 'User not found');
        }

        res.json(user);
    } catch (error) {
        console.error(error.message);
        handleErrors(res, 500, 'Server error');
    }
});

// Update User Info (PUT)
router.put('/', authMiddleware, [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('contactNumber').notEmpty().withMessage('Contact number is required'),
    body('address').notEmpty().withMessage('Address is required'),
    body('role').isIn(['buyer', 'seller', 'both']).withMessage('Invalid role'),
    body('businessName').custom((value, { req }) => {
        if ((req.body.role === 'seller' || req.body.role === 'both') && !value) {
            throw new Error('Business name is required for sellers');
        }
        return true;
    }),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, contactNumber, address, role, businessName } = req.body;

    try {
        const user = await User.findOne({ _id: req.userId, isDeleted: false });
        if (!user) {
            return handleErrors(res, 404, 'User not found');
        }

        // Update user info
        user.firstName = firstName;
        user.lastName = lastName;
        user.contactNumber = contactNumber;
        user.address = address;
        user.role = role;
        user.businessName = (role === 'seller' || role === 'both') ? businessName : null;

        await user.save();

        // Send email notification
        await sendEmail(user.email, 'User Info Updated', 'Your user information has been successfully updated.');

        // Respond with a redirect to the account homepage
        res.json({ msg: 'User info updated successfully', redirectTo: '/account' });
    } catch (error) {
        console.error(error.message);
        handleErrors(res, 500, 'Server error');
    }
});

export default router;
