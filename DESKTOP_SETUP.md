# Digiventures CRM — Desktop Application & Multi-User Sync Guide

This guide explains how the **Electron Desktop Application** works and how **data is synchronized in real-time across multiple users and devices**.

---

## 1. How Multi-User & Multi-Device Synchronization Works

When multiple team members (e.g. Athiyaman, Bala, Sneka, Trainees) install the desktop app on their respective computers, changes must be synchronized instantly.

```
 ┌──────────────────────┐         ┌──────────────────────┐
 │ Athiyaman's PC       │         │ Bala's / Sneka's PC  │
 │ [Digiventures.exe]   │         │ [Digiventures.exe]   │
 └──────────┬───────────┘         └──────────┬───────────┘
            │                                │
            │      Secure HTTPS API Sync     │
            ▼                                ▼
   ┌─────────────────────────────────────────────────────┐
   │            CENTRAL CLOUD SERVER / API               │
   │    (Hostinger VPS, Supabase, AWS, or DigitalOcean)  │
   └──────────────────────────┬──────────────────────────┘
                              │
                              ▼
   ┌─────────────────────────────────────────────────────┐
   │             SHARED CLOUD DATABASE                   │
   │       (PostgreSQL / Supabase / Cloud SQLite)        │
   │  • Projects  • Tasks & Proofs  • Calendar & Events  │
   │  • Attendance & Logs           • Trainee Payouts    │
   └─────────────────────────────────────────────────────┘
```

### The Synchronization Flow:
1. **Central Single Source of Truth**:
   The Next.js backend runs on your cloud server (e.g., Hostinger, AWS, or Vercel) connected to a PostgreSQL database (like Supabase, Neon, or Hostinger PostgreSQL).
2. **Desktop Client Connection**:
   Every employee's `Digiventures.exe` points to your central domain (`https://crm.yourdomain.com`).
3. **Instant Live Updates**:
   - When Athiyaman creates a new project or approves a proof, it sends a REST request to the cloud database.
   - When Bala or Sneka opens their app, their local cache updates via the store synchronization engine (`crm-store.ts`).
4. **Offline Resilience**:
   If an employee's internet connection drops temporarily, the desktop app continues to display cached data, showing a reconnection prompt when necessary.

---

## 2. Desktop App Structure

The desktop setup is located in `/electron`:
* `electron/main.js`: Main Electron process managing the native Windows desktop window, frameless title styling, system tray icon, and external link handling.
* `electron/preload.js`: Secure context bridge connecting native desktop capabilities.
* `electron/offline.html`: Custom branded offline/reconnection screen with automated retry countdown.
* `electron/icon.png`: Digiventures branded 25-years logo used for taskbar and system tray.

---

## 3. Running the Desktop App in Development

To launch and test the Electron desktop app locally:

1. **Start the Next.js server** (if not already running):
   ```bash
   npm run dev
   ```
2. **Launch the Electron desktop window**:
   ```bash
   npm run electron:dev
   ```

---

## 4. Building the Windows `.exe` Installer

To generate the standalone Windows installer for distribution to employees:

```bash
npm run electron:dist
```

This generates two files in the `dist-electron/` folder:
1. **`Digiventures-Setup-1.0.0.exe`** (Standard Windows NSIS Installer):
   - Creates a Start Menu shortcut and Desktop icon.
   - Allows users to choose installation folder.
2. **`Digiventures-1.0.0-portable.exe`** (Portable Executable):
   - Runs directly on any Windows PC without installation or admin privileges.

---

## 5. Connecting the Desktop App to Your Live Cloud Server

Before building the production `.exe` for employees, configure the live production domain:

In `electron/main.js`:
```javascript
const DEFAULT_URL = process.env.APP_URL || 'https://your-production-crm-domain.com';
```
Or set the environment variable when building:
```bash
$env:APP_URL="https://your-production-crm-domain.com"; npm run electron:dist
```

Now, every employee who installs the `.exe` will automatically connect to your centralized cloud database and work seamlessly together in real time!

