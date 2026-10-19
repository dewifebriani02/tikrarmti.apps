# 📘 PANDUAN STANDAR DEPLOYMENT VPS (MULTI-TENANT)
**Host**: `187.52.120.159` (`srv1912648.hstgr.cloud`)  
**Panel**: CloudPanel (Ubuntu Linux)  
**Dokumen ini adalah rujukan wajib bagi seluruh developer / user yang mengelola dan mendeploy aplikasi di server ini.**

---

## 1. Spesifikasi & Karakteristik Server

Server ini adalah **Shared Environment** yang menampung banyak aplikasi produksi sekaligus:
* **CPU**: 1 Core vCPU (⚠️ Sangat sensitif terhadap proses kompilasi berat)
* **RAM**: 3.8 GiB (Swap: 2.0 GiB)
* **Node.js**: v20.x (`/usr/bin/node`)
* **Database**: MySQL 8.0 (`:3306`) & PostgreSQL 16 (`:5432`)
* **Web Server**: Nginx (Reverse Proxy & Static) + Varnish Cache (`:8080`, `:6081`)

---

## 2. Pemetaan Website & Registry Port Internal

Setiap aplikasi yang berjalan di server ini memiliki alokasi port dan user terisolasi. **DILARANG MENGGUNAKAN PORT YANG SUDAH TERDAFTAR!**

| Domain | User Linux | Stack Utama | Port Internal | Systemd Service PM2 |
| :--- | :--- | :--- | :---: | :---: |
| **`markaztikrar.id`** | `markaztikrar` | Next.js 14 | `3006` | `pm2-markaztikrar` |
| **`markaztikrar.id` (API)** | `markaztikrar` | PostgREST | `3010` | `postgrest.service` |
| **`hiaqli.pro`** | `hiaqli` | Next.js / Node | `3001` | `pm2-hiaqli` |
| **`koperasipesantren.online`** | `koperasipesantren` | Next.js | `3000` | `pm2-koperasipesantren` |
| **`koperasipesantren.online` (API)**| `koperasipesantren` | Python Uvicorn | `8000` | (via PM2) |
| **`aksyar.hiaqli.pro`** | `hiaqli-aksyar` | PHP / Laravel | Pool `20001` | PHP-FPM CloudPanel |
| **`anisha.hiaqli.pro`** | `anisha-patiseri` | PHP / Laravel | Pool `19002` | PHP-FPM CloudPanel |
| **`kenariledger.com`** | `kenariledger` | PHP / Laravel | Pool `19003` | PHP-FPM CloudPanel |
| **`proyeksi-mitra.online`** | `superadmin` | PHP / Laravel | Pool `19001` | PHP-FPM CloudPanel |

> 📌 **Aturan Alokasi Port Baru**:  
> Jika menambah aplikasi Node.js/Python baru, gunakan port kosong pada rentang **3002 - 3005** atau **3011 - 3020** dan catat di tabel ini.

---

## 3. 5 Aturan Emas (Golden Rules) Deployment

### ⚠️ ATURAN 1: JANGAN BUILD NEXT.JS / ASSET BERAT LANGSUNG DI VPS!
* Server hanya memiliki **1 Core CPU** dan RAM terbatas. Menjalankan `next build` langsung di server akan membuat CPU melonjak 100%, RAM habis, dan sistem Linux akan memicu **OOM Killer** (mematikan MySQL/Postgres dan membuat **SELURUH WEBSITE 502/DOWN**).
* **Solusi Wajib**:
  1. Jalankan `npm run build` di komputer lokal (Mac/PC) atau via GitHub Actions.
  2. Sync hasil build (`.next/`, source code, `public/`) ke VPS menggunakan `rsync` atau `scp`.
  3. Di server hanya jalankan `npm install --omit=dev` dan `pm2 reload`.

---

### 🔒 ATURAN 2: GUNAKAN USER LINUX MASING-MASING (JANGAN DEPLOY DENGAN ROOT!)
* Masing-masing aplikasi memiliki user terisolasi (misal: `markaztikrar`, `hiaqli`, `kenariledger`).
* Akses SSH harus diarahkan ke user tersebut:
  ```bash
  ssh markaztikrar@187.52.120.159
  # ATAU
  ssh hiaqli@187.52.120.159
  ```
