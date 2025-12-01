# 🚀 Optimización de Rendimiento - Sistema de Caché Redis

## 📋 Descripción

Se ha implementado un sistema de caché Redis para optimizar el rendimiento de las consultas más frecuentes en Changánet, reduciendo la carga en la base de datos y mejorando los tiempos de respuesta.

## 🛠️ Funcionalidades Implementadas

### 1. **Búsqueda de Profesionales**
- **Cache Key**: `search:professionals:{filters}`
- **TTL**: 10 minutos
- **Beneficio**: Evita consultas repetidas a la base de datos para búsquedas populares

### 2. **Perfiles de Profesionales**
- **Cache Key**: `profile:professional:{professionalId}`
- **TTL**: 30 minutos
- **Beneficio**: Perfiles de alto acceso se sirven desde memoria

### 3. **Rankings de Profesionales**
- **Cache Key**: `rankings:professionals`
- **TTL**: 1 hora
- **Beneficio**: Rankings se calculan una vez por hora

## 🔧 Configuración

### Variables de Entorno
```bash
# Redis (Opcional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=""
```

### Instalación
```bash
npm install redis
```

## 📊 Estrategias de Cache

### Cache-Aside Pattern
- Las consultas primero verifican el caché
- Si no existe, consultan la base de datos
- Los resultados se almacenan en caché para futuras consultas

### Invalidación Inteligente
- Los perfiles se invalidan cuando se actualizan
- Las búsquedas se mantienen frescas con TTL apropiado
- Los rankings se recalculan periódicamente

## 🚀 Beneficios de Rendimiento

### Antes del Caché
- Cada búsqueda → Consulta a BD
- Perfiles populares → Múltiples consultas
- Rankings → Cálculo complejo cada vez

### Después del Caché
- Búsquedas frecuentes → Respuesta instantánea
- Perfiles populares → Servicio desde memoria
- Rankings → Cálculo una vez por hora

## 📈 Métricas Esperadas

- **Reducción de carga DB**: 60-80% para consultas frecuentes
- **Mejora de latencia**: 10-100x más rápido para datos cacheados
- **Escalabilidad**: Soporte para mayor concurrencia

## 🔍 Monitoreo

### Endpoint de Estadísticas
```bash
GET /api/cache/stats
```

Respuesta:
```json
{
  "redis": true,
  "totalKeys": 150,
  "info": {
    "connected_clients": "5",
    "used_memory": "2.5M",
    "hits": "1250",
    "misses": "45"
  }
}
```

## 🛡️ Resiliencia

- **Fallback**: Si Redis no está disponible, el sistema funciona normalmente
- **Logging**: Todas las operaciones de caché se registran
- **Timeouts**: Configuración apropiada para evitar bloqueos

## 🔄 Invalidación de Caché

### Automática
- Perfiles se invalidan al actualizar
- Rankings se refrescan por TTL

### Manual (si es necesario)
```javascript
const { invalidateSearchCache, invalidateRankingsCache } = require('./services/cacheService');

// Invalidar todas las búsquedas
await invalidateSearchCache();

// Invalidar rankings
await invalidateRankingsCache();
```

## 🎯 Recomendaciones de Uso

1. **Desarrollo**: Redis opcional, funciona sin él
2. **Producción**: Recomendado para alto tráfico
3. **Escalado**: Múltiples instancias pueden compartir Redis
4. **Monitoreo**: Implementar alertas en métricas de caché

## 📚 Próximos Pasos

- [ ] Implementar caché para mensajes recientes
- [ ] Agregar compresión de datos en caché
- [ ] Implementar cache warming para datos críticos
- [ ] Agregar métricas detalladas de hit/miss ratio
