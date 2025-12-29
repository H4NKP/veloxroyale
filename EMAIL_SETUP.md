# Email System Setup Guide

This guide explains how to set up the email system for VeloxAI Panel on a third-party server.

## Prerequisites
- A server running Ubuntu 20.04/22.04 (or similar Linux).
- Root or sudo access.
- Domain name pointed to the server (for proper DNS records).

## Option A: Using Third-Party SMTP (Recommended)
The easiest way is to use a service like SendGrid, Mailgun, or Gmail/Google Workspace.

1.  **Obtain Credentials**:
    *   **Host**: e.g., `smtp.sendgrid.net` or `smtp.gmail.com`
    *   **Port**: `587` (TLS) or `465` (SSL)
    *   **User**: `apikey` (SendGrid) or your email address
    *   **Password**: API Key or App Password
2.  **Configure in Panel**:
    *   Go to **System Controls** -> **SMTP & Email Settings**.
    *   Enter the credentials.
    *   Click **Test Email**.

## Option B: Self-Hosted Postfix (Advanced)
If you want to send emails directly from your Ubuntu server.

### 1. Install Postfix
```bash
sudo apt update
sudo apt install postfix mailutils -y
```
*   Select **Internet Site** when prompted.
*   Enter your FQDN (e.g., `panel.yourdomain.com`).

### 2. Configure Postfix
Edit `/etc/postfix/main.cf`:
```bash
sudo nano /etc/postfix/main.cf
```
Ensure these settings:
```conf
inet_interfaces = loopback-only
myhostname = panel.yourdomain.com
```
Restart Postfix:
```bash
sudo systemctl restart postfix
```

### 3. DNS Records (Critical)
To prevent emails going to Spam, setup:
*   **SPF**: `v=spf1 ip4:YOUR_SERVER_IP ~all`
*   **DKIM** & **DMARC** (Recommended)

### 4. Integration with VeloxAI
Since `nodemailer` sends from the app, you can point it to the local Postfix:
*   **Host**: `localhost` (or `127.0.0.1`)
*   **Port**: `25`
*   **Secure**: `false`
*   **User/Pass**: (Leave empty if Postfix allows local relay)

## Troubleshooting
*   **Connection Refused**: Check firewall (UFW) allows port 587/465.
*   **Auth Failed**: Check credentials. For Gmail, you MUST use an **App Password** if 2FA is on.
