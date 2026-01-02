import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Get all active orders for kitchen display
 */
export async function GET() {
    try {
        const orders = await prisma.order.findMany({
            where: {
                status: {
                    in: ['PENDING', 'PAID', 'PREPARING', 'READY'],
                },
                // Exclude expired pay-on-pickup orders
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } },
                    { status: { not: 'PENDING' } },
                ],
            },
            include: {
                orderItems: {
                    include: {
                        item: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        // Group by status
        const grouped = {
            pending: orders.filter((o) => o.status === 'PENDING'),
            paid: orders.filter((o) => o.status === 'PAID'),
            preparing: orders.filter((o) => o.status === 'PREPARING'),
            ready: orders.filter((o) => o.status === 'READY'),
        };

        return NextResponse.json({
            orders: grouped,
            totalActive: orders.length,
        });
    } catch (error) {
        console.error('Failed to fetch kitchen orders:', error);
        return NextResponse.json(
            { error: 'Failed to fetch orders' },
            { status: 500 }
        );
    }
}
