import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors'; // For cross-origin resource sharing
import helmet from 'helmet'; // For setting security-related HTTP headers
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import userInfoRoutes from './routes/userInfoRoutes.js'; 
import productRoutes from './routes/product.js';
import cartRoutes from './routes/cartRoutes.js';  
import orderRoutes from './routes/orderRoutes.js'; 

dotenv.config();

const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable cross-origin requests
app.use(express.json()); // Parse incoming JSON payloads

// MongoDB connection (no deprecated options)
const mongoURI = process.env.MONGODB_URI;
mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.log('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/userinfo', userInfoRoutes); 
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/order', orderRoutes);

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('SIGINT signal received. Closing MongoDB connection and exiting...');
  await mongoose.connection.close();
  process.exit(0);
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
