const { logger } = require('../utils/logger.js');

// Define products array
const products = [
  {
    id: '1',
    name: 'Wireless Headphones',
    description: 'High-quality wireless headphones with noise cancellation',
    price: 199.99,
    image: 'https://placehold.co/600x400/2563eb/ffffff?text=Wireless+Headphones',
    category: 'Electronics'
  },
  {
    id: '2',
    name: 'Smart Watch',
    description: 'Feature-rich smartwatch with health tracking',
    price: 299.99,
    image: 'https://placehold.co/600x400/2563eb/ffffff?text=Smart+Watch',
    category: 'Electronics'
  },
  {
    id: '3',
    name: 'Running Shoes',
    description: 'Comfortable running shoes for all terrains',
    price: 89.99,
    image: 'https://placehold.co/600x400/2563eb/ffffff?text=Running+Shoes',
    category: 'Sports'
  },
  {
    id: '4',
    name: 'Yoga Mat',
    description: 'Premium yoga mat with carrying strap',
    price: 29.99,
    image: 'https://placehold.co/600x400/2563eb/ffffff?text=Yoga+Mat',
    category: 'Sports'
  },
  {
    id: '5',
    name: 'Coffee Maker',
    description: 'Programmable coffee maker with thermal carafe',
    price: 79.99,
    image: 'https://placehold.co/600x400/2563eb/ffffff?text=Coffee+Maker',
    category: 'Home'
  },
  {
    id: '6',
    name: 'Blender',
    description: 'High-powered blender for smoothies and more',
    price: 59.99,
    image: 'https://placehold.co/600x400/2563eb/ffffff?text=Blender',
    category: 'Home'
  }
];

// Validate products data
if (!Array.isArray(products)) {
  logger.error('Products data is not an array');
  throw new Error('Invalid products data format');
}

if (products.length === 0) {
  logger.warn('Products array is empty');
}

logger.info('Products data loaded', { count: products.length });

// Export products
module.exports = { products }; 