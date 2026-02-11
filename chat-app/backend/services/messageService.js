import { prisma } from "../lib/prisma.js";

export async function createMessage(role, content) {
  return prisma.message.create({
    data: { role, content },
  });
}

export async function getAllMessages() {
  return prisma.message.findMany({
    orderBy: { createdAt: "asc" },
  });
}
