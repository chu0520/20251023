// =================================================================
// 步驟一：H5P 成績數據接收
// -----------------------------------------------------------------

// 確保這是全域變數
let finalScore = 0; 
let maxScore = 0;
let scoreText = ""; // 用於 p5.js 繪圖的文字

// 【新增】煙火相關全域變數
let fireworks = []; // 存放 Firework 實例的陣列
let gravity; // 重力向量

window.addEventListener('message', function (event) {
    // 執行來源驗證...
    // ...
    const data = event.data;
    
    if (data && data.type === 'H5P_SCORE_RESULT') {
        
        // !!! 關鍵步驟：更新全域變數 !!!
        finalScore = data.score; // 更新全域變數
        maxScore = data.maxScore;
        scoreText = `最終成績分數: ${finalScore}/${maxScore}`;
        
        console.log("新的分數已接收:", scoreText); 
        
        // ----------------------------------------
        // 關鍵步驟 2: 呼叫重新繪製 
        // ----------------------------------------
        
        // 滿分時，啟動 loop() 來進行動畫，否則只 redraw 一次
        if (typeof loop === 'function' && maxScore > 0 && finalScore / maxScore >= 0.999) {
            loop(); // 滿分時啟動動畫循環
        } else if (typeof redraw === 'function') {
            redraw(); 
        }
    }
}, false);


// =================================================================
// 步驟二：p5.js 核心設定與繪圖
// -----------------------------------------------------------------

function setup() { 
    createCanvas(windowWidth / 2, windowHeight / 2); 
    background(255); 
    
    // 【修改】預設停止繪製，直到分數更新或觸發動畫
    noLoop(); 
    
    // 【新增】初始化重力向量和顏色模式
    gravity = createVector(0, 0.2); // 向下加速度
    colorMode(HSB, 360, 100, 100); // 使用 HSB 顏色模式方便隨機顏色
} 

// =================================================================
// 步驟三：煙火與粒子類別定義
// -----------------------------------------------------------------

// 【新增】Particle 類別 (單個粒子)
class Particle {
    constructor(x, y, hu, isFirework) {
        this.pos = createVector(x, y);
        this.isFirework = isFirework; // 是否為向上飛的引信
        this.lifespan = 255; // 粒子的壽命
        this.hu = hu; // HUE 顏色值

        if (this.isFirework) {
            // 引信：向上飛
            this.vel = createVector(0, random(-10, -15));
        } else {
            // 爆炸粒子：隨機向外擴散
            this.vel = p5.Vector.random2D();
            this.vel.mult(random(2, 10)); // 爆炸速度
        }
        this.acc = createVector(0, 0);
    }
    
    applyForce(force) {
        this.acc.add(force);
    }
    
    update() {
        this.vel.add(this.acc);
        this.pos.add(this.vel);
        this.acc.mult(0); // 重置加速度
        this.lifespan -= 4; // 粒子逐漸消失
        
        if (!this.isFirework) {
            // 爆炸粒子有摩擦力/阻力，讓它們慢下來
            this.vel.mult(0.95);
        }
    }
    
    show() {
        strokeWeight(2);
        // 設定顏色 (HSB 顏色值, 飽和度, 亮度, 透明度)
        fill(this.hu, 100, 100, this.lifespan); 
        noStroke();
        ellipse(this.pos.x, this.pos.y, 4);
    }
    
    isDead() {
        return this.lifespan < 0;
    }
}

// 【新增】Firework 類別 (單個煙火，包含引信與爆炸邏輯)
class Firework {
    constructor(x, y) {
        this.particles = [];
        this.hu = random(360); // 隨機顏色
        this.exploded = false;
        
        // 煙火的起始點
        this.pos = createVector(x, y); 
        
        // 初始化為向上飛行的「引信」粒子
        this.fireworkParticle = new Particle(this.pos.x, this.pos.y, this.hu, true);
    }
    
    update() {
        if (!this.exploded) {
            // 更新引信
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
        // 引信完成任務
        this.fireworkParticle = null; 
    }
    
    // 檢查是否所有粒子都消失
    isDone() {
        return this.exploded && this.particles.length === 0;
    }
}

// 【新增】一個繪製星星的輔助函數，用來作為滿分時的裝飾
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
    // 【修改】背景使用半透明黑色，造成煙火的拖尾效果 (0.1 是透明度)
    background(0, 0, 0, 0.1); 

    let percentage = (maxScore > 0) ? (finalScore / maxScore) * 100 : 0;

    // -----------------------------------------------------------------
    // A. 煙火效果邏輯
    // -----------------------------------------------------------------
    if (percentage >= 99.99 && maxScore > 0) {
        // 滿分時：隨機發射新的煙火
        if (random(1) < 0.05) { // 每幀有 5% 的機率發射新煙火
            // 煙火從畫面底部中央的隨機位置發射
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
            fireworks.splice(i, 1); // 移除已結束的煙火
        }
    }
    // -----------------------------------------------------------------
    
    // B. 分數文本與圖形顯示邏輯 (放在煙火之上)
    
    push(); // 保存當前的繪圖樣式
    
    // 根據分數區間改變文本和裝飾
    if (percentage >= 90) {
        // 滿分或高分
        fill(60, 100, 100); // 鮮豔的黃色/金色 (HSB 模式)
        textSize(80); 
        textAlign(CENTER);
        text("恭喜！優異成績！", width / 2, height / 2 - 50);
        
        // 畫一個小星星代表榮譽
        fill(60, 100, 100, 150); 
        noStroke();
        star(width / 2, height / 2 + 150, 20, 50, 5);
        
    } else if (percentage >= 60) {
        // 中等分數
        fill(45, 100, 100); // 橘黃色
        textSize(80); 
        textAlign(CENTER);
        text("成績良好，請再接再厲。", width / 2, height / 2 - 50);
        
        // 畫一個方形 
        fill(45, 100, 80, 150);
        rectMode(CENTER);
        rect(width / 2, height / 2 + 150, 150, 150);
        
    } else if (percentage > 0) {
        // 低分
        fill(0, 80, 80); // 紅色
        textSize(80); 
        textAlign(CENTER);
        text("需要加強努力！", width / 2, height / 2 - 50);
        
    } else {
        // 尚未收到分數或分數為 0
        fill(0, 0, 60); // 灰色
        textSize(50);
        textAlign(CENTER);
        text(scoreText, width / 2, height / 2);
    }

    // 顯示具體分數 (在所有情況下都顯示)
    textSize(50);
    fill(0, 0, 95); // 接近白色
    text(`得分: ${finalScore}/${maxScore}`, width / 2, height / 2 + 50);
    
    pop(); // 恢復之前的繪圖樣式
}
