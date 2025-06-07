import { products } from '../../../data/products.js';

export default function handler(req, res) {
  if (req.method === 'GET') {
    // Simulate API delay
    setTimeout(() => {
      res.status(200).json(products);
    }, 500);
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
} 