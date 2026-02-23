(() => {
  // =========================
  // Helpers
  // =========================
  const el = (id)=>document.getElementById(id);
  const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
  const fmt1 = (n)=>Number(n).toFixed(1);
  const escapeHtml = (s)=>String(s)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/\"/g,"&quot;")
    .replace(/'/g,"&#039;");

  function isShown(m){ return !!(m && m.classList && m.classList.contains("show")); }
  function showModal(m){ m.classList.add("show"); m.setAttribute("aria-hidden","false"); syncPause(); }
  function hideModal(m){ m.classList.remove("show"); m.setAttribute("aria-hidden","true"); syncPause(); }

  function syncPause(){
    // Pause the game whenever a visible modal requests pausing.
    try{
      if(typeof state === "undefined" || !state || !state.running) return;
      const anyPausing = Array.from(document.querySelectorAll(".modalBack.show"))
        .some(n=>n && n.dataset && n.dataset.pauses==="true");
      state.paused = !!anyPausing;
    }catch(_e){}
  }


  // =========================
  // Config
  // =========================
  const CFG = {
    durationSec: 120,
    doomAtSec: 105,

    manaMax: 100,
    manaRegenPerSec: 10,

    fxChangeEverySec: 12,
    fxAnnounceSec: 3,

    vibrateLeadSec: 2,

    playerSpawnX: 140,
    enemySpawnX: 960,
    laneY: 335,

    baseP: { x: 80,  hp: 3000, maxHp: 3000, w: 90, h: 170 },
    baseE: { x: 1020, hp: 3000, maxHp: 3000, w: 90, h: 170 },

    enemySpawnEvery: 2.2,
  };

  const MAIN_STAGE_COUNT = 7;
  const SUB_STAGE_COUNT = 7;
  const MIDBOSS_SUB_INDEX = 4;

  // =========================
  // Grades
  // =========================
  const GRADE_META = {
    relic:   { label:"태초",     rank:7 },
    limited: { label:"리미티드", rank:6 },
    premium: { label:"프리미엄", rank:5 },
    myth:    { label:"신화",     rank:4 },
    unique:  { label:"유니크",   rank:3 },
    rare:    { label:"레어",     rank:2 },
    common:  { label:"커먼",     rank:1 },
  };

  function gradeLabel(key){ return (GRADE_META[key]||GRADE_META.common).label; }
  function gradeRank(key){ return (GRADE_META[key]||GRADE_META.common).rank; }
  function gradeCssClass(key){ return "g-" + (key || "common"); }

  // 장비/토템 각각의 뽑기 테이블(고정 보장 없음)
  const EQUIP_GACHA = [
    { key:"relic", w:2 },
    { key:"limited", w:4 },
    { key:"myth", w:10 },
    { key:"unique", w:16 },
    { key:"rare", w:24 },
    { key:"common", w:44 },
  ];

  const TOTEM_GACHA = [
    { key:"limited", w:1 },
    { key:"premium", w:3 },
    { key:"myth", w:10 },
    { key:"unique", w:16 },
    { key:"rare", w:24 },
    { key:"common", w:46 },
  ];

  function rollFromTable(tbl, r){
    const rr = (typeof r === "number") ? r : Math.random();
    const sum = tbl.reduce((a,b)=>a+(b.w||0),0) || 1;
    let roll = rr * sum;
    for(const t of tbl){
      roll -= (t.w||0);
      if(roll <= 0) return t.key;
    }
    return tbl[tbl.length-1].key;
  }

  // =========================
  // Totem icons (차트 패턴)
  // =========================
  const CHART_PATTERNS = [
    { id:"ASC_TRI",  name:"상승삼각형",    pts:[[4,22],[16,10],[16,22],[30,14],[30,22],[46,16],[46,22],[56,12]] },
    { id:"ASC_FLAG", name:"상승플래그",    pts:[[4,22],[14,10],[14,16],[28,14],[28,20],[46,12],[56,16]] },
    { id:"ASC_PEN",  name:"상승페넌트",    pts:[[4,22],[14,12],[24,18],[34,12],[44,16],[56,10]] },
    { id:"CUP",      name:"컵앤핸들",      pts:[[4,12],[14,18],[24,22],[34,18],[44,12],[50,14],[56,10]] },
    { id:"SYM_TRI",  name:"삼각수렴",      pts:[[4,18],[16,10],[26,18],[36,12],[48,18],[56,14]] },

    { id:"DBL_BOT",  name:"쌍바닥",        pts:[[4,10],[16,22],[28,10],[40,22],[52,10],[56,10]] },
    { id:"TRP_BOT",  name:"3중바닥",       pts:[[4,10],[14,22],[24,10],[34,22],[44,10],[54,22],[56,10]] },
    { id:"FALL_W",   name:"하락쐐기",      pts:[[4,10],[18,22],[30,14],[44,22],[56,16]] },
    { id:"INV_HS",   name:"역헤드앤숄더",  pts:[[4,16],[14,22],[24,14],[34,24],[44,14],[56,16]] },
    { id:"RND_BOT",  name:"라운드바텀",    pts:[[4,10],[14,18],[24,22],[34,22],[44,18],[54,10]] },

    { id:"DESC_TRI", name:"하락삼각형",    pts:[[4,10],[16,18],[16,10],[30,14],[30,10],[46,12],[46,10],[56,10]] },
    { id:"DESC_FLAG",name:"하락플래그",    pts:[[4,10],[14,22],[14,18],[28,20],[28,14],[46,22],[56,18]] },
    { id:"DESC_PEN", name:"하락페넌트",    pts:[[4,10],[14,20],[24,14],[34,20],[44,16],[56,22]] },
    { id:"RISE_W",   name:"상승쐐기",      pts:[[4,22],[18,10],[30,18],[44,10],[56,16]] },

    { id:"BROAD_TOP",name:"브로드닝탑",    pts:[[4,18],[14,10],[24,22],[34,8],[44,24],[56,12]] },
    { id:"DBL_TOP",  name:"더블탑",        pts:[[4,22],[16,10],[28,22],[40,10],[52,22],[56,22]] },
    { id:"TRP_TOP",  name:"트리플탑",      pts:[[4,22],[14,10],[24,22],[34,10],[44,22],[54,10],[56,22]] },
    { id:"HS",       name:"헤드앤숄더",    pts:[[4,22],[14,12],[24,18],[34,8],[44,18],[56,12]] },
    { id:"RND_TOP",  name:"라운드탑",      pts:[[4,22],[14,14],[24,10],[34,10],[44,14],[54,22]] },
    { id:"DIAMOND",  name:"다이아몬드탑",  pts:[[4,18],[18,10],[32,18],[46,10],[56,18]] },
  ];

  function svgForPattern(pid){
    const p = CHART_PATTERNS.find(x=>x.id===pid);
    if(!p) return "";
    const pts = p.pts.map(([x,y])=>x+","+y).join(" ");
    return '<svg class="miniSvg" viewBox="0 0 60 28" aria-label="'+escapeHtml(p.name)+'">'
      + '<polyline points="'+pts+'"></polyline>'
      + '</svg>';
  }

  // =========================
  // Equipment pools (태초/리미티드 이름은 유저 지정)
  // =========================
  const EQUIP_BY_GRADE = {
    relic: [
      { id:"E_NEWTON",  name:"뉴턴의 깨달음" },
      { id:"E_TURING",  name:"앨런 튜링의 알고리즘" },
      { id:"E_EINSTEIN",name:"아인슈타인의 실수" },
    ],
    limited: [
      { id:"E_BUFFETT", name:"워렌 버핏의 장부" },
      { id:"E_MUSK",    name:"일론 머스크의 상상" },
      { id:"E_JENSEN",  name:"젠슨 황의 가속기" },
      { id:"E_FED",     name:"연준의장의 원칙" },
    ],
    myth: [
      { id:"E_VOL_CORE", name:"변동성 흡수 코어" },
      { id:"E_MKT_CAP",  name:"시가총액 부스터" },
    ],
    unique: [
      { id:"E_LEV_GLOVE", name:"레버리지 글러브" },
      { id:"E_MARGIN",    name:"마진 방패" },
    ],
    rare: [
      { id:"E_STOP_RING", name:"손절의 반지" },
      { id:"E_TAKE_NECK", name:"익절의 목걸이" },
    ],
    common: [
      { id:"E_TAX_BADGE", name:"금리 차익 배지" },
      { id:"E_PROTECT",   name:"청산 방지 부적" },
      { id:"E_REBAL",     name:"리밸런스 키트" },
    ],
  };

  // =========================
  // Totem pools
  //   - 리미티드/프리미엄 토템도 sheet에 있는 "차트 패턴" 이름 사용
  // =========================
  const TOTEM_SPECIAL = {
    common: [
      { id:"T_LONG_BULL",     name:"장대양봉",    patternId:"ASC_TRI" },
      { id:"T_GOLDEN_CROSS",  name:"골든크로스",  patternId:"RND_BOT" },
      { id:"T_RSI_OVERSOLD",  name:"RSI 과매도",  patternId:"INV_HS" },
    ],
    premium: [
      { id:"T_DEADCAT", name:"데드캣 바운스", patternId:"DBL_BOT" },
      { id:"T_MACD",    name:"MACD",         patternId:"SYM_TRI" },
    ],
    limited: [
      { id:"T_BLACK_SWAN",  name:"블랙 스완",  patternId:"DIAMOND" },
      { id:"T_SANTA_RALLY", name:"산타 랠리",  patternId:"ASC_FLAG" },
    ],
  };

  function buildChartTotems(){
    // 남은 차트 패턴을 레어/유니크/신화에 분배
    // (중요) 등급이 뽑기 테이블에 존재하면, 해당 등급 풀은 "최소 1개"는 있어야 함.
    const all = CHART_PATTERNS.map(p => ({ id:"T_PAT_"+p.id, name:p.name, patternId:p.id }));

    // 특수 토템에서 사용한 patternId는 제거(중복 방지)
    const used = new Set([
      ...Object.values(TOTEM_SPECIAL).flat().map(x=>x.patternId)
    ]);

    const remain = all.filter(x => !used.has(x.patternId));

    // remain이 13개인 경우(현재 데이터) 기존 slice(13)로 myth가 0개가 되어 오류가 났었음.
    // → rare 6 / unique 6 / myth 나머지(최소 1) 로 강제.
    const rareCount = Math.min(6, remain.length);
    const uniqueCount = Math.min(6, Math.max(0, remain.length - rareCount));

    const rare = remain.slice(0, rareCount);
    const unique = remain.slice(rareCount, rareCount + uniqueCount);
    const myth = remain.slice(rareCount + uniqueCount);

    // 안전망: myth가 비면 unique/rare에서 1개 가져오기
    if(myth.length === 0){
      if(unique.length > 0) myth.push(unique.pop());
      else if(rare.length > 0) myth.push(rare.pop());
    }

    return { rare, unique, myth };
  }

  const CHART_TOTEMS = buildChartTotems();

  const TOTEM_BY_GRADE = {
    common: TOTEM_SPECIAL.common,
    rare: CHART_TOTEMS.rare,
    unique: CHART_TOTEMS.unique,
    myth: CHART_TOTEMS.myth,
    premium: TOTEM_SPECIAL.premium,
    limited: TOTEM_SPECIAL.limited,
  };

  function poolFor(tab, gradeKey){
    if(tab === "equip"){
      return EQUIP_BY_GRADE[gradeKey] || EQUIP_BY_GRADE.common;
    }
    return TOTEM_BY_GRADE[gradeKey] || TOTEM_BY_GRADE.common;
  }

  function gachaTableFor(tab){
    return (tab === "equip") ? EQUIP_GACHA : TOTEM_GACHA;
  }

  // =========================
  // Safe pick (prevents undefined.id)
  // =========================
  function pickRandomItem(tab, gradeKey){
    // 1) 요청 등급 풀
    const tryGrades = [gradeKey, "common", "rare", "unique", "myth", "premium", "limited", "relic"]; // fallback chain

    for(const g of tryGrades){
      const pool = poolFor(tab, g);
      if(Array.isArray(pool) && pool.length>0){
        const pick = pool[Math.floor(Math.random()*pool.length)];
        if(pick && pick.id) return { ...pick, grade: g, patternId: pick.patternId || null };
      }
    }

    // 2) 최후의 안전망: 전체에서 하나
    const all = (tab === "equip")
      ? Object.values(EQUIP_BY_GRADE).flat()
      : Object.values(TOTEM_BY_GRADE).flat();

    const p = all.find(x=>x && x.id);
    if(p) return { ...p, grade:"common", patternId: p.patternId || null };

    return null;
  }

  // =========================
  // Persistence
  // =========================
  // 버전 업: 구조 변경으로 구버전 데이터 충돌 방지
  const STORAGE_KEY = "mana-war-progress-v4";
  const LOADOUT_KEY = "mana-war-loadout-v4";

  const stageProgress = new Map();

  const loadoutState = {
    tab: "equip", // 'equip' | 'totem'
    sortMode: { equip: "grade", totem: "grade" },

    equip: { equip: [null,null,null], totem: [null,null,null] },
    inv: { equip: [], totem: [] }, // stacks: {id,name,grade,patternId,qty}
  };

  function loadProgress(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return;
      const obj = JSON.parse(raw);
      if(!obj || typeof obj!=="object") return;
      for(const k in obj) stageProgress.set(k, Number(obj[k])||0);
    }catch(_e){}
  }
  function saveProgress(){
    try{
      const obj = {};
      for(const [k,v] of stageProgress.entries()) obj[k]=v;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    }catch(_e){}
  }
  function getBestProgress(code){ return stageProgress.get(code) || 0; }
  function recordProgress(code, pct){
    const prev = getBestProgress(code);
    const next = Math.max(prev, pct);
    stageProgress.set(code, next);
    saveProgress();
  }

  function loadLoadout(){
    try{
      const raw = localStorage.getItem(LOADOUT_KEY);
      if(!raw) return;
      const obj = JSON.parse(raw);
      if(!obj || typeof obj!=="object") return;

      if(obj.tab) loadoutState.tab = obj.tab;
      if(obj.sortMode && typeof obj.sortMode === "object"){
        if(obj.sortMode.equip) loadoutState.sortMode.equip = obj.sortMode.equip;
        if(obj.sortMode.totem) loadoutState.sortMode.totem = obj.sortMode.totem;
      }

      if(obj.equip && obj.equip.equip && obj.equip.totem){
        loadoutState.equip.equip = obj.equip.equip;
        loadoutState.equip.totem = obj.equip.totem;
      }
      if(obj.inv && obj.inv.equip && obj.inv.totem){
        loadoutState.inv.equip = obj.inv.equip;
        loadoutState.inv.totem = obj.inv.totem;
      }

      normalizeInventory("equip");
      normalizeInventory("totem");
      saveLoadout();
    }catch(_e){}
  }
  function saveLoadout(){
    try{ localStorage.setItem(LOADOUT_KEY, JSON.stringify(loadoutState)); }catch(_e){}
  }

  // =========================
  // Inventory helpers
  // =========================
  function getSortMode(tab){
    const t = tab || loadoutState.tab;
    const m = loadoutState.sortMode && loadoutState.sortMode[t];
    if(m === "qty_desc" || m === "qty_asc" || m === "grade") return m;
    return "grade";
  }

  function setSortMode(tab, mode){
    const t = tab || loadoutState.tab;
    if(!loadoutState.sortMode) loadoutState.sortMode = { equip:"grade", totem:"grade" };
    const m = (mode === "qty_desc" || mode === "qty_asc" || mode === "grade") ? mode : "grade";
    loadoutState.sortMode[t] = m;
    saveLoadout();
  }

  function normalizeInventory(tab){
    const inv = loadoutState.inv[tab];
    if(!Array.isArray(inv) || inv.length===0) return;

    const byId = new Map();
    for(const it of inv){
      if(!it || !it.id) continue;
      const key = String(it.id);
      const qty = Math.max(1, Number(it.qty)||1);
      const g = String(it.grade||"common");

      if(!byId.has(key)){
        byId.set(key, { id: it.id, name: it.name, grade: g, patternId: it.patternId||null, qty });
      }else{
        const cur = byId.get(key);
        cur.qty += qty;
      }
    }
    loadoutState.inv[tab] = Array.from(byId.values());
  }

  function addToInventoryStack(tab, item){
    if(!item || !item.id) return;
    normalizeInventory(tab);
    const inv = loadoutState.inv[tab];
    const key = String(item.id);

    const found = inv.find(x=>String(x.id)===key);
    if(found){
      found.qty = Math.max(1, Number(found.qty)||1) + 1;
    }else{
      inv.push({ id:item.id, name:item.name, grade:item.grade||"common", patternId:item.patternId||null, qty:1 });
    }
  }

  function sortInventory(tab){
    normalizeInventory(tab);
    const inv = loadoutState.inv[tab];
    if(!Array.isArray(inv) || inv.length<=1) return;

    const mode = getSortMode(tab);

    inv.sort((a,b)=>{
      const qa = Math.max(1, Number(a?.qty)||1);
      const qb = Math.max(1, Number(b?.qty)||1);
      const ra = gradeRank(a?.grade);
      const rb = gradeRank(b?.grade);

      if(mode === "qty_asc"){
        if(qa !== qb) return qa - qb;
        if(rb !== ra) return rb - ra;
      }else if(mode === "qty_desc"){
        if(qa !== qb) return qb - qa;
        if(rb !== ra) return rb - ra;
      }else{
        if(rb !== ra) return rb - ra;
        if(qa !== qb) return qb - qa;
      }

      const na = String(a?.name || a?.id || "");
      const nb = String(b?.name || b?.id || "");
      return na.localeCompare(nb, "ko");
    });
  }

  // =========================
  // Stage helper
  // =========================
  function stageCode(main, sub){
    const m = String(main);
    const s = (Number(sub)<10) ? ("0"+String(Number(sub))) : String(Number(sub));
    return m + "-" + s;
  }
  function parseStageCode(code){
    const p = String(code).split("-");
    return { main:Number(p[0]||1), sub:Number(p[1]||1) };
  }
  function nextStage(main, sub){
    if(main===MAIN_STAGE_COUNT && sub===SUB_STAGE_COUNT) return null;
    if(sub<SUB_STAGE_COUNT) return stageCode(main, sub+1);
    return stageCode(main+1, 1);
  }

  // =========================
  // Stage master
  // =========================
  const STAGE_MASTER = [
    { bossName:"튜토리얼 시스템", gimmick:"강제청산 학습", fxMin:1000, fxMax:1200 },
    { bossName:"잠식된 선동가",   gimmick:"패턴 예고 강화", fxMin:1050, fxMax:1250 },
    { bossName:"탐욕의 큰손",     gimmick:"자본 잠식", fxMin:1100, fxMax:1350 },
    { bossName:"냉혈한 매니저",   gimmick:"공매도", fxMin:1150, fxMax:1400 },
    { bossName:"달러의 군주",     gimmick:"금리 인상", fxMin:1200, fxMax:1500 },
    { bossName:"공허의 약탈자",   gimmick:"실시간 환율", fxMin:1000, fxMax:1800 },
    { bossName:"자애로운 성자",   gimmick:"유동성 공급", fxMin:1300, fxMax:1300 },
  ];
  function masterFor(main){
    const idx = clamp(main-1, 0, STAGE_MASTER.length-1);
    return STAGE_MASTER[idx];
  }

  // =========================
  // Canvas setup
  // =========================
  const canvas = el("game");
  const ctx = canvas.getContext("2d");

  (function ensureRoundRect(){
    try{
      if(!CanvasRenderingContext2D || CanvasRenderingContext2D.prototype.roundRect) return;
      CanvasRenderingContext2D.prototype.roundRect = function(x,y,w,h,r){
        const rr = (typeof r==="number") ? {tl:r,tr:r,br:r,bl:r} : (r||{tl:0,tr:0,br:0,bl:0});
        const tl=rr.tl||0,tr=rr.tr||0,br=rr.br||0,bl=rr.bl||0;
        this.moveTo(x+tl,y);
        this.arcTo(x+w,y,x+w,y+h,tr);
        this.arcTo(x+w,y+h,x,y+h,br);
        this.arcTo(x,y+h,x,y,bl);
        this.arcTo(x,y,x+w,y,tl);
        this.closePath();
        return this;
      };
    }catch(_e){}
  })();

  // HUD refs
  const stageHudEl = el("stageHud");
  const gimmickHudEl = el("gimmickHud");
  const timeEl = el("time");
  const playEl = el("play");
  const manaEl = el("mana");
  const manaMaxEl = el("manaMax");
  const fxEl = el("fx");
  const fxMulEl = el("fxMul");
  const fxNextEl = el("fxNext");
  const fxCdEl = el("fxCd");
  const bossNameEl = el("bossName");
  const patternTextEl = el("patternText");
  const nextPatternTextEl = el("nextPatternText");
  const doomChip = el("doomChip");
  const doomLabelEl = el("doomLabel");
  const doomTextEl = el("doomText");
  const doomUnitEl = el("doomUnit");
  const scoreEl = el("score");
  const coinsEl = el("coins");
  const basePEl = el("baseP");
  const baseEEl = el("baseE");
  const progressBarEl = el("progressBar");
  const progressPctEl = el("progressPct");
  const overlayMsgEl = el("overlayMsg");
  const cardsWrap = el("cards");
  const dbgEl = el("dbg");

  // Modals
  const titleModal = el("titleModal");
  const howModal = el("howModal");
  const startMenuModal = el("startMenuModal");
  const stageModal = el("stageModal");
  const loadoutModal = el("loadoutModal");
  const endModal = el("endModal");
  const storyModal = el("storyModal");
  const storyTitleEl = el("storyTitle");
  const storyTextEl = el("storyText");
  const storyNextBtn = el("storyNextBtn");
  const storySkipBtn = el("storySkipBtn");

  // Buttons
  el("startBtn").addEventListener("click", ()=>{ hideModal(titleModal); showModal(startMenuModal); });
  el("howBtn").addEventListener("click", ()=>{ showModal(howModal); });
  el("howCloseBtn").addEventListener("click", ()=>{ hideModal(howModal); });
  howModal.addEventListener("click", (e)=>{ if(e.target===howModal) hideModal(howModal); });

  storyNextBtn && storyNextBtn.addEventListener("click", ()=>nextStory());
  storySkipBtn && storySkipBtn.addEventListener("click", ()=>skipStory());
  storyModal && storyModal.addEventListener("click", (e)=>{ if(e.target===storyModal) skipStory(); });

  el("startMenuBackBtn").addEventListener("click", ()=>{ hideModal(startMenuModal); showModal(titleModal); });
  el("goStageSelectBtn").addEventListener("click", ()=>{ hideModal(startMenuModal); openStageSelect(); });
  el("goLoadoutBtn").addEventListener("click", ()=>{ hideModal(startMenuModal); openLoadout(); });

  el("openStageBtn").addEventListener("click", openStageSelect);
  el("openLoadoutBtn").addEventListener("click", openLoadout);

  el("closeStageBtn").addEventListener("click", ()=>hideModal(stageModal));
  el("backToTitleBtn").addEventListener("click", ()=>{ hideModal(stageModal); showModal(titleModal); });
  el("resetProgressBtn").addEventListener("click", ()=>{ stageProgress.clear(); saveProgress(); buildStageUI(); alert("진행도 초기화 완료"); });

  el("retryBtn").addEventListener("click", ()=>{ hideModal(endModal); startGame(selectedStageCode); });
  el("nextBtn").addEventListener("click", ()=>{
    const cur = parseStageCode(selectedStageCode);
    const nx = nextStage(cur.main, cur.sub);
    if(!nx){ alert("마지막 스테이지입니다."); return; }
    hideModal(endModal);
    selectedStageCode = nx;
    startGame(selectedStageCode);
  });

  // =========================
  // Overlay
  // =========================
  let overlayTimer = null;
  function overlay(msg){
    overlayMsgEl.textContent = msg;
    overlayMsgEl.classList.add("show");
    if(overlayTimer) clearTimeout(overlayTimer);
    overlayTimer = setTimeout(()=>overlayMsgEl.classList.remove("show"), 900);
  }

  // =========================
  // Story / cutscenes
  // =========================
  let storyLines = [];
  let storyIdx = 0;

  function formatStoryLine(line){
    const s = String(line||"");
    const parts = s.split(":");
    if(parts.length >= 2){
      const who = escapeHtml(parts.shift().trim());
      const say = escapeHtml(parts.join(":").trim());
      return '<div class="who">'+who+'</div><div class="say">'+say+'</div>';
    }
    return escapeHtml(s);
  }

  function renderStory(){
    if(!storyTextEl) return;
    const line = storyLines[storyIdx] || "";
    storyTextEl.innerHTML = formatStoryLine(line);
    if(storyNextBtn){
      storyNextBtn.textContent = (storyIdx >= storyLines.length-1) ? "OK" : "NEXT";
    }
  }

  function openStory(title, lines){
    if(!lines || !lines.length) return;
    if(isShown(storyModal)) return; // don't interrupt an active cutscene
    storyLines = lines.slice();
    storyIdx = 0;
    if(storyTitleEl) storyTitleEl.textContent = title || "📜 STORY";
    renderStory();
    showModal(storyModal);
  }

  function nextStory(){
    if(!isShown(storyModal)) return;
    if(storyIdx < storyLines.length-1){
      storyIdx += 1;
      renderStory();
    }else{
      hideModal(storyModal);
    }
  }

  function skipStory(){
    if(isShown(storyModal)) hideModal(storyModal);
  }

  function storyForStageStart(main, sub){
    const master = masterFor(main);
    const code = stageCode(main, sub);
    const lines = [];
    if(main === 1){
      lines.push("시스템: 튜토리얼에 진입했습니다.");
      lines.push("시스템: 목표는 간단합니다. 적 본진을 무너뜨리세요.");
      lines.push("시스템: 단, 적 본진이 15% 아래로 떨어지면 '강제청산 경고'가 시작됩니다.");
      lines.push("시스템: 10% 아래로 떨어지면 3초 후 강제청산. 그 전에 끝내세요.");
    }else{
      lines.push("전략가: STAGE "+code+" 진입.");
      lines.push("전략가: 보스 - "+master.bossName+" / 기믹 - "+master.gimmick);
      lines.push("전략가: 환율 예고(3초)와 패턴 진동(2초 전)을 활용해 밀어붙인다.");
    }
    return { title: "🎬 스테이지 시작", lines };
  }

  function storyForMidboss(main){
    const master = masterFor(main);
    return {
      title: "⚔️ 중간보스",
      lines: [
        "시스템: 세부 4 - 중간보스 구간입니다.",
        "시스템: "+master.bossName+"의 패턴이 더 거칠어집니다.",
        "전략가: 여기서 무너지면 끝. 리스크는 내가 관리한다."
      ]
    };
  }



  // =========================
  // Loadout UI
  // =========================
  const tabEquipBtn = el("tabEquip");
  const tabTotemBtn = el("tabTotem");
  const slotRowEl = el("slotRow");
  const invWrapEl = el("invWrap");
  const equipCountEl = el("equipCount");
  const draw1Btn = el("draw1Btn");
  const draw10Btn = el("draw10Btn");
  const sortSelectEl = el("sortSelect");

  el("loadoutCloseBtn").addEventListener("click", ()=>hideModal(loadoutModal));
  el("clearInvBtn").addEventListener("click", ()=>{ loadoutState.inv[loadoutState.tab] = []; saveLoadout(); renderLoadout(); });

  tabEquipBtn.addEventListener("click", ()=>{ loadoutState.tab="equip"; saveLoadout(); renderLoadout(); });
  tabTotemBtn.addEventListener("click", ()=>{ loadoutState.tab="totem"; saveLoadout(); renderLoadout(); });

  sortSelectEl.addEventListener("change", ()=>{
    setSortMode(loadoutState.tab, sortSelectEl.value);
    sortInventory(loadoutState.tab);
    saveLoadout();
    renderLoadout();
  });

  draw1Btn.addEventListener("click", ()=>{ drawMany(loadoutState.tab, 1); renderLoadout(); });
  draw10Btn.addEventListener("click", ()=>{ drawMany(loadoutState.tab, 10); renderLoadout(); });

  function openLoadout(){
    renderLoadout();
    showModal(loadoutModal);
  }

  function slotInner(tab, item, isSlot){
    if(!item) return "<b>빈 슬롯</b><span style=\"opacity:.7\">("+(tab==="equip"?"장비":"토템")+")</span>";
    const gk = item.grade || "common";
    const cls = gradeCssClass(gk);
    const tag = '<span class="gradeTag '+cls+'">'+gradeLabel(gk)+'</span>';

    const qty = Math.max(1, Number(item.qty)||1);
    const qtyText = (!isSlot)
      ? ' <span style="opacity:.9;font-weight:1000;">x'+qty+'</span>'
      : '';

    const name = '<span class="itemName '+cls+'">'+escapeHtml(item.name||item.id)+'</span>' + qtyText;

    let icon = "";
    if(tab==="totem"){
      icon = svgForPattern(item.patternId || "SYM_TRI");
    }else{
      icon = '<div class="miniSvg" style="display:grid;place-items:center;font-weight:1000;">🧿</div>';
    }

    return icon + '<div style="display:flex;flex-direction:column;gap:4px;">'
      + '<div class="nameLine">'+tag+name+'</div>'
      + '<div class="small" style="opacity:.72;">'+(isSlot?"슬롯":"인벤")+'</div>'
      + '</div>';
  }

  // (요구) 이름 ... 생략 금지: 컨테이너 너비에 맞춰 폰트 자동 축소, 그래도 넘치면 줄바꿈
  function fitTextToBox(node, maxPx=13, minPx=7){
    if(!node) return;
    node.style.wordBreak = "keep-all";
    node.style.whiteSpace = "nowrap";
    node.style.fontSize = maxPx + "px";

    let size = maxPx;
    let guard = 0;
    while(size > minPx && node.scrollWidth > node.clientWidth + 1 && guard < 30){
      size = Math.round((size - 0.5) * 10) / 10;
      node.style.fontSize = size + "px";
      guard++;
    }

    // 마지막까지 안 맞으면(아주 긴 이름) → 줄바꿈 허용(그래도 풀네임 유지)
    if(node.scrollWidth > node.clientWidth + 1){
      node.style.whiteSpace = "normal";
      node.style.fontSize = Math.max(10, minPx + 2) + "px";
    }
  }

  function fitAllItemNames(){
    const nodes = loadoutModal.querySelectorAll(".slot .itemName, .invItem .itemName");
    nodes.forEach(n=>fitTextToBox(n, 13, 7));
  }

  function renderLoadout(){
    sortInventory(loadoutState.tab);

    tabEquipBtn.classList.toggle("active", loadoutState.tab==="equip");
    tabTotemBtn.classList.toggle("active", loadoutState.tab==="totem");

    draw1Btn.textContent = (loadoutState.tab==="equip") ? "장비 1연 뽑기" : "토템 1연 뽑기";
    draw10Btn.textContent = (loadoutState.tab==="equip") ? "장비 10연 뽑기" : "토템 10연 뽑기";

    sortSelectEl.value = getSortMode(loadoutState.tab);

    const tab = loadoutState.tab;
    const slots = loadoutState.equip[tab];

    slotRowEl.innerHTML = "";
    slots.forEach((it, idx)=>{
      const div = document.createElement("div");
      div.className = "slot";
      div.innerHTML = slotInner(tab, it, true);
      div.title = "클릭하면 해제";
      div.addEventListener("click", ()=>{ if(it){ unequipToInv(tab, idx); renderLoadout(); } });
      slotRowEl.appendChild(div);
    });

    invWrapEl.innerHTML = "";
    const inv = loadoutState.inv[tab];
    inv.forEach((it, idx)=>{
      // (안전) undefined가 섞여있으면 무시
      if(!it || !it.id) return;
      const div = document.createElement("div");
      div.className = "invItem";
      div.innerHTML = slotInner(tab, it, false);
      div.title = "클릭하면 장착";
      div.addEventListener("click", ()=>{ equipFromInv(tab, idx); renderLoadout(); });
      invWrapEl.appendChild(div);
    });

    const equipCount = loadoutState.equip.equip.filter(Boolean).length;
    const totemCount = loadoutState.equip.totem.filter(Boolean).length;
    equipCountEl.textContent = "장비 " + equipCount + "/3 · 토템 " + totemCount + "/3";

    // 렌더 이후 레이아웃 확정된 다음 텍스트 피팅
    requestAnimationFrame(fitAllItemNames);
  }

  window.addEventListener("resize", ()=>{
    if(loadoutModal.classList.contains("show")) requestAnimationFrame(fitAllItemNames);
  });

  function equipFromInv(tab, invIndex){
    normalizeInventory(tab);
    const inv = loadoutState.inv[tab];
    if(invIndex<0 || invIndex>=inv.length) return;

    const slots = loadoutState.equip[tab];
    const empty = slots.findIndex(x=>!x);
    if(empty===-1) { overlay("슬롯이 가득 찼어"); return; }

    const stack = inv[invIndex];
    if(!stack || !stack.id) return; // 안전

    const qty = Math.max(1, Number(stack.qty)||1);

    slots[empty] = { id:stack.id, name:stack.name, grade:stack.grade, patternId:stack.patternId||null };

    if(qty>1){
      stack.qty = qty - 1;
    }else{
      inv.splice(invIndex, 1);
    }

    sortInventory(tab);
    saveLoadout();
  }

  function unequipToInv(tab, slotIndex){
    const slots = loadoutState.equip[tab];
    if(slotIndex<0 || slotIndex>=slots.length) return;
    const item = slots[slotIndex];
    if(!item) return;
    slots[slotIndex]=null;
    addToInventoryStack(tab, item);
    sortInventory(tab);
    saveLoadout();
  }

  function drawMany(tab, n){
    const count = Math.max(1, Number(n)||1);
    const tbl = gachaTableFor(tab);

    for(let i=0;i<count;i++){
      const g = rollFromTable(tbl);
      const pick = pickRandomItem(tab, g);

      // (핵심) pick이 null/undefined면 id 접근하면 터짐 → 방어
      if(!pick || !pick.id){
        console.warn("[gacha] pickRandomItem failed", { tab, g });
        continue;
      }

      addToInventoryStack(tab, {
        id: pick.id,
        name: pick.name,
        grade: pick.grade || g,
        patternId: pick.patternId || null,
      });
    }

    sortInventory(tab);
    saveLoadout();
  }

  // =========================
  // Stage select UI
  // =========================
  const mainStageGridEl = el("mainStageGrid");
  const subStageGridEl = el("subStageGrid");
  const selectedMainEl = el("selectedMain");

  let selectedStageCode = stageCode(1,1);
  let selectedMain = 1;

  function openStageSelect(){
    buildStageUI();
    showModal(stageModal);
  }

  function buildStageUI(){
    mainStageGridEl.innerHTML = "";
    for(let m=1;m<=MAIN_STAGE_COUNT;m++){
      const master = masterFor(m);
      const div = document.createElement("div");
      div.className = "stageBtn" + (m===selectedMain?" active":"");
      div.innerHTML = '<div class="t">STAGE '+m+' <span style="opacity:.75">·</span> <span style="opacity:.9">'+escapeHtml(master.bossName)+'</span></div>'
        + '<div class="d">'+escapeHtml(master.gimmick)+'</div>';
      div.addEventListener("click", ()=>{ selectedMain=m; buildStageUI(); });
      mainStageGridEl.appendChild(div);
    }

    selectedMainEl.textContent = String(selectedMain);

    subStageGridEl.innerHTML = "";
    for(let s=1;s<=SUB_STAGE_COUNT;s++){
      const code = stageCode(selectedMain, s);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "subBtn" + (s===MIDBOSS_SUB_INDEX?" midboss":"");
      btn.innerHTML = '<div style="font-weight:1000;font-size:16px;">'+s+'</div>'
        + '<div style="font-size:11px;opacity:.85;">'+(s===MIDBOSS_SUB_INDEX?"B":"")+'</div>';
      btn.addEventListener("click", ()=>{
        selectedStageCode = code;
        hideModal(stageModal);
        startGame(code);
      });
      subStageGridEl.appendChild(btn);
    }
  }

  // =========================
  // Units (UI에는 스탯 미표기)
  // =========================
  const UNIT_DB = [
    { id:"U1", name:"개미 병사", cost:8,  hp:240, atk:18, rate:0.9, range:18,  speed:70,  unlockAt: "1-01" },
    { id:"U2", name:"단타 자객", cost:14, hp:180, atk:42, rate:1.4, range:16,  speed:110, unlockAt: "1-01" },
    { id:"U3", name:"헤지 마법사", cost:26, hp:220, atk:22, rate:0.7, range:140, speed:60,  unlockAt: "1-01" },
    { id:"U4", name:"포지션 브레이커", cost:36, hp:360, atk:38, rate:0.9, range:26,  speed:80,  unlockAt: "1-02" },
    { id:"U5", name:"리밸런스 대포",   cost:52, hp:260, atk:78, rate:1.6, range:170, speed:55,  unlockAt: "1-04" },
  ];

  function isUnlockedUnit(u){
    if(u && u.id === "U1") return true;
    const req = u.unlockAt || "1-01";
    return (getBestProgress(req) >= 30);
  }

  function unitCost(u){
    // 환율( state.fx / 1000 )에 따라 유닛 소환 비용 변동
    const mul = (state.fx || 1000) / 1000;
    // 비용은 정수. 환율이 오르면 체감되도록 올림(ceil) 처리.
    return Math.max(1, Math.ceil((u.cost || 0) * mul));
  }


  function buildCards(){
    cardsWrap.innerHTML = "";
    UNIT_DB.forEach((u, idx)=>{
      const btn = document.createElement("button");
      btn.className = "card";
      btn.type = "button";
      const unlocked = isUnlockedUnit(u);
      btn.disabled = !unlocked;

      btn.innerHTML = '<div class="name">'+escapeHtml(u.name)+'</div>'
        + '<div class="meta">'
        + '<span>비용 '+u.cost+'</span>'
        + (unlocked ? '<span style="opacity:.75">#'+(idx+1)+'</span>' : '<span style="opacity:.85">해금: '+escapeHtml(u.unlockAt)+' 30%+</span>')
        + '</div>';

      btn.addEventListener("click", ()=>spawnUnit(u));
      cardsWrap.appendChild(btn);
    });
  }

  // =========================
  // Game state & loop
  // =========================
  const state = {
    running:false,
    stageCode:"1-01",
    main:1, sub:1,

    fx:1000,
    fxNext:1100,
    fxT:0,

    play:0,
    timeLeft:CFG.durationSec,

    mana:0,
    score:0,
    coins:0,

    baseP: {...CFG.baseP},
    baseE: {...CFG.baseE},

    units:[],
    enemies:[],

    kills:0,
    dmgToEnemyBase:0,

    patternNow:"-",
    patternNext:"-",
    patternQueue:[],

    shakeT:0,
    enemySpawnT:0,

    paused:false,

    doomActive:false,
    doomWarn15:false,
    doomStory15:false,
    doomStory10:false,

    doomFired:false,
  };

  function resetStateForStage(code){
    const {main, sub} = parseStageCode(code);
    const master = masterFor(main);

    state.running = true;
    state.stageCode = code;
    state.main = main; state.sub = sub;

    state.fx = master.fxMin;
    state.fxNext = master.fxMax;
    state.fxT = 0;

    state.play = 0;
    state.timeLeft = CFG.durationSec;

    state.mana = 40;
    state.score = 0;
    state.coins = 0;

    state.baseP = {...CFG.baseP};
    state.baseE = {...CFG.baseE};

    state.units = [];
    state.enemies = [];

    state.kills = 0;
    state.dmgToEnemyBase = 0;

    state.patternNow = "-";
    state.patternNext = "-";
    state.patternQueue = buildPatternPlan(main, sub);

    state.shakeT = 0;
    state.enemySpawnT = 0;

    state.paused = false;

    state.doomActive = (main===1);
    state.doomWarn15 = false;
    state.doomStory15 = false;
    state.doomStory10 = false;
    state.doomFired = false;

    stageHudEl.textContent = code;
    gimmickHudEl.textContent = master.gimmick;
    bossNameEl.textContent = master.bossName;

    manaMaxEl.textContent = String(CFG.manaMax);
    doomChip.style.display = state.doomActive ? "flex" : "none";

    buildCards();
    // Stage entry story cut
    const st = storyForStageStart(main, sub);
    openStory(st.title, st.lines);
    if(sub===MIDBOSS_SUB_INDEX){
      const mb = storyForMidboss(main);
      // queue midboss story after stage-start by appending lines
      storyLines = storyLines.concat(["", "—", ""].concat(mb.lines));
      if(storyTitleEl) storyTitleEl.textContent = st.title;
      renderStory();
    }

    overlay("게임 시작");
    updateHUD();
  }

  function buildPatternPlan(main, sub){
    const plan = [];
    plan.push({ at: 20, name: "마나 드레인", type:"mana", amount: 25 });
    plan.push({ at: 45, name: "공격 속도 저하", type:"slow", dur: 6 });
    plan.push({ at: 75, name: "환율 급변", type:"fx" });

    if(main===1){
      plan.push({ at: 105, name: "강제청산", type:"doom" });
    }

    plan.sort((a,b)=>a.at-b.at);
    return plan;
  }

  function spawnUnit(u){
    if(!state.running) return;
    const cost = unitCost(u);
    if(state.mana < cost){ overlay("마나 부족"); return; }
    state.mana -= cost;
    state.units.push({
      name:u.name,
      x:CFG.playerSpawnX,
      y:CFG.laneY,
      hp:u.hp,
      maxHp:u.hp,
      atk:u.atk,
      rate:u.rate,
      range:u.range,
      speed:u.speed,
      cd:0,
    });
  }

  function spawnEnemy(){
    const m = state.main;
    const isMid = (state.sub===MIDBOSS_SUB_INDEX);

    let hp = 170 + m*28;
    let atk = 13 + m*2;
    let speed = 60 + m*2;
    let rate = 1.0;

    if(isMid){ hp *= 1.55; atk *= 1.35; speed *= 0.92; rate = 0.9; }

    const e = { x:CFG.enemySpawnX, y:CFG.laneY, hp:Math.round(hp), maxHp:Math.round(hp), atk:Math.round(atk), rate, range:18, speed, cd:0 };
    state.enemies.push(e);
  }

  function enemySpawnInterval(){
    // later stages spawn slightly faster
    let t = CFG.enemySpawnEvery * (1 - (state.main-1)*0.05);
    if(state.sub===MIDBOSS_SUB_INDEX) t *= 0.92;
    return clamp(t, 0.9, 3.5);
  }

  function updateEnemySpawns(dt){
    state.enemySpawnT += dt;
    const itv = enemySpawnInterval();
    while(state.enemySpawnT >= itv){
      state.enemySpawnT -= itv;
      spawnEnemy();
    }
  }

  function applyPattern(p){
    state.patternNow = p.name;
    if(p.type==="mana"){
      state.mana = Math.max(0, state.mana - (p.amount||0));
      overlay("패턴: 마나 드레인");
    }else if(p.type==="slow"){
      overlay("패턴: 공속 저하");
    }else if(p.type==="fx"){
      state.fxT = CFG.fxChangeEverySec - 0.2;
      overlay("패턴: 환율 급변");
    }else if(p.type==="doom"){
      state.baseP.hp = 0;
      state.mana = 0;
      state.doomFired = true;
      overlay("강제청산 발동");
      endGame(false, "강제청산");
    }
  }

  function updatePatterns(dt){
    if(!state.patternQueue.length){
      state.patternNext = "-";
      return;
    }
    const next = state.patternQueue[0];
    state.patternNext = next.name + " · " + fmt1(Math.max(0, next.at - state.play)) + "s";

    const until = next.at - state.play;
    if(until <= CFG.vibrateLeadSec && until > 0){
      state.shakeT = Math.max(state.shakeT, until);
    }

    if(state.play >= next.at){
      state.patternQueue.shift();
      applyPattern(next);
    }
  }

  function updateFX(dt){
    const master = masterFor(state.main);

    state.fxT += dt;
    const cd = CFG.fxChangeEverySec - state.fxT;
    const announce = cd <= CFG.fxAnnounceSec && cd > 0;

    if(announce){
      fxNextEl.textContent = String(state.fxNext);
      fxCdEl.textContent = fmt1(cd);
    }else{
      fxNextEl.textContent = "-";
      fxCdEl.textContent = fmt1(Math.max(0, CFG.fxAnnounceSec));
    }

    if(state.fxT >= CFG.fxChangeEverySec){
      state.fxT = 0;
      const prevFx = state.fx;
      state.fx = state.fxNext;
      const r = Math.random();
      state.fxNext = master.fxMin + Math.round(r*(master.fxMax-master.fxMin));
      overlay("환율 변동");
      // 환율 변동 시 카드 비용 UI도 갱신
      if(prevFx !== state.fx) buildCards();
    }

    const mul = state.fx / 1000;
    fxMulEl.textContent = mul.toFixed(2);
  }

  function updateEntities(dt){
    const units = state.units;
    const enemies = state.enemies;

    // 충돌/추월 방지용 간격
    const BODY_R = 14;
    const BLOCK_DIST = BODY_R * 2 + 2;

    const enemyBaseEdge = state.baseE.x - state.baseE.w/2;
    const playerBaseEdge = state.baseP.x + state.baseP.w/2;

    // Units
    for(const u of units){
      // nearest enemy in front
      let target = null;
      let best = Infinity;
      let signed = 0;

      for(const e of enemies){
        const sdx = e.x - u.x;
        if(sdx >= 0 && sdx < best){
          best = sdx;
          signed = sdx;
          target = e;
        }
      }
      // overlap rescue (when already crossed due to dt)
      if(!target){
        for(const e of enemies){
          const sdx = e.x - u.x;
          const dist = Math.abs(sdx);
          if(dist < BLOCK_DIST && dist < best){
            best = dist;
            signed = sdx;
            target = e;
          }
        }
      }

      if(!target){
        const dxBase = enemyBaseEdge - u.x;
        if(dxBase <= u.range){
          state.baseE.hp = Math.max(0, state.baseE.hp - u.atk);
          state.dmgToEnemyBase += u.atk;
        }else{
          const nextX = u.x + u.speed*dt;
          u.x = Math.min(nextX, enemyBaseEdge - (BODY_R + 2));
        }
      }else{
        const dist = Math.abs(target.x - u.x);
        if(dist <= u.range){
          target.hp -= u.atk;
        }else{
          const nextX = u.x + u.speed*dt;
          if(signed >= 0){
            u.x = Math.min(nextX, target.x - BLOCK_DIST);
          }else{
            // should be rare; still move forward
            u.x = nextX;
          }
        }
      }
    }

    // Enemies
    for(const e of enemies){
      let target = null;
      let best = Infinity;
      let signed = 0;

      for(const u of units){
        const sdx = e.x - u.x;
        if(sdx >= 0 && sdx < best){
          best = sdx;
          signed = sdx;
          target = u;
        }
      }
      // overlap rescue
      if(!target){
        for(const u of units){
          const sdx = e.x - u.x;
          const dist = Math.abs(sdx);
          if(dist < BLOCK_DIST && dist < best){
            best = dist;
            signed = sdx;
            target = u;
          }
        }
      }

      if(!target){
        const dxBase = e.x - playerBaseEdge;
        if(dxBase <= e.range + 20){
          state.baseP.hp = Math.max(0, state.baseP.hp - e.atk);
        }else{
          const nextX = e.x - e.speed*dt;
          e.x = Math.max(nextX, playerBaseEdge + (BODY_R + 2));
        }
      }else{
        const dist = Math.abs(e.x - target.x);
        if(dist <= e.range){
          target.hp -= e.atk;
        }else{
          const nextX = e.x - e.speed*dt;
          if(signed >= 0){
            e.x = Math.max(nextX, target.x + BLOCK_DIST);
          }else{
            e.x = nextX;
          }
        }
      }
    }

    // cleanup
    for(let i=units.length-1;i>=0;i--){
      if(units[i].hp<=0) units.splice(i,1);
    }
    for(let i=enemies.length-1;i>=0;i--){
      if(enemies[i].hp<=0){
        enemies.splice(i,1);
        state.kills += 1;
        state.score += 120;
        state.coins += 1;
      }
    }
  }

  function updateMana(dt){
    state.mana = clamp(state.mana + CFG.manaRegenPerSec * dt, 0, CFG.manaMax);
  }

  function computeProgressPct(){
    const p = (state.dmgToEnemyBase / state.baseE.maxHp) * 100;
    return clamp(Math.round(p), 0, 100);
  }



  function getNextDoomAt(){
    const ev = state.patternQueue.find(p=>p && p.type==="doom");
    return ev ? ev.at : CFG.doomAtSec;
  }

  // Stage 1: 적 본진 체력 기반 강제청산 경고/발동
  // - 15% 이하: 경고(칩/컷)
  // - 10% 미만: 3초 예고 후 강제청산(타이머보다 우선)
  function updateDoomFromEnemyHp(){
    if(!state.doomActive || state.doomFired) return;
    if(!state.baseE || !(state.baseE.maxHp>0)) return;

    const ratio = state.baseE.hp / state.baseE.maxHp;

    if(ratio < 0.15 && !state.doomWarn15){
      state.doomWarn15 = true;
      overlay("⚠️ 적 본진 15%↓ : 강제청산 경고");
      if(!state.doomStory15){
        state.doomStory15 = true;
        openStory("⚠️ 강제청산 경고", [
          "시스템: 적 본진이 15% 아래로 떨어졌습니다.",
          "시스템: 강제청산이 예고됩니다. 더 빨리 끝내세요."
        ]);
      }
    }

    if(ratio >= 0.10) return;

    const curAt = getNextDoomAt();
    const desiredAt = state.play + 3; // 3초 예고 후 발동

    if(desiredAt + 0.001 < curAt){
      state.patternQueue = state.patternQueue.filter(p=>p && p.type!=="doom");
      state.patternQueue.push({ at: desiredAt, name:"강제청산", type:"doom" });
      state.patternQueue.sort((a,b)=>a.at-b.at);
      overlay("💀 적 본진 10%↓ : 3초 후 강제청산");
    }

    if(!state.doomStory10){
      state.doomStory10 = true;
      openStory("💀 강제청산 임박", [
        "시스템: 적 본진이 10% 아래로 붕괴했습니다.",
        "시스템: 3초 후 강제청산 발동. 지금 끝내세요!"
      ]);
    }
  }
  function updateHUD(){
    timeEl.textContent = fmt1(state.timeLeft);
    playEl.textContent = fmt1(state.play);
    manaEl.textContent = String(Math.floor(state.mana));

    fxEl.textContent = String(state.fx);

    if(state.doomActive){
      const warn = !!state.doomWarn15;
      doomLabelEl && (doomLabelEl.textContent = warn ? "강제청산 경고" : "강제청산까지");
      doomUnitEl && (doomUnitEl.textContent = "s");
      doomTextEl.textContent = fmt1(Math.max(0, getNextDoomAt() - state.play));
      doomChip.classList.toggle("danger", warn);
      doomChip.style.display = "flex";
    }else{
      doomChip.classList.remove("danger");
      doomChip.style.display = "none";
    }

    scoreEl.textContent = String(state.score);
    coinsEl.textContent = String(state.coins);

    basePEl.textContent = String(state.baseP.hp);
    baseEEl.textContent = String(state.baseE.hp);

    patternTextEl.textContent = state.patternNow;
    nextPatternTextEl.textContent = state.patternNext;

    const progress = computeProgressPct();
    progressPctEl.textContent = String(progress);
    progressBarEl.style.width = progress + "%";

    dbgEl.textContent = "인벤 장비 " + loadoutState.inv.equip.length + "개 / 토템 " + loadoutState.inv.totem.length + "개";
  }

  function draw(){
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);

    let sx=0, sy=0;
    if(state.shakeT>0){
      const amp = 6;
      sx = (Math.random()*2-1)*amp;
      sy = (Math.random()*2-1)*amp;
    }

    ctx.save();
    ctx.translate(sx, sy);

    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = "rgba(255,255,255,.10)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, CFG.laneY);
    ctx.lineTo(w-60, CFG.laneY);
    ctx.stroke();

    drawBase(state.baseP.x, CFG.laneY-150, state.baseP.w, state.baseP.h, state.baseP.hp/state.baseP.maxHp, true);
    drawBase(state.baseE.x, CFG.laneY-150, state.baseE.w, state.baseE.h, state.baseE.hp/state.baseE.maxHp, false);

    for(const u of state.units){
      drawUnit(u.x, u.y, u.hp/u.maxHp, true);
    }
    for(const e of state.enemies){
      drawUnit(e.x, e.y, e.hp/e.maxHp, false);
    }

    ctx.restore();

    ctx.fillStyle = "rgba(255,255,255,.14)";
    ctx.font = "900 16px system-ui";
    ctx.fillText("STAGE " + state.stageCode, 18, 24);
  }

  function drawBase(x,y,w,h,ratio,isPlayer){
    ctx.fillStyle = isPlayer ? "rgba(105,210,255,.12)" : "rgba(255,123,123,.10)";
    ctx.strokeStyle = isPlayer ? "rgba(105,210,255,.40)" : "rgba(255,123,123,.30)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x - w/2, y, w, h, 14);
    ctx.fill();
    ctx.stroke();

    const bw = w-14;
    const bx = x - bw/2;
    const by = y - 12;
    ctx.fillStyle = "rgba(255,255,255,.10)";
    ctx.fillRect(bx, by, bw, 8);
    ctx.fillStyle = "rgba(255,255,255,.75)";
    ctx.fillRect(bx, by, bw*clamp(ratio,0,1), 8);
  }

  function drawUnit(x,y,ratio,isPlayer){
    const r = 14;
    ctx.fillStyle = isPlayer ? "rgba(105,210,255,.25)" : "rgba(255,123,123,.22)";
    ctx.strokeStyle = isPlayer ? "rgba(105,210,255,.55)" : "rgba(255,123,123,.42)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI*2);
    ctx.fill();
    ctx.stroke();

    const bw = 32;
    ctx.fillStyle = "rgba(255,255,255,.10)";
    ctx.fillRect(x-bw/2, y+20, bw, 5);
    ctx.fillStyle = "rgba(255,255,255,.75)";
    ctx.fillRect(x-bw/2, y+20, bw*clamp(ratio,0,1), 5);
  }

  function endGame(win, reason){
    if(!state.running) return;
    state.running = false;

    let progress = computeProgressPct();
    const {main} = parseStageCode(state.stageCode);

    if(main===1) progress = Math.max(progress, 30);

    recordProgress(state.stageCode, progress);

    const bonus = calcBonus(progress);
    state.coins += bonus;

    updateHUD();

    showEndModal(win, reason, progress, bonus);
  }

  function calcBonus(progress){
    if(progress>=90) return 80;
    if(progress>=60) return 40;
    if(progress>=30) return 20;
    return 0;
  }

  function showEndModal(win, reason, progress, bonus){
    el("endStage").textContent = state.stageCode;
    const title = el("endTitle");
    title.textContent = win ? "CLEARED" : "DEFEAT";
    title.classList.toggle("lose", !win);

    const s1 = el("star1"), s2=el("star2"), s3=el("star3");
    s1.classList.toggle("on", progress>=30);
    s2.classList.toggle("on", progress>=60);
    s3.classList.toggle("on", progress>=90);

    el("endScore").textContent = String(state.score);
    el("endCoins").textContent = String(state.coins);
    el("endTime").textContent = fmt1(state.play);
    el("endProgress").textContent = String(progress);
    el("endKills").textContent = String(state.kills);
    el("endDmg").textContent = String(state.dmgToEnemyBase);

    el("endBonus").textContent = String(bonus);
    el("bonusWhy").textContent = (bonus>0) ? (progress>=90?"90%+":"30/60%+") : (reason||"기본");

    const map = el("stageMap");
    map.innerHTML = "";
    for(let i=1;i<=SUB_STAGE_COUNT;i++){
      const node = document.createElement("div");
      node.className = "node" + (i===MIDBOSS_SUB_INDEX?" mid":"");
      node.textContent = (i===MIDBOSS_SUB_INDEX) ? "B" : String(i);
      map.appendChild(node);
      if(i<SUB_STAGE_COUNT){
        const c = document.createElement("div");
        c.className = "conn";
        map.appendChild(c);
      }
    }

    const campaignPct = getBestProgress(state.stageCode);
    el("campaignPct").textContent = String(campaignPct);
    el("campaignBar").style.width = campaignPct + "%";

    showModal(endModal);
  }

  function startGame(code){
    hideModal(titleModal);
    hideModal(startMenuModal);
    hideModal(stageModal);
    hideModal(loadoutModal);

    resetStateForStage(code);
  }

  // keyboard
  window.addEventListener("keydown", (e)=>{
    if(e.key==="1") spawnUnit(UNIT_DB[0]);
    if(e.key==="2") spawnUnit(UNIT_DB[1]);
    if(e.key==="3") spawnUnit(UNIT_DB[2]);
    if(e.key==="r" || e.key==="R"){
      if(!state.running) { hideModal(endModal); startGame(selectedStageCode); }
    }
    if(e.key==="n" || e.key==="N"){
      if(!state.running){
        const cur = parseStageCode(selectedStageCode);
        const nx = nextStage(cur.main, cur.sub);
        if(nx){ hideModal(endModal); selectedStageCode = nx; startGame(selectedStageCode); }
      }
    }
  });

  // =========================
  // Loop
  // =========================
  let lastTs = performance.now();
  function tick(ts){
    const dt = Math.min(0.05, (ts-lastTs)/1000);
    lastTs = ts;

    if(state.running){
      syncPause();
      if(!state.paused){
        state.play += dt;
      state.timeLeft = Math.max(0, CFG.durationSec - state.play);

      updateFX(dt);
      updatePatterns(dt);
      updateMana(dt);
      updateEnemySpawns(dt);
      updateEntities(dt);

      // Stage 1: 적 본진 15%/10% 조건 기반 강제청산 경고/발동
      updateDoomFromEnemyHp();

      const doomAt = getNextDoomAt();
      if(state.doomActive && !state.doomFired && state.play >= doomAt){
        // 혹시 패턴 큐가 꼬여도 1회만 보장
        applyPattern({ name:"강제청산", type:"doom" });
      }

      state.shakeT = Math.max(0, state.shakeT - dt);

      if(state.baseE.hp<=0){
        endGame(true, "승리");
      }else if(state.baseP.hp<=0){
        endGame(false, "본진 파괴");
      }else if(state.timeLeft<=0){
        endGame(false, "시간 종료");
      }

      }

      updateHUD();
    }

    draw();
    requestAnimationFrame(tick);
  }

  // =========================
  // Tests (console)
  // =========================
  function runUnitTests(){
    // rollFromTable determinism
    const k0 = rollFromTable(EQUIP_GACHA, 0.0001);
    const k1 = rollFromTable(EQUIP_GACHA, 0.9999);
    if(!k0 || !k1) throw new Error("rollFromTable returns empty");

    // chart patterns unique
    const names = CHART_PATTERNS.map(x=>x.name);
    if(new Set(names).size !== names.length) throw new Error("CHART_PATTERNS duplicate names");

    // svg content
    const svg = svgForPattern(CHART_PATTERNS[0].id);
    if(svg.indexOf("polyline")===-1) throw new Error("svgForPattern invalid");

    // stageCode format
    if(stageCode(1,1)!=="1-01" || stageCode(7,7)!=="7-07") throw new Error("stageCode formatting broken");

    // totem pool ids unique
    const allTotems = Object.values(TOTEM_BY_GRADE).flat();
    const tid = allTotems.map(x=>x.id);
    if(new Set(tid).size !== tid.length) throw new Error("TOTEM_BY_GRADE has duplicate ids");

    // equip pool ids unique
    const allEquips = Object.values(EQUIP_BY_GRADE).flat();
    const eid = allEquips.map(x=>x.id);
    if(new Set(eid).size !== eid.length) throw new Error("EQUIP_BY_GRADE has duplicate ids");

    // stacking
    loadoutState.inv.equip = [
      {id:"E_PROTECT", name:"A", grade:"common"},
      {id:"E_PROTECT", name:"A", grade:"common"},
      {id:"E_STOP_RING", name:"B", grade:"rare"},
    ];
    normalizeInventory("equip");
    if(loadoutState.inv.equip.length !== 2) throw new Error("normalizeInventory failed to stack");
    const a = loadoutState.inv.equip.find(x=>x.id==="E_PROTECT");
    if(!a || a.qty !== 2) throw new Error("stack qty incorrect");

    // NEW: myth pool must not be empty (was causing undefined.id crash)
    if(!Array.isArray(TOTEM_BY_GRADE.myth) || TOTEM_BY_GRADE.myth.length < 1){
      throw new Error("TOTEM_BY_GRADE.myth must have at least 1 item");
    }

    // NEW: pickRandomItem must always return an item even for missing grade
    const p1 = pickRandomItem("totem", "relic");
    if(!p1 || !p1.id) throw new Error("pickRandomItem fallback failed (totem relic)");

    // NEW: drawMany should never throw even if a grade pool is empty (guarded)
    loadoutState.inv.totem = [];
    drawMany("totem", 50);
    normalizeInventory("totem");
    if(loadoutState.inv.totem.length < 1) throw new Error("drawMany did not add any totems");

    console.log("[tests] ok", {
      equipGrades: Object.keys(EQUIP_BY_GRADE),
      totemGrades: Object.keys(TOTEM_BY_GRADE),
      chartTotems: Object.values(CHART_TOTEMS).flat().length,
      mythTotems: TOTEM_BY_GRADE.myth.length,
    });
  }

  // =========================
  // Boot
  // =========================
  function boot(){
    loadProgress();
    loadLoadout();

    selectedStageCode = stageCode(1,1);
    selectedMain = 1;

    showModal(titleModal);

    buildCards();
    renderLoadout();

    runUnitTests();

    requestAnimationFrame(tick);
  }

  boot();
})();
