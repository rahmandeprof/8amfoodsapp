import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { estimateWaitTime } from '@/lib/prep-time';

export const dynamic = 'force-dynamic';

/**
 * Mock payment confirmation endpoint
 * In production, this would be a Paystack webhook
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { orderId, success, providerRef } = body as {
            orderId: string;
            success: boolean;
            providerRef?: string;
        };

        if (!orderId) {
            return NextResponse.json(
                { error: 'Order ID required' },
                { status: 400 }
            );
        }

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                orderItems: {
                    include: { item: true },
                },
            },
        });

        if (!order) {
            return NextResponse.json(
                { error: 'Order not found' },
                { status: 404 }
            );
        }

        if (!success) {
            // Payment failed - don't change order status
            await prisma.payment.create({
                data: {
                    orderId: order.id,
                    method: 'card',
                    status: 'FAILED',
                    providerRef: providerRef || null,
                    amountKobo: order.totalKobo,
                },
            });

            return NextResponse.json({
                success: false,
                message: 'Payment failed',
            });
        }

        // Payment succeeded - update order and decrement inventory
        const itemPrepTimes = order.orderItems.map((oi) => ({
            prepTimeSec: oi.item.prepTimeSec,
            quantity: oi.quantity,
        }));

        const waitTimeSec = await estimateWaitTime(itemPrepTimes);
        const estReadyAt = new Date(Date.now() + waitTimeSec * 1000);

        await prisma.$transaction(async (tx) => {
            // Create payment record
            await tx.payment.create({
                data: {
                    orderId: order.id,
                    method: 'card',
                    status: 'SUCCESS',
                    providerRef: providerRef || null,
                    amountKobo: order.totalKobo,
                    confirmedAt: new Date(),
                },
            });

            // Update order status
            await tx.order.update({
                where: { id: order.id },
                data: {
                    status: 'PAID',
                    paidAt: new Date(),
                    estReadyAt,
                },
            });

            // Decrement inventory (for online payments)
            for (const orderItem of order.orderItems) {
                await tx.item.update({
                    where: { id: orderItem.itemId },
                    data: {
                        availableToday: {
                            decrement: orderItem.quantity,
                        },
                    },
                });
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Payment confirmed',
            estReadyAt,
        });
    } catch (error) {
        console.error('Payment confirmation failed:', error);
        return NextResponse.json(
            { error: 'Payment confirmation failed' },
            { status: 500 }
        );
    }
}
