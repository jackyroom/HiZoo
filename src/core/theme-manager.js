// 主题管理器：负责切换主题和加载用户自定义样式

class ThemeManager {
    constructor() {
        this.currentTheme = 'cyber';
        this.themes = {};
    }

    // 注册主题
    registerTheme(name, cssPath) {
        this.themes[name] = cssPath;
    }

    // 切换主题
    async setTheme(themeName) {
        if (!this.themes[themeName]) {
            console.warn(`[ThemeManager] Theme "${themeName}" not found`);
            return;
        }

        // 移除旧主题
        const oldLink = document.getElementById('theme-stylesheet');
        if (oldLink) oldLink.remove();

        // 加载新主题
        const link = document.createElement('link');
        link.id = 'theme-stylesheet';
        link.rel = 'stylesheet';
        link.href = this.themes[themeName];
        document.head.appendChild(link);

        // 设置 data-theme 属性
        document.documentElement.setAttribute('data-theme', themeName);
        this.currentTheme = themeName;

        // 触发主题切换事件
        if (window.eventBus) {
            window.eventBus.emit('THEME_CHANGED', { theme: themeName });
        }
    }

    // 加载用户自定义样式（最高优先级）
    loadUserStyles() {
        const userStylesPath = 'public/custom/user-styles.css';
        const existing = document.getElementById('user-styles');
        if (existing) existing.remove();

        const link = document.createElement('link');
        link.id = 'user-styles';
        link.rel = 'stylesheet';
        link.href = userStylesPath;
        link.onerror = () => {
            // 用户样式文件不存在是正常的，静默失败
        };
        document.head.appendChild(link);
    }

    // 初始化
    init() {
        this.loadUserStyles();
        // 默认加载 cyber 主题
        this.setTheme('cyber');
    }
}

export const themeManager = new ThemeManager();



