const { products } = require('../../../data/products.js');
const { logger } = require('../../../utils/logger.js');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    if (!products || !Array.isArray(products)) {
      logger.error('Products data is not properly initialized');
      return res.status(500).json({ 
        error: 'Products data is not available',
        success: false
      });
    }

    logger.info('Successfully fetched products');
    return res.status(200).json({ 
      products,
      success: true
    });
  } catch (error) {
    logger.error('Error fetching products:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch products',
      success: false
    });
  }
}

module.exports = handler; 