// 应用上下文：管理全局生命周期和状态

class AppContext {
    constructor() {
        this.isInitialized = false;
        this.currentView = 'dashboard'; // dashboard | neural
        this.listeners = [];
    }

    // 初始化应用
    async init() {
        if (this.isInitialized) return;
        
        this.isInitialized = true;
        this.emit('app:init');
    }

    // 切换视图
    setView(view) {
        if (this.currentView === view) return;
        const oldView = this.currentView;
        this.currentView = view;
        this.emit('app:view-changed', { from: oldView, to: view });
    }

    // 事件监听
    on(event, callback) {
        this.listeners.push({ event, callback });
    }

    // 触发事件
    emit(event, data) {
        this.listeners
            .filter(l => l.event === event)
            .forEach(l => {
                try {
                    l.callback(data);
                } catch (err) {
                    console.error(`[AppContext] Error in listener for "${event}":`, err);
                }
            });
    }

    // 销毁
    destroy() {
        this.listeners = [];
        this.isInitialized = false;
    }
}

export const appContext = new AppContext();



