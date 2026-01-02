'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';

interface OrderItem {
    name: string;
    quantity: number;
    unitPriceKobo: number;
}

interface Order {
    id: string;
    shortCode: string;
    status: string;
    paymentMethod: string;
    totalKobo: number;
    estReadyAt: string | null;
    expiresAt: string | null;
    createdAt: string;
    paidAt: string | null;
    readyAt: string | null;
    items: OrderItem[];
}

const STATUS_CONFIG: Record<string, { icon: string; title: string; message: string; color: string }> = {
    PENDING: {
        icon: '⏳',
        title: 'Waiting for Payment',
        message: 'Come to the counter and pay to start preparation.',
        color: 'text-yellow-400',
    },
    PAID: {
        icon: '🔥',
        title: 'Preparing Now!',
        message: 'Your order is being prepared.',
        color: 'text-orange-400',
    },
    PREPARING: {
        icon: '👨‍🍳',
        title: 'Cooking...',
        message: 'Almost there! Your food is being made.',
        color: 'text-orange-400',
    },
    READY: {
        icon: '✅',
        title: 'Ready for Pickup!',
        message: 'Come to the counter and show this screen.',
        color: 'text-green-400',
    },
    PICKED_UP: {
        icon: '🎉',
        title: 'Picked Up',
        message: 'Enjoy your meal!',
        color: 'text-green-400',
    },
    CANCELLED: {
        icon: '❌',
        title: 'Cancelled',
        message: 'This order has been cancelled.',
        color: 'text-red-400',
    },
    EXPIRED: {
        icon: '⌛',
        title: 'Expired',
        message: 'This reservation has expired.',
        color: 'text-red-400',
    },
};

export default function OrderStatusPage({
    params,
}: {
    params: Promise<{ code: string }>;
}) {
    const resolvedParams = use(params);
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOrder = useCallback(async () => {
        try {
            const res = await fetch(`/api/orders/${resolvedParams.code}`);
            if (!res.ok) {
                if (res.status === 404) {
                    setError('Order not found');
                } else {
                    throw new Error('Failed to fetch order');
                }
                return;
            }
            const data = await res.json();
            setOrder(data.order);
            setError(null);
        } catch (err) {
            console.error(err);
            setError('Could not load order. Please refresh.');
        } finally {
            setLoading(false);
        }
    }, [resolvedParams.code]);

    useEffect(() => {
        fetchOrder();
        const interval = setInterval(fetchOrder, 30000);
        return () => clearInterval(interval);
    }, [fetchOrder]);

    const formatPrice = (kobo: number): string => {
        return `₦${(kobo / 100).toLocaleString()}`;
    };

    const formatTime = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-NG', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getProgressPercent = (status: string): number => {
        switch (status) {
            case 'PENDING': return 10;
            case 'PAID': return 40;
            case 'PREPARING': return 70;
            case 'READY':
            case 'PICKED_UP': return 100;
            default: return 0;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-10 h-10 border-3 border-card border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="max-w-md mx-auto px-4 py-12">
                <div className="bg-card rounded-2xl p-8 text-center">
                    <div className="text-6xl mb-4">❓</div>
                    <div className="text-xl font-bold mb-4">{error || 'Order not found'}</div>
                    <Link href="/" className="inline-block bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-3 rounded-xl transition-colors">
                        Back to Menu
                    </Link>
                </div>
            </div>
        );
    }

    const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;

    return (
        <div className="max-w-md mx-auto px-4 py-6">
            {/* Status Card */}
            <div className="bg-card rounded-2xl p-8 text-center mb-4">
                <div className="text-6xl mb-4">{statusConfig.icon}</div>
                <div className={`text-2xl font-bold mb-2 ${statusConfig.color}`}>{statusConfig.title}</div>
                <div className="text-3xl font-bold text-primary font-mono mb-6">{order.shortCode}</div>

                {/* Progress Bar */}
                {!['PICKED_UP', 'CANCELLED', 'EXPIRED'].includes(order.status) && (
                    <>
                        <div className="h-2 bg-card-hover rounded-full overflow-hidden mb-4">
                            <div
                                className="h-full bg-gradient-to-r from-primary to-yellow-400 rounded-full transition-all duration-500"
                                style={{ width: `${getProgressPercent(order.status)}%` }}
                            />
                        </div>
                        {order.estReadyAt && order.status !== 'READY' && (
                            <div className="text-lg font-semibold">
                                Est. ready by ~{formatTime(order.estReadyAt)}
                            </div>
                        )}
                        {order.expiresAt && order.status === 'PENDING' && (
                            <div className="mt-4 bg-yellow-900/30 border border-yellow-500 text-yellow-400 px-4 py-3 rounded-xl text-sm">
                                ⚠️ Come to pay within 15 minutes or this reservation expires.
                            </div>
                        )}
                    </>
                )}

                {order.status === 'READY' && (
                    <div className="mt-4 bg-green-900/30 border border-green-500 text-green-400 px-4 py-3 rounded-xl">
                        Show this screen at the counter to collect your order!
                    </div>
                )}

                <p className="text-gray-400 mt-4">{statusConfig.message}</p>
            </div>

            {/* Order Details */}
            <div className="bg-card rounded-xl p-5 mb-4">
                <h2 className="text-xs text-gray-400 uppercase tracking-wide mb-4">Order Details</h2>
                {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-2 border-b border-card-hover last:border-0">
                        <span>{item.name} × {item.quantity}</span>
                        <span>{formatPrice(item.unitPriceKobo * item.quantity)}</span>
                    </div>
                ))}
                <div className="flex justify-between pt-4 mt-2 border-t-2 border-card-hover text-xl font-bold">
                    <span>Total</span>
                    <span className="text-primary">{formatPrice(order.totalKobo)}</span>
                </div>
            </div>

            <p className="text-center text-gray-500 text-sm mb-4">
                Bookmark this page to check your order status
            </p>

            <Link href="/" className="block w-full text-center bg-card-hover hover:bg-card text-white font-semibold px-6 py-4 rounded-xl transition-colors">
                Order More
            </Link>
        </div>
    );
}
