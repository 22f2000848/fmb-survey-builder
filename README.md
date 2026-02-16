# CG Dump Server

AWS-deployable fullstack platform for multi-tenant dump sheet workflows.

## Architecture

```text
fmb-survey-builder/
  apps/
    web/                    # Next.js app router (UI + API routes)
  packages/
    db/                     # Prisma schema + Prisma client
    core/                   # Auth, RBAC, tenancy, domain services
    shared/                 # Shared zod schemas, template definitions
  client/                   # Legacy React app (source retained)
  server/                   # Legacy Express app (source retained)
```

## What Is Implemented

- Next.js + TypeScript app in `apps/web`
- Legacy survey flows ported to Next API route handlers (backward-compatible paths)
- Cognito JWT verification + RBAC (`admin`, `state_user`)
- Prisma/Postgres data model for:
  - `User`, `State`, `Product`, `StateProduct`
  - `Template`, `Dataset`, `DatasetRow`, `AuditLog`
- Server-side tenancy enforcement:
  - state users can only access their own state datasets
  - admin can operate across states
- Product enablement enforcement (state-product gate) on dataset create/list/get
- FMB template seed endpoint + grid editor UI
- XLSX import/export for datasets
- S3 presigned upload/download URL endpoints
- Structured JSON logging and in-memory rate limiting
- Minimal API route tests (Vitest)

## API Summary

### Legacy-compatible routes

- `GET/POST /api/surveys`
- `GET/PUT/DELETE /api/surveys/:id`
- `GET/POST /api/surveys/:id/questions`
- `PUT/DELETE /api/surveys/:id/questions/:questionId`
- `POST /api/surveys/:id/duplicate`
- `POST /api/surveys/:id/questions/:questionId/duplicate`
- `GET /api/export/:surveyId`
- `POST /api/import`
- `POST /api/validate-upload`
- `GET /api/validation-schema`
- `POST /api/translate`
- `GET /api/health`

### Platform routes (authenticated)

- Admin:
  - `POST /api/admin/states`
  - `POST /api/admin/users`
  - `PUT /api/admin/state-products`
  - `POST /api/admin/templates`
  - `POST /api/admin/templates/fmb`
- State/Admin:
  - `GET /api/state/products`
  - `GET/POST /api/datasets`
  - `GET /api/datasets/:datasetId`
  - `PUT /api/datasets/:datasetId/rows`
  - `POST /api/datasets/:datasetId/import/xlsx`
  - `GET /api/datasets/:datasetId/export/xlsx`
  - `GET /api/templates?productCode=FMB`
  - `POST /api/storage/presign-upload`
  - `POST /api/storage/presign-download`

## Local Development

```bash
npm install
npm run prisma:generate --workspace @cg-dump/db
npm run dev
```

Useful checks:

```bash
npm run typecheck --workspace @cg-dump/web
npm run build --workspace @cg-dump/web
npm run test --workspace @cg-dump/web
```

## Deploy on AWS

### Recommended stack

- App: ECS Fargate or App Runner
- Auth: Cognito User Pool
- Database: RDS PostgreSQL
- Object storage: S3
- Secret/config: AWS Systems Manager Parameter Store or Secrets Manager

### Deployment steps

1. Provision AWS resources:
   - Cognito User Pool + App Client + groups (`admin`, `state_user`)
   - RDS PostgreSQL
   - S3 bucket for uploads/exports
2. Build container:
   - `npm ci`
   - `npm run build --workspace @cg-dump/web`
3. Run Prisma migrations on deployment job:
   - `npm run prisma:deploy --workspace @cg-dump/db`
4. Start app:
   - `npm run start --workspace @cg-dump/web`
5. Expose service behind ALB/API Gateway/CloudFront as needed.

## Environment Variables

All variables are read by server-side route handlers.

```bash
# Runtime
NODE_ENV=production

# Postgres
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public

# AWS
AWS_REGION=ap-south-1
S3_BUCKET=your-bucket-name
S3_UPLOAD_PREFIX=uploads
S3_EXPORT_PREFIX=exports

# Cognito auth
COGNITO_USER_POOL_ID=ap-south-1_xxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxx
COGNITO_ISSUER=https://cognito-idp.ap-south-1.amazonaws.com/ap-south-1_xxxxx
# Optional override:
COGNITO_JWKS_URL=https://cognito-idp.ap-south-1.amazonaws.com/ap-south-1_xxxxx/.well-known/jwks.json

# Translation upstream
TRANSLATE_API_URL=https://libretranslate.de/translate
TRANSLATE_API_KEY=
TRANSLATE_TIMEOUT_MS=10000

# Upload/rate limits
MAX_UPLOAD_BYTES=10485760
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=120

# Local dev only (bypass Cognito verification)
AUTH_BYPASS=false
```

## Notes

- Error format is standardized for new platform routes:
  - `{ "error": "message", "details": ... }`
- Legacy routes are retained for compatibility while platform routes cover new multi-tenant dataset workflows.
