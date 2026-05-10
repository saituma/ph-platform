// Shared k6 load test configuration for PH Performance API
// All secrets come from env vars — never hardcoded.

export const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
export const API_URL = __ENV.API_URL || `${BASE_URL}/api`;

// Test user credentials — must be pre-seeded in the target DB.
// See docs/load-testing.md for seed instructions.
export const TEST_USER_EMAIL = __ENV.TEST_USER_EMAIL || "loadtest@example.com";
export const TEST_USER_PASSWORD = __ENV.TEST_USER_PASSWORD || "loadtest123";
export const PARENT_TEST_EMAIL = __ENV.PARENT_TEST_EMAIL || "parent-loadtest@example.com";
export const PARENT_TEST_PASSWORD = __ENV.PARENT_TEST_PASSWORD || "loadtest123";
export const ADMIN_TEST_EMAIL = __ENV.ADMIN_TEST_EMAIL || "admin-loadtest@example.com";
export const ADMIN_TEST_PASSWORD = __ENV.ADMIN_TEST_PASSWORD || "loadtest123";

// Default thresholds — tightened per-scenario in suite.js
export const THRESHOLDS = {
  http_req_duration: ["p(95)<800", "p(99)<2000"],
  http_req_failed: ["rate<0.01"],
};

// Quick local validation: 2 VUs, 30 s
export const SMOKE_OPTIONS = {
  vus: 2,
  duration: "30s",
  thresholds: THRESHOLDS,
};

// Standard load profile for staging
export const LOAD_OPTIONS = {
  stages: [
    { duration: "2m", target: 20 },   // ramp up
    { duration: "5m", target: 50 },   // sustained load
    { duration: "2m", target: 100 },  // peak
    { duration: "2m", target: 0 },    // ramp down
  ],
  thresholds: THRESHOLDS,
};

// Stress profile — reveals breaking points
export const STRESS_OPTIONS = {
  stages: [
    { duration: "2m", target: 50 },
    { duration: "5m", target: 150 },
    { duration: "2m", target: 200 },
    { duration: "2m", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000", "p(99)<5000"],
    http_req_failed: ["rate<0.05"],
  },
};
