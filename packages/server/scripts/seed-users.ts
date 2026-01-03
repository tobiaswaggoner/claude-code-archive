/**
 * Seed script for creating initial admin and system users.
 *
 * Usage: pnpm db:seed
 *
 * Environment variables:
 *   ADMIN_PASSWORD - Password for admin user (default: "admin123!")
 *   SYSTEM_API_KEY - API key for system user (default: auto-generated)
 *   DATABASE_URL   - PostgreSQL connection string (required)
 */

import { randomBytes } from "node:crypto";
import { db, closeConnection } from "../src/db/connection.js";
import { authUser, authAccount } from "../src/db/schema/index.js";
import { hashPassword } from "better-auth/crypto";

// Generate a random API key in the format ca_<32 hex chars>
function generateApiKey(): string {
  return `ca_${randomBytes(16).toString("hex")}`;
}

// Generate a random password (for system user that doesn't use password auth)
function generateRandomPassword(): string {
  return randomBytes(32).toString("base64");
}

async function seed(): Promise<void> {
  console.log("Seeding users...\n");

  const adminPassword = process.env.ADMIN_PASSWORD || "admin123!";
  const systemApiKey = process.env.SYSTEM_API_KEY || generateApiKey();

  // Hash passwords using Better Auth's scrypt-based hasher
  const adminPasswordHash = await hashPassword(adminPassword);
  const systemPasswordHash = await hashPassword(generateRandomPassword());

  // Insert admin user
  const adminResult = await db
    .insert(authUser)
    .values({
      name: "Admin",
      email: "admin@claude-archive.local",
      emailVerified: true,
      role: "admin",
      apiKey: null,
    })
    .onConflictDoNothing({ target: authUser.email })
    .returning({ id: authUser.id, email: authUser.email });

  if (adminResult.length > 0) {
    const adminUser = adminResult[0];
    console.log(`Created admin user: ${adminUser.email} (id: ${adminUser.id})`);

    // Create credential account for admin
    await db
      .insert(authAccount)
      .values({
        userId: adminUser.id,
        accountId: adminUser.id,
        providerId: "credential",
        password: adminPasswordHash,
      })
      .onConflictDoNothing();

    console.log("  - Created credential account with password");
  } else {
    console.log("Admin user already exists, skipping...");
  }

  // Insert system user
  const systemResult = await db
    .insert(authUser)
    .values({
      name: "System",
      email: "system@claude-archive.local",
      emailVerified: true,
      role: "system",
      apiKey: systemApiKey,
    })
    .onConflictDoNothing({ target: authUser.email })
    .returning({ id: authUser.id, email: authUser.email, apiKey: authUser.apiKey });

  if (systemResult.length > 0) {
    const systemUser = systemResult[0];
    console.log(`\nCreated system user: ${systemUser.email} (id: ${systemUser.id})`);

    // Create credential account for system (not used, but required by schema)
    await db
      .insert(authAccount)
      .values({
        userId: systemUser.id,
        accountId: systemUser.id,
        providerId: "credential",
        password: systemPasswordHash,
      })
      .onConflictDoNothing();

    console.log("  - Created credential account (not used)");
    console.log(`  - API Key: ${systemUser.apiKey}`);
  } else {
    console.log("\nSystem user already exists, skipping...");
  }

  console.log("\nDone!");
}

// Main entry point
seed()
  .then(async () => {
    await closeConnection();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await closeConnection();
    process.exit(1);
  });
