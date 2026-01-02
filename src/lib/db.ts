import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

// Only create PrismaClient if DATABASE_URL is available
// This prevents build failures when env vars aren't set
function createPrismaClient() {
    if (!process.env.DATABASE_URL) {
        // Return a mock during build if no DATABASE_URL
        // This will fail at runtime in API routes, but allows build to complete
        return new PrismaClient({
            datasourceUrl: 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
        });
    }
    return new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
