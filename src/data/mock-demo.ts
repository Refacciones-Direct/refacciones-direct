export interface MockProduct {
  id: string;
  name: string;
  brand: string;
  partNumber: string;
  sku: string;
  price: number;
  currency: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  category: string;
  categorySlug: string;
  description: string;
  specifications: { label: string; value: string }[];
  fitmentVehicles: string[];
}

export interface MockCartItem {
  product: MockProduct;
  quantity: number;
}

export interface MockOrder {
  id: string;
  date: string;
  status: 'processing' | 'shipped' | 'delivered';
  items: { product: MockProduct; quantity: number }[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  deliveryMethod: string;
}

export const MOCK_PRODUCTS: MockProduct[] = [
  {
    id: 'brake-pad-001',
    name: 'Pastillas de Freno Cerámicas Delanteras',
    brand: 'DURALAST',
    partNumber: 'DLP-2045',
    sku: 'BRK-CER-045',
    price: 849.0,
    currency: 'MXN',
    rating: 4.5,
    reviewCount: 128,
    inStock: true,
    category: 'Frenado',
    categorySlug: 'frenado',
    description:
      'Kit de pastillas de freno cerámicas de alto rendimiento. Diseñadas para ofrecer frenado superior con mínimo polvo y ruido. Incluye hardware de instalación.',
    specifications: [
      { label: 'Material', value: 'Cerámica avanzada' },
      { label: 'Posición', value: 'Delanteras' },
      { label: 'Incluye', value: 'Hardware de instalación' },
      { label: 'Garantía', value: '3 años / 60,000 km' },
      { label: 'Peso', value: '1.8 kg' },
      { label: 'País de origen', value: 'México' },
    ],
    fitmentVehicles: [
      '2019 Honda Civic EX',
      '2018-2022 Honda Civic',
      '2019-2023 Honda CR-V',
      '2018-2022 Acura ILX',
    ],
  },
  {
    id: 'rotor-001',
    name: 'Rotor de Freno Ventilado Delantero',
    brand: 'DURALAST',
    partNumber: 'DLR-3078',
    sku: 'BRK-ROT-078',
    price: 629.0,
    currency: 'MXN',
    rating: 4.7,
    reviewCount: 89,
    inStock: true,
    category: 'Frenado',
    categorySlug: 'frenado',
    description:
      'Rotor de freno ventilado de alta calidad. Diseño optimizado para disipación de calor y frenado consistente.',
    specifications: [
      { label: 'Tipo', value: 'Ventilado' },
      { label: 'Posición', value: 'Delantero' },
      { label: 'Diámetro', value: '282 mm' },
      { label: 'Garantía', value: '2 años / 40,000 km' },
      { label: 'Peso', value: '5.2 kg' },
      { label: 'País de origen', value: 'México' },
    ],
    fitmentVehicles: ['2019 Honda Civic EX', '2018-2022 Honda Civic', '2019-2023 Honda CR-V'],
  },
];

export const MOCK_CART: {
  items: MockCartItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
} = {
  items: [
    { product: MOCK_PRODUCTS[0], quantity: 1 },
    { product: MOCK_PRODUCTS[1], quantity: 1 },
  ],
  subtotal: 1478.0,
  shipping: 0,
  tax: 236.48,
  total: 1714.48,
};

export const MOCK_SHIPPING_ADDRESS = {
  name: 'Juan García López',
  street: 'Av. Revolución 1425, Col. Mixcoac',
  city: 'Ciudad de México',
  state: 'CDMX',
  zip: '03910',
  phone: '+52 55 1234 5678',
};

export const MOCK_ORDERS: MockOrder[] = [
  {
    id: 'RD-20260305-001',
    date: '5 de marzo, 2026',
    status: 'delivered',
    items: [
      { product: MOCK_PRODUCTS[0], quantity: 1 },
      { product: MOCK_PRODUCTS[1], quantity: 1 },
    ],
    subtotal: 1478.0,
    shipping: 0,
    tax: 236.48,
    total: 1714.48,
    deliveryMethod: 'Envío estándar',
  },
  {
    id: 'RD-20260302-003',
    date: '2 de marzo, 2026',
    status: 'processing',
    items: [{ product: MOCK_PRODUCTS[0], quantity: 2 }],
    subtotal: 1698.0,
    shipping: 0,
    tax: 271.68,
    total: 1969.68,
    deliveryMethod: 'Envío estándar',
  },
];

export function formatPrice(price: number, currency = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(price);
}
