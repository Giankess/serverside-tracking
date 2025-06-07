import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { products } from '../../data/products';
import { useTracking } from '../../hooks/useTracking';
import { ArrowLeftIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';

export default function ProductDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { trackPageView, trackEvent } = useTracking();
  const [quantity, setQuantity] = useState(1);

  const product = products.find(p => p.id === id);

  useEffect(() => {
    if (product) {
      trackPageView({
        page: `/product/${product.id}`,
        title: `${product.name} - Test Shop`
      });
    }
  }, [product]);

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Product not found</h1>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    trackEvent({
      eventName: 'add_to_cart',
      properties: {
        product_id: product.id,
        product_name: product.name,
        price: product.price,
        quantity: quantity
      }
    });
    // In a real app, this would update the cart state
    alert('Product added to cart!');
  };

  const handlePurchase = () => {
    trackEvent({
      eventName: 'purchase',
      properties: {
        transaction_id: `T_${Date.now()}`,
        value: product.price * quantity,
        currency: 'USD',
        items: [{
          itemId: product.id,
          itemName: product.name,
          price: product.price,
          quantity: quantity
        }]
      }
    });
    // In a real app, this would process the purchase
    alert('Purchase successful!');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <button
              onClick={() => router.push('/')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Back to Products
            </button>
            <button className="p-2 rounded-full hover:bg-gray-100">
              <ShoppingCartIcon className="h-6 w-6 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="md:flex">
            <div className="md:flex-shrink-0">
              <div className="h-48 w-full md:w-48 bg-gray-200 flex items-center justify-center">
                {/* Placeholder for product image */}
                <div className="text-gray-500">{product.name}</div>
              </div>
            </div>
            <div className="p-8">
              <div className="uppercase tracking-wide text-sm text-indigo-500 font-semibold">
                {product.category}
              </div>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">
                {product.name}
              </h1>
              <p className="mt-3 text-gray-600">{product.description}</p>
              <div className="mt-4">
                <span className="text-3xl font-bold text-gray-900">
                  ${product.price}
                </span>
              </div>
              <div className="mt-6">
                <div className="flex items-center space-x-4">
                  <label htmlFor="quantity" className="text-gray-700">
                    Quantity:
                  </label>
                  <select
                    id="quantity"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  >
                    {[1, 2, 3, 4, 5].map((num) => (
                      <option key={num} value={num}>
                        {num}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-6 space-x-4">
                  <button
                    onClick={handleAddToCart}
                    className="px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-md hover:bg-blue-500"
                  >
                    Add to Cart
                  </button>
                  <button
                    onClick={handlePurchase}
                    className="px-6 py-3 text-base font-medium text-white bg-green-600 rounded-md hover:bg-green-500"
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 