#!/bin/bash

echo "🔄 Resetting database schema..."
# --force-reset akan menghapus semua data
pnpm --filter @alizzah/api exec prisma db push --force-reset

echo "🌱 Running standard seeder (Master Data)..."
pnpm --filter @alizzah/api exec tsx prisma/seed.ts

echo "🚀 Running legacy migration seeder (Siswa Data)..."
pnpm --filter @alizzah/api exec tsx prisma/seed-legacy.ts

echo "✅ Database reset and seeding completed successfully!"
