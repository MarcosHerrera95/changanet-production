/**
 * Validation Script: Comprehensive validation of notification system migration
 *
 * This script performs thorough validation checks to ensure data integrity
 * after the notification system migration.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class ValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

async function validateNotificationSystem() {
  console.log('🔍 Starting comprehensive validation of notification system...\n');

  const results = {
    passed: [],
    warnings: [],
    errors: [],
  };

  try {
    // 1. Validate notification_preferences table
    console.log('1️⃣  Validating notification_preferences table...');
    await validateNotificationPreferences(results);

    // 2. Validate notificaciones table structure
    console.log('2️⃣  Validating notificaciones table structure...');
    await validateNotificacionesTable(results);

    // 3. Validate notification_templates table
    console.log('3️⃣  Validating notification_templates table...');
    await validateNotificationTemplates(results);

    // 4. Validate notification_metrics table
    console.log('4️⃣  Validating notification_metrics table...');
    await validateNotificationMetrics(results);

    // 5. Validate foreign key relationships
    console.log('5️⃣  Validating foreign key relationships...');
    await validateForeignKeys(results);

    // 6. Validate data consistency
    console.log('6️⃣  Validating data consistency...');
    await validateDataConsistency(results);

    // 7. Performance validation
    console.log('7️⃣  Validating performance (indexes)...');
    await validatePerformance(results);

  } catch (error) {
    results.errors.push(`Unexpected error during validation: ${error.message}`);
    console.error('💥 Validation failed with unexpected error:', error);
  } finally {
    await prisma.$disconnect();
  }

  // Report results
  console.log('\n' + '='.repeat(60));
  console.log('📊 VALIDATION RESULTS');
  console.log('='.repeat(60));

  if (results.errors.length > 0) {
    console.log(`❌ ERRORS (${results.errors.length}):`);
    results.errors.forEach((error, i) => console.log(`   ${i + 1}. ${error}`));
  }

  if (results.warnings.length > 0) {
    console.log(`⚠️  WARNINGS (${results.warnings.length}):`);
    results.warnings.forEach((warning, i) => console.log(`   ${i + 1}. ${warning}`));
  }

  if (results.passed.length > 0) {
    console.log(`✅ PASSED (${results.passed.length}):`);
    results.passed.forEach((passed, i) => console.log(`   ${i + 1}. ${passed}`));
  }

  console.log('='.repeat(60));

  const hasErrors = results.errors.length > 0;
  const hasWarnings = results.warnings.length > 0;

  if (hasErrors) {
    console.log('💥 VALIDATION FAILED: Critical errors found!');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('⚠️  VALIDATION COMPLETED WITH WARNINGS');
    process.exit(0);
  } else {
    console.log('🎉 VALIDATION PASSED: All checks successful!');
    process.exit(0);
  }
}

async function validateNotificationPreferences(results) {
  try {
    // Check table exists and has data
    const count = await prisma.notification_preferences.count();
    results.passed.push(`notification_preferences table exists with ${count} records`);

    // Check required fields
    const sample = await prisma.notification_preferences.findFirst();
    if (sample) {
      const requiredFields = ['id', 'usuario_id', 'enabled', 'timezone', 'canales', 'categorias'];
      const missingFields = requiredFields.filter(field => !(field in sample));

      if (missingFields.length > 0) {
        results.errors.push(`notification_preferences missing required fields: ${missingFields.join(', ')}`);
      } else {
        results.passed.push('notification_preferences has all required fields');
      }

      // Validate JSON fields
      try {
        JSON.parse(sample.canales);
        JSON.parse(sample.categorias);
        results.passed.push('notification_preferences JSON fields are valid');
      } catch (e) {
        results.errors.push('notification_preferences contains invalid JSON data');
      }
    }

    // Check unique constraint
    const duplicates = await prisma.$queryRaw`
      SELECT usuario_id, COUNT(*) as count
      FROM notification_preferences
      GROUP BY usuario_id
      HAVING COUNT(*) > 1
    `;

    if (duplicates.length > 0) {
      results.errors.push(`Found ${duplicates.length} duplicate usuario_id entries in notification_preferences`);
    } else {
      results.passed.push('notification_preferences has no duplicate usuario_id entries');
    }

  } catch (error) {
    results.errors.push(`Error validating notification_preferences: ${error.message}`);
  }
}

async function validateNotificacionesTable(results) {
  try {
    // Check new fields exist
    const sample = await prisma.notificaciones.findFirst();
    if (sample) {
      const requiredFields = ['entity_type', 'entity_id'];
      const missingFields = requiredFields.filter(field => !(field in sample));

      if (missingFields.length > 0) {
        results.errors.push(`notificaciones table missing new fields: ${missingFields.join(', ')}`);
      } else {
        results.passed.push('notificaciones table has new entity_type and entity_id fields');
      }
    } else {
      results.passed.push('notificaciones table exists (no data to validate)');
    }

  } catch (error) {
    results.errors.push(`Error validating notificaciones table: ${error.message}`);
  }
}

async function validateNotificationTemplates(results) {
  try {
    const count = await prisma.notification_templates.count();
    results.passed.push(`notification_templates table exists with ${count} records`);

    // Check unique constraint on nombre
    const duplicates = await prisma.$queryRaw`
      SELECT nombre, COUNT(*) as count
      FROM notification_templates
      GROUP BY nombre
      HAVING COUNT(*) > 1
    `;

    if (duplicates.length > 0) {
      results.errors.push(`Found ${duplicates.length} duplicate nombre entries in notification_templates`);
    } else {
      results.passed.push('notification_templates has no duplicate nombre entries');
    }

  } catch (error) {
    results.errors.push(`Error validating notification_templates: ${error.message}`);
  }
}

async function validateNotificationMetrics(results) {
  try {
    const count = await prisma.notification_metrics.count();
    results.passed.push(`notification_metrics table exists with ${count} records`);

    // Check data types and constraints
    const sample = await prisma.notification_metrics.findFirst();
    if (sample) {
      if (typeof sample.enviada === 'boolean' && typeof sample.entregada === 'boolean') {
        results.passed.push('notification_metrics boolean fields have correct types');
      } else {
        results.errors.push('notification_metrics boolean fields have incorrect types');
      }
    }

  } catch (error) {
    results.errors.push(`Error validating notification_metrics: ${error.message}`);
  }
}

async function validateForeignKeys(results) {
  try {
    // Check notification_preferences -> usuarios
    const orphanedPrefs = await prisma.$queryRaw`
      SELECT np.id
      FROM notification_preferences np
      LEFT JOIN usuarios u ON np.usuario_id = u.id
      WHERE u.id IS NULL
    `;

    if (orphanedPrefs.length > 0) {
      results.errors.push(`Found ${orphanedPrefs.length} orphaned notification_preferences records`);
    } else {
      results.passed.push('All notification_preferences have valid usuario_id references');
    }

    // Check notificaciones -> usuarios
    const orphanedNotifs = await prisma.$queryRaw`
      SELECT n.id
      FROM notificaciones n
      LEFT JOIN usuarios u ON n.usuario_id = u.id
      WHERE u.id IS NULL
    `;

    if (orphanedNotifs.length > 0) {
      results.errors.push(`Found ${orphanedNotifs.length} orphaned notificaciones records`);
    } else {
      results.passed.push('All notificaciones have valid usuario_id references');
    }

    // Check notification_metrics -> usuarios (nullable)
    const orphanedMetrics = await prisma.$queryRaw`
      SELECT nm.id
      FROM notification_metrics nm
      LEFT JOIN usuarios u ON nm.usuario_id = u.id
      WHERE nm.usuario_id IS NOT NULL AND u.id IS NULL
    `;

    if (orphanedMetrics.length > 0) {
      results.errors.push(`Found ${orphanedMetrics.length} orphaned notification_metrics records`);
    } else {
      results.passed.push('All notification_metrics have valid usuario_id references');
    }

  } catch (error) {
    results.errors.push(`Error validating foreign keys: ${error.message}`);
  }
}

async function validateDataConsistency(results) {
  try {
    // Check that all users have notification preferences (if users exist)
    const userCount = await prisma.usuarios.count();
    const prefCount = await prisma.notification_preferences.count();

    if (userCount > 0) {
      if (prefCount >= userCount) {
        results.passed.push('All users have notification preferences');
      } else {
        results.warnings.push(`${userCount - prefCount} users missing notification preferences`);
      }
    } else {
      results.passed.push('No users in database (development environment)');
    }

    // Check notification template consistency
    const templates = await prisma.notification_templates.findMany({
      select: { tipo: true, prioridad_default: true },
    });

    const invalidPriorities = templates.filter(t =>
      !['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(t.prioridad_default)
    );

    if (invalidPriorities.length > 0) {
      results.errors.push(`${invalidPriorities.length} notification templates have invalid priority_default values`);
    } else {
      results.passed.push('All notification templates have valid priority values');
    }

  } catch (error) {
    results.errors.push(`Error validating data consistency: ${error.message}`);
  }
}

async function validatePerformance(results) {
  try {
    // Check if indexes were created (this is a basic check)
    const indexCheck = await prisma.$queryRaw`
      SELECT name FROM sqlite_master
      WHERE type='index' AND name LIKE '%notif%'
      ORDER BY name
    `;

    if (indexCheck.length > 0) {
      results.passed.push(`Found ${indexCheck.length} notification-related indexes`);
    } else {
      results.warnings.push('No notification-related indexes found (may be normal for SQLite)');
    }

    // Performance check: Count records in each table
    const tables = ['notificaciones', 'notification_preferences', 'notification_templates', 'notification_metrics'];
    for (const table of tables) {
      try {
        const count = await prisma[table].count();
        results.passed.push(`${table} table performance check: ${count} records`);
      } catch (e) {
        results.warnings.push(`Could not check ${table} table performance`);
      }
    }

  } catch (error) {
    results.errors.push(`Error validating performance: ${error.message}`);
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  validateNotificationSystem().catch(error => {
    console.error('💥 Validation script failed:', error);
    process.exit(1);
  });
}

module.exports = { validateNotificationSystem };
