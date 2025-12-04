#!/bin/bash

# 🚀 SCRIPT DE PRUEBA - SISTEMA DE LOGIN/REGISTRO

echo "=========================================="
echo "🚀 CHANGANET - PRUEBA DE INICIO DE SESIÓN"
echo "=========================================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar que está en la rama correcta
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "inicio-sesion" ]; then
    echo -e "${YELLOW}⚠️  Estás en la rama: $CURRENT_BRANCH${NC}"
    echo -e "${BLUE}Para ver los cambios, cambia a: git checkout inicio-sesion${NC}"
fi

echo ""
echo -e "${BLUE}📋 ARCHIVOS MODIFICADOS:${NC}"
echo "  1. ✅ changanet-backend/src/controllers/authController.js"
echo "  2. ✅ changanet-backend/src/services/emailService.js"
echo "  3. ✅ changanet-frontend/src/context/AuthProvider.jsx"
echo ""

echo -e "${BLUE}🔍 VERIFICANDO SINTAXIS:${NC}"

# Verificar backend
cd "changanet/changanet-backend"
if node -c src/controllers/authController.js 2>/dev/null; then
    echo -e "${GREEN}✅ authController.js - Sintaxis correcta${NC}"
else
    echo -e "${RED}❌ authController.js - Error de sintaxis${NC}"
fi

if node -c src/services/emailService.js 2>/dev/null; then
    echo -e "${GREEN}✅ emailService.js - Sintaxis correcta${NC}"
else
    echo -e "${RED}❌ emailService.js - Error de sintaxis${NC}"
fi

cd "../.."

echo ""
echo -e "${BLUE}📦 CAMBIOS PRINCIPALES:${NC}"
echo ""
echo "1️⃣  Backend - emailService.js"
echo "   • Mejor manejo de errores de SendGrid"
echo "   • En desarrollo, no falla si API key es inválida"
echo ""

echo "2️⃣  Backend - authController.js (Login)"
echo "   • Ahora incluye 'token' en la respuesta"
echo "   • Respuesta: { message, user, token }"
echo ""

echo "3️⃣  Backend - authController.js (Register)"
echo "   • Ahora incluye 'token' en la respuesta"
echo "   • Respuesta: { message, user, token, requiresVerification }"
echo ""

echo "4️⃣  Frontend - AuthProvider.jsx"
echo "   • Agregado credentials: 'include' en fetch"
echo "   • Espera y usa token en la respuesta"
echo ""

echo -e "${YELLOW}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}🧪 PASOS PARA PROBAR:${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════${NC}"
echo ""

echo "1. Asegúrate de que el backend esté corriendo:"
echo -e "   ${BLUE}cd changanet/changanet-backend${NC}"
echo -e "   ${BLUE}npm run dev${NC}"
echo ""

echo "2. Asegúrate de que el frontend esté corriendo:"
echo -e "   ${BLUE}cd changanet/changanet-frontend${NC}"
echo -e "   ${BLUE}npm run dev${NC}"
echo ""

echo "3. Abre el navegador:"
echo -e "   ${BLUE}http://localhost:5175${NC}"
echo ""

echo "4. OPCIÓN A - Registrar un usuario nuevo:"
echo "   • Click en 'Registrarse'"
echo "   • Completa el formulario"
echo "   • El email de verificación puede fallar (es normal)"
echo "   • Deberías hacer login automático"
echo ""

echo "5. OPCIÓN B - Iniciar sesión (si ya tienes usuario):"
echo "   • Click en 'Iniciar Sesión'"
echo "   • Completa email y contraseña"
echo "   • Deberías ver tu dashboard"
echo ""

echo -e "${YELLOW}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}🔍 VERIFICAR EN DEVTOOLS (F12):${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════${NC}"
echo ""

echo "Tab de Storage:"
echo "  • localStorage → changanet_user (datos del usuario)"
echo "  • localStorage → changanet_token (JWT token)"
echo ""

echo "Tab de Network:"
echo "  • POST /api/auth/login (o /api/auth/register)"
echo "  • Headers → Response Headers"
echo "  • Buscar 'set-cookie' para ver cookies httpOnly"
echo ""

echo "Tab de Console:"
echo "  • Buscar logs: 'AuthContext - loginWithEmail: Success response'"
echo "  • Ver el token en la respuesta"
echo ""

echo -e "${YELLOW}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}✨ ¡Listo para probar!${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════${NC}"
echo ""
