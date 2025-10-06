import { DefaultSession } from "next-auth";
import { authOptions } from '@/app/api/auth/[...nextauth]/options'

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"]
  }
}

// Re-export authOptions from NextAuth options.ts
export { authOptions }; 