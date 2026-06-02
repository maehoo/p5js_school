// ==========================================
// [1] 전역 변수 및 게임 핵심 설정 세팅
// ==========================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const hpBox = document.getElementById('hpBox');
const stageBox = document.getElementById('stageBox');
const scoreBox = document.getElementById('scoreBox');
const finalScore = document.getElementById('finalScore');
const rankList = document.getElementById('rankList');

// 🌟 콤보 박스도 형의 CSS를 방해하지 않게 화면 고정(fixed)으로 따로 띄움!
const comboHtmlBox = document.createElement('div');
comboHtmlBox.id = 'comboHtmlBox';
comboHtmlBox.style.position = 'fixed';
comboHtmlBox.style.left = '20px';
comboHtmlBox.style.top = '100px'; // 체력, 스테이지 박스 밑에 배치
comboHtmlBox.style.font = 'bold 20px Arial';
comboHtmlBox.style.color = '#ff9f43'; 
comboHtmlBox.style.textShadow = '2px 2px 2px rgba(0,0,0,0.8)'; 
comboHtmlBox.style.zIndex = '100';
document.body.appendChild(comboHtmlBox);

let W=0, H=0;                  
let worldW=0, worldH=0;        
let mode='menu';               
let lastTime=0;                
let spawnTimer=0;              
let keys={};                   
let player;                    
let enemies=[];                
let effects=[];                
let stage=1;                   
let parryCount=0;              
let totalScore=0;              
let needParry=5;               

let comboCount = 0, comboTimer = 0;            
let kParrySkillTimer = 0, lParrySkillTimer = 0, jParrySkillTimer = 0;
let lastDashDir = { x: 1, y: 0 };
let firstDashDir = null;
let ultimateFlash = 0;         

let camX=0, camY=0, isCamInitialized=false;    
const PARRY_RANGE = 75;
const ENEMY_R = 21;
const BOSS_R = ENEMY_R * 3;
const J_ENEMY_SPEED = 200 * 1.5 * 1.8;
const BOSS_SPEED = J_ENEMY_SPEED * 0.5 * 0.7;
const BOSS_ACTIVATE_KILLS = 5;
const BOSS_ACTIVE_SPAWN_RATE = 0.4;
const BOSS_HP = 8;
const BOSS_ATTACK_RANGE = PARRY_RANGE * 6;
const BOSS_ATTACK_FREQ_MULT = 1.2;
const BOSS_WINDUP_TIME = 0.3 / BOSS_ATTACK_FREQ_MULT;
const BOSS_RECOVERY_TIME = 0.2 / BOSS_ATTACK_FREQ_MULT;
const BOSS_BULLET_SPEED = 1400 * 0.5;
const BOSS_RED_ATTACK_CHANCE = 0.3;
const BOSS_DEATH_DURATION = 1.6;

let miniBoss = null;
let enemyKillCount = 0;
let bossBullets = [];
let homingMissiles = [];        

// 🌟 HUD 표시/숨김 제어 함수 (CSS와 충돌 없이 깔끔하게 제어)
function setHudVisibility(visible) {
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = visible ? 'block' : 'none';
    if (comboHtmlBox) comboHtmlBox.style.display = visible ? 'block' : 'none';
}

// ==========================================
// [2] 🌟 CSS 충돌 방지 클린 풀스크린 함수
// ==========================================
function initCanvas(){
    W = window.innerWidth; 
    H = window.innerHeight; 
    
    canvas.width = W;
    canvas.height = H;
    
    // 형의 DOM 구조를 뜯어고치지 않고, 캔버스만 브라우저 배경에 꽉 차게 고정!
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '0'; // 메뉴와 UI보다 항상 뒤에 깔리도록 설정
    
    worldW = 2400; 
    worldH = 2400;
}
// 창 크기가 바뀔 때 도화지 크기만 리사이즈함 (UI 건드리지 않음)
window.addEventListener('resize', initCanvas);
initCanvas(); 
setHudVisibility(false); // 처음 접속 시 게임 화면이 아니므로 HUD 숨김

function screens(){return [...document.querySelectorAll('.screen')]}
function hideScreens(){screens().forEach(s=>s.classList.remove('active'))}
function openScreen(id){
    hideScreens();
    const targetScreen = document.getElementById(id);
    if(targetScreen) {
        targetScreen.classList.add('active');
    } else {
        const fallbackScreen = document.getElementById('gameOver');
        if(fallbackScreen) fallbackScreen.classList.add('active');
    }
}

function bind(id,fn){const el=document.getElementById(id);if(el)el.addEventListener('click',fn)}
bind('startBtn',startGame);
bind('retryBtn',startGame);
bind('guideBtn',()=>openScreen('guide'));
bind('creatorsBtn',()=>openScreen('creators')); 
bind('rankBtn',showRank);
bind('rankBtn2',showRank);

document.querySelectorAll('.menuBtn').forEach(btn=>btn.addEventListener('click',()=>{
    mode='menu';
    setHudVisibility(false); // 메뉴로 돌아가면 체력/점수창 끄기
    openScreen('menu');
}));

