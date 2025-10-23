// =================================================================
// 步驟一：模擬成績數據接收
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
        // 在這裡，我們將從 noLoop() 改為 loop() 以啟用動畫
        if (typeof loop === 'function' && finalScore / maxScore >= 0.999) {
            loop(); // 滿分時啟動動畫循環
        } else if (typeof redraw === 'function') {
            redraw(); 
        }
    }
}, false);


// =================================================================
// 步驟二：使用 p5.js 繪製分數 (在網頁 Canvas 上顯示)
// -----------------------------------------------------------------

function setup() { 
    createCanvas(windowWidth / 2, windowHeight / 2); 
    background(255); 
    noLoop(); // 預設停止繪製，直到分數更新
    
    // 【新增】初始化重力
    gravity = createVector(0, 0.2); // 向下加速度
    colorMode(HSB, 360, 100, 100); // 使用 HSB 顏色模式方便隨機顏色
} 

// 【新增】Firework 類別 (極簡化版，只處理爆炸粒子)
class Firework {
    constructor(x, y) {
        this.particles = [];
        this.hu = random(360); // 隨機顏色
        this.exploded = false;
        
        // 煙火的起始點
        this.pos = createVector(x, y); 
        
        // 初始化為向上飛行的「引信」粒子 (簡化為一個點)
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
        if (!this.exploded) {
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
        // 引信完成任務，從畫面上移除
        this.fireworkParticle = null; 
    }
    
    // 檢查是否所有粒子都消失
    isDone() {
        return this.exploded && this.particles.length === 0;
    }
}

// 【新增】Particle 類別
class Particle {
    constructor(x, y, hu, isFirework) {
        this.pos = createVector(x, y);
        this.isFirework = isFirework; // 是否為向上飛的引信
        this.lifespan = 255;
        this.hu = hu;

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
        noStroke();
        fill(this.hu, 100, 100, this.lifespan);
        ellipse(this.pos.x, this.pos.y, 4);
    }
    
    isDead() {
        return this.lifespan < 0;
    }
}


function draw() { 
    // 【修改】背景使用半透明黑色，造成拖尾效果
    background(0, 0, 0, 0.1); 

    // 計算百分比
    let percentage = (finalScore / maxScore) * 100;

    // -----------------------------------------------------------------
    // C. 滿分時新增煙火效果
    // -----------------------------------------------------------------
    if (percentage >= 99.99 && maxScore > 0) {
        // 【新增】在畫面上隨機位置創建新的煙火
        if (random(1) < 0.05) { // 每幀有 5% 的機率發射新煙火
            fireworks.push(new Firework(random(width / 4, width * 3 / 4), height));
        }
    } else {
        // 如果不是滿分，清空煙火陣列並停止循環
        fireworks = [];
        noLoop();
    }
    
    // 【新增】更新和顯示所有煙火
    for (let i = fireworks.length - 1; i >= 0; i--) {
        fireworks[i].update();
        fireworks[i].show();
        if (fireworks[i].isDone()) {
            fireworks.splice(i, 1); // 移除已結束的煙火
        }
    }
    // -----------------------------------------------------------------
    
    // A. 根據分數區間改變文本顏色和內容
    if (percentage >= 90) {
        // 滿分或高分：顯示鼓勵文本，使用鮮豔顏色
        fill(100, 100, 80); // 淺色文本在黑背景上
        textSize(80); 
        textAlign(CENTER);
        text("恭喜！優異成績！", width / 2, height / 2 - 50);
        
    } else if (percentage >= 60) {
        // 中等分數
        fill(45, 100, 100); // 黃色
        textSize(80); 
        textAlign(CENTER);
        text("成績良好，請再接再厲。", width / 2, height / 2 - 50);
        
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
        noLoop(); // 確保無分數時不會進行動畫循環
    }

    // 顯示具體分數
    textSize(50);
    fill(0, 0, 95); // 接近白色
    text(`得分: ${finalScore}/${maxScore}`, width / 2, height / 2 + 50);
    
    
    // -----------------------------------------------------------------
    // B. 根據分數觸發不同的幾何圖形反映 (移除舊的幾何圖形，以免影響煙火)
    // -----------------------------------------------------------------
    
    if (percentage >= 90) {
        // 畫一個小星星代表榮譽 (替代舊的圓圈)
        fill(60, 100, 100, 150); // 金色
        noStroke();
        star(width / 2, height / 2 + 150, 20, 50, 5); // 自定義 star 函數
        
    } else if (percentage >= 60) {
        // 畫一個方形 
        fill(45, 100, 80, 150);
        rectMode(CENTER);
        rect(width / 2, height / 2 + 150, 150, 150);
    }
}

// 【新增】一個繪製星星的輔助函數，在 p5.js 中並非內建
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
