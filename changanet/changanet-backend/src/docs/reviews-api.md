# API de Reseñas y Valoraciones - Changánet

## Descripción General

La API de Reseñas y Valoraciones permite a los clientes dejar reseñas y calificaciones para servicios completados. Implementa todas las funcionalidades requeridas en REQ-21 a REQ-25 del PRD.

## Autenticación

Todos los endpoints requieren autenticación JWT válida. Incluya el token en el header `Authorization: Bearer <token>`.

## Endpoints

### 1. Crear Reseña

**POST** `/api/reviews`

Crea una nueva reseña para un servicio completado.

#### Parámetros de Request

- **Content-Type**: `multipart/form-data`
- **Campos requeridos**:
  - `servicio_id` (string): ID del servicio a reseñar
  - `calificacion` (integer): Calificación de 1 a 5 estrellas
  - `comentario` (string, opcional): Comentario escrito
- **Archivos opcionales**:
  - `url_foto` (file): Imagen del servicio (máx. 5MB, formatos: JPEG, PNG, WebP)

#### Validaciones

- Usuario debe ser el cliente del servicio
- Servicio debe estar en estado 'completado'
- No debe existir reseña previa para el servicio
- Calificación debe ser entero entre 1-5
- Imagen opcional pero con límites de tamaño y tipo

#### Respuesta Exitosa (201)

```json
{
  "id": "uuid-reseña",
  "servicio_id": "uuid-servicio",
  "cliente_id": "uuid-cliente",
  "calificacion": 5,
  "comentario": "Excelente servicio",
  "url_foto": "https://cloudinary.com/...",
  "creado_en": "2025-11-29T00:00:00.000Z"
}
```

#### Códigos de Error

- `400`: Datos inválidos (detalles en respuesta)
- `401`: No autenticado
- `403`: No autorizado para reseñar este servicio
- `429`: Límite de reseñas excedido (5 por 15 minutos)
- `500`: Error interno del servidor

### 2. Verificar Elegibilidad para Reseñar

**GET** `/api/reviews/check/:servicioId`

Verifica si el usuario autenticado puede dejar una reseña para un servicio específico.

#### Parámetros de URL

- `servicioId` (string): ID del servicio a verificar

#### Respuesta Exitosa (200)

```json
{
  "canReview": true
}
```

```json
{
  "canReview": false,
  "reason": "El servicio debe estar completado para poder reseñar"
}
```

### 3. Obtener Reseñas de un Profesional

**GET** `/api/reviews/professional/:professionalId`

Obtiene todas las reseñas de un profesional específico.

#### Parámetros de URL

- `professionalId` (string): ID del profesional

#### Respuesta Exitosa (200)

```json
[
  {
    "id": "uuid-reseña",
    "servicio_id": "uuid-servicio",
    "cliente_id": "uuid-cliente",
    "calificacion": 4,
    "comentario": "Buen trabajo",
    "url_foto": "https://cloudinary.com/...",
    "creado_en": "2025-11-29T00:00:00.000Z",
    "servicio": {
      "descripcion": "Servicio de plomería"
    },
    "cliente": {
      "nombre": "Juan Pérez",
      "email": "juan@example.com"
    }
  }
]
```

### 4. Obtener Estadísticas de Reseñas

**GET** `/api/reviews/professional/:professionalId/stats`

Obtiene estadísticas agregadas de reseñas para un profesional.

#### Parámetros de URL

- `professionalId` (string): ID del profesional

#### Respuesta Exitosa (200)

```json
{
  "professionalId": "uuid-profesional",
  "totalReviews": 25,
  "averageRating": 4.2,
  "ratingDistribution": {
    "1": 0,
    "2": 1,
    "3": 3,
    "4": 8,
    "5": 13
  },
  "positivePercentage": 84,
  "lastReviewDate": "2025-11-29T10:30:00.000Z"
}
```

### 5. Obtener Reseñas del Cliente

**GET** `/api/reviews/client`

Obtiene todas las reseñas escritas por el cliente autenticado.

#### Respuesta Exitosa (200)

```json
{
  "reviews": [
    {
      "id": "uuid-reseña",
      "servicio_id": "uuid-servicio",
      "cliente_id": "uuid-cliente",
      "calificacion": 5,
      "comentario": "Excelente profesional",
      "url_foto": null,
      "creado_en": "2025-11-29T00:00:00.000Z",
      "servicio": {
        "profesional": {
          "nombre": "María González",
          "especialidad": "Pintura",
          "perfil_profesional": {
            "especialidad": "Pintor"
          }
        }
      }
    }
  ]
}
```