// ==========================================
// [3] 키보드 입력 핸들러 (패링 및 특수 스킬 제어)
// ==========================================
addEventListener('keydown',e=>{
    if(e.repeat) return; 
    
    const k=e.key.toLowerCase();
    keys[k]=true;
    if(mode!=='play'||!player) return;
    
    if(k==='shift'){
        if (kParrySkillTimer > 0) {
            let closestEnemy = null;
            let minDist = Infinity;
            
            enemies.forEach(enemy => {
                if (!enemy.dead) {
                    const d = distance(player, enemy);
                    if (d < minDist) { minDist = d; closestEnemy = enemy; }
                }
            });

            if (closestEnemy) {
                effects.push({x: player.x, y: player.y, r: 50, t: 0.2, color: '#ff3838'}); 
                
                player.x = closestEnemy.x; 
                player.y = closestEnemy.y;
                
                const skillRange = 300; 
                enemies.forEach(enemy => {
                    if (!enemy.dead) {
                        const d = distance(player, enemy);
                        if (d < skillRange) {
                            enemy.dead = true; parryCount++; comboCount++; 
                            effects.push({x: enemy.x, y: enemy.y, r: 60, t: 0.2, color: '#ffcd03'}); 
                        }
                    }
                });

                effects.push({x: player.x, y: player.y, r: skillRange, t: 0.3, color: '#ff3838'}); 
                
                player.invincible = stage === 1 ? 0.5 : 0.3;
                comboTimer = 3;

                advanceStageFromParries();
                kParrySkillTimer = 0; updateHud();
                return; 
            }
        }
        else if (lParrySkillTimer > 0) {
            let mx = 0, my = 0;
            if (keys.a || keys.arrowleft) mx--;
            if (keys.d || keys.arrowright) mx++;
            if (keys.w || keys.arrowup) my--;
            if (keys.s || keys.arrowdown) my++;
            if (mx === 0 && my === 0) mx = 1; 
            
            const v = unit(mx, my); 

            player.dashTime = .168; 
            player.dashCooldown = .7;
            effects.push({x: player.x, y: player.y, r: 20, t: .22, color: '#4aa3ff'});

            effects.push({
                type: 'moving_wave',
                startX: player.x,
                startY: player.y,
                v: v,
                frontDist: 0,       
                speed: 1800,        
                thickness: 150,     
                maxDist: 1500,      
                t: 1.0,             
                color: 'rgba(74, 163, 255, 0.4)'
            });

            player.invincible = 0.3; 
            comboTimer = 3; 

            lParrySkillTimer = 0; updateHud();
            return; 
        }
        else if (jParrySkillTimer > 0) {
            const v = getInputDir();

            player.dashTime = .168;
            player.dashCooldown = .7;
            effects.push({ x: player.x, y: player.y, r: 20, t: .22, color: '#4aa3ff' });

            effects.push({
                type: 'missile',
                x: player.x,
                y: player.y,
                v: { x: v.x, y: v.y },
                speed: 1400,
                r: 14,
                travel: 0,
                maxDist: 1500,
                t: 1.0
            });
            effects.push({ x: player.x, y: player.y, r: 40, t: 0.25, color: '#dfe6e9' });

            player.invincible = 0.3;
            comboTimer = 3;
            jParrySkillTimer = 0;
            updateHud();
            return;
        }
        
        if (player.dashCooldown <= 0) {
            recordDashDir();
            player.dashTime=.168; player.dashCooldown=.7;
            effects.push({x:player.x,y:player.y,r:20,t:.22,color:'#4aa3ff'});
        }
    }
    
    if (k === ' ' || e.code === 'Space') {
        if (comboCount >= 20) {
            comboCount -= 20; 
            comboTimer = 3;

            ultimateFlash = 1.0; 

            enemies.forEach(enemy => {
                if (!enemy.dead) {
                    enemy.dead = true;
                    parryCount++;
                    effects.push({x: enemy.x, y: enemy.y, r: 70, t: 0.2, color: '#ffcd03'});
                }
            });
            if (miniBoss && miniBoss.state === 'active') damageMiniBoss();

            advanceStageFromParries();
            updateHud();
        }
    }
    
    if((k==='j'||k==='k'||k==='l') && player.parryCooldown <= 0 && player.parryTime <= 0){
        player.parryType = k === 'j' ? 'typeJ' : (k === 'k' ? 'typeK' : 'typeL');
        player.parryTime = .25; 
        
        let color = k==='j'?'#dfe6e9':(k==='k'?'#ff9f43':'#4aa3ff');
        effects.push({x:player.x,y:player.y,r:55,t:.25,color:color}); 
        player.hasParriedAny = false; 
    }
});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);

// ==========================================
// [4] 게임 시작 및 초기화 데이터 생성 함수
// ==========================================
function startGame(){
    hideScreens(); mode='play'; stage=1; parryCount=0; totalScore=0; needParry=5; spawnTimer=.25;
    enemies=[]; effects=[]; isCamInitialized=false;
    
    comboCount = 0; comboTimer = 0;
    kParrySkillTimer = 0; lParrySkillTimer = 0; jParrySkillTimer = 0;
    lastDashDir = { x: 1, y: 0 };
    firstDashDir = null;
    ultimateFlash = 0;
    miniBoss = createMiniBoss();
    enemyKillCount = 0;
    bossBullets = [];
    homingMissiles = [];

    player={
        x:worldW/2, y:worldH/2, r:18, hp:3, 
        speed: 260 * 1.5 * 0.7, 
        dashTime:0, dashCooldown:0, 
        parryType:null, parryTime:0, parryCooldown:0, 
        hasParriedAny: false, invincible:0
    };
    
    setHudVisibility(true); // 🌟 인게임 시작 시 HUD 켜기
    updateHud();
}

