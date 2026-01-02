'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface MenuItem {
  id: string;
  name: string;
  priceKobo: number;
  prepTimeSec: number;
  availableToday: number;
  estimatedWait: string;
}

interface CartItem {
  item: MenuItem;
  quantity: number;
}

export default function MenuPage() {
  const router = useRouter();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/items');
      if (!res.ok) throw new Error('Failed to load menu');
      const data = await res.json();
      setItems(data.items);
      setError(null);
    } catch (err) {
      setError('Could not load menu. Please refresh.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
    const interval = setInterval(fetchItems, 60000);
    return () => clearInterval(interval);
  }, [fetchItems]);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const newCart = new Map(prev);
      const existing = newCart.get(item.id);
      if (existing) {
        if (existing.quantity < item.availableToday) {
          newCart.set(item.id, { ...existing, quantity: existing.quantity + 1 });
        }
      } else {
        newCart.set(item.id, { item, quantity: 1 });
      }
      return newCart;
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const newCart = new Map(prev);
      const existing = newCart.get(itemId);
      if (existing) {
        if (existing.quantity > 1) {
          newCart.set(itemId, { ...existing, quantity: existing.quantity - 1 });
        } else {
          newCart.delete(itemId);
        }
      }
      return newCart;
    });
  };

  const getCartQuantity = (itemId: string): number => {
    return cart.get(itemId)?.quantity || 0;
  };

  const getTotalItems = (): number => {
    let total = 0;
    cart.forEach((item) => (total += item.quantity));
    return total;
  };

  const getTotalPrice = (): number => {
    let total = 0;
    cart.forEach((item) => (total += item.item.priceKobo * item.quantity));
    return total;
  };

  const formatPrice = (kobo: number): string => {
    return `₦${(kobo / 100).toLocaleString()}`;
  };

  const handleCheckout = () => {
    const cartData = Array.from(cart.values()).map((item) => ({
      itemId: item.item.id,
      name: item.item.name,
      quantity: item.quantity,
      priceKobo: item.item.priceKobo,
    }));
    sessionStorage.setItem('cart', JSON.stringify(cartData));
    router.push('/checkout');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-card border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="max-w-md mx-auto px-4 pb-28">
        {/* Header */}
        <header className="text-center py-8">
          <h1 className="text-3xl font-bold text-primary">🍳 8am</h1>
          <p className="text-gray-400 text-sm mt-1">Order breakfast, skip the queue</p>
        </header>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-900/30 border border-red-500 text-red-400 px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {/* Empty State */}
        {items.length === 0 && !error && (
          <div className="text-center py-12 text-gray-400">
            <p>No items available right now.</p>
            <p className="text-sm mt-2">Check back later!</p>
          </div>
        )}

        {/* Item Cards */}
        {items.map((item) => {
          const qty = getCartQuantity(item.id);
          return (
            <div
              key={item.id}
              className="bg-card rounded-xl p-4 mb-4 shadow-lg transition-transform active:scale-[0.98]"
            >
              {/* Item Header */}
              <div className="flex justify-between items-start mb-2">
                <span className="text-lg font-semibold">{item.name}</span>
                <span className="text-xl font-bold text-primary">
                  {formatPrice(item.priceKobo)}
                </span>
              </div>

              {/* Meta Info */}
              <div className="flex gap-4 text-gray-400 text-sm mb-4">
                <span className="flex items-center gap-1">⏱ {item.estimatedWait}</span>
                <span className="flex items-center gap-1">📦 {item.availableToday} left</span>
              </div>

              {/* Quantity Controls */}
              <div className="flex justify-center items-center gap-4">
                {qty === 0 ? (
                  <button
                    onClick={() => addToCart(item)}
                    className="w-12 h-12 rounded-full bg-primary hover:bg-primary-dark text-white text-2xl font-semibold flex items-center justify-center transition-colors touch-target"
                    aria-label={`Add ${item.name} to cart`}
                  >
                    +
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="w-12 h-12 rounded-full bg-card-hover hover:bg-primary text-white text-2xl font-semibold flex items-center justify-center transition-colors touch-target"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="text-xl font-semibold min-w-[32px] text-center">{qty}</span>
                    <button
                      onClick={() => addToCart(item)}
                      disabled={qty >= item.availableToday}
                      className="w-12 h-12 rounded-full bg-primary hover:bg-primary-dark disabled:opacity-30 disabled:cursor-not-allowed text-white text-2xl font-semibold flex items-center justify-center transition-colors touch-target"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky Cart Bar */}
      {getTotalItems() > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-card-hover p-4 shadow-2xl z-50">
          <div className="max-w-md mx-auto flex justify-between items-center gap-4">
            <div>
              <div className="text-gray-400 text-sm">
                {getTotalItems()} item{getTotalItems() > 1 ? 's' : ''}
              </div>
              <div className="text-xl font-bold">{formatPrice(getTotalPrice())}</div>
            </div>
            <button
              onClick={handleCheckout}
              className="bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-4 rounded-xl text-lg transition-colors touch-target"
            >
              Review Order →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
