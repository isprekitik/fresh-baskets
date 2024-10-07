// routes/authRoutes.js

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { check, validationResult } from 'express-validator';
import User from '../models/User.js';
import authMiddleware from '../middleware/authMiddleware.js'; 
import { sendEmail } from '../utils/sendEmail.js'; 
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// User Signup with Email Verification and Success Email
router.post(
  '/signup',
  [
    check('email', 'Please provide a valid email').isEmail(),
    check('password', 'Password must be 8 or more characters and include uppercase and lowercase')
      .matches(/^(?=.*[a-z])(?=.*[A-Z]).{8,}$/),
    check('confirmPassword', 'Confirm Password is required').exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({ msg: 'Passwords do not match' });
    }

    try {
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ msg: 'User already exists' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create verification token
      const verificationToken = jwt.sign({ email }, process.env.JWT_EMAIL_SECRET, { expiresIn: '1d' });

      user = new User({
        email,
        password: hashedPassword,
        isDeleted: false,
        isVerified: false,
        verificationToken,
      });

      await user.save();

      // Send verification email
      const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;
      await sendEmail(email, 'Email Verification', `Please verify your email by clicking this link: ${verificationUrl}`);

      await sendEmail(email, 'Registration Successful', `Thank you for registering, ${email}. Please verify your email.`);

      res.status(201).json({ 
        msg: 'User registered successfully, please verify your email', 
        redirectTo: '/login',
        token: verificationToken 
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).send('Server error');
    }
  }
);

// Verify Email Endpoint
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;

  try {
    // Verify the token using JWT
    const decoded = jwt.verify(token, process.env.JWT_EMAIL_SECRET); // Make sure JWT_EMAIL_SECRET is defined in your .env file

    const user = await User.findOne({ email: decoded.email });

    if (!user) {
      return res.status(400).json({ msg: 'User not found or invalid token' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ msg: 'Email already verified' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null; 

    await user.save(); 

    res.json({ msg: 'Email verified successfully' });
  } catch (error) {
    console.error(error.message);
    return res.status(400).json({ msg: 'Invalid or expired token' });
  }
});

// User Login with Email Verification Check
router.post(
  '/login',
  [
    check('email', 'Please provide a valid email').isEmail(),
    check('password', 'Password is required').exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      let user = await User.findOne({ email, isDeleted: false });

      if (!user) {
        return res.status(400).json({ msg: 'Invalid credentials' });
      }

      if (user.isDeleted) {
        return res.status(400).json({ msg: 'Your account has been deleted' });
      }

      if (!user.isEmailVerified) {
        return res.status(403).json({ msg: 'Please verify your email first' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ msg: 'Invalid credentials' });
      }

      const payload = {
        userId: user._id,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

      res.json({
        token,
        redirectTo: '/userinfo',
        user: {
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).send('Server error');
    }
  }
);


// Get User Account (Protected)
router.get('/account', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password').where('isDeleted').equals(false);

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});

// Soft Delete User (Protected)
router.delete('/account', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    user.isDeleted = true;
    await user.save();

    // Send account deletion email notification
    await sendEmail(user.email, 'Account Deletion', `Dear ${user.email}, your account has been successfully deleted. If this was not intended, please contact support.`);

    res.json({ msg: 'User deleted successfully and email notification sent' });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
});
// Change Password (Protected)
router.put(
  '/account/change-password',
  [
    authMiddleware,
    check('currentPassword', 'Current password is required').exists(),
    check('newPassword', 'New password must be 8 or more characters and include uppercase and lowercase')
      .matches(/^(?=.*[a-z])(?=.*[A-Z]).{8,}$/),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    try {
      const user = await User.findById(req.userId);

      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ msg: 'Current password is incorrect' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      user.password = hashedPassword;
      await user.save();

      res.json({ msg: 'Password updated successfully' });
    } catch (error) {
      console.error(error.message);
      res.status(500).send('Server error');
    }
  }
);

// Logout User (Protected)
router.post('/logout', authMiddleware, (req, res) => {
  res.json({ msg: 'Logout successful' });
});

export default router;