function unit(dx,dy){const d=Math.hypot(dx,dy)||1;return{x:dx/d,y:dy/d}}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}

function getInputDir(){
    let mx = 0, my = 0;
    if (keys.a || keys.arrowleft) mx--;
    if (keys.d || keys.arrowright) mx++;
    if (keys.w || keys.arrowup) my--;
    if (keys.s || keys.arrowdown) my++;
    if (mx !== 0 || my !== 0) return unit(mx, my);
    if (firstDashDir) return { ...firstDashDir };
    return { ...lastDashDir };
}

function recordDashDir(){
    let mx = 0, my = 0;
    if (keys.a || keys.arrowleft) mx--;
    if (keys.d || keys.arrowright) mx++;
    if (keys.w || keys.arrowup) my--;
    if (keys.s || keys.arrowdown) my++;
    if (mx === 0 && my === 0) mx = 1;
    lastDashDir = unit(mx, my);
    if (!firstDashDir) firstDashDir = { ...lastDashDir };
}

function createMiniBoss(){
    return {
        x: BOSS_R + 80,
        y: BOSS_R + 80,
        r: BOSS_R,
        hp: BOSS_HP,
        maxHp: BOSS_HP,
        state: 'dormant',
        attackState: 'idle',
        attackTimer: 0,
        parryHit: false,
        nextShotRed: false
    };
}

function activateMiniBoss(){
    if (!miniBoss || miniBoss.state !== 'dormant') return;
    miniBoss.state = 'active';
    effects.push({ x: miniBoss.x, y: miniBoss.y, r: BOSS_R * 1.5, t: 0.6, color: '#ffffff' });
    updateHud();
}

function registerEnemyKill(){
    if (stage !== 1 || !miniBoss || miniBoss.state !== 'dormant') return;
    enemyKillCount++;
    if (enemyKillCount >= BOSS_ACTIVATE_KILLS) activateMiniBoss();
    updateHud();
}

function advanceStageFromParries(){
    if (stage === 1) return;
    if (parryCount < needParry) return;
    totalScore += parryCount;
    parryCount = 0;
    stage++;
    needParry += 3;
    if (stage > 3) gameClear();
    updateHud();
}

function damageMiniBoss(){
    if (!miniBoss || miniBoss.state !== 'active') return;
    miniBoss.hp--;
    effects.push({ x: miniBoss.x, y: miniBoss.y, r: BOSS_R + 20, t: 0.3, color: '#2ecc71' });
    updateHud();
    if (miniBoss.hp <= 0) startBossDefeat();
}

function startBossDefeat(){
    if (!miniBoss || miniBoss.state === 'dying' || miniBoss.state === 'defeated') return;
    miniBoss.state = 'dying';
    miniBoss.hp = 0;
    miniBoss.deathTimer = BOSS_DEATH_DURATION;
    miniBoss.deathScale = 1;
    miniBoss.deathAlpha = 1;
    miniBoss.deathYOffset = 0;
    miniBoss.particleTimer = 0;
    miniBoss.attackState = 'idle';
    bossBullets = [];
    homingMissiles = [];
    effects.push({ x: miniBoss.x, y: miniBoss.y, r: BOSS_R * 2.2, t: 0.5, color: '#ffffff' });
    effects.push({ x: miniBoss.x, y: miniBoss.y, r: BOSS_R * 1.6, t: 0.7, color: '#eccc68' });
    updateHud();
}

function updateBossDefeat(dt){
    if (!miniBoss || miniBoss.state !== 'dying') return;

    miniBoss.deathTimer -= dt;
    const progress = 1 - Math.max(0, miniBoss.deathTimer / BOSS_DEATH_DURATION);
    miniBoss.deathScale = 1 - progress * 0.75;
    miniBoss.deathAlpha = 1 - progress * 0.9;
    miniBoss.deathYOffset = progress * 50;

    miniBoss.particleTimer = (miniBoss.particleTimer ?? 0) - dt;
    if (miniBoss.particleTimer <= 0) {
        miniBoss.particleTimer = 0.12;
        effects.push({
            x: miniBoss.x + (Math.random() - 0.5) * miniBoss.r,
            y: miniBoss.y + miniBoss.deathYOffset + (Math.random() - 0.5) * miniBoss.r,
            r: 25 + Math.random() * 35,
            t: 0.35,
            color: progress > 0.5 ? '#dfe6e9' : '#ffffff'
        });
    }

    if (miniBoss.deathTimer <= 0) completeBossDefeat();
}

function completeBossDefeat(){
    if (!miniBoss) return;
    miniBoss = null;
    stage = 2;
    totalScore += parryCount;
    parryCount = 0;
    needParry = 8;
    ultimateFlash = 0.6;
    effects.push({ x: player.x, y: player.y, r: 120, t: 0.4, color: '#4aa3ff' });
    updateHud();
}

function fireBossBullet(){
    if (!miniBoss || miniBoss.state !== 'active') return;
    const v = unit(player.x - miniBoss.x, player.y - miniBoss.y);
    const isRed = miniBoss.nextShotRed;
    bossBullets.push({
        x: miniBoss.x,
        y: miniBoss.y,
        v: { x: v.x, y: v.y },
        speed: BOSS_BULLET_SPEED,
        r: 14,
        travel: 0,
        maxDist: 2000,
        t: 1,
        isRed
    });
    effects.push({
        x: miniBoss.x, y: miniBoss.y, r: 50, t: 0.2,
        color: isRed ? '#ff3838' : '#dfe6e9'
    });
    miniBoss.nextShotRed = false;
}

