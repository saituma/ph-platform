/**
 * Send test renders of the redesigned discount emails directly via Resend/SMTP.
 * Bypasses the outbox queue — run with the API's env vars loaded.
 *
 * Usage:
 *   pnpm --filter api exec tsx src/scripts/send-test-discount-email.ts dawitworkujima@gmail.com
 */

import "dotenv/config";
import { deliverEmail } from "../lib/mailer/base.mailer";
import { renderPromoCodeEmail, renderAdminWelcomeCredentialsEmail } from "../lib/mailer/auth.mailer";

const to = process.argv[2];
if (!to) {
  console.error("Usage: tsx send-test-discount-email.ts <email>");
  process.exit(1);
}

async function main() {
  console.log(`Sending test discount emails to ${to} …`);

  // 1. Standalone promo code email
  const promo = renderPromoCodeEmail({
    code: "LAUNCH30",
    discountPercent: 30,
    expiresAt: new Date(Date.now() + 7 * 86_400_000),
  });
  await deliverEmail({ to, subject: `[TEST] ${promo.subject}`, html: promo.html });
  console.log("✓ sendPromoCodeEmail sent");

  // 2. Welcome email with embedded promo block
  const welcome = renderAdminWelcomeCredentialsEmail({
    guardianName: "Alex Johnson",
    temporaryPassword: "TmpPass#9142",
    promoCode: { code: "WELCOME20", discountPercent: 20 },
  });
  await deliverEmail({ to, subject: `[TEST] ${welcome.subject}`, html: welcome.html });
  console.log("✓ sendAdminWelcomeCredentialsEmail sent");

  console.log("Done — check your inbox.");
}

main().catch((err) => {
  console.error("Fatal:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
