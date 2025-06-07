const { products } = require('../../../data/products.js');
const { logger } = require('../../../utils/logger.js');

async function handler(req, res) {
  // Set proper headers
  res.setHeader('Content-Type', 'application/json');
  
  try {
    logger.info('Products API called');
    
    if (req.method !== 'GET') {
      logger.warn('Invalid method:', req.method);
      return res.status(405).json({ 
        success: false,
        error: 'Method not allowed' 
      });
    }

    // Ensure products data is available
    if (!products) {
      logger.error('Products data is undefined');
      return res.status(500).json({ 
        success: false,
        error: 'Products data is not available'
      });
    }

    // Ensure products is an array
    if (!Array.isArray(products)) {
      logger.error('Products data is not an array:', typeof products);
      return res.status(500).json({ 
        success: false,
        error: 'Invalid products data format'
      });
    }

    logger.info('Successfully fetched products', { count: products.length });
    
    return res.status(200).json({ 
      success: true,
      products
    });
  } catch (error) {
    logger.error('Error in products API:', error);
    return res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}

// Export the handler using CommonJS
module.exports = handler; 