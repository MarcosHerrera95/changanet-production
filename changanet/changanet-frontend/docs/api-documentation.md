# 📚 Documentación de la API de Changánet

## 📡 Endpoints Públicos

### `POST /api/auth/register`
**Descripción:** Registrar un nuevo usuario (cliente o profesional).

**Cuerpo de la Solicitud:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña_segura",
  "name": "Nombre Completo",
  "role": "cliente" // o "profesional"
}
### `POST /api/auth/login`
**Descripción:** Iniciar sesión de usuario.

**Cuerpo de la Solicitud:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña_segura"
}
```
