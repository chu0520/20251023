// =================================================================
// p5.js sketch.js - 結合 H5P 分數顯示與滿分煙火特效
// =================================================================

// 核心分數變數
let finalScore = 0; 
let maxScore = 0;
let scoreText = ""; 

// 煙火相關全域變數
let fireworks = []; // 存放 Firework 實例的陣列
let gravity; // 重力向量

// =================================================================
// 步驟一：H5P 成績數據接收
// -----------------------------------------------------------------

window.addEventListener('message', function (event) {
    const data = event.data;
    
    if (data && data.type === 'H5P_SCORE_RESULT') {
        finalScore = data.score; 
        maxScore = data.maxScore;
        scoreText = `最終成績分數: ${finalScore}/${maxScore}`;
        
        console.log("新的分數已接收:", scoreText); 
        
        // 滿分時，啟動 loop() 來進行動畫，否則只 redraw 一次
        if (typeof loop === 'function' && maxScore > 0 && finalScore / maxScore >= 0.999) {
            loop(); 
        } else if (typeof redraw === 'function') {
            redraw(); 
        }
    }
}, false);


// =================================================================
// 步驟二：p5.js 核心設定與繪圖
// -----------------------------------------------------------------

function setup() { 
    // 創建畫布 (可以根據需要調整尺寸)
    createCanvas(windowWidth / 2, windowHeight / 2); 
    
    // 【重要】設置 HSB 顏色模式：色相(0-360), 飽和度(0-100), 亮度(0-100)
    colorMode(HSB, 360, 100, 100); 
    
    // 初始背景為黑色 (亮度 0)
    background(0, 0, 0); 
    // 預設停止繪圖循環，等待分數更新
    noLoop(); 
    
    // 初始化重力向量
    gravity = createVector(0, 0.2); 
} 

// =================================================================
// 步驟三：煙火與粒子類別定義
// -----------------------------------------------------------------

/** 粒子類別 (Particle Class) - 構成煙火的基本元素 */
class Particle {
    constructor(x, y, hu, isFirework) {
        this.pos = createVector(x, y);
        this.isFirework = isFirework; // 是否為向上飛的引信
        this.lifespan = 255; // 粒子的壽命 (透明度)
        this.hu = hu; // HUE 顏色值

        if (this.isFirework) {
            // 引信：向上飛
            this.vel = createVector(0, random(-10, -15));
        } else {
            // 爆炸粒子：隨機向外擴散
            this.vel = p5.Vector.random2D();
            this.vel.mult(random(2, 10)); 
            this.vel.mult(0.9);
        }
        this.acc = createVector(0, 0);
    }
    
    applyForce(force) {
        this.acc.add(force);
    }
    
    update() {
        this.vel.add(this.acc);
        this.pos.add(this.vel);
        this.acc.mult(0); 
        this.lifespan -= 4; // 壽命減少 (逐漸消失)
        
        if (!this.isFirework) {
            // 爆炸粒子減速，模擬空氣阻力
            this.vel.mult(0.95);
        }
    }
    
    show() {
        strokeWeight(2);
        // HSB 顏色: 色相, 飽和度, 亮度, 透明度
        fill(this.hu, 100, 100, this.lifespan); 
        noStroke();
        ellipse(this.pos.x, this.pos.y, 4);
    }
    
    isDead() {
        return this.lifespan < 0;
    }
}


/** 煙火類別 (Firework Class) - 處理發射、爆炸、粒子生命週期 */
class Firework {
    constructor(x, y) {
        this.particles = [];
        this.hu = random(360); // 隨機顏色
        this.exploded = false;
        
        this.pos = createVector(x, y); 
        
        this.fireworkParticle = new Particle(this.pos.x, this.pos.y, this.hu, true);
    }
    