## Reglas de Negocio

### RB-01: Una Reseña por Servicio
- Cada servicio puede tener máximo una reseña
- Implementado con UNIQUE constraint en `servicio_id`

### RB-02: Solo Servicios Completados
- Solo servicios en estado 'completado' pueden ser reseñados
- Validación en backend antes de permitir reseña

### RB-03: Calificación Obligatoria (1-5)
- Campo requerido, validado como entero entre 1-5
- Representa estrellas en la interfaz

### RB-04: Comentario Opcional
- Campo TEXT nullable
- Longitud máxima: 1000 caracteres
- Sanitización automática de HTML/scripts

### RB-05: Foto Opcional con Validaciones
- Máximo 5MB por imagen
- Solo formatos: JPEG, PNG, WebP
- Almacenamiento en Cloudinary
- URLs seguras generadas automáticamente

## Seguridad

### Autenticación y Autorización
- JWT Bearer Token requerido en todos los endpoints
- Verificación de propiedad del servicio
- Rate limiting: máximo 5 reseñas por usuario cada 15 minutos

### Validación de Datos
- Sanitización de comentarios (remoción de HTML/scripts)
- Validación de tipos MIME para imágenes
- Límites de tamaño de archivos
- Validación de rangos numéricos

### Protección de Imágenes
- URLs firmadas con expiración
- Acceso restringido a usuarios autenticados
- Almacenamiento seguro en Cloudinary

## Notificaciones

### Eventos Automáticos
- **Nueva reseña**: Notificación push al profesional
- **Nueva reseña**: Notificación en base de datos al profesional
- **Actualización de promedio**: Perfil profesional actualizado automáticamente

### Tipos de Notificación
- `resena_recibida`: Nueva reseña recibida
- `nuevo_mensaje_chat`: Mensaje relacionado con reseña

## Integración con Módulos Existentes

### Usuarios
- Relación con tabla `usuarios` para clientes y profesionales
- Actualización automática de `calificacion_promedio` en perfiles profesionales

### Servicios
- Relación con tabla `servicios` (estado 'completado' requerido)
- Una reseña por servicio (constraint UNIQUE)

### Pagos
- Servicios pagados pueden ser reseñados
- Custodia de fondos puede liberarse tras reseña positiva (futuro)

## Manejo de Errores

Todos los errores siguen el formato estándar:

```json
{
  "error": "Descripción corta del error",
  "message": "Mensaje detallado para el usuario",
  "details": ["Array de errores específicos"] // opcional
}
```

### Códigos HTTP
- `200`: Éxito
- `201`: Recurso creado
- `400`: Datos inválidos
- `401`: No autenticado
- `403`: No autorizado
- `404`: Recurso no encontrado
- `429`: Límite excedido
- `500`: Error interno

## Testing

### Cobertura de Tests
- Validación de elegibilidad
- Cálculo de promedios
- Validación de datos
- Manejo de errores
- Integración con servicios externos

### Comandos de Test
```bash
# Ejecutar todos los tests
npm test

# Ejecutar con cobertura
npm run test:coverage

# Ejecutar tests específicos
npm test validationService.test.js
npm test ratingService.test.js
```

## Métricas y Monitoreo

### KPIs Principales
- `total_reviews`: Contador total de reseñas
- `average_rating_trend`: Tendencia de calificaciones promedio
- `review_completion_rate`: Tasa de servicios reseñados
- `image_upload_success`: Éxito en subida de imágenes

### Logs
- Creación de reseñas
- Errores de validación
- Problemas de subida de imágenes
- Intentos de abuso/rate limiting

## Cumplimiento con Requerimientos

✅ **REQ-21**: Calificación con estrellas (1-5) - Validación estricta
✅ **REQ-22**: Comentario escrito - Campo opcional sanitizado
✅ **REQ-23**: Adjuntar foto - Subida a Cloudinary con validaciones
✅ **REQ-24**: Calificación promedio - Cálculo automático y actualización
✅ **REQ-25**: Solo servicios completados - Validación completa en backend

## Versionado

- **Versión actual**: 1.0.0
- **Fecha de implementación**: Noviembre 2025
- **Compatibilidad**: Requiere autenticación JWT y servicios completados
