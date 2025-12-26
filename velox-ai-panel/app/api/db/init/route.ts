import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'database_config.json');

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { host, port, user, password, database } = body;

        const connection = await mysql.createConnection({
            host,
            port: Number(port),
            user,
            password,
            database,
            multipleStatements: true
        });

        const schema = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('admin', 'customer') NOT NULL,
                joined_at VARCHAR(255) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS servers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                userId INT NOT NULL,
                status ENUM('active', 'suspended') NOT NULL DEFAULT 'active',
                aiApiKey TEXT,
                whatsappApiToken TEXT,
                whatsappBusinessId VARCHAR(255),
                whatsappPhoneNumberId VARCHAR(255),
                whatsappClientId VARCHAR(255),
                whatsappClientSecret VARCHAR(255),
                powerStatus ENUM('running', 'offline', 'restarting') NOT NULL DEFAULT 'offline',
                created_at VARCHAR(255) NOT NULL,
                config JSON,
                subUsers JSON
            );

            CREATE TABLE IF NOT EXISTS reservations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                userId INT NOT NULL,
                serverId INT NOT NULL,
                customerName VARCHAR(255) NOT NULL,
                customerPhone VARCHAR(255) NOT NULL,
                date VARCHAR(255) NOT NULL,
                time VARCHAR(255) NOT NULL,
                partySize INT NOT NULL,
                status ENUM('pending', 'confirmed', 'cancelled') NOT NULL DEFAULT 'pending',
                source VARCHAR(255) NOT NULL,
                created_at VARCHAR(255) NOT NULL,
                notes TEXT,
                allergies TEXT
            );

            CREATE TABLE IF NOT EXISTS status_monitors (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                target VARCHAR(255) NOT NULL,
                status ENUM('active', 'inactive', 'maintenance') NOT NULL DEFAULT 'active',
                last_check VARCHAR(255),
                total_checks INT DEFAULT 0,
                successful_checks INT DEFAULT 0,
                created_at VARCHAR(255) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sync_state (
                id INT PRIMARY KEY,
                version INT NOT NULL DEFAULT 1
            );

            INSERT IGNORE INTO sync_state (id, version) VALUES (1, 1);
        `;

        await connection.query(schema);

        // Save config
        const config = { host, port: Number(port), user, password, database, enabled: true };
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

        await connection.end();

        return NextResponse.json({ success: true, message: "Database initialized and tables created." });
    } catch (error: any) {
        console.error("DB Init Failed:", error);
        return NextResponse.json({
            success: false,
            message: error.message || "Failed to initialize database"
        }, { status: 500 });
    }
}
