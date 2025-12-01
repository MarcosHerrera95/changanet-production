# 🚀 Changánet Backend

Backend para la plataforma Changánet, una plataforma web responsive que conecta a clientes con profesionales de servicios técnicos.

## 🛠️ Tecnologías

*   **Lenguaje:** Node.js
*   **Framework:** Express
*   **Base de Datos:** PostgreSQL
*   **ORM:** Prisma
*   **Autenticación:** JWT
*   **Chat en Tiempo Real:** Socket.IO

## 🚀 Cómo Ejecutar el Proyecto

1.  Clonar el repositorio:
    ```bash
    git clone https://github.com/tu-usuario/changanet-backend.git
    cd changanet-backend
    ```

2.  Instalar dependencias:
    ```bash
    npm install
    ```

3.  Configurar variables de entorno:
    *   Crea un archivo `.env` en la raíz del proyecto.
    *   Copia el contenido de `.env.example` y rellena tus credenciales.

4.  Generar la base de datos:
    ```bash
    npx prisma migrate dev --name init
    npx prisma generate
    ```

5.  Iniciar el servidor:
    ```bash
    npm run dev
    ```

El backend estará corriendo en `http://localhost:3003`.