function spawnBossHomingMissile(){
    if (!miniBoss || miniBoss.state !== 'active') return;
    homingMissiles.push({
        x: player.x,
        y: player.y,
        speed: 1100,
        r: 12,
        t: 1
    });
    effects.push({ x: player.x, y: player.y, r: 45, t: 0.25, color: '#ff9f43' });
}

function updateMiniBoss(dt){
    if (!miniBoss || miniBoss.state !== 'active') return;

    const dist = distance(miniBoss, player);

    if (miniBoss.attackState === 'idle') {
        const v = unit(player.x - miniBoss.x, player.y - miniBoss.y);
        miniBoss.x += v.x * BOSS_SPEED * dt;
        miniBoss.y += v.y * BOSS_SPEED * dt;
        miniBoss.x = Math.max(miniBoss.r, Math.min(worldW - miniBoss.r, miniBoss.x));
        miniBoss.y = Math.max(miniBoss.r, Math.min(worldH - miniBoss.r, miniBoss.y));

        if (dist <= BOSS_ATTACK_RANGE) {
            miniBoss.attackState = 'windup';
            miniBoss.attackTimer = BOSS_WINDUP_TIME;
            miniBoss.nextShotRed = Math.random() < BOSS_RED_ATTACK_CHANCE;
        }
    } else if (miniBoss.attackState === 'windup') {
        miniBoss.attackTimer -= dt;
        if (miniBoss.attackTimer <= 0) {
            fireBossBullet();
            miniBoss.attackState = 'recovery';
            miniBoss.attackTimer = BOSS_RECOVERY_TIME;
        }
    } else if (miniBoss.attackState === 'recovery') {
        miniBoss.attackTimer -= dt;
        if (miniBoss.attackTimer <= 0) miniBoss.attackState = 'idle';
    }

    if (player.parryTime <= 0) miniBoss.parryHit = false;
    else if (!miniBoss.parryHit && player.parryTime > 0 &&
        (player.parryType === 'typeJ' || player.parryType === 'typeK' || player.parryType === 'typeL') &&
        dist < PARRY_RANGE + miniBoss.r) {
        miniBoss.parryHit = true;
        player.hasParriedAny = true;
        damageMiniBoss();
        if (player.parryType === 'typeK' && stage !== 1) kParrySkillTimer = 1;
        else if (player.parryType === 'typeL') lParrySkillTimer = 1;
        else if (player.parryType === 'typeJ') jParrySkillTimer = 1;
        if (comboTimer > 0) comboCount++;
        else comboCount = 1;
        comboTimer = 3;
        updateHud();
    }

    if (dist < miniBoss.r + player.r && player.invincible <= 0) {
        player.hp -= 2;
        player.invincible = 0.9;
        effects.push({ x: player.x, y: player.y, r: 75, t: 0.25, color: '#e74c3c' });
        comboCount = 0;
        comboTimer = 0;
        kParrySkillTimer = 0;
        lParrySkillTimer = 0;
        jParrySkillTimer = 0;
        updateHud();
        if (player.hp <= 0) gameOver();
    }
}

function updateBossBullets(dt){
    bossBullets.forEach(b => {
        b.x += b.v.x * b.speed * dt;
        b.y += b.v.y * b.speed * dt;
        b.travel += b.speed * dt;
        if (b.travel >= b.maxDist) { b.t = 0; return; }

        if (b.isRed && player.parryTime > 0 && player.parryType === 'typeJ' &&
            distance(b, player) < PARRY_RANGE + b.r) {
            b.t = 0;
            player.hasParriedAny = true;
            spawnBossHomingMissile();
            effects.push({ x: b.x, y: b.y, r: 55, t: 0.25, color: '#ff3838' });
            return;
        }

        if (player.invincible <= 0 && distance(b, player) < b.r + player.r) {
            player.hp -= 1;
            player.invincible = 0.9;
            effects.push({ x: player.x, y: player.y, r: 60, t: 0.2, color: '#e74c3c' });
            b.t = 0;
            comboCount = 0;
            comboTimer = 0;
            kParrySkillTimer = 0;
            lParrySkillTimer = 0;
            jParrySkillTimer = 0;
            updateHud();
            if (player.hp <= 0) gameOver();
        }
    });
    bossBullets = bossBullets.filter(b => b.t > 0 && b.travel < b.maxDist);
}

function updateHomingMissiles(dt){
    if (!miniBoss || miniBoss.state !== 'active') {
        homingMissiles = [];
        return;
    }
    homingMissiles.forEach(m => {
        const v = unit(miniBoss.x - m.x, miniBoss.y - m.y);
        m.x += v.x * m.speed * dt;
        m.y += v.y * m.speed * dt;
        if (distance(m, miniBoss) < m.r + miniBoss.r) {
            m.t = 0;
            damageMiniBoss();
            effects.push({ x: miniBoss.x, y: miniBoss.y, r: 70, t: 0.25, color: '#ff9f43' });
        }
    });
    homingMissiles = homingMissiles.filter(m => m.t > 0);
}

