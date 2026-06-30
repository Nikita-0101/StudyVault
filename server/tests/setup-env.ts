/*
 * Тесты не должны зависеть от настоящих
 * секретов из server/.env.
 */

process.env.NODE_ENV = 'test';
process.env.PORT = '5000';

process.env.DATABASE_URL =
  'postgresql://test:test@localhost:5432/studyvault_test';

process.env.JWT_SECRET =
  'test-jwt-secret-that-is-longer-than-sixty-four-characters-for-validation';

process.env.JWT_EXPIRES_IN = '1h';

process.env.SUPABASE_URL =
  'https://test-project.supabase.co';

process.env.SUPABASE_SECRET_KEY =
  'test-supabase-secret-key';

process.env.SUPABASE_STORAGE_BUCKET =
  'personal-materials';

process.env.FILE_UPLOAD_MAX_BYTES =
  String(20 * 1024 * 1024);