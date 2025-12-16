const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const iconv = require('iconv-lite');
const db = require('./db');

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'];
const ROOT_DIR = path.join(__dirname, '..');
const ASSETS_ROOT = path.join(ROOT_DIR, 'public', 'assets');
const DATA_DIR = path.join(__dirname, 'data');

function readCsvFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  let text = buffer.toString('utf8');
  if (text.includes('��')) {
    text = iconv.decode(buffer, 'gbk');
  }
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_column_count: true,
    trim: true
  });
}

function findValue(row, keyNames, fallback = '') {
  for (const k of keyNames) {
    const val = row[k];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val).trim();
    }
  }
  return fallback;
}

function collectSubCategories(row) {
  const keys = Object.keys(row).filter(k => k.toLowerCase().startsWith('subcategory'));
  // 按出现顺序排序
  keys.sort((a, b) => a.length - b.length || a.localeCompare(b));
  return keys.map(k => String(row[k]).trim()).filter(Boolean);
}

function collectLinks(row) {
  const downloads = [];
  Object.keys(row).forEach(k => {
    if (k.toLowerCase().startsWith('link') && row[k]) {
      downloads.push({ label: k, url: String(row[k]).trim() });
    }
  });
  return downloads;
}

function splitTags(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/[,，]/)
    .map(t => t.trim())
    .filter(Boolean);
}

function ensureDirCaseInsensitive(baseDir, targetName) {
  const direct = path.join(baseDir, targetName);
  if (fs.existsSync(direct)) return direct;
  if (!fs.existsSync(baseDir)) return null;
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  const match = entries.find(
    e => e.isDirectory() && e.name.toLowerCase() === targetName.toLowerCase()
  );
  return match ? path.join(baseDir, match.name) : null;
}

function findMedia(category, title) {
  const result = { thumbnail: null, gallery: [] };
  const catDir = ensureDirCaseInsensitive(ASSETS_ROOT, category || '');
  if (!catDir) return result;
  const titleDir = ensureDirCaseInsensitive(catDir, title);
  if (!titleDir) return result;

  const files = fs
    .readdirSync(titleDir)
    .filter(f => IMAGE_EXTS.some(ext => f.toLowerCase().endsWith(ext.toLowerCase())))
    .sort();

  if (files.length === 0) return result;

  const rel = p => '/' + path.relative(ROOT_DIR, p).replace(/\\/g, '/');
  result.thumbnail = rel(path.join(titleDir, files[0]));
  if (files.length > 1) {
    result.gallery = files.slice(1).map(f => rel(path.join(titleDir, f)));
  }
  return result;
}

async function ensureCategory(pathArr) {
  let parentId = null;
  let pathSoFar = '';
  for (const name of pathArr.filter(Boolean)) {
    const fullPath = pathSoFar ? `${pathSoFar}>${name}` : name;
    const existing = await db.get(
      'SELECT * FROM hizoo_categories WHERE path = ? LIMIT 1',
      [fullPath]
    );
    if (existing) {
      parentId = existing.id;
      pathSoFar = fullPath;
      continue;
    }
    const res = await db.run(
      'INSERT INTO hizoo_categories (name, parent_id, path, order_index) VALUES (?, ?, ?, ?)',
      [name, parentId, fullPath, 0]
    );
    parentId = res.id;
    pathSoFar = fullPath;
  }
  return parentId;
}

async function upsertCard({ title, categoryId, attributes }) {
  const exists = await db.get('SELECT * FROM hizoo_cards WHERE title = ? LIMIT 1', [title]);
  const attrJson = JSON.stringify(attributes || {});
  if (exists) {
    await db.run(
      'UPDATE hizoo_cards SET category_id = ?, attributes_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [categoryId, attrJson, exists.id]
    );
    return exists.id;
  } else {
    const res = await db.run(
      'INSERT INTO hizoo_cards (category_id, title, content_body, attributes_json) VALUES (?, ?, ?, ?)',
      [categoryId, title, null, attrJson]
    );
    return res.id;
  }
}

async function importCsvFile(filePath) {
  const fileName = path.basename(filePath);
  const records = readCsvFile(filePath);
  let processed = 0;

  for (const row of records) {
    const title = findValue(row, ['Title', '名称', 'name', 'title']);
    if (!title) continue;
    const category = findValue(row, ['Category', '分类', '类别', 'class'], 'DEFAULT');
    const subs = collectSubCategories(row);
    const tags = splitTags(findValue(row, ['Tags', '标签']));
    const downloads = collectLinks(row);
    const categoryPath = [category, ...subs];
    const categoryId = await ensureCategory(categoryPath);

    const media = findMedia(category, title);

    const attributes = {
      type: 'download',
      tags,
      downloads,
      thumbnail: media.thumbnail,
      gallery: media.gallery,
      categoryPath
    };

    await upsertCard({ title, categoryId, attributes });
    processed += 1;
  }

  return { file: fileName, processed };
}

async function importAllCSVs() {
  if (!fs.existsSync(DATA_DIR)) return { total: 0, details: [] };
  const files = fs
    .readdirSync(DATA_DIR)
    .filter(f => f.toLowerCase().endsWith('.csv'))
    .map(f => path.join(DATA_DIR, f));

  const details = [];
  for (const file of files) {
    try {
      const res = await importCsvFile(file);
      details.push(res);
    } catch (err) {
      console.error('[CSV Import] file failed:', file, err.message);
    }
  }
  const total = details.reduce((sum, d) => sum + (d.processed || 0), 0);
  return { total, details };
}

module.exports = {
  importAllCSVs
};


