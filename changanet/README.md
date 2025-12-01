
---

## 🚀 **CÓMO EJECUTAR EL SPRINT 6**

### **Paso 1: Asegúrate de que el Backend está Actualizado**

1.  **Detén el backend si está corriendo** (`Ctrl + C` en la terminal).
2.  **Reemplaza los archivos del backend** con los nuevos archivos proporcionados.
3.  **Instala las nuevas dependencias:**
    ```bash
    npm install helmet morgan compression rate-limiter-flexible swagger-jsdoc swagger-ui-express jest supertest eslint prettier @types/jest @types/supertest rimraf
    ```
4.  **Genera la documentación Swagger:**
    ```bash
    npm run docs
    ```
5.  **Ejecuta los tests:**
    ```bash
    npm test
    ```
6.  **Verifica la cobertura:**
    ```bash
    npm run test:coverage
    ```
7.  **Inicia el backend en modo producción:**
    ```bash
    npm start
    ```
    o con PM2:
    ```bash
    pm2 start ecosystem.config.js --env production
    ```

### **Paso 2: Actualiza el Frontend**

1.  **Detén el frontend si está corriendo** (`Ctrl + C` en la terminal).
2.  **Reemplaza los archivos del frontend** con los nuevos archivos proporcionados.
3.  **Instala las nuevas dependencias:**
    ```bash
    npm install @testing-library/react @testing-library/jest-dom
    ```
4.  **Ejecuta los tests:**
    ```bash
    npm test
    ```
5.  **Construye para producción:**
    ```bash
    npm run build
    ```

### **Paso 3: ¡Probar!**

1.  Abre tu navegador en `http://localhost:3003/api-docs` para ver la documentación de la API.
2.  Ejecuta `npm test` en ambos proyectos para asegurarte de que todos los tests pasan.
3.  Verifica que el backend responda en `http://localhost:3003/health`.
4.  Revisa la cobertura de tests (`coverage/lcov-report/index.html`).

---

## 🎯 **RESULTADO ESPERADO**

Al finalizar el Sprint 6, tendrás:

*   **Backend:** Totalmente testeado, documentado, optimizado y listo para producción.
*   **Frontend:** Totalmente testeado y optimizado para producción.
*   **Documentación:** Completa de la API, métricas de QA y guía de despliegue.
*   **Proceso de QA:** Implementado con tests unitarios, de integración y cobertura.
*   **Preparación para Lanzamiento:** Todo listo para el despliegue en producción.

---

## 🚀 **¡FELICIDADES!**

Has completado el desarrollo del **MVP completo de Changánet**. Tienes un producto funcional, probado, documentado y listo para ser lanzado al mercado. ¡Estás listo para el éxito! 🎉

¿Te gustaría que te ayude a crear un **plan de lanzamiento** o a **desplegar el proyecto en la nube** (Google Cloud, AWS, etc.)?
