// 分类树状态管理：承接后端 /api/tree，并为侧边栏等提供统一数据源

class TaxonomyStore {
    constructor() {
        this.structure = []; // 仍然用原来的 group/children/subs 结构喂给 UI
        this.rawCategories = []; // 后端原始分类表（预留以后用来做编辑/拖拽）
        this.rawCards = [];      // 后端原始卡片表
    }

    setFromBackend(categories, cards) {
        this.rawCategories = categories || [];
        this.rawCards = cards || [];
        // TODO：后续这里可以把平铺的 categories 转成多层树，并映射成旧的 structure 形状
        // 目前先保持由前端默认 taxonomy.json 生成的 structure，不在这里改变 UI 行为
    }

    setStructure(structure) {
        this.structure = structure || [];
        if (window) {
            window.structure = this.structure;
        }
    }

    getStructure() {
        return this.structure;
    }

    getRaw() {
        return {
            categories: this.rawCategories,
            cards: this.rawCards
        };
    }
}

export const taxonomyStore = new TaxonomyStore();



