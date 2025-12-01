# Rollback Strategy: Notification System Migration

## Overview
This document outlines the complete rollback procedure for the notification system migration. The migration includes schema changes, data migration, and new tables.

## Migration Components
1. **Schema Migration**: `20251129164311_add_entity_fields_to_notifications`
2. **Data Migration**: Migration of notification preferences from `usuarios` to `notification_preferences`
3. **New Tables**: `notification_preferences`, `notification_templates`, `notification_metrics`

## Rollback Procedures

### Option 1: Complete Rollback (Recommended for Development)

#### Step 1: Rollback Data Migration
```bash
cd changanet/changanet-backend
node prisma/migrations/migrate_notification_preferences.js rollback
```

This will:
- Delete all records from `notification_preferences` table
- Preserve original data in `usuarios` table

#### Step 2: Rollback Schema Migration
```bash
# Reset to previous migration
npx prisma migrate reset --force

# Or manually rollback the specific migration
npx prisma migrate resolve --rolled-back 20251129164311_add_entity_fields_to_notifications
```

#### Step 3: Regenerate Prisma Client
```bash
npx prisma generate
```

### Option 2: Selective Rollback (For Production)

#### Step 1: Manual Data Cleanup
If you need to preserve some data, manually clean up:

```sql
-- Remove notification preferences (keeping original user data)
DELETE FROM notification_preferences;

-- Remove notification metrics
DELETE FROM notification_metrics;

-- Remove notification templates (if they were added during migration)
DELETE FROM notification_templates WHERE /* condition to identify migrated templates */;
```

#### Step 2: Schema Rollback
```bash
# Mark migration as rolled back
npx prisma migrate resolve --rolled-back 20251129164311_add_entity_fields_to_notifications

# Apply the rollback SQL manually if needed
```

### Option 3: Emergency Rollback Script

```javascript
// rollback_notification_migration.js
const { PrismaClient } = require('@prisma/client');

async function emergencyRollback() {
  const prisma = new PrismaClient();

  try {
    console.log('🚨 Starting emergency rollback...');

    // 1. Delete all notification-related data
    await prisma.notification_metrics.deleteMany();
    await prisma.notification_templates.deleteMany();
    await prisma.notification_preferences.deleteMany();

    // 2. Remove new columns from notificaciones (if needed)
    // Note: Prisma doesn't support column removal in SQLite easily
    // You may need to recreate the table

    console.log('✅ Emergency rollback completed');
  } catch (error) {
    console.error('💥 Emergency rollback failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

emergencyRollback();
```

## Validation After Rollback

After rollback, run the validation script to ensure clean state:

```bash
node prisma/validate_notification_migration.js
```

Expected results after successful rollback:
- ✅ notification_preferences table exists with 0 records
- ✅ notification_templates table exists with 0 records
- ✅ notification_metrics table exists with 0 records
- ✅ notificaciones table should not have entity_type/entity_id columns

## Recovery Procedures

### If Rollback Fails
1. **Database Backup**: Always have a backup before migration
2. **Manual Cleanup**: Use database tools to manually clean up
3. **Fresh Migration**: Drop and recreate database, then re-run migration

### Data Recovery
- Original notification preferences remain in `usuarios` table
- No data loss occurs during rollback
- Templates and metrics can be recreated from code

## Testing Rollback

### Pre-Rollback Checklist
- [ ] Database backup created
- [ ] Application stopped
- [ ] No active transactions
- [ ] Validation script passes

### Post-Rollback Checklist
- [ ] Run validation script
- [ ] Test application functionality
- [ ] Verify user notification preferences work
- [ ] Check notification sending still works

## Prevention Measures

### For Future Migrations
1. **Always backup** before migration
2. **Test rollback** in development environment
3. **Use transactions** for data migrations
4. **Implement feature flags** for gradual rollout
5. **Monitor performance** after migration

### Monitoring
- Set up alerts for migration failures
- Monitor application performance post-migration
- Log all migration activities

## Contact Information

For issues with rollback:
- Check application logs
- Review database state
- Contact development team

---

**Important**: This rollback strategy preserves data integrity. The original notification preferences in the `usuarios` table remain intact and can be migrated again if needed.
