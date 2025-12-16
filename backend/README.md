HiZoo 后端（实验版）
====================

这个目录是 HiZoo 项目的专用后端示例，使用 Node + Express + SQLite：

- `server.js`：提供分类树 / 卡片 API（端口默认 4000）
- `db.js`：初始化并操作 `backend/data/hizoo.db` 数据库

前端（运行在 `http://localhost:8000`）会调用：

- `GET http://localhost:4000/api/tree` 获取当前所有分类和卡片
- `POST/PATCH/DELETE http://localhost:4000/api/categories/*` 管理分类（增删改、拖拽移动）
- `POST/PATCH/DELETE http://localhost:4000/api/cards/*` 管理卡片（增删改、拖拽移动）
注意：

- 这个后端只服务于 HiZoo，不会改动 `ZipStore/` 里的任何内容。



