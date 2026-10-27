<?php
// Database tables. Returns SQL statements for the chosen driver ('mysql' or 'sqlite').

return function (string $driver): array {
    $id   = $driver === 'sqlite' ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'INT UNSIGNED AUTO_INCREMENT PRIMARY KEY';
    $tail = $driver === 'sqlite' ? '' : ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
    $fk   = $driver === 'sqlite' ? 'INTEGER' : 'INT UNSIGNED';

    return [
        "CREATE TABLE IF NOT EXISTS users (
            id $id,
            username VARCHAR(64) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            created_at DATETIME NOT NULL
        )$tail",

        "CREATE TABLE IF NOT EXISTS settings (
            k VARCHAR(64) NOT NULL PRIMARY KEY,
            v TEXT
        )$tail",

        "CREATE TABLE IF NOT EXISTS customers (
            id $id,
            name VARCHAR(190) NOT NULL,
            phone VARCHAR(64),
            email VARCHAR(190),
            company VARCHAR(190),
            address TEXT,
            tags VARCHAR(255),
            notes TEXT,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        )$tail",

        "CREATE TABLE IF NOT EXISTS entries (
            id $id,
            customer_id $fk NULL,
            type VARCHAR(20) NOT NULL DEFAULT 'note',
            title VARCHAR(190) NOT NULL,
            amount DECIMAL(14,2) NOT NULL DEFAULT 0,
            entry_date DATE NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'open',
            notes TEXT,
            created_at DATETIME NOT NULL,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
        )$tail",

        "CREATE TABLE IF NOT EXISTS media (
            id $id,
            kind VARCHAR(10) NOT NULL,
            title VARCHAR(190),
            content TEXT,
            original_name VARCHAR(255),
            stored_name VARCHAR(80),
            mime VARCHAR(100),
            size INTEGER NOT NULL DEFAULT 0,
            tags VARCHAR(255),
            customer_id $fk NULL,
            created_at DATETIME NOT NULL,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
        )$tail",

        "CREATE TABLE IF NOT EXISTS activity (
            id $id,
            action VARCHAR(40) NOT NULL,
            detail VARCHAR(255),
            created_at DATETIME NOT NULL
        )$tail",

        // Phase 2: AI chats and saved commands
        "CREATE TABLE IF NOT EXISTS ai_chats (
            id $id,
            title VARCHAR(190) NOT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        )$tail",

        "CREATE TABLE IF NOT EXISTS ai_messages (
            id $id,
            chat_id $fk NOT NULL,
            role VARCHAR(12) NOT NULL,
            content TEXT NOT NULL,
            media_id $fk NULL,
            actions TEXT,
            created_at DATETIME NOT NULL,
            FOREIGN KEY (chat_id) REFERENCES ai_chats(id) ON DELETE CASCADE
        )$tail",

        "CREATE TABLE IF NOT EXISTS commands (
            id $id,
            name VARCHAR(190) NOT NULL,
            prompt TEXT NOT NULL,
            use_data TINYINT NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL
        )$tail",

        // Phase 4: automation recipes
        "CREATE TABLE IF NOT EXISTS recipes (
            id $id,
            name VARCHAR(190) NOT NULL,
            enabled TINYINT NOT NULL DEFAULT 1,
            trigger_type VARCHAR(30) NOT NULL,
            trigger_value VARCHAR(100),
            action_type VARCHAR(30) NOT NULL,
            config TEXT,
            last_run_at DATETIME NULL,
            last_status VARCHAR(255),
            run_count INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL
        )$tail",

        "CREATE TABLE IF NOT EXISTS recipe_runs (
            id $id,
            recipe_id $fk NOT NULL,
            ok TINYINT NOT NULL DEFAULT 1,
            output TEXT,
            created_at DATETIME NOT NULL,
            FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
        )$tail",
    ];
};
