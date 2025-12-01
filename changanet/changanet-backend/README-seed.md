# 🌱 Seed de Datos de Prueba - Changánet

Este documento explica cómo cargar datos de prueba en la base de datos de Changánet.

## 📋 Información General

- **Total de usuarios**: 200 (100 clientes + 100 profesionales)
- **Contraseña común**: `123456` (hasheada con bcrypt)
- **Emails únicos**: Formato específico por rol
- **Datos realistas**: Basados en nombres y ubicaciones argentinas

## 👥 Estructura de Datos

### Clientes (100)
- **Email**: `cliente001@cliente.changanet.com` a `cliente100@cliente.changanet.com`
- **Rol**: `cliente`
- **Campos**: nombre, email, teléfono, foto de perfil, estado de verificación

### Profesionales (100)
- **Email**: `profesional001@profesional.changanet.com` a `profesional100@profesional.changanet.com`
- **Rol**: `profesional`
- **Campos adicionales**:
  - Especialidad (10 tipos diferentes)
  - Zona de cobertura (CABA, GBA, Interior)
  - Años de experiencia (1-20)
  - Tarifa por hora ($4.000-$15.000)
  - Calificación promedio (3.0-5.0)
  - Descripción del servicio
  - Estado de verificación (60% verificado, 30% pendiente, 10% rechazado)

## 🛠️ Cómo Ejecutar el Seed

### Prerrequisitos
1. Base de datos configurada y migrations ejecutadas
2. Variables de entorno configuradas (`.env`)
3. Prisma Client generado

### Comando
```bash
# Desde el directorio changanet-backend
npm run db:seed
```

### Comando alternativo con npx
```bash
npx prisma db seed
```

## 📊 Distribución de Datos

### Especialidades (10 tipos, ~10 profesionales cada una)
- Plomero, Electricista, Pintor, Albañil, Gasista
- Carpintero, Herrería, Cerrajería, Mecánica, Jardinería

### Zonas de Cobertura
- **CABA**: Palermo, Recoleta, Belgrano, Almagro, etc. (15 barrios)
- **GBA**: Quilmes, Lanús, Avellaneda, Lomas de Zamora, etc.
- **Interior**: Córdoba, Rosario, Mendoza, Tucumán

### Estados de Verificación
- ✅ **Verificado**: 60 profesionales
- ⏳ **Pendiente**: 30 profesionales
- ❌ **Rechazado**: 10 profesionales

## 🔐 Credenciales de Acceso

### Clientes de Prueba
```
Email: cliente001@cliente.changanet.com
Password: 123456

Email: cliente050@cliente.changanet.com
Password: 123456
```

### Profesionales de Prueba
```
Email: profesional001@profesional.changanet.com
Password: 123456

Email: profesional050@profesional.changanet.com
Password: 123456
```

## 🎯 Usos del Seed

### Testing
- Validar funcionalidades de búsqueda y filtrado
- Probar sistema de calificaciones y reseñas
- Verificar perfiles profesionales completos

### Desarrollo
- Poblar base de datos para desarrollo local
- Demostrar funcionalidades a stakeholders
- Realizar pruebas de carga básicas

### QA
- Ejecutar pruebas con datos realistas
- Validar flujos completos de usuario
- Verificar integraciones (Cloudinary, etc.)

## 📈 Estadísticas Generadas

Después de ejecutar el seed, obtendrás:
- **200 usuarios únicos** con emails verificables
- **100 perfiles profesionales** con datos completos
- **Cobertura geográfica** de Argentina
- **Distribución equilibrada** de especialidades
- **Estados de verificación realistas**

## 🔄 Reset de Datos

Para limpiar y recargar datos:
```bash
# Reset database
npx prisma migrate reset --force

# Ejecutar seed
npm run db:seed
```

## ⚠️ Notas Importantes

- **No usar en producción**: Datos ficticios para testing
- **Contraseña común**: `123456` para facilitar QA
- **Emails únicos**: Evitan conflictos de unicidad
- **Fotos aleatorias**: Via randomuser.me API
- **Datos realistas**: Basados en ubicaciones y nombres argentinos

## 🐛 Troubleshooting

### Error de conexión a BD
```bash
# Verificar variables de entorno
cat .env

# Verificar estado de Prisma
npx prisma status
```

### Error de emails duplicados
```bash
# Limpiar datos existentes
npx prisma db push --force-reset
npm run db:seed
```

### Error de dependencias
```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

---

**¡Listo para poblar tu base de datos de prueba!** 🎉
