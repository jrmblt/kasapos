#!/bin/sh
set -e
cd /app/packages/database
bunx prisma migrate deploy
cd /app
exec node apps/api/dist/main.js
