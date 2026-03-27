process.env.NODE_ENV ??= "test";
process.env.DATABASE_URL ??= "postgres://postgres:postgres@localhost:5432/afenda_test";
process.env.JWT_SECRET ??= "test-jwt-secret-with-minimum-length-32";
