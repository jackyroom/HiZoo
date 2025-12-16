// 卡片同步服务：处理卡片移动、更新等后端同步操作

/**
 * 将卡片移动到新的分类（同步到后端）
 * @param {number} cardId - 卡片的数据库 ID
 * @param {number} newCategoryId - 目标分类的数据库 ID
 * @returns {Promise<boolean>} 是否成功
 */
export async function moveCardToCategory(cardId, newCategoryId) {
    if (!cardId || !newCategoryId) {
        console.warn('[CardSync] 缺少必要参数: cardId=', cardId, 'newCategoryId=', newCategoryId);
        return false;
    }
    
    try {
        const response = await fetch(`/api/cards/${cardId}/move`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newCategoryId })
        });
        
        const result = await response.json();
        if (result.success) {
            if (window.showToast) {
                window.showToast('卡片已移动到新分类', 'success');
            }
            return true;
        } else {
            console.error('[CardSync] 移动失败:', result.message);
            if (window.showToast) {
                window.showToast('卡片移动失败: ' + result.message, 'error');
            }
            return false;
        }
    } catch (error) {
        console.error('[CardSync] 移动异常:', error);
        if (window.showToast) {
            window.showToast('卡片移动异常: ' + error.message, 'error');
        }
        return false;
    }
}

/**
 * 根据卡片属性查找对应的数据库分类 ID
 * 这是一个辅助函数，用于将前端分类映射到后端分类
 * @param {Object} card - 卡片对象
 * @param {Object} targetParent - 目标父分类
 * @param {Object} targetSub - 目标子分类
 * @returns {Promise<number|null>} 数据库分类 ID，如果找不到则返回 null
 */
export async function findCategoryIdForCard(card, targetParent, targetSub) {
    // TODO: 这里需要根据实际的分类映射逻辑来实现
    // 目前先返回 null，表示暂时不支持自动映射
    // 后续可以从 taxonomyStore 中查找对应的数据库分类 ID
    return null;
}

