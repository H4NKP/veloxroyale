CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'customer') DEFAULT 'customer',
  status ENUM('active', 'suspended') DEFAULT 'active',
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
