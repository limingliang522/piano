class AudioVisualizer {
    constructor(audioEngine, canvasId = 'audioVisualizer') {
        this.audioEngine = audioEngine;
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.isRunning = false;
        this.animationId = null;
        
        // 可视化样式
        this.barColor = 'rgba(0, 255, 255, 0.8)';
        this.barGlowColor = 'rgba(0, 255, 255, 0.3)';
        this.backgroundColor = 'rgba(0, 0, 0, 0.2)';
        
        if (this.canvas && this.ctx) {
            this.setupCanvas();
        }
    }
    
    setupCanvas() {
        // 设置画布大小
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
        
        // 响应窗口大小变化
        window.addEventListener('resize', () => {
            this.canvas.width = this.canvas.offsetWidth;
            this.canvas.height = this.canvas.offsetHeight;
        });
    }
    
    start() {
        if (!this.ctx || this.isRunning) return;
        this.isRunning = true;
        this.draw();
    }
    
    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    draw() {
        if (!this.isRunning) return;
        
        const frequencyData = this.audioEngine.getFrequencyData();
        if (!frequencyData) {
            this.animationId = requestAnimationFrame(() => this.draw());
            return;
        }
        
        const width = this.canvas.width;
        const height = this.canvas.height;
        const barCount = 64; // 显示64个频段
        const barWidth = width / barCount;
        
        // 清空画布（带淡出效果）
        this.ctx.fillStyle = this.backgroundColor;
        this.ctx.fillRect(0, 0, width, height);
        
        // 绘制频谱条
        for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor(i * frequencyData.length / barCount);
            const value = frequencyData[dataIndex];
            const barHeight = (value / 255) * height * 0.8;
            
            const x = i * barWidth;
            const y = height - barHeight;
            
            // 绘制发光效果
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = this.barGlowColor;
            
            // 绘制频谱条
            this.ctx.fillStyle = this.barColor;
            this.ctx.fillRect(x, y, barWidth - 2, barHeight);
        }
        
        this.animationId = requestAnimationFrame(() => this.draw());
    }
    
    setColors(barColor, glowColor, bgColor) {
        this.barColor = barColor;
        this.barGlowColor = glowColor;
        this.backgroundColor = bgColor;
    }
}
