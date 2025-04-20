import { PrismaClient as OriginalPrismaClient } from '@prisma/client';

declare global {
  namespace PrismaClient {
    interface PrismaClient extends OriginalPrismaClient {}
  }
}

declare module '@prisma/client' {
  interface PrismaClient {
    weddingGuest: {
      findUnique: (args: any) => Promise<any>;
      findMany: (args: any) => Promise<any[]>;
      create: (args: any) => Promise<any>;
      update: (args: any) => Promise<any>;
      delete: (args: any) => Promise<any>;
    };
  }
}

export {}; 