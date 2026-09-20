/**
 * SECURITY CHALLENGE — TEMPORARY, DO NOT MERGE
 *
 * This fixture intentionally models an authorization flaw for security-review testing.
 * It is NOT imported by the application and must remain isolated from production.
 *
 * Expected finding:
 * - Authorization is checked only on the client boundary.
 * - The data-access function does not enforce ownership/scope.
 * - A production implementation must enforce authorization server-side/RLS.
 */

export type SecurityChallengeCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

const fixtureCustomers: SecurityChallengeCustomer[] = [
  { id: "fixture-001", name: "Cliente de prueba", email: "test@example.invalid", phone: "000000000" },
];

export function insecureListCustomers(): SecurityChallengeCustomer[] {
  // INTENTIONAL VULNERABILITY FOR SECURITY REVIEW:
  // No authorization or tenant/sede ownership check is performed here.
  return fixtureCustomers;
}
