# 📊 Guía de Optimización de Base de Datos - Changánet

## 🎯 Resumen Ejecutivo
Esta guía documenta las optimizaciones implementadas en la base de datos de Changánet para Sprints 1-6, asegurando rendimiento < 2s y escalabilidad a 100k usuarios según el PRD v1.0.

## 📈 Índices Estratégicos Implementados

### Índices Obligatorios (PRD)
```prisma
// usuarios
@@index([rol])                           // REQ-01: Filtrar por tipo de usuario
@@index([esta_verificado])               // REQ-03: Usuarios verificados

// perfiles_profesionales
@@index([especialidad])                  // REQ-07: Búsqueda por especialidad
@@index([zona_cobertura])                // REQ-09: Búsqueda por zona
@@index([calificacion_promedio])         // REQ-14: Ordenar por calificación

// servicios
@@index([cliente_id])                    // Consultas de cliente
@@index([profesional_id])                // Consultas de profesional
@@index([estado])                        // Filtrar por estado
@@index([creado_en])                     // Ordenar por fecha
@@index([cliente_id, estado])            // Consultas compuestas optimizadas
@@index([profesional_id, estado])        // Consultas compuestas optimizadas

// resenas
@@index([servicio_id])                   // UNIQUE: Una reseña por servicio (RB-02)
```

### Índices de Rendimiento Adicionales
```prisma
// mensajes - Optimizado para chat en tiempo real
@@index([remitente_id, creado_en])           // Historial de mensajes enviados
@@index([destinatario_id, creado_en])        // Historial de mensajes recibidos
@@index([remitente_id, destinatario_id, creado_en]) // Conversaciones específicas
```

## 🏗️ Tipos de Datos Optimizados

### Booleanos (Eficiencia de Almacenamiento)
```prisma
esta_verificado Boolean @default(false)    // usuarios
esta_leido      Boolean @default(false)    // mensajes, notificaciones
esta_disponible Boolean @default(true)     // disponibilidad
```

### Enums (Integridad de Datos)
```prisma
enum EstadoServicio {
  PENDIENTE
  AGENDADO
  COMPLETADO
  CANCELADO
}

enum EstadoCotizacion {
  PENDIENTE
  ACEPTADO
  RECHAZADO
}
```

## ✅ Validaciones de Datos

### Validaciones en Capa de Aplicación
Dado que Prisma no soporta `@@check` constraints, implementamos validaciones en el código:

```javascript
// Validación de calificaciones (1-5)
if (calificacion < 1 || calificacion > 5) {
  throw new Error('La calificación debe estar entre 1 y 5');
}

// Validación de precios positivos
if (precio <= 0) {
  throw new Error('El precio debe ser mayor a 0');
}
```

## 🚀 Consultas Optimizadas (Evitando N+1)

### ❌ Consulta Ineficiente (N+1)
```javascript
// Esto genera N+1 consultas
const profesionales = await prisma.perfiles_profesionales.findMany();
for (const prof of profesionales) {
  const usuario = await prisma.usuarios.findUnique({ where: { id: prof.usuario_id } });
}
```

### ✅ Consulta Optimizada
```javascript
// Una sola consulta con include
const profesionales = await prisma.perfiles_profesionales.findMany({
  include: {
    usuario: {
      select: {
        nombre: true,
        email: true,
        esta_verificado: true
      }
    }
  }
});
```

### Ejemplos de Consultas Optimizadas

#### Búsqueda de Profesionales
```javascript
const profesionales = await prisma.perfiles_profesionales.findMany({
  where: {
    especialidad: { contains: searchTerm },
    zona_cobertura: { contains: location },
    tarifa_hora: { gte: minPrice, lte: maxPrice }
  },
  include: {
    usuario: { select: { nombre: true, esta_verificado: true } }
  },
  orderBy: { calificacion_promedio: 'desc' },
  take: 20
});
```

#### Servicios con Cliente y Profesional
```javascript
const servicios = await prisma.servicios.findMany({
  where: { cliente_id: userId },
  include: {
    cliente: { select: { nombre: true } },
    profesional: {
      include: {
        perfil_profesional: { select: { especialidad: true } }
      }
    }
  }
});
```

#### Historial de Chat
```javascript
const mensajes = await prisma.mensajes.findMany({
  where: {
    OR: [
      { remitente_id: userId, destinatario_id: otherUserId },
      { remitente_id: otherUserId, destinatario_id: userId }
    ]
  },
  orderBy: { creado_en: 'asc' },
  take: 50
});
```

