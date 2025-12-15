// UI 状态管理

class UIStore {
    constructor() {
        this.currentMediaIndex = 0;
        this.activeItem = null;
        this.isNeuralMode = false;
    }

    setActiveItem(item, index = 0) {
        this.activeItem = item;
        this.currentMediaIndex = index;
    }

    getActiveItem() {
        return this.activeItem;
    }

    setNeuralMode(enabled) {
        this.isNeuralMode = enabled;
    }

    getNeuralMode() {
        return this.isNeuralMode;
    }
}

export const uiStore = new UIStore();



