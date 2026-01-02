'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface CartItem {
    itemId: string;
    name: string;
    quantity: number;
    priceKobo: number;
}

export default function CheckoutPage() {
    const router = useRouter();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const savedCart = sessionStorage.getItem('cart');
        if (savedCart) {
            setCart(JSON.parse(savedCart));
        } else {
            router.push('/');
        }
    }, [router]);

    const getTotalPrice = (): number => {
        return cart.reduce((sum, item) => sum + item.priceKobo * item.quantity, 0);
    };

    const formatPrice = (kobo: number): string => {
        return `₦${(kobo / 100).toLocaleString()}`;
    };

    const handleOrder = async (paymentMethod: 'ONLINE' | 'IN_PERSON') => {
        if (loading) return;
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart.map((item) => ({
                        itemId: item.itemId,
                        quantity: item.quantity,
                    })),
                    paymentMethod,
                    phone: phone || undefined,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Failed to create order');
                setLoading(false);
                return;
            }

            sessionStorage.removeItem('cart');

            if (paymentMethod === 'ONLINE') {
                const paymentRes = await fetch('/api/payments/confirm', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderId: data.order.id,
                        success: true,
                        providerRef: `MOCK-${Date.now()}`,
                    }),
                });

                if (!paymentRes.ok) {
                    setError('Payment failed. Please try again.');
                    setLoading(false);
                    return;
                }
            }

            router.push(`/order/${data.order.shortCode}`);
        } catch (err) {
            console.error(err);
            setError('Something went wrong. Please try again.');
            setLoading(false);
        }
    };

    if (cart.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-10 h-10 border-3 border-card border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto px-4 py-6">
            {/* Back Link */}
            <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6">
                ← Back to menu
            </Link>

            <h1 className="text-2xl font-bold mb-6">Your Order</h1>

            {/* Error Alert */}
            {error && (
                <div className="bg-red-900/30 border border-red-500 text-red-400 px-4 py-3 rounded-xl mb-4">
                    {error}
                </div>
            )}

            {/* Order Summary */}
            <div className="bg-card rounded-xl p-5 mb-4">
                <h2 className="text-xs text-gray-400 uppercase tracking-wide mb-4">Order Summary</h2>
                {cart.map((item) => (
                    <div key={item.itemId} className="flex justify-between py-2 border-b border-card-hover last:border-0">
                        <span>{item.name} × {item.quantity}</span>
                        <span>{formatPrice(item.priceKobo * item.quantity)}</span>
                    </div>
                ))}
                <div className="flex justify-between pt-4 mt-2 border-t-2 border-card-hover text-xl font-bold">
                    <span>Total</span>
                    <span className="text-primary">{formatPrice(getTotalPrice())}</span>
                </div>
            </div>

            {/* Phone Input */}
            <div className="bg-card rounded-xl p-5 mb-4">
                <h2 className="text-xs text-gray-400 uppercase tracking-wide mb-4">Contact (Optional)</h2>
                <input
                    type="tel"
                    placeholder="080xxxxxxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={11}
                    className="w-full px-4 py-3 bg-card-hover border border-transparent focus:border-primary rounded-xl text-white placeholder-gray-500 outline-none transition-colors"
                />
                <p className="text-xs text-gray-500 mt-2">We&apos;ll text when your order is ready</p>
            </div>

            {/* Payment Options */}
            <div className="bg-card rounded-xl p-5">
                <h2 className="text-xs text-gray-400 uppercase tracking-wide mb-4">Payment Method</h2>
                <div className="space-y-3">
                    <button
                        onClick={() => handleOrder('ONLINE')}
                        disabled={loading}
                        className="w-full flex flex-col items-center p-5 bg-card-hover hover:border-primary border-2 border-transparent rounded-xl transition-colors disabled:opacity-50"
                    >
                        <span className="text-3xl mb-2">💳</span>
                        <span className="text-lg font-semibold">Pay Now (Online)</span>
                        <span className="text-sm text-gray-400 mt-1">Prep starts immediately</span>
                    </button>

                    <button
                        onClick={() => handleOrder('IN_PERSON')}
                        disabled={loading}
                        className="w-full flex flex-col items-center p-5 bg-card-hover hover:border-primary border-2 border-transparent rounded-xl transition-colors disabled:opacity-50"
                    >
                        <span className="text-3xl mb-2">💵</span>
                        <span className="text-lg font-semibold">Pay on Pickup</span>
                        <span className="text-sm text-gray-400 mt-1">Prep starts when you arrive & pay</span>
                    </button>
                </div>
            </div>

            {/* Loading Spinner */}
            {loading && (
                <div className="flex justify-center mt-6">
                    <div className="w-10 h-10 border-3 border-card border-t-primary rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
}
