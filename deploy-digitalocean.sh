#!/bin/bash
# ==============================================================================
# Script de Despliegue y Optimización para DigitalOcean Droplet
# Especificaciones: Ubuntu 24.04 LTS (x64) - 1 vCPU, 512 MB RAM, 10 GB SSD
# IP: 165.22.180.160 | Proyecto: Docenty PRO & WhatsApp AI Seller
# ==============================================================================

set -e

echo "🚀 [1/6] Iniciando aprovisionamiento en DigitalOcean (Ubuntu 24.04)..."

# 1. Configurar SWAP de 2GB (VITAL para Droplets de 512MB RAM para evitar OOM Killer)
if [ ! -f /swapfile ]; then
  echo "💾 [2/6] Configurando archivo SWAP de 2GB para optimizar los 512MB de RAM..."
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl vm.swappiness=10
  echo 'vm.swappiness=10' >> /etc/sysctl.conf
  echo "✅ SWAP de 2GB activado con éxito."
else
  echo "ℹ️ SWAP ya configurado."
fi

# 2. Actualizar sistema e instalar dependencias base
echo "📦 [3/6] Actualizando repositorios e instalando Nginx, Node.js 20 y utilidades..."
apt-get update -y
apt-get install -y curl wget git ufw nginx certbot python3-certbot-nginx build-essential

# Instalar Node.js 20 LTS
if ! command -v node &> /dev/null; then
  echo "⚡ Instalando Node.js 20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# Instalar PM2 globalmente
npm install -g pm2

# 3. Configurar Cortafuegos UFW
echo "🛡️ [4/6] Configurando Firewall UFW (SSH, HTTP, HTTPS)..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 4. Configurar Nginx como Reverse Proxy hacia el puerto 3000
echo "🌐 [5/6] Configurando Nginx Reverse Proxy hacia puerto 3000..."
cat << 'EOF' > /etc/nginx/sites-available/docenty
server {
    listen 80;
    server_name _;

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/docenty /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 5. Crear directorio de la aplicación si no existe
mkdir -p /var/www/docenty
cd /var/www/docenty

echo "=================================================================="
echo "🎉 ¡VPS DIGITALOCEAN PREPARADA EXITOSAMENTE!"
echo "IP Pública: 165.22.180.160"
echo "Memoria: 512MB RAM + 2GB SWAP virtual para Node.js"
echo ""
echo "PASOS SIGUIENTES PARA EJECUTAR TU APLICACIÓN:"
echo "1) Sube o clona el código en /var/www/docenty"
echo "2) Configura las variables en .env (META_WA_TOKEN, GEMINI_API_KEY, etc.)"
echo "3) Ejecuta:"
echo "   npm install --production"
echo "   npm run build"
echo "   pm2 start dist/server.cjs --name docenty-pro --node-args='--max-old-space-size=256'"
echo "   pm2 save"
echo "   pm2 startup"
echo "=================================================================="
