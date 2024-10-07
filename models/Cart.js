import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  products: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true, default: 1 },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

// Virtual field to calculate total price for each product
cartSchema.virtual('products.totalPrice').get(function () {
  if (this.productId && this.quantity && this.productId.unitPrice) {
    return this.quantity * this.productId.unitPrice;
  }
  return 0;
});

// Ensure virtual fields are serialized
cartSchema.set('toObject', { virtuals: true });
cartSchema.set('toJSON', { virtuals: true });

const Cart = mongoose.model('Cart', cartSchema);
export default Cart;