function hitBossWithWave(ef){
    if (ef.bossHit || !miniBoss || miniBoss.state !== 'active') return;
    const dx = miniBoss.x - ef.startX;
    const dy = miniBoss.y - ef.startY;
    const proj = dx * ef.v.x + dy * ef.v.y;
    const backDist = Math.max(0, ef.frontDist - ef.thickness);
    const frontDist = ef.frontDist;
    if (proj >= backDist && proj <= frontDist) {
        const perpDist = Math.abs(dx * (-ef.v.y) + dy * ef.v.x);
        if (perpDist <= miniBoss.r + 40) {
            ef.bossHit = true;
            damageMiniBoss();
        }
    }
}

function removeDeadEnemies(){
    const dead = enemies.filter(e => e.dead);
    dead.forEach(() => registerEnemyKill());
    enemies = enemies.filter(e => !e.dead);
}

// ==========================================
// [5] 적 유닛 스폰(생성) 함수
// ==========================================
function spawnEnemy(){
    const side=Math.floor(Math.random()*4); 
    let x,y;
    if(side===0){x=Math.random()*worldW;y=20}
    else if(side===1){x=worldW-20;y=Math.random()*worldH}
    else if(side===2){x=Math.random()*worldW;y=worldH-20}
    else{x=20;y=Math.random()*worldH}
    
    const types = ['typeJ', 'typeK', 'typeL'];
    const type = types[Math.floor(Math.random()*3)]; 
    
    enemies.push({
        x, y, r:21, type, dead:false,
        state: 'normal', stateTimer: 0, 
        vx: 0, vy: 0, targetX: 0, targetY: 0
    });
}

