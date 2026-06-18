#!/bin/bash
# ════════════════════════════════════════════════════════════
# Script Setup para Azure - StayEvent
# ════════════════════════════════════════════════════════════

echo "🚀 Iniciando configuración de StayEvent para Azure..."

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verificar Node.js
echo -e "${BLUE}[1/5]${NC} Verificando Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# 2. Verificar Git
echo -e "${BLUE}[2/5]${NC} Verificando Git..."
if ! command -v git &> /dev/null; then
    echo "❌ Git no está instalado"
    exit 1
fi
echo -e "${GREEN}✓ Git instalado${NC}"

# 3. Instalar dependencias backend
echo -e "${BLUE}[3/5]${NC} Instalando dependencias del servidor..."
cd server
npm ci
echo -e "${GREEN}✓ Dependencias del servidor instaladas${NC}"

# 4. Instalar dependencias frontend
echo -e "${BLUE}[4/5]${NC} Instalando dependencias del cliente..."
cd ../client
npm ci
echo -e "${GREEN}✓ Dependencias del cliente instaladas${NC}"

# 5. Crear .env si no existe
echo -e "${BLUE}[5/5]${NC} Verificando configuración de variables..."
cd ../server
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠ Archivo .env no encontrado${NC}"
    echo "📝 Usa el archivo .env.example como referencia"
    echo "📝 Cambia .env.example a .env y rellena tus datos"
else
    echo -e "${GREEN}✓ .env existe${NC}"
fi

echo -e "\n${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Setup completado!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
echo "📋 Próximos pasos:"
echo "  1. Lee GUIA_DEPLOYMENT_AZURE.md"
echo "  2. Crea tu base de datos en Azure"
echo "  3. Configura las variables de entorno"
echo "  4. Haz 'git push' para activar CI/CD"
echo ""
