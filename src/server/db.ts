import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import bcrypt from 'bcryptjs';
import { OFFICIAL_OWNER_EMAIL } from '../utils/security';

const DB_PATH = path.resolve(process.cwd(), 'zorkcraft.db');
export const db = new Database(DB_PATH);

// Enable WAL mode for high performance and concurrent reads
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  // Ensure uploads directory exists
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // 1. Admin Account Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_account (
      email TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      is_temporary INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 2. Verification Codes (for 2FA)
  db.exec(`
    CREATE TABLE IF NOT EXISTS verification_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      code_display TEXT,
      expires_at INTEGER NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);

  // 3. Admin Sessions
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      token TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      user_agent TEXT,
      ip_hash TEXT
    );
  `);

  // 4. Categories Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      title_ar TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL,
      icon_name TEXT NOT NULL,
      description_ar TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0
    );
  `);

  // 5. Minecraft Versions Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS minecraft_versions (
      id TEXT PRIMARY KEY,
      version_name TEXT NOT NULL,
      release_date TEXT,
      notes TEXT
    );
  `);

  // 6. Resources Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      short_description TEXT NOT NULL,
      full_description TEXT NOT NULL,
      category_id TEXT NOT NULL,
      category_slug TEXT NOT NULL,
      mc_version TEXT NOT NULL,
      supported_devices TEXT NOT NULL,
      creator_name TEXT NOT NULL,
      source_url TEXT,
      license_info TEXT,
      cover_image TEXT NOT NULL,
      is_published INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      install_instructions TEXT,
      changelog TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE RESTRICT
    );
    CREATE INDEX IF NOT EXISTS idx_resources_published ON resources(is_published);
    CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category_slug);
    CREATE INDEX IF NOT EXISTS idx_resources_featured ON resources(is_featured);
  `);

  // 7. Resource Images (Gallery)
  db.exec(`
    CREATE TABLE IF NOT EXISTS resource_images (
      id TEXT PRIMARY KEY,
      resource_id TEXT NOT NULL,
      image_url TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(resource_id) REFERENCES resources(id) ON DELETE CASCADE
    );
  `);

  // 8. Resource Download Files
  db.exec(`
    CREATE TABLE IF NOT EXISTS resource_files (
      id TEXT PRIMARY KEY,
      resource_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0,
      file_type TEXT NOT NULL,
      version_tag TEXT NOT NULL,
      is_external INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(resource_id) REFERENCES resources(id) ON DELETE CASCADE
    );
  `);

  // 9. Download Events (Real Backend Tracking)
  db.exec(`
    CREATE TABLE IF NOT EXISTS download_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_id TEXT NOT NULL,
      file_id TEXT NOT NULL,
      event_type TEXT NOT NULL DEFAULT 'direct_download',
      ip_hash TEXT NOT NULL,
      downloaded_at TEXT NOT NULL,
      user_agent TEXT,
      FOREIGN KEY(resource_id) REFERENCES resources(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_download_resource ON download_events(resource_id);
    CREATE INDEX IF NOT EXISTS idx_download_event_ip ON download_events(resource_id, ip_hash, downloaded_at);
  `);

  // Migrations for existing tables
  try {
    db.exec(`ALTER TABLE download_events ADD COLUMN event_type TEXT NOT NULL DEFAULT 'direct_download'`);
  } catch {}
  try {
    db.exec(`ALTER TABLE resource_files ADD COLUMN external_provider TEXT DEFAULT NULL`);
  } catch {}
  try {
    db.exec(`ALTER TABLE resources ADD COLUMN display_settings TEXT DEFAULT '{}'`);
  } catch {}

  // 10. Security Audit Logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS security_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      details TEXT NOT NULL,
      severity TEXT NOT NULL,
      ip_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // 11. Website Settings
  db.exec(`
    CREATE TABLE IF NOT EXISTS website_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Seed Initial Owner if not present
  const ownerStmt = db.prepare('SELECT * FROM admin_account WHERE email = ?');
  const existingOwner = ownerStmt.get(OFFICIAL_OWNER_EMAIL);
  if (!existingOwner) {
    // Hash initial temporary password 'zork2026'
    const initialHash = bcrypt.hashSync('zork2026', 10);
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO admin_account (email, password_hash, is_temporary, created_at, updated_at)
      VALUES (?, ?, 1, ?, ?)
    `).run(OFFICIAL_OWNER_EMAIL, initialHash, now, now);
    console.log(`[DB] Seeded official owner account for ${OFFICIAL_OWNER_EMAIL} with temporary password flag.`);
  }

  // Seed Categories
  const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (catCount.count === 0) {
    const categoriesSeed = [
      {
        id: 'cat_mods',
        title_ar: 'مودات وإضافات',
        slug: 'mods',
        color: '#FF791F', // Orange
        icon_name: 'Puzzle',
        description_ar: 'إضافات ومودات Bedrock حصرية لتوسيع أسلوب اللعب وأنظمة المعارك.',
        order_index: 1,
      },
      {
        id: 'cat_shaders',
        title_ar: 'شيدرات وريـسورس باك',
        slug: 'shaders',
        color: '#8ADFFF', // Sky Blue
        icon_name: 'Sparkles',
        description_ar: 'حزم شيدرات وإضاءة واقعية وقوام بدقة عالية لأجهزة البيدروك.',
        order_index: 2,
      },
      {
        id: 'cat_skins',
        title_ar: 'سكنات',
        slug: 'skins',
        color: '#9D72FF', // Purple
        icon_name: 'User',
        description_ar: 'سكنات شخصيات وتصاميم أسطورية منتقاة لمجتمع ZORK.',
        order_index: 3,
      },
      {
        id: 'cat_maps',
        title_ar: 'خرائط وعوالم',
        slug: 'maps',
        color: '#35D16F', // Emerald Green
        icon_name: 'Map',
        description_ar: 'عوالم مغامرة، باركور، وخرائط سرفايفل وبناء متكاملة.',
        order_index: 4,
      },
      {
        id: 'cat_versions',
        title_ar: 'إصدارات ماينكرافت',
        slug: 'versions',
        color: '#C5CBD5', // Metallic Blue/Silver
        icon_name: 'Layers',
        description_ar: 'تحديثات وتفاصيل إصدارات Minecraft Bedrock الرسمية والتوافق.',
        order_index: 5,
      },
    ];

    const insertCat = db.prepare(`
      INSERT INTO categories (id, title_ar, slug, color, icon_name, description_ar, order_index)
      VALUES (@id, @title_ar, @slug, @color, @icon_name, @description_ar, @order_index)
    `);

    for (const cat of categoriesSeed) {
      insertCat.run(cat);
    }
    console.log('[DB] Seeded official ZORK categories.');
  }

  // Seed default website settings
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM website_settings').get() as { count: number };
  if (settingsCount.count === 0) {
    const defaultSettings = [
      { key: 'site_title', value: 'ZORK CRAFT' },
      { key: 'site_description', value: 'منصتك لاكتشاف إضافات ومحتوى Minecraft Bedrock.' },
      { key: 'youtube_url', value: 'https://youtube.com/@zork_al3ab?si=VOP34dCv3OlP1bTr' },
      { key: 'sound_enabled_default', value: '0' },
      { key: 'ads_enabled', value: '0' },
      { key: 'max_gallery_images', value: '15' },
    ];
    const insertSetting = db.prepare('INSERT INTO website_settings (key, value) VALUES (?, ?)');
    for (const s of defaultSettings) {
      insertSetting.run(s.key, s.value);
    }
  }
}
