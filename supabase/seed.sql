-- Seed data: minimal auth-related records for local development
--
-- These use fake WorkOS IDs. In production, real WorkOS IDs are synced
-- via the handleAuth onSuccess callback.

-- Test users: admin, manufacturer, customer
INSERT INTO users (workos_user_id, workos_org_id, email, first_name, last_name, role)
VALUES
  ('user_test_admin_001', NULL, 'admin@refaccionesdirect.test', 'Admin', 'User', 'admin'),
  ('user_test_mfr_001', 'org_test_acr_001', 'manufacturer@acr-bearings.test', 'Juan', 'García', 'manufacturer'),
  ('user_test_customer_001', NULL, 'customer@example.test', 'María', 'López', 'customer');

-- Test manufacturer: ACR Bearings
INSERT INTO manufacturers (user_id, workos_org_id, company_name, brand_name, display_mode, rfc)
VALUES
  (
    (SELECT id FROM users WHERE workos_user_id = 'user_test_mfr_001'),
    'org_test_acr_001',
    'ACR Automotive Parts S.A. de C.V.',
    'ACR Bearings',
    'brand_only',
    'AAP210301XYZ'
  );
