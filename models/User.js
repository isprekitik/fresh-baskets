import mongoose from 'mongoose';

// Define the user schema
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  firstName: {
    type: String,
  },
  lastName: {
    type: String,
  },
  contactNumber: {
    type: String,
  },
  address: {
    type: String,
  },
  role: {
    type: String,
    enum: ['buyer', 'seller', 'both'],
  },
  businessName: {
    type: String,
    required: function() {
      return this.role === 'seller' || this.role === 'both';
    },
  },
  isEmailVerified: {
    type: Boolean,
    default: false, // Defaults to false until email is verified
  },
  emailVerificationToken: {
    type: String, // Store the token sent for verification
  },
  registrationDate: {
    type: Date,
    default: Date.now, // Store the date the user registered
  },
});

// Check if the model is already compiled to avoid overwriting
const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
