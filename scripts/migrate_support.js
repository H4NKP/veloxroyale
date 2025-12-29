const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Manually parse .env if it exists
const envPath = path.join(__dirname, '..', '.env');
const envConfig = {};

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            envConfig[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
        }
    });
}

const dbConfig = {
    host: envConfig.DB_HOST || 'localhost',
    user: envConfig.DB_USER || 'root',
    password: envConfig.DB_PASSWORD || '',
    database: envConfig.DB_NAME || 'velox_panel',
};

async function migrate() {
    console.log('Connecting to database with config:', { ...dbConfig, password: '***' });
    const connection = await mysql.createConnection(dbConfig);

    try {
        console.log('Applying Support System Schema...');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
              id INT AUTO_INCREMENT PRIMARY KEY,
              setting_key VARCHAR(50) NOT NULL UNIQUE,
              setting_value TEXT,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS support_tickets (
              id INT AUTO_INCREMENT PRIMARY KEY,
              user_id INT NOT NULL,
              subject VARCHAR(255) NOT NULL,
              status ENUM('open', 'answered', 'customer_reply', 'closed') DEFAULT 'open',
              priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS support_messages (
              id INT AUTO_INCREMENT PRIMARY KEY,
              ticket_id INT NOT NULL,
              sender_type ENUM('user', 'admin') NOT NULL,
              sender_id INT NOT NULL,
              message TEXT NOT NULL,
              is_read BOOLEAN DEFAULT FALSE,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
            );
        `);

        await connection.query(`
            INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES ('max_open_tickets', '3');
        `);

        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await connection.end();
    }
}

migrate();