* **Jangan deploy sebagai `root`**. File yang dibuat oleh `root` akan memiliki permission root dan menyebabkan aplikasi error permission (`EACCES`).

---

### 🔄 ATURAN 3: STANDAR MENJALANKAN & MENYIMPAN PROSES PM2
Untuk aplikasi berbasis Node.js/Python:
1. **Batas Memori Wajib**: Pasang `--max-memory-restart 500M` agar jika aplikasi mengalami kebocoran memori (memory leak), PM2 me-restart aplikasi secara graceful sebelum membuat server hang.
   ```bash
   pm2 start npm --name "nama-app" --max-memory-restart 500M -- start -- -p <PORT_INTERNAL>
   ```
2. **Kunci Daftar Proses (Wajib)**:
   Setiap kali menambah/mengubah proses PM2, jalankan:
   ```bash
   pm2 save
   ```
   *(File tersimpan di `/home/<user>/.pm2/dump.pm2`)*.
3. **Auto-Start Saat Reboot**:
   Server sudah dikonfigurasi dengan service systemd (`pm2-markaztikrar`, `pm2-hiaqli`, `pm2-koperasipesantren`). Saat server reboot, PM2 akan otomatis melakukan `pm2 resurrect`.

---

### ⚡ ATURAN 4: CARA RELOAD TANPA DOWNTIME (ZERO-DOWNTIME)
Saat memperbarui kode aplikasi yang sedang berjalan:
* ❌ **JANGAN**: `pm2 delete all` atau `pm2 kill` (akan menyebabkan 502 Bad Gateway saat proses mati).
* ✅ **GUNAKAN**:
  ```bash
  pm2 reload <nama-app>
  ```
  *(PM2 akan menunggu proses baru siap sebelum mematikan proses lama).*

---

### 🗄️ ATURAN 5: ISOLASI DATABASE & LINGKUNGAN (.env)
* Setiap aplikasi wajib memiliki database terpisah dan user database terpisah.
* Dilarang keras memakai 1 user database untuk banyak aplikasi.
* File `.env` atau `.env.local` harus memiliki permission aman (`chmod 600 .env.local`) dan dimiliki oleh user terkait (`chown user:user .env.local`).

---

## 4. Template Script Deployment Cepat (Rekomendasi)

Berikut adalah contoh skrip deployment otomatis dari komputer lokal (seperti `scripts/deploy-vps.sh`):

```bash
#!/bin/bash
set -e

# Konfigurasi
TARGET_USER="nama_user_vps"       # Contoh: markaztikrar / hiaqli
VPS_HOST="187.52.120.159"
REMOTE_DIR="/home/${TARGET_USER}/htdocs/nama-domain.com"
APP_NAME="nama-app"
APP_PORT="300X"

echo "🚀 1. Build aplikasi secara lokal..."
npm run build

echo "📦 2. Sync file ke VPS (exclude git dan node_modules lokal)..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'backups' \
  --exclude '.env.local' \
  ./ ${TARGET_USER}@${VPS_HOST}:${REMOTE_DIR}/

echo "🔄 3. Update dependencies & Reload PM2 di VPS..."
ssh ${TARGET_USER}@${VPS_HOST} "
  cd ${REMOTE_DIR}
  npm install --omit=dev --legacy-peer-deps
  pm2 reload ${APP_NAME} || pm2 start npm --name '${APP_NAME}' --max-memory-restart 500M -- start -- -p ${APP_PORT}
  pm2 save
"

echo "✅ Deployment selesai! Cek status di https://nama-domain.com"
```

---

## 5. Troubleshooting Cepat Jika Terjadi 502 Bad Gateway

Jika domain Anda mengeluarkan tampilan **502 Bad Gateway (nginx)**:
1. **Cek apakah proses aplikasi sedang hidup**:
   ```bash
   ssh <user>@187.52.120.159 "pm2 status"
   ```
2. **Lihat log error aplikasi**:
   ```bash
   ssh <user>@187.52.120.159 "pm2 logs <nama-app> --lines 30 --nostream"
   ```
3. **Jika proses mati/berhenti**:
   ```bash
   ssh <user>@187.52.120.159 "pm2 resurrect"
   ```
4. **Cek apakah port internal merespons**:
   ```bash
   ssh <user>@187.52.120.159 "curl -I http://localhost:<PORT_ANDA>"
   ```
