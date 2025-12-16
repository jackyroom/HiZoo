const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const db = require('./db');
const { importAllCSVs } = require('./importer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: '5mb' }));

// 静态资源：将 HiZoo 根目录作为前端静态站点
const ROOT_DIR = path.join(__dirname, '..');
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


