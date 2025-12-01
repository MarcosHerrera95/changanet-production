# 🚀 Guía de Despliegue en Producción - Changánet

## 📋 Pre-requisitos

### Infraestructura Requerida
- **Servidor**: Ubuntu 20.04+ / CentOS 7+ / Debian 10+
- **Base de Datos**: PostgreSQL 13+
- **Cache**: Redis 6+
- **Node.js**: 18+ LTS
- **Dominio**: Configurado con SSL

### Servicios Externos
- **Firebase**: Proyecto configurado
- **Google Cloud**: OAuth y Maps API
- **SendGrid**: Email service
- **Twilio**: SMS (opcional)
- **Sentry**: Error monitoring
- **Cloudinary**: File storage

---

## 🐳 Despliegue con Docker

### 1. Levantar Redis
```bash
cd changanet-backend
docker-compose -f docker-compose.redis.yml up -d
```

### 2. Configurar Variables de Entorno
```bash
cp .env.production .env
# Editar .env con valores reales de producción
```

### 3. Construir y Desplegar
```bash
# Construir imagen
docker build -t changanet-backend .

# Ejecutar contenedor
docker run -d \
  --name changanet-backend \
  --env-file .env \
  -p 3002:3002 \
  --network changanet-network \
  changanet-backend
```

---

## ⚙️ Configuración Manual

### 1. Instalar Dependencias del Sistema
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nodejs npm postgresql redis-server nginx certbot

# CentOS/RHEL
sudo yum install -y nodejs npm postgresql-server redis nginx certbot
```

### 2. Configurar PostgreSQL
```bash
# Crear base de datos
sudo -u postgres psql
CREATE DATABASE changanet_prod;
CREATE USER changanet_user WITH PASSWORD 'changanet2024';
GRANT ALL PRIVILEGES ON DATABASE changanet_prod TO changanet_user;
\q

# Ejecutar migraciones
npx prisma migrate deploy
npx prisma db seed
```

### 3. Configurar Redis
```bash
# Editar /etc/redis/redis.conf
sudo nano /etc/redis/redis.conf
# Agregar:
requirepass changanet2024
appendonly yes

# Reiniciar Redis
sudo systemctl restart redis
```

### 4. Configurar Nginx (Reverse Proxy + SSL)
```bash
# Crear configuración
sudo nano /etc/nginx/sites-available/changanet
```

```nginx
server {
    listen 80;
    server_name api.changanet.com;

    location / {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name changanet.com www.changanet.com;

    location / {
        proxy_pass http://localhost:5173;  # Puerto del frontend
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Servir archivos estáticos con caché
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/changanet /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Configurar SSL con Let's Encrypt
```bash
# Obtener certificado SSL
sudo certbot --nginx -d api.changanet.com -d changanet.com -d www.changanet.com

# Configurar renovación automática
sudo crontab -e
# Agregar: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 6. Configurar PM2 para el Backend
```bash
# Instalar PM2 globalmente
npm install -g pm2

# Crear archivo de configuración PM2
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'changanet-backend',
    script: 'src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3002
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3002
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

```bash
# Iniciar con PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

---

## 📊 Monitoreo y Mantenimiento

### Métricas de Rendimiento
```bash
# Ver métricas de PM2
pm2 monit

# Ver logs
pm2 logs changanet-backend

# Ver métricas de Redis
redis-cli -a changanet2024 info
```

### Backup Automático
```bash
# Script de backup
nano /usr/local/bin/backup-changanet.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/changanet"

# Backup PostgreSQL
pg_dump -U changanet_user -h localhost changanet_prod > $BACKUP_DIR/db_$DATE.sql

# Backup Redis
redis-cli -a changanet2024 --rdb $BACKUP_DIR/redis_$DATE.rdb

# Comprimir y limpiar backups antiguos (mantener 7 días)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.rdb" -mtime +7 -delete

echo "Backup completado: $DATE"
```

```bash
# Hacer ejecutable y programar
chmod +x /usr/local/bin/backup-changanet.sh
crontab -e
# Agregar: 0 2 * * * /usr/local/bin/backup-changanet.sh
```

---

## 🔧 Solución de Problemas

### Problema: Error de conexión a Redis
```bash
# Verificar estado de Redis
sudo systemctl status redis

# Verificar conectividad
redis-cli -a changanet2024 ping
```

### Problema: Error 502 Bad Gateway
```bash
# Verificar PM2
pm2 status

# Reiniciar aplicación
pm2 restart changanet-backend

# Verificar logs
pm2 logs changanet-backend --lines 50
```

### Problema: Alto uso de CPU/Memoria
```bash
# Ver procesos
htop

# Ver métricas de PM2
pm2 monit

# Reiniciar servicios
pm2 restart all
```

---

## 📈 Escalado Horizontal

### Load Balancer con Nginx
```nginx
upstream backend_servers {
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
    server 127.0.0.1:3004;
}

server {
    listen 80;
    server_name api.changanet.com;

    location / {
        proxy_pass http://backend_servers;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        # ... otros headers
    }
}
```

### Redis Cluster (para alta disponibilidad)
```yaml
# docker-compose.redis-cluster.yml
version: '3.8'
services:
  redis-1:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    # ... configuración adicional
```

---

## ✅ Checklist de Producción

- [ ] ✅ Variables de entorno configuradas
- [ ] ✅ Base de datos PostgreSQL creada y migrada
- [ ] ✅ Redis ejecutándose con contraseña
- [ ] ✅ SSL configurado con Let's Encrypt
- [ ] ✅ Nginx configurado como reverse proxy
- [ ] ✅ PM2 configurado para gestión de procesos
- [ ] ✅ Backups automáticos programados
- [ ] ✅ Monitoreo básico configurado
- [ ] ✅ Logs centralizados
- [ ] ✅ Firewall configurado
- [ ] ✅ Actualizaciones de seguridad programadas

---

## 🚨 Contactos de Emergencia

- **Soporte Técnico**: soporte@changanet.com
- **Monitoreo**: alerts@changanet.com
- **Administrador**: admin@changanet.com

---

## 📚 Documentación Adicional

- [API Documentation](./docs/swagger.yaml)
- [Database Schema](./prisma/schema.prisma)
- [Cache Implementation](./README-cache.md)
- [Testing Guide](./README-testing.md)

---

*Esta guía asegura un despliegue robusto y escalable de Changánet en producción.*
