#!/bin/bash
# ==============================================================================
# MARKAZ TIKRAR INDONESIA (MTI) - AUTOMATED FAST DEPLOYMENT TO VPS
# ==============================================================================

set -e

VPS_HOST="187.52.120.159"
VPS_USER="root"
SITE_USER="markaztikrar"
REMOTE_PATH="/home/markaztikrar/htdocs/markaztikrar.id"
APP_PORT="3006"

echo "=========================================================="
echo "🚀 STARTING FAST DEPLOYMENT TO VPS (${VPS_HOST})"
echo "Target Directory: ${REMOTE_PATH}"
echo "Port: ${APP_PORT}"
echo "=========================================================="

# 1. Test SSH Connection
echo "Step 1: Testing SSH Connection..."
ssh -o BatchMode=yes -o ConnectTimeout=5 ${VPS_USER}@${VPS_HOST} "echo '✅ SSH Connection OK'"

# 2. Build Next.js locally on macOS for maximum speed
echo ""
echo "Step 2: Building Next.js Locally on Mac..."
npm run build

# 3. Synchronize Application Code and .next to VPS
echo ""
echo "Step 3: Syncing Build & Source Code to ${REMOTE_PATH}..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'backups' \
  --exclude '.env.local' \
  ./ ${VPS_USER}@${VPS_HOST}:${REMOTE_PATH}/

# 4. Check & Sync Production Environment Variables
echo ""
echo "Step 4: Ensuring Production .env.local on VPS..."
if [ -f ".env.production" ]; then
  echo "Syncing .env.production to VPS .env.local..."
  scp .env.production ${VPS_USER}@${VPS_HOST}:${REMOTE_PATH}/.env.local
elif [ -f ".env.local" ]; then
  echo "Syncing local .env.local to VPS..."
  scp .env.local ${VPS_USER}@${VPS_HOST}:${REMOTE_PATH}/.env.local
else
  echo "Preserving existing .env.local on VPS..."
fi

# 5. Set Permissions, Install Dependencies & Restart Services
echo ""
echo "Step 5: Setting Permissions, Installing Dependencies & Restarting Services on VPS..."
ssh ${VPS_USER}@${VPS_HOST} "
  systemctl restart postgrest-mti || true
  chmod -R 775 ${REMOTE_PATH}
  chown -R ${SITE_USER}:${SITE_USER} ${REMOTE_PATH}
  su - ${SITE_USER} -c 'cd ${REMOTE_PATH} && npm install --omit=dev --legacy-peer-deps && (pm2 restart markaztikrar-app || pm2 start npm --name \"markaztikrar-app\" -- start -- -p ${APP_PORT}) && pm2 save'
"

# 6. Verify Health
echo ""
echo "Step 6: Verifying Deployment Health..."
sleep 2
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://markaztikrar.id)
echo "HTTP Status Code: ${HTTP_STATUS}"

if [ "${HTTP_STATUS}" == "200" ] || [ "${HTTP_STATUS}" == "307" ] || [ "${HTTP_STATUS}" == "308" ]; then
  echo ""
  echo "=========================================================="
  echo "✅ DEPLOYMENT SUCCESSFUL! 🎉"
  echo "🌐 App is Live: https://markaztikrar.id"
  echo "🗄️ PostgreSQL Database: mti_db (Local VPS)"
  echo "⚡ PostgREST Service: Running on 127.0.0.1:3010"
  echo "🔒 Auth & Sessions: Native PostgreSQL & JWT Cookies"
  echo "=========================================================="
else
  echo "⚠️ Warning: Expected HTTP 200/307/308 but got ${HTTP_STATUS}. Check logs on server."
fi
