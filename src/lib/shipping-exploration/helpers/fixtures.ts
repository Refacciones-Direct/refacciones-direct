/**
 * Test data: Mexican addresses and auto parts packages.
 * Used across exploration test modules. Provider-specific field names
 * can be mapped in tests (e.g. colonia vs neighborhood).
 */

export type AddressFixture = {
  name: string;
  phone: string;
  street: string;
  streetNumber: string;
  neighborhood: string;
  city: string;
  stateCode: string;
  postalCode: string;
  country: string;
  reference?: string;
  interiorNumber?: string;
  company?: string;
};

export type PackageFixture = {
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  declaredValueMxn: number;
  contentsDescription: string;
  packageType: 'box' | 'envelope' | 'pallet';
};

/** Mexican addresses — real postal codes, use cases per plan */
export const addresses: Record<string, AddressFixture> = {
  warehouseMonterrey: {
    name: 'Almacén Refacciones Norte',
    phone: '+528118765432',
    street: 'Av. Industrial',
    streetNumber: '2500',
    neighborhood: 'Parque Industrial',
    city: 'Monterrey',
    stateCode: 'NL',
    postalCode: '64000',
    country: 'MX',
    reference: 'Bodega 12',
    company: 'Refacciones Norte S.A. de C.V.',
  },
  warehouseCDMX: {
    name: 'Centro de Distribución CDMX',
    phone: '+525555123456',
    street: 'Av. Río Churubusco',
    streetNumber: '456',
    neighborhood: 'Del Valle',
    city: 'Ciudad de México',
    stateCode: 'CMX',
    postalCode: '06600',
    country: 'MX',
    reference: 'Local 3',
  },
  warehouseGuadalajara: {
    name: 'Bodega Occidente',
    phone: '+523312345678',
    street: 'Av. López Mateos',
    streetNumber: '3200',
    neighborhood: 'Jardines del Bosque',
    city: 'Guadalajara',
    stateCode: 'JAL',
    postalCode: '44100',
    country: 'MX',
  },
  customerCDMX: {
    name: 'Juan Pérez García',
    phone: '+525512345678',
    street: 'Av. Álvaro Obregón',
    streetNumber: '123',
    neighborhood: 'Roma Norte',
    city: 'Ciudad de México',
    stateCode: 'CMX',
    postalCode: '06700',
    country: 'MX',
    reference: 'Entre Oaxaca y Jalapa',
  },
  customerMonterrey: {
    name: 'María López',
    phone: '+528198765432',
    street: 'Calle Morelos',
    streetNumber: '500',
    neighborhood: 'Centro',
    city: 'Monterrey',
    stateCode: 'NL',
    postalCode: '64000',
    country: 'MX',
  },
  customerMerida: {
    name: 'Carlos Hernández',
    phone: '+529991234567',
    street: 'Calle 60',
    streetNumber: '301',
    neighborhood: 'Centro',
    city: 'Mérida',
    stateCode: 'YUC',
    postalCode: '97000',
    country: 'MX',
  },
  customerRural: {
    name: 'Ana Martínez',
    phone: '+529512345678',
    street: 'Av. Principal',
    streetNumber: 'S/N',
    neighborhood: 'Centro',
    city: 'Santiago Suchilquitongo',
    stateCode: 'OAX',
    postalCode: '71256',
    country: 'MX',
    reference: 'Frente al mercado',
  },
  customerTijuana: {
    name: 'Roberto Sánchez',
    phone: '+526641234567',
    street: 'Blvd. Agua Caliente',
    streetNumber: '8900',
    neighborhood: 'Misión del Sol',
    city: 'Tijuana',
    stateCode: 'BC',
    postalCode: '22000',
    country: 'MX',
  },
};

/** Generic auto parts packages — edge cases and common items */
export const packages: Record<string, PackageFixture> = {
  brakePadSet: {
    weightKg: 3.5,
    lengthCm: 30,
    widthCm: 25,
    heightCm: 10,
    declaredValueMxn: 850,
    contentsDescription: 'Juego de pastillas de freno',
    packageType: 'box',
  },
  brakeRotorPair: {
    weightKg: 12.0,
    lengthCm: 35,
    widthCm: 35,
    heightCm: 15,
    declaredValueMxn: 1800,
    contentsDescription: 'Par de discos de freno',
    packageType: 'box',
  },
  sparkPlugSet: {
    weightKg: 0.5,
    lengthCm: 15,
    widthCm: 10,
    heightCm: 8,
    declaredValueMxn: 320,
    contentsDescription: 'Juego de bujías',
    packageType: 'box',
  },
  oilFilterKit: {
    weightKg: 1.2,
    lengthCm: 20,
    widthCm: 15,
    heightCm: 15,
    declaredValueMxn: 450,
    contentsDescription: 'Kit de filtro de aceite',
    packageType: 'box',
  },
  bumperFront: {
    weightKg: 8.0,
    lengthCm: 150,
    widthCm: 60,
    heightCm: 30,
    declaredValueMxn: 3500,
    contentsDescription: 'Parachoque delantero',
    packageType: 'box',
  },
  exhaustPipe: {
    weightKg: 6.5,
    lengthCm: 120,
    widthCm: 20,
    heightCm: 20,
    declaredValueMxn: 2200,
    contentsDescription: 'Tubo de escape',
    packageType: 'box',
  },
  alternator: {
    weightKg: 5.0,
    lengthCm: 25,
    widthCm: 20,
    heightCm: 20,
    declaredValueMxn: 2800,
    contentsDescription: 'Alternador 12V',
    packageType: 'box',
  },
  headlightAssembly: {
    weightKg: 2.5,
    lengthCm: 50,
    widthCm: 35,
    heightCm: 30,
    declaredValueMxn: 4500,
    contentsDescription: 'Ensemble de faro',
    packageType: 'box',
  },
};

/** Real launch products (Humberto's manufacturers) — weight-based carrier routing */
export const realProductPackages: Record<string, PackageFixture> = {
  mazaDeRueda: {
    weightKg: 4.0,
    lengthCm: 35,
    widthCm: 30,
    heightCm: 25,
    declaredValueMxn: 1200,
    contentsDescription: 'Maza de rueda',
    packageType: 'box',
  },
  alternador12V: {
    weightKg: 6.5,
    lengthCm: 30,
    widthCm: 25,
    heightCm: 25,
    declaredValueMxn: 2800,
    contentsDescription: 'Alternador 12V',
    packageType: 'box',
  },
  soporteDeMotor: {
    weightKg: 3.0,
    lengthCm: 25,
    widthCm: 20,
    heightCm: 20,
    declaredValueMxn: 900,
    contentsDescription: 'Soporte de motor',
    packageType: 'box',
  },
  chicoteElectrico: {
    weightKg: 1.0,
    lengthCm: 30,
    widthCm: 15,
    heightCm: 10,
    declaredValueMxn: 650,
    contentsDescription: 'Chicote eléctrico',
    packageType: 'box',
  },
  mazaPesada: {
    weightKg: 5.0,
    lengthCm: 35,
    widthCm: 30,
    heightCm: 25,
    declaredValueMxn: 1500,
    contentsDescription: 'Maza de rueda (5kg boundary)',
    packageType: 'box',
  },
};
