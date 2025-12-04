# Configuración de VITE_BACKEND_URL para producción

**IMPORTANTE:**

Para que el login y todas las llamadas a la API funcionen en producción, debes definir la variable de entorno:

```
VITE_BACKEND_URL=https://changanet-backend-xxxxx.onrender.com
```

- Reemplaza `xxxxx` por el subdominio real de tu backend en Render.
- Configura esta variable en el panel de Render, en tu servicio frontend, sección **Environment**.
- Luego, haz redeploy del frontend.

**¿Qué pasa si no la configuras?**
- El login y otras llamadas a la API fallarán y verás un error claro en pantalla.
- El botón de login con Google quedará deshabilitado en producción hasta que la variable esté presente.

**En desarrollo:**
- Puedes dejarla vacía o apuntar a `http://localhost:3003` si usas proxy de Vite.

---

**Checklist rápido:**
- [ ] Variable agregada en Render frontend: `VITE_BACKEND_URL=https://changanet-backend-xxxxx.onrender.com`
- [ ] Backend responde en esa URL y tiene el endpoint `/api/auth/google-login`
- [ ] Redeploy realizado
- [ ] Login probado en producción
