#!/bin/bash
# Droplet deploy script — source of truth for `~/nabani-backend` on the server.
# The Deploy workflow (main.yml) SSHes in and runs that file after scp'ing
# backend.tar.gz (compiled app + pruned production node_modules) to
# /home/ellebkey/apps/nabani. After editing this file, copy it to the
# droplet: scp deploy/nabani-backend.sh <user>@<host>:~/nabani-backend
set -e

DEPLOY_START=$(date +%s)
log() { echo "==> [$(date '+%H:%M:%S')] $1"; }

log "Deploy started"

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 24 > /dev/null
log "Runtime: node $(node -v) / npm $(npm -v)"

cd /home/ellebkey/apps/nabani
log "Artifact: $(du -h backend.tar.gz | cut -f1) backend.tar.gz"

log "Swapping release (previous kept as backend.old)"
rm -rf backend.old
[ -d backend ] && mv backend backend.old
tar -xzf backend.tar.gz
rm backend.tar.gz
log "Extracted: $(find backend -type f -name '*.js' -not -path '*/node_modules/*' | wc -l) app files, node_modules $(du -sh backend/node_modules | cut -f1)"

# Secret env — Nabani's sequelize-cli config (db-migrations/config/config.js) reads DB
# credentials from this .env via dotenv, so no separate config.json is needed.
cp ~/secrets/.env.nabani backend/.env
log "Secrets in place"

cd backend
export NODE_ENV=production
log "Running migrations..."
npx sequelize-cli db:migrate
log "Migrations done"

log "Restarting pm2 app"
pm2 restart nabani-backend --update-env

# Health check — fail the pipeline if the app doesn't come back
PORT=$(grep -oP '^PORT=\K\d+' .env || echo 5333)
log "Health check on :$PORT"
for i in $(seq 1 10); do
  if curl -sf -o /dev/null "http://127.0.0.1:$PORT/api/health-check"; then
    log "App is up (responded on attempt $i)"
    log "Deploy finished in $(( $(date +%s) - DEPLOY_START ))s ✔"
    exit 0
  fi
  sleep 2
done

log "App did NOT respond after 20s — deploy FAILED (previous release in backend.old)"
pm2 logs nabani-backend --nostream --lines 30
exit 1
