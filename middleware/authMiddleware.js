import jwt from 'jsonwebtoken';

// Middleware to check the JWT token
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1]; // Extract token from the Authorization header

  if (!token) {
    console.log('No token provided'); // Logging for debugging
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify token using the secret key
    req.userId = decoded.userId; // Assign userId to request object
    console.log('Token verified successfully:', req.userId); // Logging for debugging
    next(); // Move to next middleware or route handler
  } catch (err) {
    console.error('Token verification failed:', err); // Logging for debugging
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

export default authMiddleware;
