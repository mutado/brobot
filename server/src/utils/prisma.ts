import { PrismaClient } from "@prisma/client";

export default async function withPrisma(cb: (prisma: PrismaClient) => Promise<any>): Promise<any> {
    const prisma = new PrismaClient();
    const res = await cb(prisma);
    await prisma.$disconnect();
    return res;
}