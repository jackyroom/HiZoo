// 编辑器插入功能：代码块、水平线等

export function insertCodeBlock() {
    const codeHtml = `<pre style="background:rgba(0,0,0,0.5); padding:15px; border:1px solid #444; color:#0f0; font-family:'Courier New', monospace; white-space:pre-wrap;"><code>// Type your code here...</code></pre><p><br></p>`;
    document.execCommand('insertHTML', false, codeHtml);
}

export function insertHorizontalRule() {
    const hrHtml = `<hr style="border: none; border-top: 2px solid var(--accent); margin: 20px 0; box-shadow: 0 0 10px rgba(0, 243, 255, 0.3);"><p><br></p>`;
    document.execCommand('insertHTML', false, hrHtml);
}


