const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const multer = require('multer');
const { spawn } = require('child_process');
const db = require('./db');
const { importAllCSVs } = require('./importer');
const { insertRowSecondLine, updateRow: updateCsvRow, deleteRow: deleteCsvRow } = require('./utils/csv-writer');

function safeParse(str) {
  try {
    return JSON.parse(str);
  } catch (_) {
    return {};
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: '5mb' }));

// 静态资源：将 HiZoo 根目录作为前端静态站点
const ROOT_DIR = path.join(__dirname, '..');
const ASSETS_ROOT = path.join(ROOT_DIR, 'public', 'assets');
const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_TMP = path.join(__dirname, 'uploads_tmp');

fs.mkdirSync(UPLOAD_TMP, { recursive: true });
fs.mkdirSync(ASSETS_ROOT, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    cb(null, UPLOAD_TMP);
  },
  filename: (_, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 单文件 50MB
    files: 50
  }
});

app.use(express.static(ROOT_DIR));

// 单页入口：访问根路径时返回 index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'index.html'));
});

// 获取完整分类树 + 卡片（一次性返回）
app.get('/api/tree', async (req, res) => {
  try {
    const categories = await db.query('SELECT * FROM hizoo_categories ORDER BY COALESCE(parent_id, 0), order_index, id');
    const cards = await db.query('SELECT * FROM hizoo_cards');
    res.json({ success: true, categories, cards });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 创建分类
app.post('/api/categories', async (req, res) => {
  try {
    const { name, parentId, orderIndex, meta } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });

    const parent_id = parentId ?? null;
    const order_index = typeof orderIndex === 'number' ? orderIndex : 0;
    const meta_json = meta ? JSON.stringify(meta) : null;

    const result = await db.run(
      'INSERT INTO hizoo_categories (name, parent_id, order_index, meta_json) VALUES (?, ?, ?, ?)',
      [name, parent_id, order_index, meta_json]
    );

    const category = await db.get('SELECT * FROM hizoo_categories WHERE id = ?', [result.id]);
    res.json({ success: true, category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 重命名 / 更新分类
app.patch('/api/categories/:id', async (req, res) => {
  try {
    const { name, meta } = req.body;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'invalid id' });

    const meta_json = meta ? JSON.stringify(meta) : null;
    await db.run(
      'UPDATE hizoo_categories SET name = COALESCE(?, name), meta_json = COALESCE(?, meta_json), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name || null, meta_json, id]
    );
    const category = await db.get('SELECT * FROM hizoo_categories WHERE id = ?', [id]);
    res.json({ success: true, category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 移动/排序分类（拖拽）
app.patch('/api/categories/:id/move', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { newParentId, newOrderIndex } = req.body;
    if (!id) return res.status(400).json({ success: false, message: 'invalid id' });

    const parent_id = newParentId ?? null;
    const order_index = typeof newOrderIndex === 'number' ? newOrderIndex : 0;

    await db.run(
      'UPDATE hizoo_categories SET parent_id = ?, order_index = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [parent_id, order_index, id]
    );
    const category = await db.get('SELECT * FROM hizoo_categories WHERE id = ?', [id]);
    res.json({ success: true, category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 删除分类
app.delete('/api/categories/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'invalid id' });

    // 简化：不做级联，前端应先移动/删除子节点与卡片
    await db.run('DELETE FROM hizoo_categories WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 创建卡片
app.post('/api/cards', async (req, res) => {
  try {
    const { categoryId, title, content, attributes } = req.body;
    if (!categoryId || !title) {
      return res.status(400).json({ success: false, message: 'categoryId and title are required' });
    }
    const attributes_json = attributes ? JSON.stringify(attributes) : null;
    const result = await db.run(
      'INSERT INTO hizoo_cards (category_id, title, content_body, attributes_json) VALUES (?, ?, ?, ?)',
      [categoryId, title, content || null, attributes_json]
    );
    const card = await db.get('SELECT * FROM hizoo_cards WHERE id = ?', [result.id]);
    res.json({ success: true, card });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 卡片移动（拖拽到其他分类）
app.patch('/api/cards/:id/move', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { newCategoryId } = req.body;
    if (!id || !newCategoryId) {
      return res.status(400).json({ success: false, message: 'invalid id or newCategoryId' });
    }
    await db.run(
      'UPDATE hizoo_cards SET category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newCategoryId, id]
    );
    const card = await db.get('SELECT * FROM hizoo_cards WHERE id = ?', [id]);
    res.json({ success: true, card });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 更新 / 删除卡片（预留）
app.patch('/api/cards/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { title, content, attributes } = req.body;
    if (!id) return res.status(400).json({ success: false, message: 'invalid id' });

    const attributes_json = attributes ? JSON.stringify(attributes) : null;
    await db.run(
      'UPDATE hizoo_cards SET title = COALESCE(?, title), content_body = COALESCE(?, content_body), attributes_json = COALESCE(?, attributes_json), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title || null, content || null, attributes_json, id]
    );
    const card = await db.get('SELECT * FROM hizoo_cards WHERE id = ?', [id]);
    res.json({ success: true, card });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/cards/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'invalid id' });
    await db.run('DELETE FROM hizoo_cards WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 上传处理：写入 CSV + 保存文件 + 触发重命名与压缩
app.post(
  '/api/upload',
  upload.fields([
    { name: 'files', maxCount: 50 },
    { name: 'cover', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const {
        title = 'UNTITLED_ASSET',
        categoryName = 'Uncategorized',
        subCategory = '',
        subCategory2 = '',
        tags = '',
        description = '',
        categoryId
      } = req.body || {};

      const links = [req.body?.link1, req.body?.link2, req.body?.link3]
        .map((l) => (l || '').trim())
        .filter(Boolean);

      const targetDir = path.join(ASSETS_ROOT, categoryName, title);
      fs.mkdirSync(targetDir, { recursive: true });

      const uniqueName = (dir, original) => {
        const { name, ext } = path.parse(original);
        let candidate = original;
        let idx = 1;
        while (fs.existsSync(path.join(dir, candidate))) {
          candidate = `${name}_${idx}${ext}`;
          idx += 1;
        }
        return candidate;
      };

      const moveFiles = (files = []) => {
        const moved = [];
        files.forEach((file) => {
          const safeName = uniqueName(targetDir, file.originalname);
          const dest = path.join(targetDir, safeName);
          fs.renameSync(file.path, dest);
          moved.push(dest);
        });
        return moved;
      };

      const movedPayload = moveFiles(req.files?.files || []);
      const movedCover = moveFiles(req.files?.cover || []);

      if (movedPayload.length === 0 && movedCover.length === 0) {
        return res.status(400).json({ success: false, message: 'NO_FILES_RECEIVED' });
      }

      // 重命名与压缩
      await runRenameScript(targetDir);
      await runCompressScript(targetDir);
      cleanupOriginalImages(targetDir);

      // 收集图片路径
      const images = fs
        .readdirSync(targetDir)
        .filter((f) => /\.(png|jpg|jpeg|webp|gif|avif|bmp)$/i.test(f))
        .sort();

      const rel = (p) => '/' + path.relative(ROOT_DIR, p).replace(/\\/g, '/');
      // 首张仅用于封面，不再重复放入 gallery
      const thumbnail = images[0] ? rel(path.join(targetDir, images[0])) : '';
      const gallery = images.slice(1).map((f) => rel(path.join(targetDir, f)));
      const imageFullPaths = images.map((f) => path.join(targetDir, f));

      // 写入 CSV（第二行）
      const csvPath = path.join(DATA_DIR, `data_${categoryName}.csv`);
      insertRowSecondLine(csvPath, {
        Title: title,
        Category: categoryName,
        Link: links[0] || '',
        Link2: links[1] || '',
        Link3: links[2] || '',
        SubCategory: subCategory || '',
        SubCategory2: subCategory2 || '',
        Tags: tags || ''
      });

      // 确保分类存在并获取 categoryId
      const categoryPath = [categoryName, subCategory, subCategory2].filter(Boolean);
      const finalCategoryId = await ensureCategory(categoryPath, categoryId);
      if (!finalCategoryId) {
        return res.status(400).json({ success: false, message: 'INVALID_CATEGORY' });
      }

      // 写入数据库卡片
      const parsedTags = (tags || '')
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean);
      const downloads = links.map((url, idx) => ({
        label: `Link${idx + 1}`,
        url
      }));

      const attributes = {
        type: 'download',
        tags: parsedTags,
        downloads,
        thumbnail,
        gallery,
        categoryPath,
        size: calcSizeText(imageFullPaths)
      };

      const cardRes = await db.run(
        'INSERT INTO hizoo_cards (category_id, title, content_body, attributes_json) VALUES (?, ?, ?, ?)',
        [finalCategoryId, title, description || null, JSON.stringify(attributes)]
      );

      res.json({
        success: true,
        card: {
          id: cardRes.id,
          title,
          category_id: finalCategoryId,
          content_body: description || '',
          attributes
        }
      });
    } catch (err) {
      console.error('[Upload] failed:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

function calcSizeText(filePaths = []) {
  try {
    const total = filePaths.reduce((acc, p) => acc + (fs.existsSync(p) ? fs.statSync(p).size : 0), 0);
    if (total === 0) return '--';
    return (total / 1024 / 1024).toFixed(1) + ' MB';
  } catch (e) {
    return '--';
  }
}

async function ensureCategory(pathArr = [], fallbackId = null) {
  if (fallbackId) return Number(fallbackId);
  let parentId = null;
  let pathSoFar = '';

  for (const name of pathArr) {
    if (!name) continue;
    const fullPath = pathSoFar ? `${pathSoFar}>${name}` : name;
    let existing = await db.get('SELECT * FROM hizoo_categories WHERE path = ? LIMIT 1', [fullPath]);
    if (!existing) {
      const res = await db.run(
        'INSERT INTO hizoo_categories (name, parent_id, path, order_index) VALUES (?, ?, ?, ?)',
        [name, parentId, fullPath, 0]
      );
      existing = { id: res.id };
    }
    parentId = existing.id;
    pathSoFar = fullPath;
  }

  return parentId;
}

function runRenameScript(targetDir) {
  const scriptPath = path.join(__dirname, 'data', 'image_script', 'Notion图片重命名.py');
  return runPython(scriptPath, ['--target', targetDir]);
}

function runCompressScript(targetDir) {
  const scriptPath = path.join(__dirname, 'data', 'image_script', 'Notion图片压缩.py');
  // 将压缩输出也指向同一目录，避免产生额外副本目录
  return runPython(scriptPath, ['--input', targetDir, '--output', targetDir]);
}

function cleanupOriginalImages(dir) {
  const IMAGE_EXTS = ['.png', '.jpeg', '.jpg', '.webp', '.gif', '.avif', '.bmp'];
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  files.forEach((f) => {
    const ext = path.extname(f).toLowerCase();
    if (ext === '.jpg') return; // keep jpg
    if (!IMAGE_EXTS.includes(ext)) return;
    const base = path.basename(f, ext);
    const jpgPath = path.join(dir, `${base}.jpg`);
    if (fs.existsSync(jpgPath)) {
      try {
        fs.unlinkSync(path.join(dir, f));
      } catch (err) {
        console.warn('[Cleanup] remove original failed:', f, err.message);
      }
    }
  });
}

function runPython(script, args = []) {
  return new Promise((resolve, reject) => {
    const py = spawn(process.env.PYTHON || 'python', [script, ...args], {
      cwd: path.dirname(script),
      stdio: 'inherit'
    });
    py.on('error', reject);
    py.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Python script exited with code ${code}`));
    });
  });
}

// 最近上传列表
app.get('/api/uploads/recent', async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const rows = await db.query(
      'SELECT * FROM hizoo_cards ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    const items = rows.map((row) => {
      const attrs = row.attributes_json ? safeParse(row.attributes_json) : {};
      return {
        id: row.id,
        title: row.title,
        categoryPath: attrs.categoryPath || [],
        downloads: attrs.downloads || [],
        tags: attrs.tags || [],
        thumbnail: attrs.thumbnail || '',
        gallery: attrs.gallery || [],
        size: attrs.size || '--',
        description: row.content_body || '',
        createdAt: row.created_at,
      };
    });
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 资源管理：分页 + 筛选
app.get('/api/uploads/list', async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 20, 1), 50);
    const q = (req.query.q || '').toString().trim().toLowerCase();
    const filterCat = (req.query.category || '').toString().trim();
    const filterSub = (req.query.subCategory || '').toString().trim();

    const rows = await db.query(
      'SELECT * FROM hizoo_cards ORDER BY created_at DESC'
    );

    const normalized = rows.map((row) => {
      const attrs = row.attributes_json ? safeParse(row.attributes_json) : {};
      const categoryPath = attrs.categoryPath || [];
      const tags = attrs.tags || [];
      const downloads = attrs.downloads || [];

      return {
        raw: row,
        id: row.id,
        title: row.title || '',
        categoryPath,
        tags,
        downloads,
        thumbnail: attrs.thumbnail || '',
        gallery: attrs.gallery || [],
        size: attrs.size || '--',
        description: row.content_body || '',
        createdAt: row.created_at,
      };
    });

    let filtered = normalized;

    if (q) {
      filtered = filtered.filter((it) => {
        const inTitle = it.title.toLowerCase().includes(q);
        const inTags = (it.tags || []).some((t) =>
          String(t).toLowerCase().includes(q)
        );
        return inTitle || inTags;
      });
    }

    if (filterCat) {
      filtered = filtered.filter(
        (it) => it.categoryPath && it.categoryPath[0] === filterCat
      );
    }

    if (filterSub) {
      filtered = filtered.filter(
        (it) => it.categoryPath && it.categoryPath[1] === filterSub
      );
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize).map((it) => ({
      id: it.id,
      title: it.title,
      categoryPath: it.categoryPath,
      downloads: it.downloads,
      tags: it.tags,
      thumbnail: it.thumbnail,
      gallery: it.gallery,
      size: it.size,
      description: it.description,
      createdAt: it.createdAt,
    }));

    res.json({ success: true, items, total, page, pageSize });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 更新上传（链接 / 标签 / 描述）
app.patch('/api/uploads/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'invalid id' });

    const card = await db.get('SELECT * FROM hizoo_cards WHERE id = ?', [id]);
    if (!card) return res.status(404).json({ success: false, message: 'not found' });

    const attrs = card.attributes_json ? safeParse(card.attributes_json) : {};
    const oldCategory = attrs.categoryPath?.[0];
    const oldSub = attrs.categoryPath?.[1] || '';
    if (!oldCategory) return res.status(400).json({ success: false, message: 'category missing' });

    const links = Array.isArray(req.body.links) ? req.body.links.map((l) => String(l || '').trim()).filter(Boolean) : [];
    const tags = String(req.body.tags || '')
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean);
    const description = req.body.description || '';
    const newCategory = (req.body.categoryName || oldCategory).trim() || oldCategory;
    const newSubCategory = (req.body.subCategory || '').trim();

    const downloads = links.map((url, idx) => ({ label: `Link${idx + 1}`, url }));
    attrs.downloads = downloads;
    attrs.tags = tags;
    attrs.categoryPath = [newCategory, newSubCategory].filter(Boolean);

    // 如果分类变化，移动文件夹、更新 CSV、更新 category_id、刷新缩略图
    const categoryChanged = newCategory !== oldCategory || newSubCategory !== oldSub;
    let targetCategoryId = card.category_id;
    let newThumbnail = attrs.thumbnail || '';
    let newGallery = attrs.gallery || [];
    let newSize = attrs.size || '--';

    if (categoryChanged) {
      // 目标分类节点
      const newPathArr = [newCategory, newSubCategory].filter(Boolean);
      targetCategoryId = await ensureCategory(newPathArr, null);

      // 移动资源目录
      const oldFolder = path.join(ASSETS_ROOT, oldCategory, card.title);
      const newFolder = path.join(ASSETS_ROOT, newCategory, card.title);
      try {
        fs.mkdirSync(path.dirname(newFolder), { recursive: true });
        if (fs.existsSync(oldFolder)) {
          fs.renameSync(oldFolder, newFolder);
        }
      } catch (moveErr) {
        console.warn('[Upload] move folder failed:', moveErr.message);
      }

      // 重新收集图片
      if (fs.existsSync(newFolder)) {
        cleanupOriginalImages(newFolder);
        const files = fs
          .readdirSync(newFolder)
          .filter((f) => /\.(png|jpg|jpeg|webp|gif|avif|bmp)$/i.test(f))
          .sort();
        const rel = (p) => '/' + path.relative(ROOT_DIR, p).replace(/\\/g, '/');
        newThumbnail = files[0] ? rel(path.join(newFolder, files[0])) : '';
        newGallery = files.slice(1).map((f) => rel(path.join(newFolder, f)));
        const imageFullPaths = files.map((f) => path.join(newFolder, f));
        newSize = calcSizeText(imageFullPaths);
      }

      attrs.thumbnail = newThumbnail;
      attrs.gallery = newGallery;
      attrs.size = newSize;

      // 更新 CSV：删除旧分类行，插入新分类行
      const oldCsv = path.join(DATA_DIR, `data_${oldCategory}.csv`);
      deleteCsvRow(oldCsv, card.title, oldCategory);

      const newCsv = path.join(DATA_DIR, `data_${newCategory}.csv`);
      insertRowSecondLine(newCsv, {
        Title: card.title,
        Category: newCategory,
        Link: links[0] || '',
        Link2: links[1] || '',
        Link3: links[2] || '',
        SubCategory: newSubCategory || '',
        SubCategory2: '',
        Tags: tags.join(',')
      });
    } else {
      // 分类未变化，仅更新 CSV 行内容
      const csvPath = path.join(DATA_DIR, `data_${oldCategory}.csv`);
      updateCsvRow(csvPath, card.title, oldCategory, {
        Link: links[0] || '',
        Link2: links[1] || '',
        Link3: links[2] || '',
        SubCategory: oldSub || '',
        Tags: tags.join(',')
      });
    }

    await db.run(
      'UPDATE hizoo_cards SET category_id = ?, attributes_json = ?, content_body = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [targetCategoryId, JSON.stringify(attrs), description, id]
    );

    // 更新 CSV
    // （分类变化的场景已在上面处理，这里只负责非变化场景的更新）

    res.json({
      success: true,
      card: {
        ...card,
        category_id: targetCategoryId,
        attributes_json: JSON.stringify(attrs),
        content_body: description
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 删除上传（DB + CSV + 资源文件夹）
app.delete('/api/uploads/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'invalid id' });

    const card = await db.get('SELECT * FROM hizoo_cards WHERE id = ?', [id]);
    if (!card) return res.status(404).json({ success: false, message: 'not found' });

    const attrs = card.attributes_json ? safeParse(card.attributes_json) : {};
    const category = attrs.categoryPath?.[0];
    const title = card.title;

    // 删除文件夹
    if (category && title) {
      const folder = path.join(ASSETS_ROOT, category, title);
      fs.rmSync(folder, { recursive: true, force: true });

      // 删除 CSV 行
      const csvPath = path.join(DATA_DIR, `data_${category}.csv`);
      deleteCsvRow(csvPath, title, category);
    }

    await db.run('DELETE FROM hizoo_cards WHERE id = ?', [id]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


async function startServer() {
  try {
    const imported = await importAllCSVs();
    console.log(`[CSV Import] total cards processed: ${imported.total}`);
    imported.details.forEach(d => console.log(` - ${d.file}: ${d.processed} cards`));
  } catch (err) {
    console.warn('[CSV Import] CSV import skipped:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`HiZoo backend running at http://localhost:${PORT}`);
  });
}

startServer();