// ==========================================
// [6] 게임 상태 실시간 물리 루프 처리 함수
// ==========================================
function update(dt){
    if(mode!=='play'||!player)return;

    player.dashTime=Math.max(0,player.dashTime-dt);
    player.dashCooldown=Math.max(0,player.dashCooldown-dt);
    player.invincible=Math.max(0,player.invincible-dt);
    
    if(player.parryTime > 0){
        player.parryTime -= dt;
        if(player.parryTime <= 0){
            if(!player.hasParriedAny){ player.parryCooldown = 0.8; } 
            player.parryType = null;
        }
    }
    player.parryCooldown = Math.max(0, player.parryCooldown - dt);

    if (kParrySkillTimer > 0) { kParrySkillTimer -= dt; if (kParrySkillTimer <= 0) updateHud(); }
    if (lParrySkillTimer > 0) { lParrySkillTimer -= dt; if (lParrySkillTimer <= 0) updateHud(); }
    if (jParrySkillTimer > 0) { jParrySkillTimer -= dt; if (jParrySkillTimer <= 0) updateHud(); }

    if (ultimateFlash > 0) {
        ultimateFlash = Math.max(0, ultimateFlash - dt * 1.25); 
    }

    if (comboTimer > 0) {
        comboTimer -= dt;
        if (comboTimer <= 0) { comboCount = 0; updateHud(); }
    }

    let mx=0,my=0;
    if(keys.a||keys.arrowleft)mx--; if(keys.d||keys.arrowright)mx++;
    if(keys.w||keys.arrowup)my--; if(keys.s||keys.arrowdown)my++;
    if(mx||my){
        const v=unit(mx,my), speed=player.speed*(player.dashTime>0?3.2:1);
        player.x+=v.x*speed*dt; player.y+=v.y*speed*dt;
    }
    player.x=Math.max(player.r,Math.min(worldW-player.r,player.x));
    player.y=Math.max(player.r,Math.min(worldH-player.r,player.y));

    spawnTimer-=dt;
    if(spawnTimer<=0){
        spawnEnemy();
        let interval = Math.max(.45, 1.2 - stage * .08);
        if (stage === 1 && miniBoss && miniBoss.state === 'active') {
            interval /= BOSS_ACTIVE_SPAWN_RATE;
        } else if (stage === 1 && miniBoss && miniBoss.state === 'dying') {
            interval *= 2.5;
        }
        spawnTimer = interval;
    }

    updateBossDefeat(dt);
    if (miniBoss && miniBoss.state === 'active') {
        updateMiniBoss(dt);
        updateBossBullets(dt);
        updateHomingMissiles(dt);
    }

    enemies.forEach(e=>{
        if (e.dead) return; 

        const dist = distance(e, player);
        const baseSpeed =
            e.type === 'typeJ' ? 200 * 1.5 * 1.8 :
            e.type === 'typeK' ? 240 * 1.5 * 1.5 :
            220 * 1.5 * 2; 

        if(e.type === 'typeJ'){
            const v = unit(player.x - e.x, player.y - e.y);
            e.x += v.x * baseSpeed * dt; e.y += v.y * baseSpeed * dt;
        } 
        else if(e.type === 'typeK'){
            if(e.state === 'normal'){
                if(dist < PARRY_RANGE * 4){
                    e.state = 'backstep';
                    const v = unit(e.x - player.x, e.y - player.y);
                    e.targetX = e.x + v.x * PARRY_RANGE; e.targetY = e.y + v.y * PARRY_RANGE;
                } else {
                    const v = unit(player.x - e.x, player.y - e.y);
                    e.x += v.x * baseSpeed * dt; e.y += v.y * baseSpeed * dt;
                }
            } else if(e.state === 'backstep'){
                const v = unit(e.targetX - e.x, e.targetY - e.y);
                e.x += v.x * baseSpeed * 2 * dt; e.y += v.y * baseSpeed * 2 * dt;
                if(Math.hypot(e.targetX-e.x, e.targetY-e.y) < 5){
                    e.state = 'wait'; e.stateTimer = 0.5; 
                    effects.push({x: e.x, y: e.y, r: 65, t: 0.5, color: '#ffffff'}); 
                    const vToPlayer = unit(player.x - e.x, player.y - e.y);
                    e.vx = vToPlayer.x * baseSpeed * 3; e.vy = vToPlayer.y * baseSpeed * 3;
                }
            } else if(e.state === 'wait'){
                e.stateTimer -= dt;
                if(e.stateTimer <= 0) { e.state = 'charge'; e.stateTimer = 1.5; }
            } else if(e.state === 'charge'){
                e.x += e.vx * dt; e.y += e.vy * dt; e.stateTimer -= dt;
                let hitWall = false;
                if(e.x <= e.r) { e.x = e.r; hitWall = true; }
                else if(e.x >= worldW - e.r) { e.x = worldW - e.r; hitWall = true; }
                if(e.y <= e.r) { e.y = e.r; hitWall = true; }
                else if(e.y >= worldH - e.r) { e.y = worldH - e.r; hitWall = true; }

                if(e.stateTimer <= 0 || hitWall) { e.state = 'cooldown'; e.stateTimer = 1.0; }
            } else if(e.state === 'cooldown') {
                e.stateTimer -= dt; if(e.stateTimer <= 0) e.state = 'normal';
            }
        } 
        else if(e.type === 'typeL'){
            e.stateTimer -= dt;
            if(e.state === 'normal'){
                if(e.stateTimer <= 0){
                    e.state = 'dash'; e.stateTimer = 0.7;    
                    const v = unit(player.x - e.x, player.y - e.y); 
                    e.vx = v.x; e.vy = v.y;
                }
            } else if(e.state === 'dash'){
                const t = e.stateTimer;
                const speed = baseSpeed * 4 * (t * t); 
                e.x += e.vx * speed * dt; e.y += e.vy * speed * dt;
                if(e.stateTimer <= 0){ e.state = 'normal'; e.stateTimer = 1.0; }
            }
            if(e.x <= e.r) { e.x = e.r; e.vx *= -1; }
            else if(e.x >= worldW - e.r) { e.x = worldW - e.r; e.vx *= -1; }
            if(e.y <= e.r) { e.y = e.r; e.vy *= -1; }
            else if(e.y >= worldH - e.r) { e.y = worldH - e.r; e.vy *= -1; }
        }

        effects.forEach(ef => {
            if (ef.type === 'moving_wave' && !e.dead) {
                const dx = e.x - ef.startX;
                const dy = e.y - ef.startY;
                const proj = dx * ef.v.x + dy * ef.v.y; 
                
                const backDist = Math.max(0, ef.frontDist - ef.thickness);
                const frontDist = ef.frontDist;

                if (proj >= backDist && proj <= frontDist) {
                    const perpDist = Math.abs(dx * (-ef.v.y) + dy * ef.v.x); 
                    if (perpDist <= 100) { 
                        e.dead = true; parryCount++; comboCount++; comboTimer = 3;
                        effects.push({x: e.x, y: e.y, r: 60, t: 0.2, color: '#ffcd03'});
                        
                        advanceStageFromParries();
                        updateHud(); 
                    }
                }
            }
        });

        if(player.parryTime > 0 && player.parryType === e.type && dist < 75 + e.r){
            e.dead = true; parryCount++; player.hasParriedAny = true;

            if (e.type === 'typeK') { kParrySkillTimer = 1; }
            else if (e.type === 'typeL') { lParrySkillTimer = 1; }
            else if (e.type === 'typeJ') { jParrySkillTimer = 1; }

            if (comboTimer > 0) { comboCount++; } else { comboCount = 1; }
            comboTimer = 3; 

            effects.push({x:player.x,y:player.y,r:70,t:.25,color:'#2ecc71'}); 
            advanceStageFromParries();
            updateHud();
        } 
        else if(dist < e.r + player.r && player.invincible <= 0){
            player.hp -= 1; 
            player.invincible = 0.9; e.dead = true;
            effects.push({x:player.x,y:player.y,r:75,t:.25,color:'#e74c3c'}); 
            
            comboCount = 0; comboTimer = 0;
            kParrySkillTimer = 0; lParrySkillTimer = 0;
            jParrySkillTimer = 0;

            updateHud();
            if(player.hp <= 0) gameOver();
        }
    });

    effects.forEach(ef => {
        if (ef.type === 'moving_wave') hitBossWithWave(ef);
    });
    removeDeadEnemies();

    effects.forEach(ef => {
        if (ef.type !== 'missile') return;
        ef.x += ef.v.x * ef.speed * dt;
        ef.y += ef.v.y * ef.speed * dt;
        ef.travel += ef.speed * dt;
        if (ef.travel >= ef.maxDist) { ef.t = 0; return; }

        enemies.forEach(enemy => {
            if (enemy.dead || ef.t <= 0) return;
            if (distance(ef, enemy) < ef.r + enemy.r) {
                enemy.dead = true;
                parryCount++;
                if (comboTimer > 0) comboCount++;
                else comboCount = 1;
                comboTimer = 3;
                effects.push({ x: enemy.x, y: enemy.y, r: 60, t: 0.2, color: '#ffcd03' });
                ef.t = 0;
                advanceStageFromParries();
                updateHud();
            }
        });
        if (ef.t > 0 && miniBoss && miniBoss.state === 'active' &&
            distance(ef, miniBoss) < ef.r + miniBoss.r) {
            damageMiniBoss();
            ef.t = 0;
        }
    });
    removeDeadEnemies();
    
    effects.forEach(e => {
        if (e.type === 'moving_wave') {
            e.frontDist += e.speed * dt; 
            if (e.frontDist >= e.maxDist + e.thickness) { e.t = 0; } 
            else { e.t = 1.0; } 
        } else if (e.type !== 'missile') {
            e.t -= dt; 
        }
    });
    effects = effects.filter(e => {
        if (e.type === 'missile') return e.t > 0 && e.travel < e.maxDist;
        return e.t > 0;
    });
}

