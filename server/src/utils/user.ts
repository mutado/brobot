import { User } from "grammy/types";
import withPrisma from "./prisma";
import { User as PrismaUser } from "@prisma/client";

export async function getOrCreateUser(userOrId: User | number | undefined, firstName: string | null = null): Promise<PrismaUser> {
    if (!userOrId) {
        throw new Error("User is undefined")
    }
    return await withPrisma(async (prisma) => {
        const id = typeof userOrId === "number" ? userOrId : userOrId.id;
        const name = typeof userOrId === "number" ? firstName : userOrId.first_name;

        const existingUser = await prisma.user.findUnique({
            where: {
                id
            }
        })

        if (existingUser) {
            return existingUser;
        } else {
            return await prisma.user.create({
                data: {
                    id,
                    name,
                }
            })
        }
    })
}