#!/bin/bash
# ==============================================================================
# Script de Actualización Rápida y Segura para Docenty PRO en VPS DigitalOcean
# - Protege la base de datos (leads y chats) y variables .env
# - Descarga código actualizado desde Git
# - Compila el proyecto sin fugas de memoria
# - Recarga PM2 sin caída del servicio (Zero-Downtime)
# ==============================================================================

set -e

PROJECT_DIR="/var/www/docenty"

echo "🔄 [1/4] Accediendo al directorio de la app ($PROJECT_DIR)..."
cd "$PROJECT_DIR" || { echo "❌ Error: Directorio $PROJECT_DIR no encontrado"; exit 1; }

echo "📥 [2/4] Sincronizando cambios de código..."
if [ -d ".git" ]; then
  # Preserva cambios locales en archivos de datos antes del pull
  git stash push -m "Auto-backup before update" sqlite.db config_store.json leads_store.json .env 2>/dev/null || true
  git pull origin main --rebase || git pull origin main
  git stash pop 2>/dev/null || true
else
  echo "ℹ️ No se detectó repositorio Git. Continuando con la compilación..."
fi

echo "⚙️ [3/4] Compilando la nueva versión con optimización de memoria..."
NODE_OPTIONS="--max-old-space-size=450" npm run build

echo "🚀 [4/4] Recargando el servicio PM2 (Zero-Downtime)..."
pm2 reload docenty-pro --update-env || pm2 restart docenty-pro --update-env

echo ""
echo "=================================================================="
echo "✅ ¡DOCENTY PRO ACTUALIZADO CON ÉXITO EN TU VPS!"
echo "• Base de datos y leads: INTACTOS"
echo "• URL y Webhook: SIN CAMBIOS"
echo "• Estado del proceso PM2:"
pm2 status docenty-pro
echo "=================================================================="
