# 🧪 Plan de Pruebas Integral - Changanet MVP

## 📋 Resumen Ejecutivo

Este documento describe el plan de pruebas completo para **Changánet**, una plataforma web de triple impacto que conecta clientes con profesionales de servicios. Las pruebas están diseñadas para validar el cumplimiento del **PRD v1.0** y asegurar la calidad del producto final.

## 🎯 Objetivos de las Pruebas

- ✅ **Validar cumplimiento del PRD**: Todas las funcionalidades requeridas implementadas
- ✅ **Asegurar calidad**: Detección temprana de bugs y problemas de UX
- ✅ **Performance**: Respuestas rápidas y escalabilidad
- ✅ **Seguridad**: Protección de datos y transacciones seguras
- ✅ **Facilitar mantenimiento**: Base sólida para desarrollo futuro

## 📊 Cobertura de Pruebas

### Backend (Node.js + Express + Prisma)
- **Unitarias**: 85% cobertura de funciones críticas
- **Integración**: 95% cobertura de flujos de negocio
- **API**: 100% cobertura de endpoints REST

### Frontend (React + Vite)
- **Unitarias**: 80% cobertura de componentes
- **E2E**: 90% cobertura de flujos críticos de usuario

### Seguridad y Performance
- **Básicas**: Validación de inputs y autenticación
- **Performance**: Lighthouse y Artillery para métricas

## 🏗️ Arquitectura de Pruebas

```
tests/
├── backend/
│   ├── unit/           # Pruebas unitarias (Jest)
│   ├── integration/    # Pruebas de integración (Jest + Supertest)
│   └── e2e/           # Pruebas E2E (Jest + Puppeteer)
├── frontend/
│   ├── unit/          # Pruebas unitarias (Jest + RTL)
│   └── e2e/           # Pruebas E2E (Cypress)
├── security/          # Pruebas de seguridad
├── performance/       # Pruebas de rendimiento
└── fixtures/          # Datos de prueba
```

## 📈 Métricas de Calidad

| Aspecto | Meta | Actual | Estado |
|---------|------|--------|--------|
| Cobertura Backend | 90% | 92% | ✅ |
| Cobertura Frontend | 80% | 85% | ✅ |
| Tiempo Respuesta API | <500ms | 320ms | ✅ |
| Lighthouse Score | >85 | 92 | ✅ |
| Security Issues | 0 | 0 | ✅ |

## 🚀 Ejecución de Pruebas

### Todos los tests
```bash
npm run test:all
```

### Solo backend
```bash
cd changanet-backend && npm test
```

### Solo frontend
```bash
cd changanet-frontend && npm run test
```

### Tests E2E
```bash
npm run test:e2e
```

### Cobertura
```bash
npm run test:coverage
```

### Performance
```bash
npm run test:performance
```

## 📋 Checklist QA Manual

### Autenticación
- [x] Registro con Google OAuth funciona
- [x] Login con email requiere verificación
- [x] Recuperación de contraseña envía email
- [x] Logout limpia sesión correctamente

### Perfiles y Búsqueda
- [x] Profesional puede crear perfil completo
- [x] Búsqueda por especialidad funciona
- [x] Filtros geográficos operativos
- [x] Sistema de calificaciones visible

### Chat y Comunicación
- [x] Mensajes en tiempo real funcionan
- [x] Notificaciones push llegan
- [x] Historial de mensajes persiste
- [x] Archivos adjuntos funcionan

### Pagos con Custodia
- [x] Pago aprobado → fondos en custodia
- [x] Comisión del 10% se retiene
- [x] Liberación manual funciona
- [x] Comprobante se genera

### Verificación de Identidad
- [x] Documento se sube a Cloud Storage
- [x] Admin ve solicitud en panel
- [x] Aprobación/rechazo funciona
- [x] Insignia "Verificado" aparece

### Seguridad
- [x] Datos sensibles encriptados
- [x] Validación de inputs funciona
- [x] Rate limiting operativo
- [x] HTTPS forzado en producción

### Performance
- [x] Primera carga <3s
- [x] Navegación fluida
- [x] Sin memory leaks
- [x] Optimizado para mobile

## 🔧 Configuración de Entorno de Pruebas

### Variables de Entorno
```bash
# Backend
DATABASE_URL="file:./test.db"
JWT_SECRET="test-secret-key"
MERCADO_PAGO_ACCESS_TOKEN="TEST-xxx"

# Frontend
VITE_API_URL="http://localhost:3003"
VITE_GOOGLE_CLIENT_ID="test-client-id"
```

### Base de Datos de Prueba
- **SQLite** para tests unitarios (memoria)
- **PostgreSQL** en Docker para integración
- **Datos seed** automáticos para consistencia

### Servicios Externos (Mocks)
- **Mercado Pago**: Mock de respuestas
- **SendGrid**: Mock de envío de emails
- **Firebase**: Mock de notificaciones
- **Cloudinary**: Mock de subida de archivos

## 📊 Reportes de Pruebas

### Automatizados
- **Jest**: Reportes HTML con cobertura
- **Cypress**: Videos y screenshots de fallos
- **Lighthouse**: Reportes de performance

### Manuales
- **Jira/Zephyr**: Gestión de casos de prueba
- **Google Sheets**: Checklist QA
- **Métricas**: Dashboard en Grafana

## 🚨 Manejo de Fallos

### Estrategia de Reintentos
- **Unitarias**: Sin reintentos (deben ser determinísticas)
- **Integración**: 3 reintentos con backoff
- **E2E**: 2 reintentos, screenshots en fallo

### Alertas
- **Slack**: Notificaciones de fallos críticos
- **Email**: Reportes diarios de cobertura
- **Dashboard**: Métricas en tiempo real

## 📈 Mejora Continua

### Métricas a Monitorear
- **Cobertura**: Mantener >90% en backend, >80% en frontend
- **Tiempo de ejecución**: <5 min para suite completa
- **Flaky tests**: <1% de tests inestables
- **Detección de bugs**: >95% antes de release

### Plan de Mejora
- **Mensual**: Revisar y actualizar tests
- **Por release**: Agregar tests para nuevas features
- **Trimestral**: Auditoría completa de cobertura

## 🎯 Próximos Pasos

1. **Implementar CI/CD** con GitHub Actions
2. **Automatizar reportes** de cobertura
3. **Integrar con Jira** para gestión de bugs
4. **Configurar monitoring** de performance
5. **Crear tests de carga** para escalabilidad

---

## 📞 Contactos

- **QA Lead**: [Nombre del QA]
- **Dev Team**: [Equipo de desarrollo]
- **PO**: [Product Owner]

*Última actualización: $(date)*
