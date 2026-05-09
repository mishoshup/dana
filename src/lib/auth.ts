import { betterAuth } from "better-auth";
import { prisma } from "@/lib/db";
import { prismaAdapter } from "better-auth/adapters/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  advanced: {
    cookiePrefix: "dana",
    csrf: {
      enabled: true,
      origin: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 10,
    },
  },
});

export type Session = typeof auth.$Infer.Session;
