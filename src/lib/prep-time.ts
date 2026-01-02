import { prisma } from './db';

/**
 * Calculate current queue delay based on pending orders
 * Assumes kitchen can prepare 2 orders in parallel
 */
const KITCHEN_CAPACITY = 2;

export async function calculateQueueDelay(): Promise<number> {
    // Get all orders that are paid or preparing
    const activeOrders = await prisma.order.findMany({
        where: {
            status: {
                in: ['PAID', 'PREPARING'],
            },
        },
        include: {
            orderItems: {
                include: {
                    item: true,
                },
            },
        },
    });

    // Sum up remaining prep time for all active orders
    let totalPrepTime = 0;
    for (const order of activeOrders) {
        for (const orderItem of order.orderItems) {
            totalPrepTime += orderItem.item.prepTimeSec * orderItem.quantity;
        }
    }

    // Divide by kitchen capacity
    return Math.ceil(totalPrepTime / KITCHEN_CAPACITY);
}

/**
 * Calculate estimated wait time for a new order
 * @param itemPrepTimes - Array of { prepTimeSec, quantity } for items in cart
 */
export async function estimateWaitTime(
    itemPrepTimes: { prepTimeSec: number; quantity: number }[]
): Promise<number> {
    const queueDelay = await calculateQueueDelay();

    // Calculate this order's prep time
    const orderPrepTime = itemPrepTimes.reduce(
        (total, item) => total + item.prepTimeSec * item.quantity,
        0
    );

    return queueDelay + orderPrepTime;
}

/**
 * Format seconds into human-readable time
 */
export function formatPrepTime(seconds: number): string {
    const minutes = Math.ceil(seconds / 60);

    if (minutes <= 5) {
        return `~${minutes} min`;
    } else if (minutes <= 15) {
        // Round to nearest 2 minutes
        const rounded = Math.ceil(minutes / 2) * 2;
        return `~${rounded} min`;
    } else if (minutes <= 25) {
        return '15+ min (busy!)';
    } else {
        return '⚠️ 25+ min';
    }
}
