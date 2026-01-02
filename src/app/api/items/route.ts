import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateQueueDelay, formatPrepTime } from '@/lib/prep-time';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const items = await prisma.item.findMany({
            where: {
                isAvailable: true,
                availableToday: { gt: 0 },
            },
            orderBy: {
                name: 'asc',
            },
        });

        const queueDelay = await calculateQueueDelay();

        const itemsWithPrepTime = items.map((item) => ({
            id: item.id,
            name: item.name,
            priceKobo: item.priceKobo,
            prepTimeSec: item.prepTimeSec,
            availableToday: item.availableToday,
            estimatedWait: formatPrepTime(queueDelay + item.prepTimeSec),
        }));

        return NextResponse.json({
            items: itemsWithPrepTime,
            queueDelaySec: queueDelay,
        });
    } catch (error) {
        console.error('Failed to fetch items:', error);
        return NextResponse.json(
            { error: 'Failed to fetch items' },
            { status: 500 }
        );
    }
}
