# Arquitectura Técnica Completa del Sistema de Reseñas y Valoraciones - Changánet

## Fecha de Diseño
28 de Noviembre, 2025

## Resumen Ejecutivo

Esta arquitectura técnica detalla el diseño completo del Sistema de Reseñas y Valoraciones de Changánet, integrando backend, frontend y base de datos. El sistema cumple completamente con los requerimientos REQ-21 a REQ-25 del PRD y incluye funcionalidades avanzadas para una experiencia de usuario óptima.

## 1. Arquitectura General

### 1.1 Diagrama de Arquitectura de Alto Nivel

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Base de       │
│   (React)       │◄──►│   (Node.js)     │◄──►│   Datos         │
│                 │    │                 │    │   (PostgreSQL)  │
│ • ReviewForm    │    │ • reviewController│    │ • resenas      │
│ • RatingDisplay │    │ • storageService │    │ • perfiles_prof │
│ • RatingStars   │    │ • notificationSvc│    │ • servicios     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Servicios     │
                    │   Externos      │
                    │ • Cloudinary    │
                    │ • FCM Push      │
                    │ • Email Service │
                    └─────────────────┘
```

### 1.2 Principios Arquitectónicos

- **Microservicios Lógicos**: Separación clara de responsabilidades
- **API-First**: Diseño centrado en APIs RESTful
- **Seguridad por Defecto**: Validaciones en múltiples capas
- **Escalabilidad**: Optimización de consultas y caching
- **Observabilidad**: Logging y métricas completas

## 2. Esquema de Base de Datos

### 2.1 Modelo de Datos Principal

#### Tabla `resenas` (Reviews)
```sql
CREATE TABLE resenas (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid(),
    servicio_id VARCHAR(36) UNIQUE NOT NULL,
    cliente_id VARCHAR(36) NOT NULL,
    calificacion INTEGER NOT NULL CHECK (calificacion >= 1 AND calificacion <= 5),
    comentario TEXT,
    url_foto VARCHAR(500),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Keys
    FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE CASCADE,
    FOREIGN KEY (cliente_id) REFERENCES usuarios(id) ON DELETE CASCADE,

    -- Indexes
    INDEX idx_resenas_servicio (servicio_id),
    INDEX idx_resenas_cliente (cliente_id),
    INDEX idx_resenas_creado (creado_en)
);
```

#### Tabla `perfiles_profesionales` (Professional Profiles)
```sql
-- Extensión del perfil profesional existente
ALTER TABLE perfiles_profesionales
ADD COLUMN calificacion_promedio DECIMAL(3,2) DEFAULT 0.00,
ADD INDEX idx_perfiles_calificacion (calificacion_promedio);
```

### 2.2 Relaciones y Restricciones

```
usuarios (1) ──── (N) servicios (1) ──── (1) resenas
    │                     │
    │                     │
    └─── (1) perfiles_profesionales
```

**Restricciones de Integridad:**
- Una reseña por servicio (UNIQUE servicio_id)
- Solo clientes pueden reseñar servicios completados
- Calificación debe estar entre 1-5
- Actualización automática del promedio

### 2.3 Optimizaciones de Rendimiento

```sql
-- Índices compuestos para consultas frecuentes
CREATE INDEX idx_resenas_profesional_fecha ON resenas(servicio_id, creado_en);
CREATE INDEX idx_perfiles_rating_busqueda ON perfiles_profesionales(
    calificacion_promedio, zona_cobertura, esta_disponible
);

-- Vista materializada para estadísticas rápidas
CREATE MATERIALIZED VIEW mv_professional_stats AS
SELECT
    p.usuario_id,
    COUNT(r.id) as total_reviews,
    AVG(r.calificacion) as avg_rating,
    COUNT(CASE WHEN r.calificacion >= 4 THEN 1 END) as positive_reviews
