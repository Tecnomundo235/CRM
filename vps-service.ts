import { Client, ConnectConfig } from "ssh2";

export interface SshCredentials {
  host: string;
  port?: number;
  username: string;
  password?: string;
  privateKey?: string;
}

export interface RemoteExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Execute a command over SSH with a timeout
 */
export function runSshCommand(
  creds: SshCredentials,
  command: string,
  timeoutMs: number = 30000
): Promise<RemoteExecResult> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let stdout = "";
    let stderr = "";
    let isDone = false;

    const timer = setTimeout(() => {
      if (!isDone) {
        isDone = true;
        conn.end();
        resolve({
          stdout,
          stderr: stderr + `\n[Error: Tiempo de espera agotado después de ${timeoutMs / 1000}s]`,
          exitCode: 124,
        });
      }
    }, timeoutMs);

    conn
      .on("ready", () => {
        conn.exec(command, (err, stream) => {
          if (err) {
            clearTimeout(timer);
            conn.end();
            return reject(err);
          }

          stream
            .on("close", (code: number) => {
              if (!isDone) {
                isDone = true;
                clearTimeout(timer);
                conn.end();
                resolve({ stdout, stderr, exitCode: code ?? 0 });
              }
            })
            .on("data", (data: Buffer) => {
              stdout += data.toString("utf-8");
            })
            .stderr.on("data", (data: Buffer) => {
              stderr += data.toString("utf-8");
            });
        });
      })
      .on("error", (err) => {
        if (!isDone) {
          isDone = true;
          clearTimeout(timer);
          reject(err);
        }
      });

    const connectConfig: ConnectConfig = {
      host: creds.host || "165.22.180.160",
      port: creds.port || 22,
      username: creds.username || "root",
      readyTimeout: 15000,
      keepaliveInterval: 10000,
    };

    if (creds.privateKey && creds.privateKey.trim()) {
      connectConfig.privateKey = creds.privateKey;
    } else if (creds.password) {
      connectConfig.password = creds.password;
    }

    try {
      conn.connect(connectConfig);
    } catch (e) {
      clearTimeout(timer);
      reject(e);
    }
  });
}

/**
 * Generate the unattended, resilient bootstrap shell script.
 * Runs in background with nohup so network drops or phone sleep will NOT kill it.
 */
export function buildBootstrapScript(config: {
  repoUrl?: string;
  domain?: string;
  ip?: string;
  envContent?: string;
}): string {
  const ip = config.ip || "165.22.180.160";
  const domain = config.domain && config.domain !== ip ? config.domain : ip;
  const envContent = config.envContent || "";

  return `#!/bin/bash
# ==============================================================================
# DOCENTY PRO - UNATTENDED DIGITALOCEAN INSTALLER (RESILIENT / ANTI-DISCONNECT)
# Log: /var/log/docenty-install.log
# ==============================================================================
set -e
LOG_FILE="/var/log/docenty-install.log"
exec > >(tee -a "\$LOG_FILE") 2>&1

echo "=================================================================="
echo "🚀 INICIANDO INSTALACIÓN AUTOMÁTICA DE DOCENTY PRO CRM"
echo "⏰ Inicio: \$(date)"
echo "🖥️ Host IP: ${ip}"
echo "🌐 Dominio: ${domain}"
echo "=================================================================="

echo ">>> [PASO 1/7] Configurando memoria SWAP de 2GB (Vital para evitar fallos de memoria)..."
if ! swapon --show | grep -q "/swapfile"; then
  echo "Creando archivo swap de 2GB..."
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  if ! grep -q "/swapfile" /etc/fstab; then
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi
  sysctl vm.swappiness=10
  echo "✅ Swap de 2GB activada con éxito."
else
  echo "✅ Swap ya estaba configurada."
fi

echo ">>> [PASO 2/7] Actualizando repositorios e instalando herramientas base..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git nginx ufw certbot python3-certbot-nginx build-essential htop

echo ">>> [PASO 3/7] Instalando Node.js 20 LTS y PM2..."
if ! command -v node &> /dev/null || [[ \$(node -v) != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
npm install -g pm2
echo "✅ Node.js \$(node -v) y PM2 instalados."

echo ">>> [PASO 4/7] Configurando Firewall UFW (Seguridad básica)..."
ufw allow 22/tcp || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw allow 3000/tcp || true
echo "y" | ufw enable || true
echo "✅ Firewall configurado (Puertos 22, 80, 443, 3000 permitidos)."

echo ">>> [PASO 5/7] Configurando directorio de aplicación /var/www/docenty..."
mkdir -p /var/www/docenty/logs
cd /var/www/docenty

# Escribir archivo .env con configuraciones actuales
cat << 'EOF_ENV' > /var/www/docenty/.env
${envContent}
EOF_ENV
chmod 600 /var/www/docenty/.env
echo "✅ Archivo .env configurado."

# Escribir ecosystem.config.cjs de PM2
cat << 'EOF_PM2' > /var/www/docenty/ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "docenty-pro",
      script: "dist/server.cjs",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "350M",
      node_args: "--max-old-space-size=256",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      env_file: ".env",
      exp_backoff_restart_delay: 200,
      error_file: "logs/err.log",
      out_file: "logs/out.log",
      merge_logs: true,
      time: true
    }
  ]
};
EOF_PM2

echo ">>> [PASO 6/7] Configurando Nginx como Proxy Inverso..."
cat << 'EOF_NGINX' > /etc/nginx/sites-available/docenty
server {
    listen 80;
    server_name ${domain} ${ip};

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF_NGINX

ln -sf /etc/nginx/sites-available/docenty /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "✅ Nginx configurado y recargado."

echo ">>> [PASO 7/7] Verificando compilación o archivos existentes..."
if [ -f "/var/www/docenty/package.json" ]; then
  echo "Instalando dependencias de Node.js..."
  export NODE_OPTIONS="--max-old-space-size=1536"
  npm install --include=dev --no-audit --no-fund
  if [ ! -f "/var/www/docenty/dist/server.cjs" ]; then
    echo "Compilando proyecto (Vite frontend + esbuild backend)..."
    npm run build
  fi
  if [ -f "/var/www/docenty/dist/server.cjs" ]; then
    echo "Iniciando servicio con PM2..."
    pm2 delete docenty-pro 2>/dev/null || true
    pm2 start ecosystem.config.cjs
    pm2 save
    pm2 startup systemd -u root --hp /root || true
    echo "✅ Servicio PM2 iniciado exitosamente."
  else
    echo "⚠️ Advertencia: dist/server.cjs no fue generado aún."
  fi
else
  echo "ℹ️ El código fuente aún no está en /var/www/docenty."
  echo "ℹ️ El entorno base (Node 20, Nginx, PM2, SWAP, Firewall) está 100% LISTO."
fi

echo "=================================================================="
echo "🎉 === DOCENTY_INSTALL_SUCCESS ==="
echo "⏰ Finalizado: \$(date)"
echo "Servidor listo en http://${ip} o http://${domain}"
echo "=================================================================="
`;
}
