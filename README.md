# KT Portal (Project Aura)

Next.js + Prisma (SQL Server) web application for weekly KT tracking across towers.

## Local development

```bash
npm ci
npm run db:push
npm run db:seed
npm run dev
```

## Required environment variables

Use `.env.example` as the template.

- `DATABASE_URL` (SQL Server / Azure SQL)
- `NEXTAUTH_SECRET`
- `AZURE_OPENAI_KEY` (optional)
- `AZURE_OPENAI_ENDPOINT` (optional)
- `AZURE_OPENAI_DEPLOYMENT` (optional, default `gpt-4o`)

## Build and runtime scripts

- `npm run build` - Next.js production build
- `npm run start` - production server
- `npm run db:generate` - generate Prisma Client
- `npm run db:migrate:deploy` - apply migrations in production
- `npm run db:push` - push schema (use for non-migration workflows)

## Azure Web App deployment checklist

1. Create Azure resources:
   - Azure Web App (Linux, Node 20 LTS)
   - Azure SQL database
2. Configure Web App application settings:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `AZURE_OPENAI_KEY` / `AZURE_OPENAI_ENDPOINT` (if used)
   - `AZURE_OPENAI_DEPLOYMENT` (if used)
3. Deploy from GitHub Actions using `.github/workflows/main_projectora.yml`.
4. Initialize database:
   - Preferred: `npm run db:migrate:deploy`
   - Alternative: `npm run db:push`
5. Optional initial data load:
   - `npm run db:seed`

## Notes

- Prisma Client generation is enforced via `postinstall` and `prebuild`.
- The app currently uses a stub cookie-based auth flow for login and role routing.
