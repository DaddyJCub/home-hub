# HomeHub

HomeHub is a collaborative household management app for coordinating chores, shopping,
meal planning, recipes, and a shared calendar in one place, with real user accounts.
The current release runs in Single Household / Personal Mode; multi-household support
remains forward-compatible for future expansion (see [PRD.md](PRD.md)).

Part of the JCubHub ecosystem. Built with React 19 + Vite on the frontend and an
Express + better-sqlite3 server. Errors and user feedback are forwarded to JCubHub CM
via the Sentinel bug-reporting contract.

## Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Radix UI / shadcn components
- **Server**: Node.js + Express, better-sqlite3, JSON logging
- **Auth**: local accounts (bcrypt) with optional SMTP password reset

## Running

- `npm run dev` — Vite dev server
- `npm run build` — production build (`tsc -b` + `vite build`)
- `npm start` — run the Express server (`server.js`)
- `npm test` — server integration tests
- `npm run test:unit` — Vitest unit tests

## 📧 Email Configuration (Optional)

HomeHub supports sending password reset emails via SMTP. If not configured, password reset links are displayed directly in the UI instead.

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `SMTP_HOST` | Yes* | SMTP server hostname | - |
| `SMTP_PORT` | No | SMTP port | `587` |
| `SMTP_SECURE` | No | Use TLS (set to `true` for port 465) | `false` |
| `SMTP_USER` | No** | SMTP authentication username | - |
| `SMTP_PASS` | No** | SMTP authentication password | - |
| `SMTP_FROM` | Yes* | Sender email address | - |
| `APP_URL` | No | Base URL for reset links | `http://localhost:PORT` |

*\* Required to enable email sending*  
*\*\* Required for authenticated SMTP servers*

### Example Configurations

**Gmail (with App Password):**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="HomeHub <your-email@gmail.com>"
APP_URL=https://your-domain.com
```

**SendGrid:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM="HomeHub <noreply@your-domain.com>"
APP_URL=https://your-domain.com
```

**Mailgun:**
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-password
SMTP_FROM="HomeHub <noreply@your-domain.com>"
APP_URL=https://your-domain.com
```

> **Note:** If SMTP is not configured, users can still reset their password — the reset link will be displayed directly in the UI for them to copy.

🧹 Just Exploring?
No problem! If you were just checking things out and don’t need to keep this code:

- Simply delete your Spark.
- Everything will be cleaned up — no traces left behind.

📄 License For Spark Template Resources 

The Spark Template files and resources from GitHub are licensed under the terms of the MIT license, Copyright GitHub, Inc.
