#!/bin/bash

# Navigate to the database package
cd packages/db || exit

echo "🔄 Resetting database schema..."
npx prisma db push --force-reset

echo "🌱 Running standard seeder..."
npx tsx prisma/seed.ts

echo "🚀 Running legacy migration seeder..."
npx tsx prisma/seed-legacy.ts

echo "✅ Database reset and seeding completed successfully!"
