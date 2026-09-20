#!/bin/bash
# ==============================================================================
# Script de Actualización Automática para DOCENTY PRO en VPS DigitalOcean
# Ejecutar cada vez que quieras actualizar la aplicación con los últimos cambios
# ==============================================================================

set -e

echo "🔄 [1/4] Actualizando repositorio git..."
cd /var/www/docenty
# Guardar cambios locales (como config_store.json con tokens activos) antes de actualizar
git stash
git pull origin main || git pull
git stash pop || true

echo "📦 [2/4] Instalando dependencias..."
export NODE_OPTIONS="--max-old-space-size=1536"
npm install --include=dev --no-audit --no-fund

echo "🏗️ [3/4] Compilando frontend y servidor optimizado..."
npm run build

echo "🚀 [4/4] Reiniciando servicio PM2..."
pm2 restart ecosystem.config.cjs || pm2 restart docenty-pro

echo "✅ ¡Docenty PRO actualizado y en ejecución en DigitalOcean!"
pm2 status docenty-pro
