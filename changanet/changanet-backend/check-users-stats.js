const pool = require('./src/config/database');

async function checkUsersStats() {
  try {
    console.log('\n📊 ESTADÍSTICAS DE USUARIOS EN LA BASE DE DATOS:\n');
    console.log('='.repeat(50));
    
    // Contar por rol
    const roleStats = await pool.query(`
      SELECT rol, COUNT(*) as total 
      FROM usuarios 
      GROUP BY rol 
      ORDER BY rol
    `);
    
    console.log('\n👥 Por Rol:');
    roleStats.rows.forEach(row => {
      console.log(`   ${row.rol.toUpperCase().padEnd(15)}: ${row.total} usuarios`);
    });
    
    // Total
    const total = await pool.query('SELECT COUNT(*) as total FROM usuarios');
    console.log(`\n   ${'TOTAL'.padEnd(15)}: ${total.rows[0].total} usuarios`);
    
    // Profesionales verificados
    const verifiedProfs = await pool.query(`
      SELECT COUNT(*) as total 
      FROM usuarios u
      JOIN profesionales p ON u.id = p.usuario_id
      WHERE p.estado_verificacion = 'verificado'
    `);
    
    console.log('\n✅ Profesionales Verificados:', verifiedProfs.rows[0].total);
    
    // Profesionales pendientes
    const pendingProfs = await pool.query(`
      SELECT COUNT(*) as total 
      FROM usuarios u
      JOIN profesionales p ON u.id = p.usuario_id
      WHERE p.estado_verificacion = 'pendiente'
    `);
    
    console.log('⏳ Profesionales Pendientes:', pendingProfs.rows[0].total);
    
    // Profesionales rechazados
    const rejectedProfs = await pool.query(`
      SELECT COUNT(*) as total 
      FROM usuarios u
      JOIN profesionales p ON u.id = p.usuario_id
      WHERE p.estado_verificacion = 'rechazado'
    `);
    
    console.log('❌ Profesionales Rechazados:', rejectedProfs.rows[0].total);
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUsersStats();