function gameOver(){
    mode='over'; 
    setHudVisibility(false); 
    const score = totalScore + parryCount;
    const ranks=JSON.parse(localStorage.getItem('parryRanks')||'[]');
    ranks.push(score); ranks.sort((a,b)=>b-a);
    localStorage.setItem('parryRanks',JSON.stringify(ranks.slice(0,10)));
    
    if(finalScore) finalScore.textContent=`최종 점수: ${score}`;
    openScreen('gameOver');
}

function gameClear(){
    mode='ending'; 
    setHudVisibility(false); 
    const score = totalScore + parryCount;
    const ranks=JSON.parse(localStorage.getItem('parryRanks')||'[]');
    ranks.push(score); ranks.sort((a,b)=>b-a);
    localStorage.setItem('parryRanks',JSON.stringify(ranks.slice(0,10)));
    openScreen('endingCredit');
}

function updateHud(){
    if(!player)return;
    const hp = Math.max(0, player.hp);
    hpBox.textContent='체력: '+'❤'.repeat(hp)+'♡'.repeat(Math.max(0, 3-hp));
    stageBox.textContent=`Stage ${stage}`;
    if (stage === 1 && miniBoss) {
        if (miniBoss.state === 'dormant') {
            scoreBox.textContent = `적 처치 ${enemyKillCount}/${BOSS_ACTIVATE_KILLS} | 보스 대기`;
        } else if (miniBoss.state === 'dying') {
            scoreBox.textContent = '보스 격파! Stage 2 이동 중...';
        } else {
            scoreBox.textContent = `보스 HP ${miniBoss.hp}/${miniBoss.maxHp} | Parry ${parryCount}/${needParry}`;
        }
    } else {
        scoreBox.textContent = stage===1?`Parry ${parryCount} / ${needParry}`:`Score ${totalScore+parryCount} | Parry ${parryCount} / ${needParry}`;
    }
    
    if (kParrySkillTimer > 0) {
        comboHtmlBox.textContent = `🔥 ${comboCount} COMBO!  [ ⚡ TELEPORT BURST! ]`;
        comboHtmlBox.style.color = '#ff3838'; 
    } else if (jParrySkillTimer > 0) {
        comboHtmlBox.textContent = `🔥 ${comboCount} COMBO!  [ 🚀 DASH MISSILE! ]`;
        comboHtmlBox.style.color = '#dfe6e9';
    } else if (lParrySkillTimer > 0) {
        comboHtmlBox.textContent = `🔥 ${comboCount} COMBO!  [ 🌊 BLUE WAVE SHIFT! ]`;
        comboHtmlBox.style.color = '#4aa3ff'; 
    } else if (comboCount >= 20) {
        comboHtmlBox.textContent = `🔥 ${comboCount} COMBO!  [ ⭐ READY SPACE ULTIMATE! ]`;
        comboHtmlBox.style.color = '#a29bfe'; 
    } else {
        comboHtmlBox.textContent = `🔥 ${comboCount} COMBO!`;
        comboHtmlBox.style.color = '#ff9f43'; 
    }
}

function showRank(){mode='rank';const ranks=JSON.parse(localStorage.getItem('parryRanks')||'[]');if(rankList)rankList.innerHTML=ranks.length?ranks.map(s=>`<li>${s}점</li>`).join(''):'<li>기록 없음</li>';openScreen('rank')}

function drawGrid(camX,camY){
    ctx.fillStyle='#202a38'; ctx.fillRect(0,0,W,H);
    ctx.save(); ctx.translate(-camX,-camY);
    ctx.strokeStyle='#344255'; ctx.lineWidth=1;
    for(let x=0;x<=worldW;x+=100){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,worldH);ctx.stroke()}
    for(let y=0;y<=worldH;y+=100){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(worldW,y);ctx.stroke()}
    ctx.strokeStyle='#fff'; ctx.lineWidth=5; ctx.strokeRect(0,0,worldW,worldH); 
    ctx.restore();
}

