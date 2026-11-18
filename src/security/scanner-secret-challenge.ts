/**
 * SECURITY SCANNER CHALLENGE — REMOVE AFTER VALIDATION
 *
 * This file intentionally contains a NON-FUNCTIONAL test credential pattern.
 * It is not a real provider credential and must never be used by application code.
 *
 * Purpose: validate that automated security scanning detects secret-shaped
 * credentials committed to client-side source code.
 */

// DELIBERATELY INSECURE TEST FIXTURE — NOT A REAL SECRET.
export const SECURITY_SCANNER_TEST_OPENAI_KEY =
  "sk-proj-TESTONLY-DO-NOT-USE-000000000000000000000000000000000000000000000000";

export const SECURITY_SCANNER_TEST_DATABASE_URL =
  "postgresql://test_scanner_user:TEST_ONLY_NOT_A_PASSWORD@scanner.invalid:5432/test";
