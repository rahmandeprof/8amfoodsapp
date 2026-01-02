'use client';

import { useState, useEffect, useCallback } from 'react';

interface OrderItem {
    item: { name: string };
    quantity: number;
}

interface Order {
    id: string;
    shortCode: string;
    status: string;
    paymentMethod: string;
    createdAt: string;
    orderItems: OrderItem[];
}

interface GroupedOrders {
    pending: Order[];
    paid: Order[];
    preparing: Order[];
    ready: Order[];
}

const STATUS_ACTIONS: Record<string, { next: string; label: string; color: string }> = {
    PENDING: { next: 'PAID', label: 'Mark Paid', color: 'bg-green-600 hover:bg-green-700' },
    PAID: { next: 'PREPARING', label: 'Start Prep', color: 'bg-primary hover:bg-primary-dark' },
    PREPARING: { next: 'READY', label: 'Mark Ready', color: 'bg-green-600 hover:bg-green-700' },
    READY: { next: 'PICKED_UP', label: 'Picked Up', color: 'bg-card-hover hover:bg-gray-600' },
};

const STATUS_BADGES: Record<string, string> = {
    pending: 'bg-yellow-500 text-black',
    paid: 'bg-green-500 text-white',
    preparing: 'bg-primary text-white',
    ready: 'bg-cyan-400 text-black',
};

export default function KitchenPage() {
    const [orders, setOrders] = useState<GroupedOrders>({
        pending: [],
        paid: [],
        preparing: [],
        ready: [],
    });
    const [totalActive, setTotalActive] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchOrders = useCallback(async () => {
        try {
            const res = await fetch('/api/kitchen');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setOrders(data.orders);
            setTotalActive(data.totalActive);
        } catch (err) {
            console.error('Failed to fetch orders:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 10000);
        return () => clearInterval(interval);
    }, [fetchOrders]);

    const updateStatus = async (shortCode: string, newStatus: string) => {
        try {
            const res = await fetch(`/api/orders/${shortCode}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                fetchOrders();
            }
        } catch (err) {
            console.error('Failed to update order:', err);
        }
    };

    const formatTime = (dateStr: string): string => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return 'just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        return `${Math.floor(diffMin / 60)}h ${diffMin % 60}m ago`;
    };

    const renderOrderSection = (
        title: string,
        icon: string,
        orderList: Order[],
        statusKey: string
    ) => (
        <div className="mb-8">
            <div className="flex items-center gap-2 text-xs text-gray-400 uppercase tracking-wide mb-3">
                <span>{icon}</span>
                <span>{title}</span>
                <span className="bg-card-hover px-2 py-0.5 rounded-full text-xs">{orderList.length}</span>
            </div>
            {orderList.length === 0 ? (
                <p className="text-gray-500 text-sm">No orders</p>
            ) : (
                orderList.map((order) => {
                    const action = STATUS_ACTIONS[order.status];
                    return (
                        <div key={order.id} className="bg-card rounded-xl p-4 mb-2">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xl font-bold font-mono">{order.shortCode}</span>
                                <span className="text-sm text-gray-400">{formatTime(order.createdAt)}</span>
                            </div>
                            <div className="text-gray-400 text-sm mb-3">
                                {order.orderItems.map((oi, idx) => (
                                    <span key={idx}>
                                        {oi.quantity}× {oi.item.name}
                                        {idx < order.orderItems.length - 1 ? ', ' : ''}
                                    </span>
                                ))}
                            </div>
                            {order.paymentMethod === 'IN_PERSON' && order.status === 'PENDING' && (
                                <span className={`inline-block px-2 py-1 rounded text-xs font-semibold mb-3 ${STATUS_BADGES[statusKey]}`}>
                                    Pay on Pickup
                                </span>
                            )}
                            {action && (
                                <button
                                    onClick={() => updateStatus(order.shortCode, action.next)}
                                    className={`w-full ${action.color} text-white font-semibold py-3 rounded-xl transition-colors touch-target`}
                                >
                                    {action.label}
                                </button>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-10 h-10 border-3 border-card border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-card-hover pb-4 mb-6">
                <h1 className="text-2xl font-bold">🍳 Kitchen</h1>
                <span className="bg-primary px-3 py-1 rounded-full font-semibold">
                    {totalActive} active
                </span>
            </div>

            {renderOrderSection('Waiting for Payment', '⏳', orders.pending, 'pending')}
            {renderOrderSection('Paid - Start Prep', '💰', orders.paid, 'paid')}
            {renderOrderSection('Preparing', '👨‍🍳', orders.preparing, 'preparing')}
            {renderOrderSection('Ready for Pickup', '✅', orders.ready, 'ready')}

            <p className="text-center text-gray-500 text-xs mt-8">
                Auto-refreshes every 10 seconds
            </p>
        </div>
    );
}
