import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient;
}

// Validate DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is required. " +
    "For local development, set it to 'file:./prisma/dev.sqlite'. " +
    "For production, set it to your PostgreSQL connection string."
  );
}

// Optimize Prisma connection for production with better error handling
const createPrismaClient = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" 
      ? ["query", "error", "warn"] 
      : ["error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // Add connection error handling
  client.$on("error" as never, (e: any) => {
    console.error("🔴 [PRISMA] Database error:", e);
  });

  // Handle connection issues
  client.$connect().catch((error) => {
    console.error("🔴 [PRISMA] Failed to connect to database:", error);
    console.error("🔴 [PRISMA] DATABASE_URL:", process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":****@"));
  });

  return client;
};

// Singleton pattern for development, new instance for production
if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = createPrismaClient();
  }
}

const prisma = global.prismaGlobal ?? createPrismaClient();

// Enhanced connection management for production
if (process.env.NODE_ENV === "production") {
  // Handle graceful shutdown
  process.on("beforeExit", async () => {
    console.log("🟡 [PRISMA] Disconnecting from database...");
    await prisma.$disconnect().catch((error) => {
      console.error("🔴 [PRISMA] Error disconnecting:", error);
    });
  });

  // Handle uncaught exceptions
  process.on("uncaughtException", async (error) => {
    console.error("🔴 [PRISMA] Uncaught exception:", error);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  });

  // Handle unhandled rejections
  process.on("unhandledRejection", async (reason) => {
    console.error("🔴 [PRISMA] Unhandled rejection:", reason);
    if (reason instanceof Error && reason.message.includes("Closed")) {
      console.log("🟡 [PRISMA] Connection closed, attempting to reconnect...");
      try {
        await prisma.$connect();
        console.log("🟢 [PRISMA] Reconnected successfully");
      } catch (error) {
        console.error("🔴 [PRISMA] Reconnection failed:", error);
      }
    }
  });

  // Periodic health check for connection
  setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      console.error("🔴 [PRISMA] Connection health check failed:", error);
      // Attempt to reconnect
      try {
        await prisma.$disconnect();
        await prisma.$connect();
        console.log("🟢 [PRISMA] Reconnected after health check failure");
      } catch (reconnectError) {
        console.error("🔴 [PRISMA] Reconnection attempt failed:", reconnectError);
      }
    }
  }, 30000); // Check every 30 seconds
}

// Helper function to execute queries with retry logic
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a connection error
      const isConnectionError = 
        error?.message?.includes("Closed") ||
        error?.message?.includes("connection") ||
        error?.code === "P1001" ||
        error?.code === "P1008";
      
      if (isConnectionError && attempt < maxRetries) {
        console.warn(`🟡 [PRISMA] Connection error (attempt ${attempt}/${maxRetries}), retrying...`);
        
        // Try to reconnect
        try {
          await prisma.$disconnect();
          await prisma.$connect();
          console.log("🟢 [PRISMA] Reconnected, retrying operation...");
        } catch (reconnectError) {
          console.error("🔴 [PRISMA] Reconnection failed:", reconnectError);
        }
        
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay * attempt));
        continue;
      }
      
      // If not a connection error or max retries reached, throw
      throw error;
    }
  }
  
  throw lastError || new Error("Operation failed after retries");
}

export default prisma;
