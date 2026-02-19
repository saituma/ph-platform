import Stripe from "stripe";

import { pool } from "../../src/db";
import { env } from "../../src/config/env";

const hasDatabase = Boolean(env.databaseUrl);
const hasStripe = Boolean(env.stripeSecretKey);

if (!hasDatabase) {
  describe.skip("integration: database", () => {
    it("skipped: DATABASE_URL missing", () => {});
  });
} else {
  describe("integration: database", () => {
    jest.setTimeout(20000);

    afterAll(async () => {
      await pool.end();
    });

    it("connects and runs a basic query", async () => {
      const result = await pool.query("select 1 as ok");
      expect(result.rows[0]?.ok).toBe(1);
    });

    it("reads from athletes table", async () => {
      const result = await pool.query('select count(*)::int as count from "athletes"');
      expect(Number.isFinite(result.rows[0]?.count)).toBe(true);
    });
  });
}

if (!hasStripe) {
  describe.skip("integration: stripe", () => {
    it("skipped: STRIPE_SECRET_KEY missing", () => {});
  });
} else {
  describe("integration: stripe", () => {
    jest.setTimeout(20000);

    it("lists prices", async () => {
      const stripe = new Stripe(env.stripeSecretKey, { apiVersion: "2025-02-24.acacia" });
      const prices = await stripe.prices.list({ limit: 1 });
      expect(prices.data).toBeDefined();
    });

    it("lists products", async () => {
      const stripe = new Stripe(env.stripeSecretKey, { apiVersion: "2025-02-24.acacia" });
      const products = await stripe.products.list({ limit: 1 });
      expect(products.data).toBeDefined();
    });
  });
}
