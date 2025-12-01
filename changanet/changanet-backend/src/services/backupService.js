/**
 * Servicio de Backup Automático - Changánet
 * Gestiona backups automáticos de base de datos y archivos
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class BackupService {
  constructor() {
    this.backupDir = path.join(process.cwd(), 'backups');
    this.retentionDays = process.env.BACKUP_RETENTION_DAYS || 30;
    this.backupInterval = process.env.BACKUP_INTERVAL_HOURS || 24; // Horas
    this.isRunning = false;
  }

  /**
   * Inicializa el servicio de backup
   */
  async initialize() {
    try {
      // Crear directorio de backups si no existe
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log(`📁 Directorio de backups creado: ${this.backupDir}`);

      // Iniciar backup automático si está habilitado
      if (process.env.ENABLE_AUTO_BACKUP === 'true') {
        this.startAutoBackup();
        console.log(`⏰ Backup automático activado cada ${this.backupInterval} horas`);
      }

      return true;
    } catch (error) {
      console.error('Error inicializando backup service:', error);
      return false;
    }
  }

  /**
   * Inicia el backup automático programado
   */
  startAutoBackup() {
    if (this.isRunning) return;

    this.isRunning = true;

    // Ejecutar backup inmediatamente
    this.performBackup();

    // Programar backups periódicos
    setInterval(() => {
      this.performBackup();
    }, this.backupInterval * 60 * 60 * 1000); // Convertir horas a ms
  }

  /**
   * Realiza un backup completo
   */
  async performBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupName = `changanet-backup-${timestamp}`;

    try {
      console.log(`🔄 Iniciando backup: ${backupName}`);

      const results = await Promise.allSettled([
        this.backupDatabase(backupName),
        this.backupFiles(backupName),
        this.backupConfig(backupName)
      ]);

      // Verificar resultados
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.filter(r => r.status === 'rejected').length;

      if (successCount > 0) {
        console.log(`✅ Backup completado: ${successCount} componentes exitosos, ${failCount} fallidos`);

        // Limpiar backups antiguos
        await this.cleanupOldBackups();

        // Notificar éxito
        await this.notifyBackupSuccess(backupName);
      } else {
        console.error('❌ Backup fallido: todos los componentes fallaron');
        await this.notifyBackupFailure(backupName, results);
      }

    } catch (error) {
      console.error('Error crítico en backup:', error);
      await this.notifyBackupFailure(backupName, error);
    }
  }

  /**
   * Backup de base de datos SQLite
   */
  async backupDatabase(backupName) {
    const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './prisma/dev.db';
    const backupPath = path.join(this.backupDir, `${backupName}-database.db`);

    try {
      // Para SQLite, simplemente copiar el archivo
      await fs.copyFile(dbPath, backupPath);
      console.log(`💾 Database backup: ${backupPath}`);

      // Verificar integridad del backup
      await this.verifyDatabaseBackup(backupPath);

      return { type: 'database', path: backupPath, size: await this.getFileSize(backupPath) };
    } catch (error) {
      console.error('Error en backup de database:', error);
      throw error;
    }
  }

  /**
   * Backup de archivos importantes (uploads, logs, etc.)
   */
  async backupFiles(backupName) {
    const filesDir = path.join(this.backupDir, `${backupName}-files`);
    await fs.mkdir(filesDir, { recursive: true });

    const dirsToBackup = [
      'uploads',
      'logs',
      'public/uploads',
      'temp'
    ];

    const backedUpFiles = [];

    for (const dir of dirsToBackup) {
      try {
        const sourcePath = path.join(process.cwd(), dir);
        const targetPath = path.join(filesDir, path.basename(dir));

        // Verificar si el directorio existe
        await fs.access(sourcePath);

        // Copiar directorio recursivamente
        await this.copyDirectory(sourcePath, targetPath);
        backedUpFiles.push(dir);

        console.log(`📁 Files backup: ${dir} → ${targetPath}`);
      } catch (error) {
        // Directorio no existe, continuar
        console.log(`⚠️  Directorio no encontrado para backup: ${dir}`);
      }
    }

    // Comprimir si hay muchos archivos
    if (backedUpFiles.length > 0) {
      const compressedPath = await this.compressDirectory(filesDir, `${backupName}-files.tar.gz`);
      return { type: 'files', path: compressedPath, directories: backedUpFiles };
    }

    return { type: 'files', directories: backedUpFiles, message: 'No files to backup' };
  }

  /**
   * Backup de configuración (variables de entorno, etc.)
   */
  async backupConfig(backupName) {
    const configPath = path.join(this.backupDir, `${backupName}-config.json`);

    const config = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || 'unknown',
      database: {
        type: 'sqlite',
        path: process.env.DATABASE_URL
      },
      services: {
        redis: process.env.REDIS_HOST ? 'configured' : 'not configured',
        firebase: process.env.FIREBASE_API_KEY ? 'configured' : 'not configured',
        sentry: process.env.SENTRY_DSN ? 'configured' : 'not configured',
        email: process.env.SENDGRID_API_KEY ? 'configured' : 'not configured'
      },
      backup: {
        retention_days: this.retentionDays,
        interval_hours: this.backupInterval
      }
    };

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    console.log(`⚙️  Config backup: ${configPath}`);

    return { type: 'config', path: configPath };
  }

  /**
   * Verifica la integridad del backup de database
   */
  async verifyDatabaseBackup(backupPath) {
    try {
      // Para SQLite, intentar abrir el archivo
      const { PrismaClient } = require('@prisma/client');
      const testPrisma = new PrismaClient({
        datasources: {
          db: {
            url: `file:${backupPath}`
          }
        }
      });

      // Intentar una query simple
      await testPrisma.$queryRaw`SELECT 1 as test`;
      await testPrisma.$disconnect();

      console.log(`✅ Database backup verified: ${backupPath}`);
    } catch (error) {
      throw new Error(`Database backup verification failed: ${error.message}`);
    }
  }

  /**
   * Copia un directorio recursivamente
   */
  async copyDirectory(source, target) {
    const stats = await fs.stat(source);

    if (stats.isDirectory()) {
      await fs.mkdir(target, { recursive: true });
      const files = await fs.readdir(source);

      for (const file of files) {
        const sourcePath = path.join(source, file);
        const targetPath = path.join(target, file);
        await this.copyDirectory(sourcePath, targetPath);
      }
    } else {
      await fs.copyFile(source, target);
    }
  }

  /**
   * Comprime un directorio
   */
  async compressDirectory(sourceDir, outputPath) {
    try {
      // Usar tar para comprimir (requiere tar instalado en el sistema)
      const outputFullPath = path.join(this.backupDir, outputPath);
      await execAsync(`tar -czf "${outputFullPath}" -C "${path.dirname(sourceDir)}" "${path.basename(sourceDir)}"`);

      // Eliminar directorio original después de comprimir
      await fs.rm(sourceDir, { recursive: true, force: true });

      console.log(`📦 Compressed backup: ${outputFullPath}`);
      return outputFullPath;
    } catch (error) {
      console.warn('Compression not available, keeping uncompressed files');
      return sourceDir;
    }
  }

  /**
   * Limpia backups antiguos según política de retención
   */
  async cleanupOldBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      let deletedCount = 0;
      for (const file of files) {
        if (file.startsWith('changanet-backup-')) {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);

          if (stats.mtime < cutoffDate) {
            await fs.unlink(filePath);
            deletedCount++;
            console.log(`🗑️  Deleted old backup: ${file}`);
          }
        }
      }

      if (deletedCount > 0) {
        console.log(`🧹 Cleanup completed: ${deletedCount} old backups removed`);
      }
    } catch (error) {
      console.error('Error during backup cleanup:', error);
    }
  }

  /**
   * Obtiene el tamaño de un archivo
   */
  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  /**
   * Notifica éxito del backup
   */
  async notifyBackupSuccess(backupName) {
    console.log(`✅ Backup completado exitosamente: ${backupName}`);

    // En producción, enviar notificación por email/Slack
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrar con servicio de notificaciones
    }
  }

  /**
   * Notifica fallo del backup
   */
  async notifyBackupFailure(backupName, error) {
    console.error(`❌ Backup fallido: ${backupName}`, error);

    // En producción, enviar alerta crítica
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrar con sistema de alertas
    }
  }

  /**
   * Lista todos los backups disponibles
   */
  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = [];

      for (const file of files) {
        if (file.startsWith('changanet-backup-')) {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);

          backups.push({
            name: file,
            path: filePath,
            size: stats.size,
            created: stats.mtime,
            type: this.getBackupType(file)
          });
        }
      }

      return backups.sort((a, b) => b.created - a.created);
    } catch (error) {
      console.error('Error listing backups:', error);
      return [];
    }
  }

  /**
   * Determina el tipo de backup por el nombre del archivo
   */
  getBackupType(filename) {
    if (filename.includes('-database.db')) return 'database';
    if (filename.includes('-files')) return 'files';
    if (filename.includes('-config.json')) return 'config';
    return 'unknown';
  }

  /**
   * Endpoint para gestión manual de backups
   */
  getBackupRoutes() {
    const express = require('express');
    const router = express.Router();

    // Lista de backups
    router.get('/backups', async (req, res) => {
      try {
        const backups = await this.listBackups();
        res.json({
          backups,
          retention_days: this.retentionDays,
          auto_backup: this.isRunning
        });
      } catch (error) {
        res.status(500).json({ error: 'Error listing backups' });
      }
    });

    // Ejecutar backup manual
    router.post('/backups/run', async (req, res) => {
      try {
        // Ejecutar backup en background
        this.performBackup();

        res.json({
          message: 'Backup iniciado en segundo plano',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({ error: 'Error starting backup' });
      }
    });

    return router;
  }
}

module.exports = new BackupService();
