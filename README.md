# ✨ Welcome to Your Spark Template!
You've just launched your brand-new Spark Template Codespace — everything’s fired up and ready for you to explore, build, and create with Spark!

This template is your blank canvas. It comes with a minimal setup to help you get started quickly with Spark development.

🚀 What's Inside?
- A clean, minimal Spark environment
- Pre-configured for local development
- Ready to scale with your ideas
  
🧠 What Can You Do?

Right now, this is just a starting point — the perfect place to begin building and testing your Spark applications.

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
