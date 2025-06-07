import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { products } from '../data/products';
import { useTracking } from '../hooks/useTracking';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';

export default function Home() {
  const router = useRouter();
  const { trackPageView, trackEvent } = useTracking();

  useEffect(() => {
    // Track page view
    trackPageView({
      page: '/',
      title: 'Home - Test Shop'
    });
  }, []);

  const handleProductClick = (product: typeof products[0]) => {
    trackEvent({
      eventName: 'product_click',
      properties: {
        product_id: product.id,
        product_name: product.name,
        product_price: product.price,
        product_category: product.category
      }
    });
    router.push(`/product/${product.id}`);
  };

  const handleAddToCart = (product: typeof products[0]) => {
    trackEvent({
      eventName: 'add_to_cart',
      properties: {
        product_id: product.id,
        product_name: product.name,
        price: product.price,
        quantity: 1
      }
    });
    // In a real app, this would update the cart state
    alert('Product added to cart!');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Test Shop</h1>
            <button className="p-2 rounded-full hover:bg-gray-100">
              <ShoppingCartIcon className="h-6 w-6 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              <div className="h-48 bg-gray-200">
                {/* Placeholder for product image */}
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  {product.name}
                </div>
              </div>
              <div className="p-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {product.name}
                </h2>
                <p className="mt-1 text-gray-500">{product.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-2xl font-bold text-gray-900">
                    ${product.price}
                  </span>
                  <div className="space-x-2">
                    <button
                      onClick={() => handleProductClick(product)}
                      className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-500"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-500"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
} 