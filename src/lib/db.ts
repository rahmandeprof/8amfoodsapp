import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

// Use getter pattern for truly lazy initialization
// This prevents PrismaClient from being instantiated at build time
function getPrismaClient(): PrismaClient {
    if (!globalForPrisma.prisma) {
        globalForPrisma.prisma = new PrismaClient();
    }
    return globalForPrisma.prisma;
}

// Export as a getter to ensure lazy initialization
export const prisma = new Proxy({} as PrismaClient, {
    get(_, prop) {
        return (getPrismaClient() as Record<string, unknown>)[prop as string];
    },
});
