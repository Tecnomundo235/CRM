#!/bin/bash
# ==============================================================================
# Script de Actualización Automática para DOCENTY PRO en VPS DigitalOcean
# Ejecutar cada vez que quieras actualizar la aplicación con los últimos cambios
# ==============================================================================

set -e

echo "🔄 [1/4] Actualizando repositorio git..."
cd /var/www/docenty
git pull origin main || git pull

echo "📦 [2/4] Instalando dependencias..."
npm install

echo "🏗️ [3/4] Compilando frontend y servidor optimizado..."
npm run build

echo "🚀 [4/4] Reiniciando servicio PM2..."
pm2 restart ecosystem.config.cjs || pm2 restart docenty-pro

echo "✅ ¡Docenty PRO actualizado y en ejecución en DigitalOcean!"
pm2 status docenty-pro