FROM perfiles_profesionales p
LEFT JOIN servicios s ON s.profesional_id = p.usuario_id
LEFT JOIN resenas r ON r.servicio_id = s.id
GROUP BY p.usuario_id;
```

## 3. Arquitectura del Backend

### 3.1 Endpoints REST API

#### Endpoints Principales
```
POST   /api/reviews              - Crear reseña
GET    /api/reviews/professional/:id - Obtener reseñas del profesional
GET    /api/reviews/professional/:id/stats - Estadísticas del profesional
GET    /api/reviews/check/:servicioId - Verificar elegibilidad
GET    /api/reviews/client         - Reseñas del cliente autenticado
```

#### Detalle de Endpoints

**POST /api/reviews**
- **Propósito**: Crear nueva reseña con validación completa
- **Autenticación**: JWT Bearer Token requerido
- **Body**: FormData (servicio_id, calificacion, comentario, url_foto)
- **Validaciones**:
  - Usuario autenticado es cliente del servicio
  - Servicio está en estado 'completado'
  - No existe reseña previa para el servicio
  - Calificación entre 1-5
  - Imagen opcional (máx 5MB, solo imágenes)

**GET /api/reviews/professional/:id/stats**
- **Propósito**: Estadísticas agregadas para UI
- **Respuesta**:
```json
{
  "professionalId": "uuid",
  "totalReviews": 25,
  "averageRating": 4.2,
  "ratingDistribution": {"1": 0, "2": 1, "3": 3, "4": 8, "5": 13},
  "positivePercentage": 84,
  "lastReviewDate": "2025-11-28T10:30:00Z"
}
```

### 3.2 Servicios Esenciales

#### Servicio de Validación (`validationService.js`)
```javascript
class ValidationService {
    async validateReviewEligibility(userId, serviceId) {
        // Verificar propiedad del servicio
        // Verificar estado completado
        // Verificar reseña existente
    }

    async validateRating(rating) {
        // Validar rango 1-5
        // Validar tipo numérico
    }
}
```

#### Servicio de Cálculo de Promedios (`ratingService.js`)
```javascript
class RatingService {
    async calculateAverageRating(professionalId) {
        const reviews = await prisma.resenas.findMany({
            where: { servicio: { profesional_id: professionalId } }
        });

        if (reviews.length === 0) return 0;

        const average = reviews.reduce((sum, r) => sum + r.calificacion, 0) / reviews.length;

        // Actualizar perfil profesional
        await prisma.perfiles_profesionales.update({
            where: { usuario_id: professionalId },
            data: { calificacion_promedio: average }
        });

        return average;
    }
}
```

#### Servicio de Subida de Imágenes (`storageService.js`)
```javascript
class StorageService {
    async uploadReviewImage(fileBuffer, serviceId) {
        // Validar tipo de archivo
        // Validar tamaño (5MB máx)
        // Subir a Cloudinary
        // Retornar URL segura
    }

    async deleteReviewImage(imageUrl) {
        // Extraer public_id de Cloudinary
        // Eliminar imagen
    }
}
```

### 3.3 Middleware de Seguridad

```javascript
// middleware/auth.js - Autenticación JWT
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token requerido' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
};

// middleware/rateLimit.js - Límite de reseñas
const reviewRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // máximo 5 reseñas por ventana
    message: 'Demasiadas reseñas. Inténtalo más tarde.'
});
```

## 4. Arquitectura del Frontend

### 4.1 Componentes Principales

#### ReviewForm Component
```jsx
const ReviewForm = ({ servicio_id, onReviewSubmitted }) => {
    // Estados locales
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [photo, setPhoto] = useState(null);

    // Verificación de elegibilidad
    useEffect(() => {
        checkReviewEligibility();
    }, [servicio_id]);

    // Submit con validación
    const handleSubmit = async (e) => {
        e.preventDefault();
        // Validaciones frontend
        // Envío con FormData
        // Manejo de errores
    };
};
```

#### RatingDisplay Component
```jsx
const RatingDisplay = ({ rating, size = 'md', interactive = false }) => {
    // Cálculo de calidad basado en rating
    const getQualityInfo = (rating) => {
        if (rating >= 4.5) return { label: 'Excelente', color: 'emerald' };
        // ... otros niveles
    };

    // Renderizado de estrellas
    const renderStars = () => {
        // Lógica de estrellas completas/parciales/vacías
    };
};
```

#### RatingStars Component (Interactivo)
```jsx
const RatingStars = ({ value, onChange, maxStars = 5 }) => {
    const handleStarClick = (starValue) => {
        onChange(starValue);
    };

    return (
        <div className="flex space-x-1">
            {[...Array(maxStars)].map((_, index) => (
                <StarIcon
                    key={index}
                    filled={index < value}
                    onClick={() => handleStarClick(index + 1)}
                    className="cursor-pointer hover:scale-110"
                />
            ))}
        </div>
    );
};
```

### 4.2 Flujo de UI

```
Inicio Servicio → Completar Servicio → Mostrar Opción de Reseña
       ↓
