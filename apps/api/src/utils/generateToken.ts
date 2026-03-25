/**
 * Auth Token Generator (Development Utility)
 * ===========================================
 * CLI tool for generating JWT tokens for testing and development.
 *
 * Usage:
 *   tsx src/utils/generateToken.ts --userId user123 --roles admin,user --lang en
 */

import { Command } from "commander";
import { generateAccessToken, generateRefreshToken } from "../middleware/auth.js";

const program = new Command();

program
  .name("generate-token")
  .description("Generate JWT tokens for development and testing")
  .requiredOption("-u, --userId <id>", "User ID (sub claim)")
  .option("-r, --roles <roles>", "Comma-separated roles", "viewer")
  .option("-l, --lang <lang>", "Language code", "en")
  .option("-t, --type <type>", "Token type (access|refresh)", "access")
  .action(async (options) => {
    const { userId, roles, lang, type } = options;
    const roleArray = roles.split(",").map((r: string) => r.trim());

    try {
      if (type === "refresh") {
        const token = await generateRefreshToken(userId);
        console.log("\n🔑 Refresh Token Generated:\n");
        console.log(token);
        console.log("\nUse this to obtain new access tokens");
      } else {
        const token = await generateAccessToken(userId, roleArray, lang);
        console.log("\n🔑 Access Token Generated:\n");
        console.log(token);
        console.log("\n\nUsage in curl:");
        console.log(`\ncurl -H "Authorization: Bearer ${token}" \\`);
        console.log("  http://localhost:4000/api/partners");
        console.log("\n\nClaims:");
        console.log({
          sub: userId,
          roles: roleArray,
          lang,
          type: "access",
        });
      }
    } catch (error) {
      console.error("Error generating token:", error);
      process.exit(1);
    }
  });

program.parse();
