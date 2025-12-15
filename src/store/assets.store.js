// 资源状态管理

class AssetsStore {
    constructor() {
        this.currentAssets = [];
        this.currentParent = null;
        this.currentSub = null;
        this.uploadedDataStore = {}; // { "categoryId-subId": [items...] }
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
}

export const assetsStore = new AssetsStore();



