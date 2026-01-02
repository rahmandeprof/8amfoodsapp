import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateOrderCode } from '@/lib/order-code';
import { PaymentMethod } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface OrderItemInput {
    itemId: string;
    quantity: number;
}

interface CreateOrderRequest {
    items: OrderItemInput[];
    paymentMethod: 'ONLINE' | 'IN_PERSON';
    phone?: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: CreateOrderRequest = await request.json();
        const { items, paymentMethod, phone } = body;

        if (!items || items.length === 0) {
            return NextResponse.json(
                { error: 'No items in order' },
                { status: 400 }
            );
        }

        // Validate inventory and calculate total
        const itemIds = items.map((i) => i.itemId);
        const dbItems = await prisma.item.findMany({
            where: { id: { in: itemIds } },
        });

        if (dbItems.length !== itemIds.length) {
            return NextResponse.json(
                { error: 'Some items not found' },
                { status: 400 }
            );
        }

        // Check availability
        for (const orderItem of items) {
            const dbItem = dbItems.find((i) => i.id === orderItem.itemId);
            if (!dbItem || dbItem.availableToday < orderItem.quantity) {
                return NextResponse.json(
                    {
                        error: `${dbItem?.name || 'Item'} is no longer available in requested quantity`,
                        itemId: orderItem.itemId,
                    },
                    { status: 409 }
                );
            }
        }

        // Calculate total
        let totalKobo = 0;
        for (const orderItem of items) {
            const dbItem = dbItems.find((i) => i.id === orderItem.itemId)!;
            totalKobo += dbItem.priceKobo * orderItem.quantity;
        }

        // Generate order code
        const shortCode = generateOrderCode();

        // Create expiration time for pay-on-pickup (15 minutes)
        const expiresAt = paymentMethod === 'IN_PERSON'
            ? new Date(Date.now() + 15 * 60 * 1000)
            : null;

        // Create order in transaction
        const order = await prisma.$transaction(async (tx) => {
            // Create the order
            const newOrder = await tx.order.create({
                data: {
                    shortCode,
                    status: paymentMethod === 'ONLINE' ? 'PENDING' : 'PENDING',
                    paymentMethod: paymentMethod as PaymentMethod,
                    phone: phone || null,
                    totalKobo,
                    expiresAt,
                    orderItems: {
                        create: items.map((item) => {
                            const dbItem = dbItems.find((i) => i.id === item.itemId)!;
                            return {
                                itemId: item.itemId,
                                quantity: item.quantity,
                                unitPriceKobo: dbItem.priceKobo,
                            };
                        }),
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

            // For pay-on-pickup, decrement inventory now (held for 15 min)
            if (paymentMethod === 'IN_PERSON') {
                for (const orderItem of items) {
                    await tx.item.update({
                        where: { id: orderItem.itemId },
                        data: {
                            availableToday: {
                                decrement: orderItem.quantity,
                            },
                        },
                    });
                }
            }

            return newOrder;
        });

        return NextResponse.json({
            success: true,
            order: {
                id: order.id,
                shortCode: order.shortCode,
                status: order.status,
                totalKobo: order.totalKobo,
                paymentMethod: order.paymentMethod,
                expiresAt: order.expiresAt,
                items: order.orderItems.map((oi) => ({
                    name: oi.item.name,
                    quantity: oi.quantity,
                    unitPriceKobo: oi.unitPriceKobo,
                })),
            },
        });
    } catch (error) {
        console.error('Failed to create order:', error);
        return NextResponse.json(
            { error: 'Failed to create order' },
            { status: 500 }
        );
    }
}