function drawMiniBoss(){
    if (!miniBoss) return;

    const drawR = miniBoss.r * (miniBoss.deathScale ?? 1);
    const drawY = miniBoss.y + (miniBoss.deathYOffset ?? 0);
    const alpha = miniBoss.state === 'dormant' ? 0.35 : (miniBoss.deathAlpha ?? 1);

    ctx.save();
    ctx.globalAlpha = alpha;

    if (miniBoss.state === 'dormant') {
        ctx.fillStyle = '#888';
    } else if (miniBoss.state === 'dying') {
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = `rgba(236, 204, 104, ${0.4 + (1 - miniBoss.deathAlpha) * 0.6})`;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(miniBoss.x, drawY, drawR + 18, 0, Math.PI * 2);
        ctx.stroke();
    } else {
        ctx.fillStyle = '#fff';
        if (miniBoss.attackState === 'windup') {
            ctx.strokeStyle = miniBoss.nextShotRed ? '#ff3838' : '#ff7675';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(miniBoss.x, drawY, drawR + 12, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    ctx.beginPath();
    ctx.arc(miniBoss.x, drawY, drawR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (miniBoss.state === 'active') {
        const barW = miniBoss.r * 2;
        const barH = 10;
        const bx = miniBoss.x - barW / 2;
        const by = miniBoss.y - miniBoss.r - 22;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(bx, by, barW, barH);
        ctx.fillStyle = '#ff7675';
        ctx.fillRect(bx, by, barW * (miniBoss.hp / miniBoss.maxHp), barH);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, barW, barH);
    }
}

function drawBossBullet(b){
    const tailX = b.x - b.v.x * b.r * 2.2;
    const tailY = b.y - b.v.y * b.r * 2.2;
    ctx.fillStyle = b.isRed ? '#ff3838' : '#dfe6e9';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = b.isRed ? '#c0392b' : '#636e72';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
}

function drawHomingMissile(m){
    if (!miniBoss || miniBoss.state !== 'active') return;
    ctx.fillStyle = '#ff9f43';
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e17055';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(miniBoss.x, miniBoss.y);
    ctx.stroke();
}

function drawEnemy(e){
    if(e.type === 'typeK' && e.state === 'wait') {
        ctx.save();
        ctx.globalAlpha = Math.abs(Math.sin(Date.now() / 50)); 
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 8, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }
    ctx.fillStyle = e.type === 'typeJ' ? '#dfe6e9' : (e.type === 'typeK' ? '#ff9f43' : '#4aa3ff');
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(e.type.replace('type', ''), e.x, e.y);
}

function drawPlayer(){
    ctx.fillStyle=player.invincible>0?'#ff7070':'#a29bfe'; 
    ctx.beginPath();ctx.arc(player.x,player.y,player.r,0,Math.PI*2);ctx.fill();
    if(player.parryCooldown > 0){
        ctx.strokeStyle = 'red'; ctx.lineWidth = 3; ctx.beginPath();
        ctx.arc(player.x, player.y, player.r + 5, 0, (player.parryCooldown/0.8) * Math.PI*2); ctx.stroke(); 
    }
}

function draw(){
    const px=player?player.x:worldW/2, py=player?player.y:worldH/2;
    
    const targetCamX = Math.max(0, Math.min(worldW - W, px - W/2));
    const targetCamY = Math.max(0, Math.min(worldH - H, py - H/2));

    if(!isCamInitialized) {
        camX = targetCamX; camY = targetCamY; isCamInitialized = true;
    } else {
        camX += (targetCamX - camX) / 8; camY += (targetCamY - camY) / 8;
    }

    drawGrid(camX,camY);
    if(!player) return;
    ctx.save(); ctx.translate(-camX,-camY);
    
    drawMiniBoss();
    enemies.forEach(drawEnemy);
    bossBullets.forEach(drawBossBullet);
    homingMissiles.forEach(drawHomingMissile);
    
    effects.forEach(e=>{
        if (e.type === 'moving_wave') {
            ctx.save();
            ctx.fillStyle = 'rgba(74, 163, 255, 0.4)';      
            ctx.strokeStyle = 'rgba(100, 210, 255, 0.9)';   
            ctx.lineWidth = 4;
            
            ctx.translate(e.startX, e.startY);
            ctx.rotate(Math.atan2(e.v.y, e.v.x)); 
            
            const backDist = Math.max(0, e.frontDist - e.thickness);
            const wLen = e.frontDist - backDist; 
            
            ctx.fillRect(backDist, -100, wLen, 200); 
            ctx.strokeRect(backDist, -100, wLen, 200);
            ctx.restore();
        } else if (e.type === 'missile') {
            const tailX = e.x - e.v.x * e.r * 2.2;
            const tailY = e.y - e.v.y * e.r * 2.2;
            ctx.fillStyle = '#dfe6e9';
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#b2bec3';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(tailX, tailY);
            ctx.lineTo(e.x, e.y);
            ctx.stroke();
        } else {
            ctx.globalAlpha=Math.max(0,e.t*4); ctx.strokeStyle=e.color; ctx.lineWidth=5;
            ctx.beginPath(); ctx.arc(e.x,e.y,e.r*(1.2-e.t),0,Math.PI*2); ctx.stroke();
            ctx.globalAlpha=1;
        }
    });
    
    if(player.parryTime > 0){
        ctx.strokeStyle = player.parryType === 'typeJ' ? '#dfe6e9' : (player.parryType === 'typeK' ? '#ff9f43' : '#4aa3ff');
        ctx.lineWidth=5; ctx.beginPath(); ctx.arc(player.x,player.y,70,0,Math.PI*2); ctx.stroke();
    }
    drawPlayer(); 
    ctx.restore(); 

    if (ultimateFlash > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${ultimateFlash})`;
        ctx.fillRect(0, 0, W, H); 
        ctx.restore();
    }
}

function loop(t){const dt=Math.min(.033,(t-lastTime)/1000||0);lastTime=t;update(dt);draw();requestAnimationFrame(loop)}
requestAnimationFrame(loop);