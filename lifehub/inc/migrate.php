<?php
// Brings an existing database up to date. Safe to run repeatedly.

const SCHEMA_VERSION = 2;

function run_migrations(PDO $pdo, string $driver): void
{
    $schema = require __DIR__ . '/schema.php';
    foreach ($schema($driver) as $sql) {
        $pdo->exec($sql);
    }
    // Columns added after Phase 1. "duplicate column" errors mean the column already exists.
    $alters = [
        'ALTER TABLE customers ADD COLUMN notion_id VARCHAR(64) NULL',
        'ALTER TABLE entries ADD COLUMN notion_id VARCHAR(64) NULL',
        'ALTER TABLE entries ADD COLUMN updated_at DATETIME NULL',
    ];
    foreach ($alters as $sql) {
        try {
            $pdo->exec($sql);
        } catch (PDOException $e) {
            if (!preg_match('/duplicate column/i', $e->getMessage())) {
                throw $e;
            }
        }
    }
    $pdo->prepare('DELETE FROM settings WHERE k = ?')->execute(['schema_version']);
    $pdo->prepare('INSERT INTO settings (k, v) VALUES (?, ?)')->execute(['schema_version', (string) SCHEMA_VERSION]);
}
