const { products } = require('../../../data/products.js');
const { logger } = require('../../../utils/logger.js');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    if (!products || !Array.isArray(products)) {
      throw new Error('Products data is not properly initialized');
    }
    
    logger.info('Fetching all products');
    return res.status(200).json(products);
  } catch (error) {
    logger.error('Error fetching products:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch products',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

module.exports = handler; 