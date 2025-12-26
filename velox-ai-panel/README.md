# 🚀 VeloxAI Panel

**VeloxAI Panel** is a powerful, AI-driven restaurant reservation management system with WhatsApp integration. Built with Next.js 14, it provides a complete admin dashboard for managing reservations, customers, and automated AI-powered booking assistance.

## ✨ Features

- **🤖 AI-Powered Reservations**: Automated booking via Google Gemini AI
- **💬 WhatsApp Integration**: Direct customer communication through WhatsApp Business API
- **📊 Admin Dashboard**: Comprehensive management interface
- **🌐 Multi-language Support**: English and Spanish
- **🔐 Secure Authentication**: Role-based access control (Admin/Customer)
- **💾 Flexible Database**: MySQL or LocalStorage support
- **📱 Real-time Updates**: Live reservation status tracking
- **🔄 Auto-Updates**: GitHub-based system updates
- **🎨 Modern UI**: Beautiful, responsive design with dark theme
- **📦 Backup System**: Automated data backups and restoration

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **Database**: MySQL (production) / LocalStorage (development)
- **AI**: Google Gemini 1.5 Flash
- **Messaging**: WhatsApp Business API (Meta)
- **Deployment**: Ubuntu Server, PM2, Nginx

## 📋 Prerequisites

- **Node.js** 20.x or higher
- **MySQL** 8.0+ (for production)
- **Ubuntu Server** 20.04/22.04 LTS (for deployment)
- **Google Gemini API Key** ([Get it here](https://aistudio.google.com/app/apikey))
- **WhatsApp Business Account** ([Meta Business](https://business.facebook.com/))

## 🚀 Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/velox-ai-panel.git
   cd velox-ai-panel
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment** (optional for dev)
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Access the panel**
   - Open [http://localhost:3000](http://localhost:3000)
   - Default login: `admin` / `admin`

### Production Deployment

For production deployment on Ubuntu Server, see our comprehensive guides:

- **[📖 Deployment Guide](DEPLOY.md)** - Complete Ubuntu server setup
- **[⚙️ Configuration Guide](CONFIGURATION.md)** - AI API & WhatsApp setup

## 📚 Documentation

- **[DEPLOY.md](DEPLOY.md)** - Ubuntu deployment, PM2, Nginx, SSL
- **[CONFIGURATION.md](CONFIGURATION.md)** - Gemini AI & WhatsApp API setup
- **[schema.sql](schema.sql)** - Database schema for MySQL

## 🔑 Default Credentials

**Admin Account** (Change immediately in production!)
- Email: `admin`
- Password: `admin`

## 🌍 Environment Variables

See [.env.example](.env.example) for all available configuration options.

**Essential Variables:**
```env
# Database (Production)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=velox_panel

# AI Configuration
GEMINI_API_KEY=your_gemini_api_key

# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_APP_ID=your_app_id
WHATSAPP_APP_SECRET=your_app_secret
```

## 📦 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
```

## 🔒 Security Features

- **License System**: Dual-key activation (`LICENCIAPRIVADO78989`, `VELOX-ADMIN-2025-PREMIUM`)
- **Factory Reset**: Password-protected data wipe (`CONFIRMACIONDEDESTRUCCUION90001`)
- **Role-Based Access**: Admin and Customer roles
- **Data Isolation**: Multi-tenant architecture

## 🆘 Support

For issues, questions, or contributions:
- Create an issue on GitHub
- Contact: [your-email@example.com]

## 📄 License

This project is protected by a dual-license system. Valid license keys are required for activation.

## 🙏 Acknowledgments

- Google Gemini AI for intelligent booking assistance
- Meta for WhatsApp Business API
- Next.js team for the amazing framework

---

**Version**: v1.0  
**Last Updated**: December 2025