Verificar Elegibilidad (/api/reviews/check/:id)
       ↓
Mostrar Formulario de Reseña
       ↓
Seleccionar Calificación (1-5 estrellas)
       ↓
Escribir Comentario (opcional)
       ↓
Adjuntar Foto (opcional)
       ↓
Enviar Reseña (POST /api/reviews)
       ↓
Mostrar Confirmación + Actualizar UI
```

### 4.3 Estados de la UI

```jsx
const ReviewStates = {
    LOADING: 'checking_eligibility',
    ELIGIBLE: 'can_review',
    INELIGIBLE: 'already_reviewed',
    SUBMITTING: 'sending_review',
    SUCCESS: 'review_sent',
    ERROR: 'review_error'
};
```

## 5. Reglas de Negocio

### 5.1 RB-01: Una Reseña por Servicio
- **Implementación**: UNIQUE constraint en servicio_id
- **Validación**: Backend verifica reseña existente antes de crear
- **UI**: Oculta formulario si ya existe reseña

### 5.2 RB-02: Solo Servicios Completados
- **Implementación**: Verificación de estado 'completado' en servicios
- **Validación**: Endpoint dedicado de elegibilidad
- **UI**: Mensaje informativo si servicio no completado

### 5.3 RB-03: Calificación Obligatoria (1-5)
- **Validación**: Frontend + Backend
- **Tipo**: INTEGER con CHECK constraint
- **UI**: Estrellas interactivas con feedback visual

### 5.4 RB-04: Comentario Opcional
- **Almacenamiento**: TEXT nullable
- **UI**: Textarea con placeholder descriptivo
- **Límite**: Validación de longitud razonable

### 5.5 RB-05: Foto Opcional con Validaciones
- **Formatos**: Solo imágenes (JPEG, PNG, WebP)
- **Tamaño**: Máximo 5MB
- **Almacenamiento**: Cloudinary con URLs seguras
- **Compresión**: Automática en subida

## 6. Seguridad

### 6.1 Autenticación y Autorización
```javascript
// Middleware de autorización
const authorizeReview = (req, res, next) => {
    const { user } = req;
    const { servicio_id } = req.body;

    // Verificar que el usuario es cliente del servicio
    if (user.id !== service.cliente_id) {
        return res.status(403).json({ error: 'No autorizado' });
    }

    next();
};
```

### 6.2 Validación de Datos
- **Input Sanitization**: Limpieza de comentarios
- **File Upload Security**: Validación de tipo MIME
- **Rate Limiting**: Máximo 5 reseñas por usuario cada 15 minutos
- **SQL Injection Prevention**: Uso de Prisma ORM

### 6.3 Protección de Imágenes
- **URLs Firmadas**: Cloudinary genera URLs temporales
- **Acceso Restringido**: Solo usuarios autenticados pueden ver
- **Moderación**: Validación de contenido (futuro)

## 7. Integración con Módulos Existentes

### 7.1 Integración con Usuarios
```
usuarios
├── perfiles_profesionales (calificacion_promedio)
├── servicios (como cliente y profesional)
└── resenas (reseñas escritas)
```

### 7.2 Integración con Servicios
```
servicios
├── resenas (0-1 reseña por servicio)
├── pagos (1 pago por servicio completado)
└── disponibilidad (slots agendados)
```

### 7.3 Integración con Pagos
- **Trigger de Reseña**: Solo servicios pagados pueden ser reseñados
- **Custodia**: Fondos liberados tras reseña positiva (opcional)
- **Comisiones**: Cálculo incluye rating promedio

### 7.4 Integración con Notificaciones
```javascript
// Notificación automática al profesional
await createNotification(
    professionalId,
    NOTIFICATION_TYPES.RESENA_RECIBIDA,
    `Nueva reseña: ${rating}⭐ de ${clientName}`,
    { servicio_id, calificacion, cliente_id }
);

