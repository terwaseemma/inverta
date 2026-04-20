# @inverta/api

**Status: placeholder.**

The spec calls for a dedicated NestJS backend for installer-authenticated endpoints (auth, catalog CRUD, leads, proposals, etc.). For MVP those routes are being implemented as Next.js Route Handlers in `apps/web/app/api/` — it lets a single deployment and one Prisma client serve the whole product.

When the Next API surface gets big enough that extracting it makes sense, this package is where it goes. Suggested structure at that point:

```
apps/api/
  src/
    main.ts
    app.module.ts
    modules/
      auth/          AuthModule — JWT guard, Supabase session verify
      installer/     InstallerModule — profile + dashboard stats
      catalog/       CatalogModule — CRUD (tenant-scoped)
      leads/         LeadsModule — list, detail, status updates
      proposals/     ProposalsModule — generation, PDF, send
      products/      ProductsModule — public store + tenant management
      notifications/ NotificationsModule
    common/
      guards/        TenantGuard that asserts JWT installerId matches resource
      pipes/         ZodValidationPipe wrapping @inverta/shared schemas
      filters/       HTTP exception filter
  test/
```

Do NOT start this work until the Next API routes have clearly outgrown their home (likely after the proposal PDF + auth slices land).
