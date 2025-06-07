export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
}

export const products: Product[] = [
  {
    id: '1',
    name: 'Wireless Headphones',
    description: 'High-quality wireless headphones with noise cancellation',
    price: 199.99,
    image: '/images/headphones.jpg',
    category: 'Electronics'
  },
  {
    id: '2',
    name: 'Smart Watch',
    description: 'Feature-rich smartwatch with health tracking',
    price: 299.99,
    image: '/images/smartwatch.jpg',
    category: 'Electronics'
  },
  {
    id: '3',
    name: 'Running Shoes',
    description: 'Comfortable running shoes for all terrains',
    price: 89.99,
    image: '/images/shoes.jpg',
    category: 'Sports'
  },
  {
    id: '4',
    name: 'Yoga Mat',
    description: 'Premium yoga mat with carrying strap',
    price: 29.99,
    image: '/images/yoga-mat.jpg',
    category: 'Sports'
  },
  {
    id: '5',
    name: 'Coffee Maker',
    description: 'Programmable coffee maker with thermal carafe',
    price: 79.99,
    image: '/images/coffee-maker.jpg',
    category: 'Home'
  },
  {
    id: '6',
    name: 'Blender',
    description: 'High-powered blender for smoothies and more',
    price: 59.99,
    image: '/images/blender.jpg',
    category: 'Home'
  }
]; 