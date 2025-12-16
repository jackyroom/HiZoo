// 分类同步服务：处理分类重命名、创建、删除等后端同步操作

/**
 * 重命名分类
 * @param {number} categoryId - 分类的数据库 ID
 * @param {string} newName - 新名称
 * @returns {Promise<boolean>} 是否成功
 */
export async function renameCategory(categoryId, newName) {
    if (!categoryId || !newName) {
        console.warn('[CategorySync] 缺少必要参数');
        return false;
    }
    
    try {
        const response = await fetch(`/api/categories/${categoryId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName })
        });
        
        const result = await response.json();
        if (result.success) {
            if (window.showToast) {
                window.showToast('分类名称已更新', 'success');
            }
            return true;
        } else {
            console.error('[CategorySync] 重命名失败:', result.message);
            if (window.showToast) {
                window.showToast('重命名失败: ' + result.message, 'error');
            }
            return false;
        }
    } catch (error) {
        console.error('[CategorySync] 重命名异常:', error);
        if (window.showToast) {
            window.showToast('重命名异常: ' + error.message, 'error');
        }
        return false;
    }
}

/**
 * 创建新分类
 * @param {string} name - 分类名称
 * @param {number|null} parentId - 父分类 ID（可选）
 * @param {number} orderIndex - 排序索引
 * @returns {Promise<Object|null>} 创建的分类对象，失败返回 null
 */
export async function createCategory(name, parentId = null, orderIndex = 0) {
    if (!name) {
        console.warn('[CategorySync] 缺少分类名称');
        return null;
    }
    
    try {
        const response = await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, parentId, orderIndex })
        });
        
        const result = await response.json();
        if (result.success) {
            if (window.showToast) {
                window.showToast('分类已创建', 'success');
            }
            return result.category;
        } else {
            console.error('[CategorySync] 创建失败:', result.message);
            if (window.showToast) {
                window.showToast('创建失败: ' + result.message, 'error');
            }
            return null;
        }
    } catch (error) {
        console.error('[CategorySync] 创建异常:', error);
        if (window.showToast) {
            window.showToast('创建异常: ' + error.message, 'error');
        }
        return null;
    }
}