    update() {
        if (!this.exploded) {
            this.fireworkParticle.applyForce(gravity);
            this.fireworkParticle.update();
            
            // 當引信開始下墜 (速度 y >= 0) 時爆炸
            if (this.fireworkParticle.vel.y >= 0) {
                this.exploded = true;
                this.explode();
            }
        }
        
        // 更新所有爆炸後的粒子
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].applyForce(gravity);
            this.particles[i].update();
            if (this.particles[i].isDead()) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    show() {
        if (!this.exploded && this.fireworkParticle) {
            this.fireworkParticle.show();
        } else {
            for (let p of this.particles) {
                p.show();
            }
        }
    }
    
    explode() {
        // 爆炸產生 100 個粒子
        for (let i = 0; i < 100; i++) {
            const p = new Particle(this.fireworkParticle.pos.x, this.fireworkParticle.pos.y, this.hu, false);
            this.particles.push(p);
        }
        this.fireworkParticle = null; 
    }
    
    // 檢查是否所有粒子都消失
    isDone() {
        return this.exploded && this.particles.length === 0;
    }
}


/** 繪製星星的輔助函數 */
function star(x, y, radius1, radius2, npoints) {
    let angle = TWO_PI / npoints;
    let halfAngle = angle / 2.0;
    beginShape();
    for (let a = 0; a < TWO_PI; a += angle) {
        let sx = x + cos(a) * radius2;
        let sy = y + sin(a) * radius2;
        vertex(sx, sy);
        sx = x + cos(a + halfAngle) * radius1;
        sy = y + sin(a + halfAngle) * radius1;
        vertex(sx, sy);
    }
    endShape(CLOSE);
}

// =================================================================
// 步驟四：主繪圖循環 (draw)
// -----------------------------------------------------------------

function draw() { 
    // 【關鍵】背景使用半透明黑色 (0.1 透明度)，實現煙火的拖尾效果
    background(0, 0, 0, 0.1); 

    let percentage = (maxScore > 0) ? (finalScore / maxScore) * 100 : 0;

    // A. 煙火效果邏輯
    if (percentage >= 99.99 && maxScore > 0) {
        // 滿分時：隨機發射新的煙火
        if (random(1) < 0.05) { // 每幀有 5% 的機率發射新煙火
            fireworks.push(new Firework(random(width / 4, width * 3 / 4), height));
        }
    } else {
        // 不是滿分時：清空煙火陣列並停止動畫循環
        fireworks = [];
        noLoop();
    }
    
    // 更新和顯示所有煙火
    for (let i = fireworks.length - 1; i >= 0; i--) {
        fireworks[i].update();
        fireworks[i].show();
        if (fireworks[i].isDone()) {
            fireworks.splice(i, 1); 
        }
    }
    
    // B. 分數文本與圖形顯示邏輯 (位於煙火之上)
    
    push(); 
    textAlign(CENTER);
    
    let textColor; 

    if (percentage >= 90) {
        // 滿分或高分：金色文本
        textColor = color(60, 100, 100); 
        textSize(80); 
        fill(textColor); 
        text("恭喜！優異成績！", width / 2, height / 2 - 50);
        
        // 畫一個小星星 (金色裝飾)
        fill(60, 100, 100, 150); 
        noStroke();
        star(width / 2, height / 2 + 150, 20, 50, 5);
        
    } else if (percentage >= 60) {
        // 中等分數：綠色文本
        textColor = color(120, 100, 100);
        textSize(80); 
        fill(textColor);
        text("成績良好，請再接再厲。", width / 2, height / 2 - 50);
        
    } else if (percentage > 0) {
        // 低分：紅色文本
        textColor = color(0, 100, 100);
        textSize(80); 
        fill(textColor);
        text("需要加強努力！", width / 2, height / 2 - 50);
        
    } else {
        // 尚未收到分數或分數為 0：亮灰色
        textColor = color(0, 0, 70); 
        textSize(50);
        fill(textColor);
        text(scoreText, width / 2, height / 2);
    }

    // 顯示具體分數
    textSize(50);
    fill(0, 0, 95); // 接近白色，確保在黑背景上清晰
    text(`得分: ${finalScore}/${maxScore}`, width / 2, height / 2 + 50);
    
    pop(); 
}
