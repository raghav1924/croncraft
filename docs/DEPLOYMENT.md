# Deployment & Production Operations — CronCraft

**Target:** Cron & Schedule Linter, Multi-Timezone Collision Detector & Bento Studio  
**Author:** Jatin Sharma ([https://jatinsh.netlify.app/](https://jatinsh.netlify.app/))

---

## 1. Container Deployment (Docker)

```bash
docker build -t croncraft:latest .
docker run -d -p 6464:6464 --name croncraft croncraft:latest
```

## 2. Process Manager (PM2)

```bash
npm install -g pm2
pm2 start dist/bin.js --name "croncraft" -- studio --port 6464
```

## 3. Systemd Service Unit

```ini
[Unit]
Description=CronCraft Background Service
After=network.target

[Service]
Type=simple
User=node
WorkingDirectory=/opt/croncraft
ExecStart=/usr/bin/node dist/bin.js studio --port 6464
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```
