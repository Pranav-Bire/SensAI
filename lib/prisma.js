import { PrismaClient } from "@prisma/client";

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global;

export const db = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// This ensures Prisma Client is only used in server-side contexts
export function getPrismaClient() {
  if (typeof window === "undefined") {
    return db;
  }
  return null;