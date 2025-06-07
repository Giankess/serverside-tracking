const { useTracking } = require('../hooks/useTracking.js');

function Header() {
  const { trackEvent } = useTracking();

  const handleLogoClick = () => {
    trackEvent('logo_click', {
      location: 'header'
    });
  };

  const handleCartClick = () => {
    trackEvent('cart_click', {
      location: 'header'
    });
  };

  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
            <a href="/" onClick={handleLogoClick} className="text-xl font-bold text-gray-800">
              E-Commerce Store
            </a>
          </div>
          <nav className="flex space-x-8">
            <a href="/" className="text-gray-600 hover:text-gray-900">
              Home
            </a>
            <a href="/products" className="text-gray-600 hover:text-gray-900">
              Products
            </a>
            <a href="/cart" onClick={handleCartClick} className="text-gray-600 hover:text-gray-900">
              Cart
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}

module.exports = { Header }; 