# ⚙️ VeloxAI Panel Configuration Guide

This guide provides step-by-step instructions for configuring the AI and WhatsApp integrations required for VeloxAI Panel.

## Table of Contents

- [Google Gemini AI API Setup](#google-gemini-ai-api-setup)
- [WhatsApp Business API Setup](#whatsapp-business-api-setup)
- [Environment Variables Reference](#environment-variables-reference)
- [Testing Your Configuration](#testing-your-configuration)
- [Troubleshooting](#troubleshooting)

---

## 🤖 Google Gemini AI API Setup

The VeloxAI Panel uses Google's Gemini AI to power intelligent, conversational reservation booking.

### Step 1: Get Your Gemini API Key

1. **Visit Google AI Studio**
   - Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
   - Sign in with your Google account

2. **Create API Key**
   - Click **"Create API Key"**
   - Select **"Create API key in new project"** (or use an existing project)
   - Copy the generated API key immediately (you won't be able to see it again)

3. **Save Your API Key**
   - Store it securely - you'll need it for the `.env` file

### Step 2: Configure in VeloxAI Panel

1. **Add to Environment Variables**
   ```bash
   # In your .env file
   GEMINI_API_KEY=your_api_key_here
   ```

2. **Verify Configuration**
   - The system uses **Gemini 1.5 Flash** model by default
   - No additional configuration needed - it works out of the box!

### API Usage Notes

- **Model**: `gemini-1.5-flash` (optimized for speed and cost)
- **Rate Limits**: Free tier includes 15 requests per minute
- **Quota**: Check your usage at [Google AI Studio](https://aistudio.google.com/)

---

## 💬 WhatsApp Business API Setup

VeloxAI Panel integrates with WhatsApp Business API (via Meta) for direct customer communication.

### Prerequisites

- A **Facebook Business Account** ([Create one](https://business.facebook.com/))
- A **Meta Developer Account** ([Sign up](https://developers.facebook.com/))
- A **phone number** for WhatsApp Business (cannot be used with regular WhatsApp)

### Step 1: Create a Meta App

1. **Go to Meta for Developers**
   - Visit [https://developers.facebook.com/apps](https://developers.facebook.com/apps)
   - Click **"Create App"**

2. **Select App Type**
   - Choose **"Business"**
   - Click **"Next"**

3. **App Details**
   - **App Name**: `VeloxAI Reservations` (or your preferred name)
   - **App Contact Email**: Your email
   - **Business Account**: Select your business account
   - Click **"Create App"**

4. **Note Your App ID**
   - After creation, you'll see your **App ID** in the dashboard
   - Save this - you'll need it later

### Step 2: Add WhatsApp Product

1. **Add WhatsApp to Your App**
   - In your app dashboard, find **"WhatsApp"** in the products list
   - Click **"Set up"**

2. **Select Business Portfolio**
   - Choose your **Meta Business Portfolio**
   - Click **"Continue"**

3. **Create or Select a WhatsApp Business Account**
   - If you don't have one, click **"Create a new WhatsApp Business Account"**
   - Fill in your business details
   - Click **"Continue"**

### Step 3: Get Your Access Token

1. **Navigate to WhatsApp > API Setup**
   - In your app dashboard, go to **WhatsApp > API Setup**

2. **Generate Temporary Access Token**
   - You'll see a **"Temporary access token"** - copy it
   - ⚠️ **Important**: This token expires in 24 hours - you'll need to generate a permanent one

3. **Generate Permanent Access Token** (Recommended)
   - Go to **Settings > Basic**
   - Copy your **App Secret**
   - Use the [Access Token Tool](https://developers.facebook.com/tools/accesstoken/) to generate a permanent token
   - Or use System User tokens (more secure for production)

### Step 4: Get Phone Number ID

1. **In WhatsApp > API Setup**
   - Find the **"Phone number ID"** section
   - Copy the **Phone Number ID** (starts with a long number)
   - This is different from your actual phone number!

### Step 5: Configure Webhook (Important!)

1. **Set Up Webhook URL**
   - In **WhatsApp > Configuration**
   - Click **"Edit"** next to Webhook
   - **Callback URL**: `https://yourdomain.com/api/whatsapp/webhook`
   - **Verify Token**: Create a random string (e.g., `veloxai_webhook_2025`)
   - Save this verify token - you'll need it in `.env`

2. **Subscribe to Webhook Fields**
   - Subscribe to: **messages**, **message_status**
   - Click **"Save"**

### Step 6: Add Phone Number

1. **Add a Phone Number**
   - In **WhatsApp > API Setup**, click **"Add phone number"**
   - Follow the verification process
   - Verify via SMS or voice call

2. **Note Your Phone Number**
   - This is the number customers will message
   - Format: `+1234567890` (with country code)

### Step 7: Configure in VeloxAI Panel

Add all the credentials to your `.env` file:

```env
# WhatsApp Business API Configuration
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_ACCESS_TOKEN=your_permanent_access_token_here
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id_here
WHATSAPP_APP_ID=your_app_id_here
WHATSAPP_APP_SECRET=your_app_secret_here
WHATSAPP_VERIFY_TOKEN=veloxai_webhook_2025
```

### Step 8: Test Your Integration

1. **Send a Test Message**
   - In **WhatsApp > API Setup**, use the **"Send test message"** feature
   - Send a message to your own phone number
   - You should receive it on WhatsApp

2. **Test in VeloxAI Panel**
   - Go to **Admin Panel > Restaurants**
   - Add a restaurant with WhatsApp enabled
   - Send a test reservation request

---

## 📋 Environment Variables Reference

Create a `.env` file in your project root with these variables:

```env
# ============================================
# DATABASE CONFIGURATION (Production)
# ============================================
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_secure_password
DB_NAME=velox_panel

# ============================================
# GOOGLE GEMINI AI API
# ============================================
GEMINI_API_KEY=AIzaSy...your_key_here

# ============================================
# WHATSAPP BUSINESS API
# ============================================
# Phone Number ID (from Meta Developer Console)
WHATSAPP_PHONE_NUMBER_ID=123456789012345

# Permanent Access Token
WHATSAPP_ACCESS_TOKEN=EAABsbCS...your_token_here

# Business Account ID
WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345

# App Credentials
WHATSAPP_APP_ID=123456789012345
WHATSAPP_APP_SECRET=abc123...your_secret_here

# Webhook Verify Token (you create this)
WHATSAPP_VERIFY_TOKEN=veloxai_webhook_2025

# ============================================
# APPLICATION SETTINGS
# ============================================
NODE_ENV=production
PORT=3000
```

---

## 🧪 Testing Your Configuration

### Test Gemini AI

1. **Via Admin Panel**
   - Go to **Admin Panel > Restaurants**
   - Create a test restaurant
   - Enable AI booking
   - The system will validate your API key

2. **Via API** (Optional)
   ```bash
   curl -X POST http://localhost:3000/api/ai/test \
     -H "Content-Type: application/json" \
     -d '{"message": "Hello, I want to make a reservation"}'
   ```

### Test WhatsApp Integration

1. **Check Webhook**
   - Meta will send a verification request to your webhook
   - Check server logs for successful verification

2. **Send Test Message**
   - Message your WhatsApp Business number
   - You should receive an AI-powered response

3. **Check Admin Panel**
   - Go to **Admin Panel > Reservations**
   - You should see incoming WhatsApp reservations

---

## 🔧 Troubleshooting

### Gemini AI Issues

**Error: "Invalid API Key"**
- Verify your API key is correct in `.env`
- Check if the key is active in [Google AI Studio](https://aistudio.google.com/)
- Ensure no extra spaces or quotes in the `.env` file

**Error: "Quota Exceeded"**
- You've hit the free tier limit (15 requests/minute)
- Wait a few minutes or upgrade to a paid plan
- Check usage at [Google AI Studio](https://aistudio.google.com/)

**Error: "Model not found"**
- The system uses `gemini-1.5-flash` by default
- Ensure this model is available in your region

### WhatsApp Issues

**Webhook Not Verified**
- Check that your `WHATSAPP_VERIFY_TOKEN` matches what you set in Meta
- Ensure your server is publicly accessible (not localhost)
- Check server logs for incoming verification requests

**Messages Not Received**
- Verify `WHATSAPP_PHONE_NUMBER_ID` is correct
- Check that your access token hasn't expired
- Ensure webhook is subscribed to `messages` field
- Check Meta Developer Console for error logs

**Cannot Send Messages**
- Verify `WHATSAPP_ACCESS_TOKEN` is valid and permanent
- Check that your phone number is verified in Meta
- Ensure you're not in sandbox mode restrictions
- Verify the recipient has messaged you first (24-hour window)

**"Invalid Phone Number ID"**
- Double-check you're using the **Phone Number ID**, not the actual phone number
- Find it in **WhatsApp > API Setup** in Meta Developer Console

### General Issues

**Environment Variables Not Loading**
```bash
# Restart your application after changing .env
pm2 restart velox-panel

# Or for development
npm run dev
```

**Database Connection Failed**
- Verify MySQL is running: `sudo systemctl status mysql`
- Check credentials in `.env`
- Ensure database exists: `mysql -u root -p -e "SHOW DATABASES;"`

---

## 📞 Need Help?

- **Meta WhatsApp Support**: [Business Help Center](https://business.facebook.com/business/help)
- **Google AI Support**: [AI Studio Documentation](https://ai.google.dev/docs)
- **VeloxAI Issues**: Create an issue on GitHub

---

## 🔐 Security Best Practices

1. **Never commit `.env` to Git**
   - Already in `.gitignore`
   - Use `.env.example` for templates

2. **Use System User Tokens** (WhatsApp)
   - More secure than user access tokens
   - Don't expire automatically

3. **Rotate Keys Regularly**
   - Generate new API keys every 90 days
   - Update in production immediately

4. **Restrict API Key Permissions**
   - In Google Cloud Console, restrict by IP if possible
   - In Meta, use least-privilege access

5. **Monitor Usage**
   - Check Google AI Studio for unusual activity
   - Monitor Meta Developer Console for API errors

---

**Last Updated**: December 2025  
**Version**: v1.0
