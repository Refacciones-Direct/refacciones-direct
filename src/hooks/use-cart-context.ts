import { useSyncExternalStore } from 'react';
import type { MockProduct, MockCartItem } from '@/data/mock-demo';

const CART_KEY = 'demo-cart:v1';
const CHANGE_EVENT = 'cartchange';
const TAX_RATE = 0.16;

interface CartState {
  items: MockCartItem[];
}

const EMPTY_CART: CartState = { items: [] };

let cachedCart: CartState | undefined;

function getSnapshot(): CartState {
  if (cachedCart !== undefined) return cachedCart;
  try {
    const raw = sessionStorage.getItem(CART_KEY);
    cachedCart = raw ? (JSON.parse(raw) as CartState) : EMPTY_CART;
  } catch {
    cachedCart = EMPTY_CART;
  }
  return cachedCart;
}

function getServerSnapshot(): CartState {
  return EMPTY_CART;
}

function subscribe(callback: () => void): () => void {
  function handleChange() {
    cachedCart = undefined;
    callback();
  }
  window.addEventListener(CHANGE_EVENT, handleChange);
  window.addEventListener('storage', handleChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handleChange);
    window.removeEventListener('storage', handleChange);
  };
}

function writeCart(cart: CartState) {
  try {
    sessionStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {
    // Incognito / quota exceeded
  }
  cachedCart = undefined;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useCartContext() {
  const cart = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const subtotal = cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shipping = 0;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = subtotal + shipping + tax;
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  function addItem(product: MockProduct, quantity = 1) {
    const c = getSnapshot();
    const existing = c.items.findIndex((item) => item.product.id === product.id);
    if (existing >= 0) {
      const updated = [...c.items];
      updated[existing] = { ...updated[existing], quantity: updated[existing].quantity + quantity };
      writeCart({ items: updated });
    } else {
      writeCart({ items: [...c.items, { product, quantity }] });
    }
  }

  function removeItem(productId: string) {
    const c = getSnapshot();
    writeCart({ items: c.items.filter((item) => item.product.id !== productId) });
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    const c = getSnapshot();
    writeCart({
      items: c.items.map((item) => (item.product.id === productId ? { ...item, quantity } : item)),
    });
  }

  function clearCart() {
    writeCart(EMPTY_CART);
  }

  return {
    items: cart.items,
    itemCount,
    subtotal,
    shipping,
    tax,
    total,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  } as const;
}
