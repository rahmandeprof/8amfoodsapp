import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { OrderStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

type RouteContext = {
    params: Promise<{ code: string }>;
};

export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const { code } = await context.params;

        const order = await prisma.order.findUnique({
            where: { shortCode: code },
            include: {
                orderItems: {
                    include: {
                        item: true,
                    },
                },
            },
        });

        if (!order) {
            return NextResponse.json(
                { error: 'Order not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            order: {
                id: order.id,
                shortCode: order.shortCode,
                status: order.status,
                paymentMethod: order.paymentMethod,
                totalKobo: order.totalKobo,
                estReadyAt: order.estReadyAt,
                expiresAt: order.expiresAt,
                createdAt: order.createdAt,
                paidAt: order.paidAt,
                readyAt: order.readyAt,
                items: order.orderItems.map((oi) => ({
                    name: oi.item.name,
                    quantity: oi.quantity,
                    unitPriceKobo: oi.unitPriceKobo,
                })),
            },
        });
    } catch (error) {
        console.error('Failed to fetch order:', error);
        return NextResponse.json(
            { error: 'Failed to fetch order' },
            { status: 500 }
        );
    }
}

// Update order status (for kitchen staff)
export async function PATCH(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const { code } = await context.params;
        const body = await request.json();
        const { status } = body as { status: OrderStatus };

        const validStatuses: OrderStatus[] = [
            'PENDING',
            'PAID',
            'PREPARING',
            'READY',
            'PICKED_UP',
            'CANCELLED',
        ];

        if (!validStatuses.includes(status)) {
            return NextResponse.json(
                { error: 'Invalid status' },
                { status: 400 }
            );
        }

        const order = await prisma.order.findUnique({
            where: { shortCode: code },
        });

        if (!order) {
            return NextResponse.json(
                { error: 'Order not found' },
                { status: 404 }
            );
        }

        // Update order with appropriate timestamps
        const updateData: Partial<{
            status: OrderStatus;
            paidAt: Date;
            readyAt: Date;
            pickedUpAt: Date;
            estReadyAt: Date;
        }> = { status };

        if (status === 'PAID' && !order.paidAt) {
            updateData.paidAt = new Date();
            // Estimate ready time (add average prep time)
            updateData.estReadyAt = new Date(Date.now() + 5 * 60 * 1000);
        }

        if (status === 'READY') {
            updateData.readyAt = new Date();
        }

        if (status === 'PICKED_UP') {
            updateData.pickedUpAt = new Date();
        }

        const updatedOrder = await prisma.order.update({
            where: { shortCode: code },
            data: updateData,
        });

        return NextResponse.json({
            success: true,
            order: {
                shortCode: updatedOrder.shortCode,
                status: updatedOrder.status,
            },
        });
    } catch (error) {
        console.error('Failed to update order:', error);
        return NextResponse.json(
            { error: 'Failed to update order' },
            { status: 500 }
        );
    }
}