## 📊 Métricas de Rendimiento Esperadas

| Operación | Tiempo Objetivo | Índices Utilizados |
|-----------|----------------|-------------------|
| Búsqueda de profesionales | < 500ms | especialidad, zona_cobertura |
| Carga de perfil | < 200ms | usuario_id (relaciones) |
| Historial de chat | < 300ms | remitente_id, destinatario_id, creado_en |
| Dashboard cliente | < 800ms | cliente_id, estado, creado_en |

## 🔧 Migraciones y Despliegue

### Comando de Migración
```bash
npx prisma migrate dev --name optimize-database
```

### Verificación de Índices
```sql
-- Verificar índices creados
SELECT name FROM sqlite_master WHERE type='index';
```

### Monitoreo de Rendimiento
```javascript
// En producción, monitorear queries lentas
const slowQuery = await prisma.$queryRaw`
  SELECT * FROM servicios WHERE estado = 'PENDIENTE'
`;
// Log queries > 1000ms
```

## 🎯 Cumplimiento PRD v1.0

### ✅ Sección 10: Rendimiento y Escalabilidad
- **< 2s**: Todas las consultas críticas optimizadas
- **100k usuarios**: Índices preparados para crecimiento
- **Consultas eficientes**: N+1 eliminado

### ✅ REQ-12, REQ-14: Búsqueda Optimizada
- **Por zona**: `@@index([zona_cobertura])`
- **Por especialidad**: `@@index([especialidad])`
- **Por calificación**: `@@index([calificacion_promedio])`

### ✅ RB-02: Una Reseña por Servicio
- **UNIQUE constraint**: `servicio_id String @unique`
- **Validación aplicación**: Una reseña por servicio completado

## 🚨 Consideraciones para Producción

### Migración a PostgreSQL
Cuando escalen a PostgreSQL, actualizar:
```sql
-- PostgreSQL equivalent
CREATE INDEX CONCURRENTLY idx_profesionales_especialidad
ON perfiles_profesionales(especialidad);
```

### Monitoreo Continuo
```javascript
// Servicio implementado: src/services/queryMonitorService.js
const queryMonitor = require('./services/queryMonitorService');

// Endpoint para métricas: GET /api/metrics/queries
app.get('/api/metrics/queries', queryMonitor.getMetricsEndpoint());

// Alertas automáticas para queries > 1000ms (configurable)
```

### Backup y Recuperación
```bash
# Servicio implementado: src/services/backupService.js

# Variables de entorno para configuración
ENABLE_AUTO_BACKUP=true
BACKUP_RETENTION_DAYS=30
BACKUP_INTERVAL_HOURS=24

# Endpoints de gestión
GET  /api/backups          # Listar backups
POST /api/backups/run      # Ejecutar backup manual

# Estructura de backups
backups/
├── changanet-backup-2025-01-01T10-00-00-000Z-database.db
├── changanet-backup-2025-01-01T10-00-00-000Z-files.tar.gz
└── changanet-backup-2025-01-01T10-00-00-000Z-config.json
```

## 📈 Próximas Optimizaciones (Fase 3)

### Índices Compuestos Avanzados Implementados
```prisma
// Búsqueda compleja de profesionales
@@index([especialidad, zona_cobertura, calificacion_promedio])

// Consultas de servicios por estado y tiempo
@@index([estado, creado_en])
@@index([cliente_id, estado])
@@index([profesional_id, estado])

// Historial de chat optimizado
@@index([remitente_id, destinatario_id, creado_en])
@@index([remitente_id, creado_en])
@@index([destinatario_id, creado_en])

// Cotizaciones eficientes
@@index([cliente_id, estado])
@@index([profesional_id, estado])
@@index([estado, creado_en])
```

### Partitioning (PostgreSQL)
```sql
-- Particionar tabla de mensajes por fecha
CREATE TABLE mensajes_y2025 PARTITION OF mensajes
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
```

### Caché a Nivel de Base de Datos
```sql
-- PostgreSQL: Materialized views para consultas frecuentes
CREATE MATERIALIZED VIEW profesionales_populares AS
SELECT * FROM perfiles_profesionales
WHERE calificacion_promedio >= 4.5;
```

---

**Resultado**: Base de datos optimizada para Sprints 1-6, preparada para crecimiento y cumplimiento total del PRD v1.0. 🚀
