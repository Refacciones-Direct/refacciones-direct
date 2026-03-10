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
  imageUrl?: string;
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

export const MOCK_CATEGORIES = [
  { slug: 'frenado', name: 'Frenado', key: 'cat6' },
  { slug: 'filtros', name: 'Filtros y aceite', key: 'cat2' },
  { slug: 'motor', name: 'Piezas de motor', key: 'cat1' },
  { slug: 'arranque', name: 'Arranque y carga', key: 'cat4' },
  { slug: 'opticas', name: 'Ópticas / Faros', key: 'cat5' },
  { slug: 'suspension', name: 'Dirección - Suspensión', key: 'cat3' },
] as const;

export const MOCK_PRODUCTS: MockProduct[] = [
  // --- Frenado (3) ---
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
    imageUrl: '/images/brakepads.jpg',
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
    imageUrl: '/images/brake disc.jpg',
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
  {
    id: 'brake-fluid-001',
    name: 'Líquido de Frenos DOT 4 Sintético',
    brand: 'CASTROL',
    partNumber: 'CST-BF4-500',
    sku: 'BRK-FLD-001',
    price: 189.0,
    currency: 'MXN',
    rating: 4.8,
    reviewCount: 215,
    inStock: true,
    category: 'Frenado',
    categorySlug: 'frenado',
    imageUrl: 'https://images.unsplash.com/photo-1635784065451-12ef0eb1e670?w=400&h=300&fit=crop',
    description:
      'Líquido de frenos sintético de alto rendimiento. Punto de ebullición superior para condiciones extremas.',
    specifications: [
      { label: 'Tipo', value: 'DOT 4 Sintético' },
      { label: 'Contenido', value: '500 ml' },
      { label: 'Punto de ebullición seco', value: '260°C' },
      { label: 'País de origen', value: 'Alemania' },
    ],
    fitmentVehicles: ['Universal — todos los vehículos DOT 4'],
  },
  // --- Filtros y aceite (3) ---
  {
    id: 'oil-filter-001',
    name: 'Filtro de Aceite Premium',
    brand: 'MANN-FILTER',
    partNumber: 'MF-W712',
    sku: 'FLT-OIL-712',
    price: 159.0,
    currency: 'MXN',
    rating: 4.6,
    reviewCount: 342,
    inStock: true,
    category: 'Filtros y aceite',
    categorySlug: 'filtros',
    imageUrl: 'https://images.unsplash.com/photo-1620085790206-7a9e0e4c8a41?w=400&h=300&fit=crop',
    description:
      'Filtro de aceite de alta eficiencia con tecnología de filtrado multicapa. Protege el motor contra partículas dañinas.',
    specifications: [
      { label: 'Tipo', value: 'Cartucho con válvula anti-retorno' },
      { label: 'Diámetro', value: '76 mm' },
      { label: 'Altura', value: '79 mm' },
      { label: 'Garantía', value: '1 año' },
      { label: 'País de origen', value: 'Alemania' },
    ],
    fitmentVehicles: ['2019 Honda Civic EX', '2018-2022 Honda Civic', '2017-2023 Honda CR-V'],
  },
  {
    id: 'motor-oil-001',
    name: 'Aceite de Motor Sintético 5W-30',
    brand: 'MOBIL 1',
    partNumber: 'MOB-5W30-5L',
    sku: 'OIL-SYN-530',
    price: 589.0,
    currency: 'MXN',
    rating: 4.9,
    reviewCount: 567,
    inStock: true,
    category: 'Filtros y aceite',
    categorySlug: 'filtros',
    imageUrl: '/images/aceite de motor mobile.jpg',
    description:
      'Aceite sintético completo de alto rendimiento. Protección superior del motor en todas las condiciones de manejo.',
    specifications: [
      { label: 'Viscosidad', value: '5W-30' },
      { label: 'Tipo', value: 'Sintético completo' },
      { label: 'Contenido', value: '5 litros' },
      { label: 'Norma', value: 'API SP / ILSAC GF-6A' },
      { label: 'País de origen', value: 'Estados Unidos' },
    ],
    fitmentVehicles: ['Universal — motores gasolina 5W-30'],
  },
  {
    id: 'air-filter-001',
    name: 'Filtro de Aire de Alto Flujo',
    brand: 'K&N',
    partNumber: 'KN-33-2468',
    sku: 'FLT-AIR-246',
    price: 749.0,
    currency: 'MXN',
    rating: 4.4,
    reviewCount: 156,
    inStock: true,
    category: 'Filtros y aceite',
    categorySlug: 'filtros',
    imageUrl: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=400&h=300&fit=crop',
    description:
      'Filtro de aire lavable y reutilizable. Aumenta el flujo de aire al motor para mejor rendimiento.',
    specifications: [
      { label: 'Tipo', value: 'Alto flujo, lavable' },
      { label: 'Material', value: 'Algodón engrasado' },
      { label: 'Garantía', value: 'De por vida (con mantenimiento)' },
      { label: 'País de origen', value: 'Estados Unidos' },
    ],
    fitmentVehicles: ['2019 Honda Civic EX', '2016-2022 Honda Civic', '2017-2023 Honda CR-V'],
  },
  // --- Piezas de motor (2) ---
  {
    id: 'serpentine-belt-001',
    name: 'Banda Serpentina Multi-V',
    brand: 'GATES',
    partNumber: 'GTS-K060923',
    sku: 'ENG-BLT-923',
    price: 349.0,
    currency: 'MXN',
    rating: 4.6,
    reviewCount: 78,
    inStock: true,
    category: 'Piezas de motor',
    categorySlug: 'motor',
    imageUrl: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&h=300&fit=crop',
    description:
      'Banda serpentina de alta durabilidad con tecnología EPDM. Resistente al calor y al desgaste para mayor vida útil.',
    specifications: [
      { label: 'Tipo', value: 'Multi-V (6 costillas)' },
      { label: 'Longitud', value: '2,345 mm' },
      { label: 'Material', value: 'EPDM' },
      { label: 'Garantía', value: '4 años / 80,000 km' },
      { label: 'País de origen', value: 'México' },
    ],
    fitmentVehicles: ['2019 Honda Civic EX', '2016-2022 Honda Civic 1.5T'],
  },
  {
    id: 'water-pump-001',
    name: 'Bomba de Agua con Empaque',
    brand: 'GMB',
    partNumber: 'GMB-GWH-45A',
    sku: 'ENG-WPM-045',
    price: 1249.0,
    currency: 'MXN',
    rating: 4.3,
    reviewCount: 45,
    inStock: true,
    category: 'Piezas de motor',
    categorySlug: 'motor',
    imageUrl: '/images/water pump product card.jpg',
    description:
      'Bomba de agua de reemplazo directo con empaque incluido. Flujo optimizado para mantener la temperatura del motor.',
    specifications: [
      { label: 'Incluye', value: 'Bomba + empaque + tornillos' },
      { label: 'Material', value: 'Aluminio fundido' },
      { label: 'Tipo', value: 'Mecánica (impulsada por banda)' },
      { label: 'Garantía', value: '2 años / 40,000 km' },
      { label: 'País de origen', value: 'Japón' },
    ],
    fitmentVehicles: ['2019 Honda Civic EX', '2016-2022 Honda Civic 1.5T/2.0L'],
  },
  // --- Arranque y carga (2) ---
  {
    id: 'battery-001',
    name: 'Batería AGM 12V 60Ah CCA 680',
    brand: 'BOSCH',
    partNumber: 'BSH-S6-590',
    sku: 'BAT-AGM-590',
    price: 3299.0,
    currency: 'MXN',
    rating: 4.8,
    reviewCount: 234,
    inStock: true,
    category: 'Arranque y carga',
    categorySlug: 'arranque',
    imageUrl: 'https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?w=400&h=300&fit=crop',
    description:
      'Batería AGM de alta capacidad con tecnología de arranque PowerFrame. Ideal para vehículos con alto consumo eléctrico.',
    specifications: [
      { label: 'Tecnología', value: 'AGM (Absorbent Glass Mat)' },
      { label: 'Voltaje', value: '12V' },
      { label: 'Capacidad', value: '60 Ah' },
      { label: 'CCA', value: '680 A' },
      { label: 'Garantía', value: '3 años' },
      { label: 'País de origen', value: 'Alemania' },
    ],
    fitmentVehicles: ['2019 Honda Civic EX', '2016-2023 Honda Civic', '2017-2023 Honda CR-V'],
  },
  {
    id: 'alternator-001',
    name: 'Alternador Remanufacturado 130A',
    brand: 'DENSO',
    partNumber: 'DNS-210-0802',
    sku: 'ALT-RMF-802',
    price: 4599.0,
    currency: 'MXN',
    rating: 4.5,
    reviewCount: 67,
    inStock: true,
    category: 'Arranque y carga',
    categorySlug: 'arranque',
    imageUrl: '/images/alternator product card duralast.jpg',
    description:
      'Alternador remanufacturado a especificaciones OE. Prueba de rendimiento al 100% antes del envío.',
    specifications: [
      { label: 'Amperaje', value: '130A' },
      { label: 'Voltaje', value: '12V' },
      { label: 'Tipo', value: 'Remanufacturado OE-spec' },
      { label: 'Garantía', value: '2 años / sin límite de km' },
      { label: 'País de origen', value: 'Japón' },
    ],
    fitmentVehicles: ['2019 Honda Civic EX', '2016-2022 Honda Civic 1.5T'],
  },
  // --- Ópticas / Faros (2) ---
  {
    id: 'headlight-bulb-001',
    name: 'Bombillas LED H11 6000K (Par)',
    brand: 'PHILIPS',
    partNumber: 'PHL-LED-H11',
    sku: 'OPT-LED-H11',
    price: 1199.0,
    currency: 'MXN',
    rating: 4.7,
    reviewCount: 189,
    inStock: true,
    category: 'Ópticas / Faros',
    categorySlug: 'opticas',
    imageUrl: 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=400&h=300&fit=crop',
    description:
      'Bombillas LED de reemplazo directo con luz blanca brillante. Hasta 200% más visibilidad que las halógenas estándar.',
    specifications: [
      { label: 'Tipo', value: 'H11 LED' },
      { label: 'Temperatura', value: '6000K (blanco frío)' },
      { label: 'Lumens', value: '3,200 lm por bombilla' },
      { label: 'Incluye', value: 'Par (2 bombillas)' },
      { label: 'Garantía', value: '2 años' },
      { label: 'País de origen', value: 'Países Bajos' },
    ],
    fitmentVehicles: ['2019 Honda Civic EX', '2016-2022 Honda Civic (luces bajas H11)'],
  },
  {
    id: 'tail-light-001',
    name: 'Faro Trasero Izquierdo Completo',
    brand: 'TYC',
    partNumber: 'TYC-11-6878',
    sku: 'OPT-TL-6878',
    price: 1849.0,
    currency: 'MXN',
    rating: 4.2,
    reviewCount: 34,
    inStock: true,
    category: 'Ópticas / Faros',
    categorySlug: 'opticas',
    imageUrl: '/images/ford taillight.jpg',
    description:
      'Faro trasero de reemplazo directo, lado izquierdo (conductor). Cumple con estándares DOT/SAE.',
    specifications: [
      { label: 'Posición', value: 'Trasero izquierdo (conductor)' },
      { label: 'Tipo', value: 'Conjunto completo con arnés' },
      { label: 'Norma', value: 'DOT / SAE' },
      { label: 'Garantía', value: '1 año' },
      { label: 'País de origen', value: 'Taiwán' },
    ],
    fitmentVehicles: ['2019 Honda Civic EX Sedán', '2016-2021 Honda Civic Sedán'],
  },
  // --- Dirección - Suspensión (2) ---
  {
    id: 'shock-absorber-001',
    name: 'Amortiguadores Delanteros Gas (Par)',
    brand: 'MONROE',
    partNumber: 'MNR-72594',
    sku: 'SUS-SHK-594',
    price: 2199.0,
    currency: 'MXN',
    rating: 4.6,
    reviewCount: 112,
    inStock: true,
    category: 'Dirección - Suspensión',
    categorySlug: 'suspension',
    imageUrl: 'https://images.unsplash.com/photo-1625047509248-ec889cbff17f?w=400&h=300&fit=crop',
    description:
      'Amortiguadores de gas presurizados para máximo control y confort. Tecnología de válvulas sensibles a velocidad.',
    specifications: [
      { label: 'Tipo', value: 'Gas presurizado' },
      { label: 'Posición', value: 'Delanteros (par)' },
      { label: 'Tecnología', value: 'Safe-Tech' },
      { label: 'Garantía', value: 'De por vida' },
      { label: 'País de origen', value: 'Bélgica' },
    ],
    fitmentVehicles: ['2019 Honda Civic EX', '2016-2022 Honda Civic'],
  },
  {
    id: 'tie-rod-001',
    name: 'Terminal de Dirección Exterior',
    brand: 'MOOG',
    partNumber: 'MOG-ES800948',
    sku: 'SUS-TRD-948',
    price: 459.0,
    currency: 'MXN',
    rating: 4.4,
    reviewCount: 56,
    inStock: true,
    category: 'Dirección - Suspensión',
    categorySlug: 'suspension',
    imageUrl: '/images/0014476-terminal-direcci-n-subaru-35583.jpg',
    description:
      'Terminal de dirección de grado premium con diseño de rótula forjada. Instalación directa sin modificaciones.',
    specifications: [
      { label: 'Posición', value: 'Exterior (lado derecho)' },
      { label: 'Material', value: 'Acero forjado' },
      { label: 'Incluye', value: 'Terminal + contratuerca' },
      { label: 'Garantía', value: '3 años / sin límite de km' },
      { label: 'País de origen', value: 'Estados Unidos' },
    ],
    fitmentVehicles: ['2019 Honda Civic EX', '2016-2022 Honda Civic'],
  },
];

// Default cart for checkout/order pages (post-purchase display)
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
  street: 'Av. Revolución',
  extNumber: '1425',
  intNumber: '',
  colonia: 'Mixcoac',
  municipio: 'Benito Juárez',
  state: 'CDMX',
  zip: '03910',
  references: '',
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
