// 编辑器工具栏状态管理：根据当前选择更新按钮状态

export function updateToolbarState() {
    const buttons = document.querySelectorAll('.tool-btn');
    buttons.forEach(btn => {
        const cmd = btn.getAttribute('data-cmd');
        if (cmd) {
            if (document.queryCommandState(cmd)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    });
}

