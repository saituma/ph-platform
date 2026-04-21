import { randomUUID } from "node:crypto";

/** Public receipt reference (emails, support). Distinct from internal DB id. */
export function newReceiptPublicId(): string {
  return randomUUID();
}
