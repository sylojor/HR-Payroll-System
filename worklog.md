---
Task ID: 1
Agent: Main Agent
Task: Fix 503 error on /api/setup endpoint and add database auto-initialization

Work Log:
- Diagnosed that 503 error occurs when database tables don't exist (fresh install scenario)
- Created /api/db-init endpoint that runs prisma db push + optional seed of default admin user
- Updated /api/setup/check to return dbError flag when database is not initialized
- Updated /api/setup POST to auto-run prisma db push before setup if tables don't exist
- Updated /api/auth POST to auto-initialize database on connection errors
- Updated Login component with database initialization UI (shows when dbError=true)
- Changed all execSync calls to async exec to prevent server hanging
- Tested all endpoints: setup/check, auth, dashboard, db-init all working
- Login page now shows a "Database Setup Required" screen with two options:
  1. Initialize with default admin (admin/admin123)
  2. Initialize without data (use setup wizard)

Stage Summary:
- Created /api/db-init endpoint for manual/auto database initialization
- All API endpoints now auto-detect and handle missing database tables
- Login component has new database initialization UI for fresh installs
- Default admin credentials: admin/admin123
- Server confirmed working with all endpoints returning 200
