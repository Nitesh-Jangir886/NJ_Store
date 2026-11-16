import express from 'express';
import {
    createProduct, 
    getProducts,
    updateProduct,
    deleteProduct
} from '../controllers/productController.js';

const router = express.Router();

//Routes to create a new product
router.post('/add', createProduct);

//Routes to get all products
router.get('/', getProducts);

//Routes to update a product by id
router.put('/update/:id', updateProduct);

//Routes to delete a product by id
router.delete('/delete/:id', deleteProduct);

export default router;