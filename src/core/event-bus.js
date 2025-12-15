// 事件总线：模块间通信机制
// 使用发布-订阅模式，解耦各模块之间的直接依赖

class EventBus {
    constructor() {
        this.events = {};
    }

    // 订阅事件
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    // 取消订阅
    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }

    // 发布事件
    emit(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => {
            try {
                callback(data);
            } catch (err) {
                console.error(`[EventBus] Error in event handler for "${event}":`, err);
            }
        });
    }

    // 一次性订阅
    once(event, callback) {
        const wrapper = (data) => {
            callback(data);
            this.off(event, wrapper);
        };
        this.on(event, wrapper);
    }

    // 清除所有事件监听
    clear() {
        this.events = {};
    }
}

// 导出单例
export const eventBus = new EventBus();



