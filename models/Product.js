import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    businessName: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    description: { type: String },
    category: { 
        type: String, 
        enum: ['gulay', 'prutas', 'dairy & eggs', 'herbs & spices', 'organic snacks', 'meat', 'fish', 'clothes', 'household items'],
        required: true 
    },
    image: { type: String },
    dateOfUpload: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false }
});

const Product = mongoose.model('Product', productSchema);
export default Product;