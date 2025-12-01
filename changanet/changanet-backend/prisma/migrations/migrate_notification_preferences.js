/**
 * Data Migration Script: Migrate notification preferences from usuarios table to notification_preferences table
 *
 * This script safely migrates existing notification preference data from the usuarios table
 * to the new notification_preferences table while maintaining data integrity.
 *
 * Run this script after applying the schema migration.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateNotificationPreferences() {
  console.log('🚀 Starting notification preferences data migration...');

  try {
    // Get all users with notification preferences
    const users = await prisma.usuarios.findMany({
      select: {
        id: true,
        notificaciones_push: true,
        notificaciones_email: true,
        notificaciones_sms: true,
        notificaciones_servicios: true,
        notificaciones_mensajes: true,
        notificaciones_pagos: true,
        notificaciones_marketing: true,
      },
    });

    console.log(`📊 Found ${users.length} users to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      try {
        // Check if user already has notification preferences
        const existingPrefs = await prisma.notification_preferences.findUnique({
          where: { usuario_id: user.id },
        });

        if (existingPrefs) {
          console.log(`⏭️  User ${user.id} already has notification preferences, skipping`);
          skippedCount++;
          continue;
        }

        // Create notification preferences record
        const preferences = {
          enabled: true, // Default to enabled
          timezone: 'America/Buenos_Aires',
          canales: JSON.stringify({
            push: user.notificaciones_push ?? true,
            email: user.notificaciones_email ?? true,
            sms: user.notificaciones_sms ?? false,
            in_app: true, // Default for in-app notifications
          }),
          categorias: JSON.stringify({
            servicios: user.notificaciones_servicios ?? true,
            mensajes: user.notificaciones_mensajes ?? true,
            pagos: user.notificaciones_pagos ?? true,
            marketing: user.notificaciones_marketing ?? false,
            sistema: true, // Default for system notifications
          }),
          quiet_hours_enabled: false,
          summary_frequency: 'immediate',
          max_notifications_per_hour: 50,
          group_similar: true,
          sound_enabled: true,
        };

        await prisma.notification_preferences.create({
          data: {
            usuario_id: user.id,
            ...preferences,
          },
        });

        migratedCount++;
        console.log(`✅ Migrated preferences for user ${user.id}`);

      } catch (error) {
        console.error(`❌ Error migrating user ${user.id}:`, error);
        throw error;
      }
    }

    console.log(`\n🎉 Migration completed successfully!`);
    console.log(`📈 Migrated: ${migratedCount} users`);
    console.log(`⏭️  Skipped: ${skippedCount} users (already had preferences)`);

    // Verification: Check that all users now have preferences
    const totalUsers = await prisma.usuarios.count();
    const usersWithPrefs = await prisma.notification_preferences.count();

    console.log(`\n🔍 Verification:`);
    console.log(`👥 Total users: ${totalUsers}`);
    console.log(`📋 Users with preferences: ${usersWithPrefs}`);

    if (usersWithPrefs >= totalUsers) {
      console.log('✅ All users have notification preferences!');
    } else {
      console.warn('⚠️  Some users may not have preferences. Please check manually.');
    }

  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Rollback function (for reference - would need to be run manually)
async function rollbackMigration() {
  console.log('🔄 Starting rollback of notification preferences migration...');

  try {
    const deletedCount = await prisma.notification_preferences.deleteMany();
    console.log(`🗑️  Deleted ${deletedCount.count} notification preference records`);

    console.log('✅ Rollback completed successfully!');
  } catch (error) {
    console.error('💥 Rollback failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  const command = process.argv[2];

  if (command === 'rollback') {
    rollbackMigration();
  } else {
    migrateNotificationPreferences();
  }
}

module.exports = {
  migrateNotificationPreferences,
  rollbackMigration,
};
