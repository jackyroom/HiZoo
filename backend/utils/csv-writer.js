const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const HEADER = ['Title', 'Category', 'Link', 'Link2', 'Link3', 'SubCategory', 'SubCategory2', 'Tags'];

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function escapeCsv(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toRow(rowObj) {
  return HEADER.map((key) => escapeCsv(rowObj[key] || '')).join(',');
}

function readRecords(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath);
  let text = content.toString('utf8');
  if (text.includes('��')) {
    // 兼容潜在的 GBK
    try {
      const iconv = require('iconv-lite');
      text = iconv.decode(content, 'gbk');
    } catch (_) {
      // ignore
    }
  }
  if (!text.trim()) return [];
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_column_count: true,
    trim: true
  });
  return records;
}

function writeRecords(filePath, records) {
  ensureDir(filePath);
  const headerLine = HEADER.join(',');
  const lines = [headerLine, ...records.map((r) => toRow(r))];
  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf8');
}

/**
 * 更新 CSV 中匹配 Title + Category 的行
 * @returns {boolean} 是否找到并写回
 */
function updateRow(filePath, title, category, newData) {
  const rows = readRecords(filePath);
  let changed = false;
  const updated = rows.map((row) => {
    if (row.Title === title && row.Category === category) {
      changed = true;
      return { ...row, ...newData };
    }
    return row;
  });
  if (changed) writeRecords(filePath, updated);
  return changed;
}

/**
 * 删除 CSV 中匹配 Title + Category 的行
 * @returns {boolean} 是否删除
 */
function deleteRow(filePath, title, category) {
  const rows = readRecords(filePath);
  const filtered = rows.filter((row) => !(row.Title === title && row.Category === category));
  const changed = filtered.length !== rows.length;
  if (changed) writeRecords(filePath, filtered);
  return changed;
}

/**
 * 将一行写入 CSV 的第二行（紧跟表头），不存在文件则创建表头
 * @param {string} filePath CSV 路径
 * @param {object} rowData 对应 HEADER 的键值对象
 */
function insertRowSecondLine(filePath, rowData) {
  ensureDir(filePath);

  if (!fs.existsSync(filePath)) {
    const headerLine = HEADER.join(',');
    const rowLine = toRow(rowData);
    fs.writeFileSync(filePath, `${headerLine}\n${rowLine}\n`, 'utf8');
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  // 清除结尾空行
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }

  // 确保有表头
  if (lines.length === 0) {
    lines.push(HEADER.join(','));
  } else {
    const currentHeader = lines[0].trim();
    if (currentHeader.replace(/\s+/g, '') !== HEADER.join('').replace(/\s+/g, '')) {
      // 如果表头不一致，保留原表头，不做替换
    }
  }

  const rowLine = toRow(rowData);
  if (lines.length === 1) {
    lines.push(rowLine);
  } else {
    lines.splice(1, 0, rowLine);
  }

  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf8');
}

module.exports = {
  insertRowSecondLine,
  updateRow,
  deleteRow,
};