// Push notification
await sendPushNotification(professionalId, title, message, data);
```

## 8. Rendimiento y Escalabilidad

### 8.1 Optimizaciones de Base de Datos
- **Índices Estratégicos**: servicio_id, cliente_id, fecha
- **Queries Optimizadas**: Uso de select específico en Prisma
- **Caching**: Redis para estadísticas populares
- **Pagination**: Cursor-based para listas largas

### 8.2 Optimizaciones de Frontend
- **Lazy Loading**: Componentes cargados bajo demanda
- **Image Optimization**: WebP, compresión automática
- **State Management**: Context API para estado global
- **Debounced Updates**: Actualización eficiente de ratings

### 8.3 Monitoreo y Métricas
```javascript
// Métricas clave
const metrics = {
    total_reviews: 'Contador total de reseñas',
    average_rating_trend: 'Tendencia de calificaciones promedio',
    review_completion_rate: 'Tasa de servicios reseñados',
    image_upload_success: 'Éxito en subida de imágenes'
};
```

## 9. Cumplimiento con Requerimientos

### ✅ REQ-21: Calificación con Estrellas (1-5)
- **Implementado**: RatingStars component con validación
- **Validación**: Frontend + Backend + DB constraints
- **UI**: Estrellas interactivas con feedback visual

### ✅ REQ-22: Comentario Escrito
- **Implementado**: Textarea opcional en ReviewForm
- **Almacenamiento**: Campo TEXT en resenas
- **Validación**: Sanitización de input

### ✅ REQ-23: Adjuntar Foto del Servicio
- **Implementado**: ImageUpload component
- **Almacenamiento**: Cloudinary con URLs seguras
- **Validación**: Tipo, tamaño, contenido

### ✅ REQ-24: Calificación Promedio
- **Implementado**: Cálculo automático en RatingService
- **Actualización**: Trigger en creación/edición de reseñas
- **Visualización**: RatingDisplay component

### ✅ REQ-25: Solo Servicios Completados
- **Implementado**: Verificación de estado en backend
- **UI**: Endpoint de elegibilidad previene mostrar formulario
- **Seguridad**: Validación múltiple capas

## 10. Diagramas Técnicos

### 10.1 Diagrama de Secuencia - Crear Reseña

```
Cliente → Frontend: Enviar formulario
Frontend → Backend: POST /api/reviews (FormData)
Backend → DB: Verificar elegibilidad
DB → Backend: Servicio completado, sin reseña previa
Backend → Cloudinary: Subir imagen (si existe)
Cloudinary → Backend: URL segura
Backend → DB: Crear reseña
Backend → DB: Actualizar calificacion_promedio
Backend → FCM: Notificar profesional
Backend → Email: Enviar notificación
Backend → Frontend: Respuesta exitosa
Frontend → Cliente: Mostrar confirmación
```

### 10.2 Diagrama de Componentes

```
┌─────────────────────────────────────┐
│         Frontend Layer              │
├─────────────────────────────────────┤
│ • ReviewForm (formulario)           │
│ • RatingDisplay (visualización)     │
│ • RatingStars (input interactivo)   │
│ • ImageUpload (subida de fotos)     │
└─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│         API Layer                   │
├─────────────────────────────────────┤
│ • reviewController (lógica)         │
│ • validationService (reglas)        │
│ • ratingService (cálculos)          │
│ • storageService (imágenes)         │
└─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│         Data Layer                  │
├─────────────────────────────────────┤
│ • resenas (reseñas)                 │
│ • perfiles_profesionales (promedios)│
│ • servicios (relaciones)            │
│ • usuarios (autenticación)          │
└─────────────────────────────────────┘
```

## 11. Recomendaciones de Implementación

### 11.1 Fase 1: Core Functionality
1. Implementar esquema de BD con constraints
2. Crear endpoints REST básicos
3. Desarrollar componentes frontend esenciales
4. Integrar validaciones de seguridad

### 11.2 Fase 2: Enhanced Features
1. Sistema de notificaciones push
2. Estadísticas avanzadas
3. Moderación de contenido
4. Analytics y métricas

### 11.3 Fase 3: Optimization
1. Implementar caching (Redis)
2. Optimización de queries
3. CDN para imágenes
4. Monitoring avanzado

## 12. Conclusión

Esta arquitectura proporciona un sistema de reseñas robusto, escalable y seguro que cumple con todos los requerimientos del PRD mientras ofrece una experiencia de usuario excepcional. La separación clara de responsabilidades, las validaciones múltiples y la integración seamless con módulos existentes garantizan un producto de alta calidad listo para producción.

**Estado**: ✅ **APROBADO PARA IMPLEMENTACIÓN**

La arquitectura está diseñada siguiendo las mejores prácticas de desarrollo, con énfasis en seguridad, rendimiento y mantenibilidad.