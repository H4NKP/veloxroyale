CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'customer') DEFAULT 'customer',
  status ENUM('active', 'suspended') DEFAULT 'active',
  support_priority ENUM('tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5', 'tier_6', 'tier_7', 'tier_8') DEFAULT 'tier_1',
  support_suspended BOOLEAN DEFAULT FALSE,
  reset_token VARCHAR(255),
  reset_token_expiry DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  serverId INT,
  customerName VARCHAR(255) NOT NULL,
  customerPhone VARCHAR(50),
  date VARCHAR(50) NOT NULL,
  time VARCHAR(50) NOT NULL,
  partySize INT DEFAULT 2,
  status VARCHAR(50) DEFAULT 'pending',
  source VARCHAR(50) DEFAULT 'web',
  notes TEXT,
  allergies TEXT,
  raw_commentary TEXT,
  structured_commentary JSON,
  staff_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert default admin user if not exists
INSERT INTO users (email, password, role, status)
SELECT * FROM (SELECT 'admin', 'admin', 'admin', 'active') AS tmp
WHERE NOT EXISTS (
    SELECT email FROM users WHERE email = 'admin'
) LIMIT 1;
-- System Settings (Global Config)
CREATE TABLE IF NOT EXISTS system_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(50) NOT NULL UNIQUE,
  setting_value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  subject VARCHAR(255) NOT NULL,
  status ENUM('open', 'answered', 'customer_reply', 'closed') DEFAULT 'open',
  priority ENUM('tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5', 'tier_6', 'tier_7', 'tier_8', 'urgent') DEFAULT 'tier_1',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Support Messages
CREATE TABLE IF NOT EXISTS support_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  sender_type ENUM('user', 'admin') NOT NULL,
  sender_id INT NOT NULL, -- user_id or admin_id (usually same users table)
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
);

-- Insert default settings
INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES ('max_open_tickets', '3');
