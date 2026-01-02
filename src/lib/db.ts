import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

// Create PrismaClient with explicit datasource URL for Vercel deployment
// Prisma 7 requires passing the URL explicitly when not using the default env var loading
function createPrismaClient() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.warn('DATABASE_URL is not set');
    }

    return new PrismaClient({
        datasources: {
            db: {
                url: databaseUrl,
            },
        },
    });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
