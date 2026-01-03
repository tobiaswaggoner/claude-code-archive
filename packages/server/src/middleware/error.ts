import type { Context } from "hono";
import { ZodError } from "zod";

export function errorHandler(err: Error, c: Context) {
  console.error("[Error]", err);

  if (err instanceof ZodError) {
    return c.json(
      {
        error: "Validation error",
        details: err.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      },
      400
    );
  }

  // Database errors
  if (err.message.includes("duplicate key")) {
    return c.json({ error: "Resource already exists" }, 409);
  }

  if (err.message.includes("violates foreign key")) {
    return c.json({ error: "Referenced resource not found" }, 400);
  }

  // Generic error
  return c.json(
    {
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    },
    500
  );
}
