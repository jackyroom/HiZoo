// 资源状态管理

class AssetsStore {
    constructor() {
        this.currentAssets = [];
        this.currentParent = null;
        this.currentSub = null;
        this.uploadedDataStore = {}; // { "categoryId-subId": [items...] }
        this.removedMockMap = {};    // { "parentId-subId": Set<mockId> }
    }

    setCurrentCategory(parent, sub) {
        this.currentParent = parent;
        this.currentSub = sub;
    }

    setAssets(assets) {
        this.currentAssets = assets;
    }

    getAssets() {
        return this.currentAssets;
    }

    addUploadedItem(categoryId, subId, item) {
        const key = `${categoryId}-${subId}`;
        if (!this.uploadedDataStore[key]) {
            this.uploadedDataStore[key] = [];
        }
        this.uploadedDataStore[key].unshift(item);
    }

    getUploadedDataStore() {
        return this.uploadedDataStore;
    }

    /**
     * 标记某个 mock 卡片已从指定分类移出
     */
    markMockMoved(parentId, subId, itemId) {
        const key = `${parentId}-${subId}`;
        if (!this.removedMockMap[key]) {
            this.removedMockMap[key] = new Set();
        }
        this.removedMockMap[key].add(itemId);
    }

    isMockRemoved(parentId, subId, itemId) {
        const key = `${parentId}-${subId}`;
        return this.removedMockMap[key]?.has(itemId) || false;
    }

    /**
     * 在当前网格中重新排序资源（用于拖拽排序）
     */
    reorderCurrentAssets(fromIndex, toIndex) {
        if (fromIndex === toIndex) return;
        const arr = [...this.currentAssets];
        const item = arr.splice(fromIndex, 1)[0];
        arr.splice(toIndex, 0, item);
        this.currentAssets = arr;
    }

    /**
     * 在上传数据仓库中移动一条记录到新的分类/子分类
     */
    moveUploadedItem(itemId, fromParentId, fromSubId, toParentId, toSubId) {
        if (!itemId) return;
        const fromKey = `${fromParentId}-${fromSubId}`;
        const toKey = `${toParentId}-${toSubId}`;
        const fromArr = this.uploadedDataStore[fromKey] || [];
        const index = fromArr.findIndex(it => it.id === itemId);
        if (index === -1) return;
        const [item] = fromArr.splice(index, 1);
        this.uploadedDataStore[fromKey] = fromArr;
        if (!this.uploadedDataStore[toKey]) {
            this.uploadedDataStore[toKey] = [];
        }
        // 放在目标列表最前面
        this.uploadedDataStore[toKey].unshift(item);
    }
}

export const assetsStore = new AssetsStore();



