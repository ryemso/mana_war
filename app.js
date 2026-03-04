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

  // Modal pause logic
  let pausedByModal = false;
  function updateModalPause(){
    try{
      pausedByModal = !!document.querySelector('.modalBack.show[data-pauses="true"]');
    }catch(_e){
      pausedByModal = false;
    }
  }

  function isShown(m){ return !!(m && m.classList && m.classList.contains("show")); }
  function showModal(m){ if(!m)return; m.classList.add("show"); m.setAttribute("aria-hidden","false"); updateModalPause(); syncPause(); }
  function hideModal(m){ if(!m)return; m.classList.remove("show"); m.setAttribute("aria-hidden","true"); updateModalPause(); syncPause(); }

  function syncPause(){
    try{
      if(typeof state === "undefined" || !state || !state.running) return;
      state.paused = pausedByModal;
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
    baseP: { x: 80,  hp: 3000, maxHp: 3000, w: 100, h: 180 },
    baseE: { x: 1020, hp: 3000, maxHp: 3000, w: 100, h: 220 },
    enemySpawnEvery: 2.2,
  };

  const MAIN_STAGE_COUNT = 7;
  const SUB_STAGE_COUNT = 7;
  const MIDBOSS_SUB_INDEX = 4;
  const MAX_ENHANCE = 9; 

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

  const EQUIP_GACHA = [ { key:"relic", w:2 }, { key:"limited", w:4 }, { key:"myth", w:10 }, { key:"unique", w:16 }, { key:"rare", w:24 }, { key:"common", w:44 } ];
  const TOTEM_GACHA = [ { key:"limited", w:1 }, { key:"premium", w:3 }, { key:"myth", w:10 }, { key:"unique", w:16 }, { key:"rare", w:24 }, { key:"common", w:46 } ];

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
  // Totem icons (Patterns)
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
      + '<polyline points="'+pts+'"></polyline></svg>';
  }

  // =========================
  // Equipment pools
  // =========================
  const EQUIP_BY_GRADE = {
    relic: [ { id:"E_NEWTON",  name:"뉴턴의 깨달음" }, { id:"E_TURING",  name:"앨런 튜링의 알고리즘" }, { id:"E_EINSTEIN",name:"아인슈타인의 실수" } ],
    limited: [ { id:"E_BUFFETT", name:"워렌 버핏의 장부" }, { id:"E_MUSK",    name:"일론 머스크의 상상" }, { id:"E_JENSEN",  name:"젠슨 황의 가속기" }, { id:"E_FED",     name:"연준의장의 원칙" } ],
    myth: [ { id:"E_VOL_CORE", name:"변동성 흡수 코어" }, { id:"E_MKT_CAP",  name:"시가총액 부스터" } ],
    unique: [ { id:"E_LEV_GLOVE", name:"레버리지 글러브" }, { id:"E_MARGIN",    name:"마진 방패" } ],
    rare: [ { id:"E_STOP_RING", name:"손절의 반지" }, { id:"E_TAKE_NECK", name:"익절의 목걸이" } ],
    common: [ { id:"E_TAX_BADGE", name:"금리 차익 배지" }, { id:"E_PROTECT",   name:"청산 방지 부적" }, { id:"E_REBAL",     name:"리밸런스 키트" } ],
  };

  const TOTEM_SPECIAL = {
    common: [ { id:"T_LONG_BULL",     name:"장대양봉",    patternId:"ASC_TRI" }, { id:"T_GOLDEN_CROSS",  name:"골든크로스",  patternId:"RND_BOT" }, { id:"T_RSI_OVERSOLD",  name:"RSI 과매도",  patternId:"INV_HS" } ],
    premium: [ { id:"T_DEADCAT", name:"데드캣 바운스", patternId:"DBL_BOT" }, { id:"T_MACD",    name:"MACD",         patternId:"SYM_TRI" } ],
    limited: [ { id:"T_BLACK_SWAN",  name:"블랙 스완",  patternId:"DIAMOND" }, { id:"T_SANTA_RALLY", name:"산타 랠리",  patternId:"ASC_FLAG" } ],
  };

  function buildChartTotems(){
    const all = CHART_PATTERNS.map(p => ({ id:"T_PAT_"+p.id, name:p.name, patternId:p.id }));
    const used = new Set([ ...Object.values(TOTEM_SPECIAL).flat().map(x=>x.patternId) ]);
    const remain = all.filter(x => !used.has(x.patternId));
    const rareCount = Math.min(6, remain.length);
    const uniqueCount = Math.min(6, Math.max(0, remain.length - rareCount));
    const rare = remain.slice(0, rareCount);
    const unique = remain.slice(rareCount, rareCount + uniqueCount);
    const myth = remain.slice(rareCount + uniqueCount);
    if(myth.length === 0){
      if(unique.length > 0) myth.push(unique.pop());
      else if(rare.length > 0) myth.push(rare.pop());
    }
    return { rare, unique, myth };
  }

  const CHART_TOTEMS = buildChartTotems();
  const TOTEM_BY_GRADE = { common: TOTEM_SPECIAL.common, rare: CHART_TOTEMS.rare, unique: CHART_TOTEMS.unique, myth: CHART_TOTEMS.myth, premium: TOTEM_SPECIAL.premium, limited: TOTEM_SPECIAL.limited };

  function poolFor(tab, gradeKey){ return (tab === "equip") ? (EQUIP_BY_GRADE[gradeKey] || EQUIP_BY_GRADE.common) : (TOTEM_BY_GRADE[gradeKey] || TOTEM_BY_GRADE.common); }
  function gachaTableFor(tab){ return (tab === "equip") ? EQUIP_GACHA : TOTEM_GACHA; }

  function pickRandomItem(tab, gradeKey){
    const tryGrades = [gradeKey, "common", "rare", "unique", "myth", "premium", "limited", "relic"];
    for(const g of tryGrades){
      const pool = poolFor(tab, g);
      if(Array.isArray(pool) && pool.length>0){
        const pick = pool[Math.floor(Math.random()*pool.length)];
        if(pick && pick.id) return { ...pick, grade: g, patternId: pick.patternId || null };
      }
    }
    const all = (tab === "equip") ? Object.values(EQUIP_BY_GRADE).flat() : Object.values(TOTEM_BY_GRADE).flat();
    const p = all.find(x=>x && x.id);
    if(p) return { ...p, grade:"common", patternId: p.patternId || null };
    return null;
  }

  // =========================
  // Persistence
  // =========================
  const STORAGE_KEY = "mana-war-progress-v4";
  const LOADOUT_KEY = "mana-war-loadout-v4";

  const stageProgress = new Map();
  const loadoutState = {
    tab: "equip", 
    sortMode: { equip: "grade", totem: "grade" },
    equip: { equip: [null,null,null], totem: [null,null,null] },
    inv: { equip: [], totem: [] }, 
  };

  function loadProgress(){
    try{ const raw = localStorage.getItem(STORAGE_KEY); if(!raw) return; const obj = JSON.parse(raw); if(!obj || typeof obj!=="object") return; for(const k in obj) stageProgress.set(k, Number(obj[k])||0); }catch(_e){}
  }
  function saveProgress(){
    try{ const obj = {}; for(const [k,v] of stageProgress.entries()) obj[k]=v; localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); }catch(_e){}
  }
  function getBestProgress(code){ return stageProgress.get(code) || 0; }
  function recordProgress(code, pct){ stageProgress.set(code, Math.max(getBestProgress(code), pct)); saveProgress(); }

  function loadLoadout(){
    try{
      const raw = localStorage.getItem(LOADOUT_KEY); if(!raw) return; const obj = JSON.parse(raw); if(!obj || typeof obj!=="object") return;
      if(obj.tab) loadoutState.tab = obj.tab;
      if(obj.sortMode && typeof obj.sortMode === "object"){
        if(obj.sortMode.equip) loadoutState.sortMode.equip = obj.sortMode.equip;
        if(obj.sortMode.totem) loadoutState.sortMode.totem = obj.sortMode.totem;
      }
      if(obj.equip && obj.equip.equip && obj.equip.totem){ loadoutState.equip.equip = obj.equip.equip; loadoutState.equip.totem = obj.equip.totem; }
      if(obj.inv && obj.inv.equip && obj.inv.totem){ loadoutState.inv.equip = obj.inv.equip; loadoutState.inv.totem = obj.inv.totem; }
      normalizeInventory("equip"); normalizeInventory("totem"); saveLoadout();
    }catch(_e){}
  }
  function saveLoadout(){ try{ localStorage.setItem(LOADOUT_KEY, JSON.stringify(loadoutState)); }catch(_e){} }

  // =========================
  // Inventory & Enhance Logic
  // =========================
  function totalQtyForId(tab, id){
    normalizeInventory(tab);
    let total = 0;
    for(const it of (loadoutState.inv[tab]||[])){
      if(it && String(it.id) === String(id)) total += Math.max(1, Number(it.qty)||1);
    }
    return total;
  }

  function getSortMode(tab){
    const t = tab || loadoutState.tab; const m = loadoutState.sortMode && loadoutState.sortMode[t];
    if(m === "qty_desc" || m === "qty_asc" || m === "grade") return m; return "grade";
  }

  function setSortMode(tab, mode){
    const t = tab || loadoutState.tab; if(!loadoutState.sortMode) loadoutState.sortMode = { equip:"grade", totem:"grade" };
    loadoutState.sortMode[t] = (mode === "qty_desc" || mode === "qty_asc" || mode === "grade") ? mode : "grade";
    saveLoadout();
  }

  function normalizeInventory(tab){
    const inv = loadoutState.inv[tab]; if(!Array.isArray(inv) || inv.length===0) return;
    const byId = new Map();
    for(const it of inv){
      if(!it || !it.id) continue;
      const key = String(it.id) + "_" + (it.lv || 0);
      const qty = Math.max(1, Number(it.qty)||1);
      if(!byId.has(key)){ byId.set(key, { id: it.id, name: it.name, grade: String(it.grade||"common"), patternId: it.patternId||null, lv: it.lv||0, qty });
      } else { byId.get(key).qty += qty; }
    }
    loadoutState.inv[tab] = Array.from(byId.values());
  }

  function addToInventoryStack(tab, item){
    if(!item || !item.id) return; normalizeInventory(tab);
    const inv = loadoutState.inv[tab];
    const lv = item.lv || 0;
    const key = String(item.id) + "_" + lv;
    const found = inv.find(x=> String(x.id)+"_"+(x.lv||0) === key);
    if(found){ found.qty = Math.max(1, Number(found.qty)||1) + 1; }
    else{ inv.push({ id:item.id, name:item.name, grade:item.grade||"common", patternId:item.patternId||null, lv:lv, qty:1 }); }
  }

  function sortInventory(tab){
    normalizeInventory(tab); const inv = loadoutState.inv[tab]; if(!Array.isArray(inv) || inv.length<=1) return;
    const mode = getSortMode(tab);
    inv.sort((a,b)=>{
      const qa = Math.max(1, Number(a?.qty)||1); const qb = Math.max(1, Number(b?.qty)||1);
      const ra = gradeRank(a?.grade); const rb = gradeRank(b?.grade);
      const la = Number(a?.lv)||0; const lb = Number(b?.lv)||0;
      if(mode === "qty_asc"){ if(qa !== qb) return qa - qb; if(rb !== ra) return rb - ra; }
      else if(mode === "qty_desc"){ if(qa !== qb) return qb - qa; if(rb !== ra) return rb - ra; }
      else{ if(rb !== ra) return rb - ra; if(lb !== la) return lb - la; if(qa !== qb) return qb - qa; }
      return String(a?.name||a?.id||"").localeCompare(String(b?.name||b?.id||""), "ko");
    });
  }

  function consumeOne(inv, idx){
    if(idx<0 || idx>=inv.length) return;
    const st = inv[idx]; if(!st) return;
    const qty = Math.max(1, Number(st.qty)||1);
    if(qty>1) st.qty = qty - 1; else inv.splice(idx, 1);
  }

  function enhanceFromInv(tab, invIndex){
    normalizeInventory(tab); const inv = loadoutState.inv[tab];
    if(invIndex<0 || invIndex>=inv.length) return;
    const st = inv[invIndex]; if(!st || !st.id) return;

    const id = String(st.id), name = st.name, grade = st.grade||'common', patternId = st.patternId||null;
    const lv  = clamp(Math.round(Number(st.lv)||0), 0, MAX_ENHANCE);

    if(lv >= MAX_ENHANCE){ overlay('최대 강화(+9)'); return; }
    if(totalQtyForId(tab, id) < 2){ overlay('같은 아이템 2개 필요'); return; }

    consumeOne(inv, invIndex);

    let idx2 = -1, bestLv = 1e9;
    for(let i=0;i<inv.length;i++){
      const it = inv[i];
      if(it && String(it.id) === id){
        const lvi = clamp(Math.round(Number(it.lv)||0),0,MAX_ENHANCE);
        if(lvi < bestLv){ bestLv = lvi; idx2 = i; }
      }
    }
    if(idx2 === -1){ overlay('강화 실패(재시도)'); return; }
    consumeOne(inv, idx2);

    addToInventoryStack(tab, { id, name, grade, patternId, lv: lv+1 });
    sortInventory(tab); saveLoadout(); overlay('강화 성공: +' + (lv+1));
  }

  // =========================
  // Stage helper
  // =========================
  function stageCode(main, sub){ return String(main) + "-" + ((Number(sub)<10) ? ("0"+String(Number(sub))) : String(Number(sub))); }
  function parseStageCode(code){ const p = String(code).split("-"); return { main:Number(p[0]||1), sub:Number(p[1]||1) }; }
  function nextStage(main, sub){ if(main===MAIN_STAGE_COUNT && sub===SUB_STAGE_COUNT) return null; if(sub<SUB_STAGE_COUNT) return stageCode(main, sub+1); return stageCode(main+1, 1); }

  const STAGE_MASTER = [
    { bossName:"튜토리얼 시스템", gimmick:"강제청산 학습", fxMin:1000, fxMax:1200 },
    { bossName:"잠식된 선동가",   gimmick:"패턴 예고 강화", fxMin:1050, fxMax:1250 },
    { bossName:"탐욕의 큰손",     gimmick:"자본 잠식", fxMin:1100, fxMax:1350 },
    { bossName:"냉혈한 매니저",   gimmick:"공매도", fxMin:1150, fxMax:1400 },
    { bossName:"달러의 군주",     gimmick:"금리 인상", fxMin:1200, fxMax:1500 },
    { bossName:"공허의 약탈자",   gimmick:"실시간 환율", fxMin:1000, fxMax:1800 },
    { bossName:"자애로운 성자",   gimmick:"유동성 공급", fxMin:1300, fxMax:1300 },
  ];
  function masterFor(main){ return STAGE_MASTER[clamp(main-1, 0, STAGE_MASTER.length-1)]; }

  // =========================
  // Canvas setup
  // =========================
  const canvas = el("game");
  const ctx = canvas.getContext("2d");

  (function ensureRoundRect(){
    if(!CanvasRenderingContext2D || CanvasRenderingContext2D.prototype.roundRect) return;
    CanvasRenderingContext2D.prototype.roundRect = function(x,y,w,h,r){
      const rr = (typeof r==="number") ? {tl:r,tr:r,br:r,bl:r} : (r||{tl:0,tr:0,br:0,bl:0});
      const tl=rr.tl||0,tr=rr.tr||0,br=rr.br||0,bl=rr.bl||0;
      this.moveTo(x+tl,y); this.arcTo(x+w,y,x+w,y+h,tr); this.arcTo(x+w,y+h,x,y+h,br); this.arcTo(x,y+h,x,y,bl); this.arcTo(x,y,x+w,y,tl); this.closePath(); return this;
    };
  })();

  // HUD refs
  const stageHudEl = el("stageHud"), gimmickHudEl = el("gimmickHud"), timeEl = el("time"), playEl = el("play"), manaEl = el("mana"), manaMaxEl = el("manaMax");
  const fxEl = el("fx"), fxMulEl = el("fxMul"), fxNextEl = el("fxNext"), fxCdEl = el("fxCd"), bossNameEl = el("bossName");
  const patternTextEl = el("patternText"), nextPatternTextEl = el("nextPatternText");
  const doomChip = el("doomChip"), doomLabelEl = el("doomLabel"), doomTextEl = el("doomText"), doomUnitEl = el("doomUnit");
  const scoreEl = el("score"), coinsEl = el("coins"), basePEl = el("baseP"), baseEEl = el("baseE");
  const progressBarEl = el("progressBar"), progressPctEl = el("progressPct"), overlayMsgEl = el("overlayMsg"), cardsWrap = el("cards"), dbgEl = el("dbg");

  // Modals
  const titleModal = el("titleModal"), howModal = el("howModal"), startMenuModal = el("startMenuModal"), stageModal = el("stageModal"), loadoutModal = el("loadoutModal"), endModal = el("endModal"), storyModal = el("storyModal");
  const storyTitleEl = el("storyTitle"), storyTextEl = el("storyText"), storyNextBtn = el("storyNextBtn"), storySkipBtn = el("storySkipBtn");

  // Buttons Event Listeners
  if(el("startBtn")) el("startBtn").addEventListener("click", ()=>{ hideModal(titleModal); showModal(startMenuModal); });
  if(el("howBtn")) el("howBtn").addEventListener("click", ()=>{ showModal(howModal); });
  if(el("howCloseBtn")) el("howCloseBtn").addEventListener("click", ()=>{ hideModal(howModal); });
  if(howModal) howModal.addEventListener("click", (e)=>{ if(e.target===howModal) hideModal(howModal); });

  if(storyNextBtn) storyNextBtn.addEventListener("click", ()=>nextStory());
  if(storySkipBtn) storySkipBtn.addEventListener("click", ()=>skipStory());
  if(storyModal) storyModal.addEventListener("click", (e)=>{ if(e.target===storyModal) skipStory(); });

  if(el("startMenuBackBtn")) el("startMenuBackBtn").addEventListener("click", ()=>{ hideModal(startMenuModal); showModal(titleModal); });
  if(el("goStageSelectBtn")) el("goStageSelectBtn").addEventListener("click", ()=>{ hideModal(startMenuModal); openStageSelect(); });
  if(el("goLoadoutBtn")) el("goLoadoutBtn").addEventListener("click", ()=>{ hideModal(startMenuModal); openLoadout(); });

  if(el("openStageBtn")) el("openStageBtn").addEventListener("click", openStageSelect);
  if(el("openLoadoutBtn")) el("openLoadoutBtn").addEventListener("click", openLoadout);

  if(el("closeStageBtn")) el("closeStageBtn").addEventListener("click", ()=>hideModal(stageModal));
  if(el("backToTitleBtn")) el("backToTitleBtn").addEventListener("click", ()=>{ hideModal(stageModal); showModal(titleModal); });
  if(el("resetProgressBtn")) el("resetProgressBtn").addEventListener("click", ()=>{ stageProgress.clear(); saveProgress(); buildStageUI(); alert("진행도 초기화 완료"); });

  if(el("retryBtn")) el("retryBtn").addEventListener("click", ()=>{ hideModal(endModal); startGame(selectedStageCode); });
  if(el("nextBtn")) el("nextBtn").addEventListener("click", ()=>{
    const cur = parseStageCode(selectedStageCode); const nx = nextStage(cur.main, cur.sub);
    if(!nx){ alert("마지막 스테이지입니다."); return; }
    hideModal(endModal); selectedStageCode = nx; startGame(selectedStageCode);
  });

  let overlayTimer = null;
  function overlay(msg){
    if(!overlayMsgEl) return;
    overlayMsgEl.textContent = msg; overlayMsgEl.classList.add("show");
    if(overlayTimer) clearTimeout(overlayTimer);
    overlayTimer = setTimeout(()=>overlayMsgEl.classList.remove("show"), 900);
  }

  // =========================
  // Story / cutscenes
  // =========================
  let storyLines = [], storyIdx = 0;

  function formatStoryLine(line){
    const parts = String(line||"").split(":");
    if(parts.length >= 2){
      const who = escapeHtml(parts.shift().trim());
      const say = escapeHtml(parts.join(":").trim());
      return '<div class="who">'+who+'</div><div class="say">'+say+'</div>';
    }
    return escapeHtml(String(line||""));
  }

  function renderStory(){
    if(!storyTextEl) return;
    storyTextEl.innerHTML = formatStoryLine(storyLines[storyIdx] || "");
    if(storyNextBtn) storyNextBtn.textContent = (storyIdx >= storyLines.length-1) ? "OK" : "NEXT";
  }

  function openStory(title, lines){
    if(!lines || !lines.length) return;
    if(isShown(storyModal)) return; 
    storyLines = lines.slice(); storyIdx = 0;
    if(storyTitleEl) storyTitleEl.textContent = title || "📜 STORY";
    renderStory(); showModal(storyModal);
  }

  function nextStory(){ if(!isShown(storyModal)) return; if(storyIdx < storyLines.length-1){ storyIdx++; renderStory(); }else{ hideModal(storyModal); } }
  function skipStory(){ if(isShown(storyModal)) hideModal(storyModal); }

  function storyForStageStart(main, sub){
    const master = masterFor(main); const code = stageCode(main, sub); const lines = [];
    if(main === 1){
      lines.push("시스템: 튜토리얼에 진입했습니다."); lines.push("시스템: 목표는 간단합니다. 거대 자본(적 본진)을 무너뜨리세요.");
      lines.push("시스템: 단, 적 본진이 15% 아래로 떨어지면 '강제청산 경고'가 시작됩니다."); lines.push("시스템: 10% 아래로 떨어지면 3초 후 강제청산. 그 전에 끝내세요.");
    }else{
      lines.push("전략가: STAGE "+code+" 진입."); lines.push("전략가: 보스 - "+master.bossName+" / 기믹 - "+master.gimmick);
      lines.push("전략가: 환율 예고(3초)와 패턴 진동(2초 전)을 활용해 밀어붙인다.");
    }
    return { title: "🎬 스테이지 시작", lines };
  }

  function storyForMidboss(main){
    const master = masterFor(main);
    return { title: "⚔️ 중간보스", lines: [ "시스템: 세부 4 - 중간보스 구간입니다.", "시스템: "+master.bossName+"의 패턴이 더 거칠어집니다.", "전략가: 여기서 무너지면 끝. 리스크는 내가 관리한다." ] };
  }

  // =========================
  // Loadout UI
  // =========================
  const tabEquipBtn = el("tabEquip"), tabTotemBtn = el("tabTotem"), slotRowEl = el("slotRow"), invWrapEl = el("invWrap");
  const equipCountEl = el("equipCount"), draw1Btn = el("draw1Btn"), draw10Btn = el("draw10Btn"), sortSelectEl = el("sortSelect");

  if(el("loadoutCloseBtn")) el("loadoutCloseBtn").addEventListener("click", ()=>hideModal(loadoutModal));
  if(el("clearInvBtn")) el("clearInvBtn").addEventListener("click", ()=>{ loadoutState.inv[loadoutState.tab] = []; saveLoadout(); renderLoadout(); });

  if(tabEquipBtn) tabEquipBtn.addEventListener("click", ()=>{ loadoutState.tab="equip"; saveLoadout(); renderLoadout(); });
  if(tabTotemBtn) tabTotemBtn.addEventListener("click", ()=>{ loadoutState.tab="totem"; saveLoadout(); renderLoadout(); });
  if(sortSelectEl) sortSelectEl.addEventListener("change", ()=>{ setSortMode(loadoutState.tab, sortSelectEl.value); sortInventory(loadoutState.tab); renderLoadout(); });
  if(draw1Btn) draw1Btn.addEventListener("click", ()=>{ drawMany(loadoutState.tab, 1); renderLoadout(); });
  if(draw10Btn) draw10Btn.addEventListener("click", ()=>{ drawMany(loadoutState.tab, 10); renderLoadout(); });

  function openLoadout(){ renderLoadout(); showModal(loadoutModal); }

  function slotInner(tab, item, isSlot){
    if(!item) return "<b>빈 슬롯</b><span style=\"opacity:.7\">("+(tab==="equip"?"장비":"토템")+")</span>";
    const gk = item.grade || "common"; const cls = gradeCssClass(gk);
    const tag = '<span class="gradeTag '+cls+'">'+gradeLabel(gk)+'</span>';
    const lvStr = item.lv ? (' <span style="color:#f1c40f;font-weight:bold;">+'+item.lv+'</span>') : '';
    const qty = Math.max(1, Number(item.qty)||1);
    const qtyText = (!isSlot) ? ' <span style="opacity:.9;font-weight:1000;">x'+qty+'</span>' : '';
    const name = '<span class="name itemName '+cls+'">'+escapeHtml(item.name||item.id)+lvStr+'</span>' + qtyText;
    let icon = tab==="totem" ? svgForPattern(item.patternId || "SYM_TRI") : '<div class="miniSvg" style="display:grid;place-items:center;font-weight:1000;">🧿</div>';
    return icon + '<div style="display:flex;flex-direction:column;gap:4px;">' + '<div class="nameLine">'+tag+name+'</div>' + '<div class="small" style="opacity:.72;">'+(isSlot?"슬롯":"인벤")+'</div></div>';
  }

  function fitTextToBox(node, maxPx=13, minPx=7){
    if(!node) return;
    node.style.wordBreak = "keep-all"; node.style.whiteSpace = "nowrap"; node.style.fontSize = maxPx + "px";
    let size = maxPx, guard = 0;
    while(size > minPx && node.scrollWidth > node.clientWidth + 1 && guard < 30){ size = Math.round((size - 0.5) * 10) / 10; node.style.fontSize = size + "px"; guard++; }
    if(node.scrollWidth > node.clientWidth + 1){ node.style.whiteSpace = "normal"; node.style.fontSize = Math.max(10, minPx + 2) + "px"; }
  }

  function renderLoadout(){
    if(!slotRowEl || !invWrapEl) return;
    sortInventory(loadoutState.tab);
    if(tabEquipBtn) tabEquipBtn.classList.toggle("active", loadoutState.tab==="equip"); 
    if(tabTotemBtn) tabTotemBtn.classList.toggle("active", loadoutState.tab==="totem");
    if(draw1Btn) draw1Btn.textContent = (loadoutState.tab==="equip") ? "장비 1연 뽑기" : "토템 1연 뽑기";
    if(draw10Btn) draw10Btn.textContent = (loadoutState.tab==="equip") ? "장비 10연 뽑기" : "토템 10연 뽑기";
    if(sortSelectEl) sortSelectEl.value = getSortMode(loadoutState.tab);
    
    const tab = loadoutState.tab, slots = loadoutState.equip[tab];
    slotRowEl.innerHTML = "";
    slots.forEach((it, idx)=>{
      const div = document.createElement("div"); div.className = "slot"; div.innerHTML = slotInner(tab, it, true); div.title = "클릭하면 해제";
      div.addEventListener("click", ()=>{ if(it){ unequipToInv(tab, idx); renderLoadout(); } });
      slotRowEl.appendChild(div);
    });

    invWrapEl.innerHTML = "";
    const inv = loadoutState.inv[tab];
    inv.forEach((it, idx)=>{
      if(!it || !it.id) return;
      const div = document.createElement("div"); div.className = "invItem";
      
      const content = document.createElement("div");
      content.style.display="flex"; content.style.gap="10px"; content.style.alignItems="center";
      content.innerHTML = slotInner(tab, it, false);
      
      const canEnh = (totalQtyForId(tab, it.id) >= 2) && (clamp(Math.round(Number(it.lv)||0),0,MAX_ENHANCE) < MAX_ENHANCE);
      const enhBtn = document.createElement("button");
      enhBtn.className = "invBtn"; enhBtn.type="button"; enhBtn.textContent = "강화";
      if(!canEnh) enhBtn.disabled = true;
      
      enhBtn.addEventListener("click", (e)=>{ e.stopPropagation(); enhanceFromInv(tab, idx); renderLoadout(); });
      content.addEventListener("click", ()=>{ equipFromInv(tab, idx); renderLoadout(); });
      
      div.appendChild(content); div.appendChild(enhBtn);
      invWrapEl.appendChild(div);
    });

    const equipCount = loadoutState.equip.equip.filter(Boolean).length; const totemCount = loadoutState.equip.totem.filter(Boolean).length;
    if(equipCountEl) equipCountEl.textContent = "장비 " + equipCount + "/3 · 토템 " + totemCount + "/3";
    requestAnimationFrame(()=> { if(loadoutModal) loadoutModal.querySelectorAll(".slot .itemName, .invItem .itemName").forEach(n=>fitTextToBox(n, 13, 7)); });
  }

  function equipFromInv(tab, invIndex){
    normalizeInventory(tab); const inv = loadoutState.inv[tab]; if(invIndex<0 || invIndex>=inv.length) return;
    const slots = loadoutState.equip[tab], empty = slots.findIndex(x=>!x);
    if(empty===-1) { overlay("슬롯이 가득 찼어"); return; }
    const stack = inv[invIndex]; if(!stack || !stack.id) return; 
    slots[empty] = { id:stack.id, name:stack.name, grade:stack.grade, patternId:stack.patternId||null, lv:stack.lv||0 };
    consumeOne(inv, invIndex); sortInventory(tab); saveLoadout();
  }

  function unequipToInv(tab, slotIndex){
    const slots = loadoutState.equip[tab]; if(slotIndex<0 || slotIndex>=slots.length) return;
    const item = slots[slotIndex]; if(!item) return; slots[slotIndex]=null;
    addToInventoryStack(tab, item); sortInventory(tab); saveLoadout();
  }

  function drawMany(tab, n){
    for(let i=0;i<Math.max(1, Number(n)||1);i++){
      const g = rollFromTable(gachaTableFor(tab)), pick = pickRandomItem(tab, g);
      if(!pick || !pick.id) continue;
      addToInventoryStack(tab, { id: pick.id, name: pick.name, grade: pick.grade || g, patternId: pick.patternId || null, lv:0 });
    }
    sortInventory(tab); saveLoadout();
  }

  // =========================
  // Stage select UI
  // =========================
  const mainStageGridEl = el("mainStageGrid"), subStageGridEl = el("subStageGrid"), selectedMainEl = el("selectedMain");
  let selectedStageCode = stageCode(1,1), selectedMain = 1;

  function openStageSelect(){ buildStageUI(); showModal(stageModal); }
  function buildStageUI(){
    if(!mainStageGridEl || !subStageGridEl) return;
    mainStageGridEl.innerHTML = "";
    for(let m=1;m<=MAIN_STAGE_COUNT;m++){
      const master = masterFor(m), div = document.createElement("div");
      const anyCleared = Array.from({length:SUB_STAGE_COUNT}, (_,i)=> getBestProgress(stageCode(m, i+1)) >= 30).some(Boolean);
      div.className = "stageBtn" + (m===selectedMain?" active":"") + (anyCleared?" cleared":"");
      div.innerHTML = '<div class="t">STAGE '+m+' <span style="opacity:.75">·</span> <span style="opacity:.9">'+escapeHtml(master.bossName)+'</span></div><div class="d">'+escapeHtml(master.gimmick)+'</div>';
      div.addEventListener("click", ()=>{ selectedMain=m; buildStageUI(); });
      mainStageGridEl.appendChild(div);
    }
    if(selectedMainEl) selectedMainEl.textContent = String(selectedMain);
    subStageGridEl.innerHTML = "";
    for(let s=1;s<=SUB_STAGE_COUNT;s++){
      const code = stageCode(selectedMain, s), btn = document.createElement("button");
      btn.type = "button"; const cleared = (getBestProgress(code) >= 30);
      btn.className = "subBtn" + (s===MIDBOSS_SUB_INDEX?" midboss":"") + (cleared?" cleared":"");
      btn.innerHTML = '<div style="font-weight:1000;font-size:16px;">'+s+'</div><div style="font-size:11px;opacity:.85;">'+(s===MIDBOSS_SUB_INDEX?"B":"")+'</div>';
      btn.addEventListener("click", ()=>{ selectedStageCode = code; hideModal(stageModal); startGame(code); });
      subStageGridEl.appendChild(btn);
    }
  }

  // =========================
  // Units
  // =========================
  const UNIT_DB = [
    { id:"U1", name:"개미 병사", cost:8,  hp:240, atk:18, rate:0.9, range:45,  speed:70,  unlockAt: "1-01" },
    { id:"U2", name:"단타 자객", cost:14, hp:180, atk:42, rate:1.4, range:42,  speed:110, unlockAt: "1-01" },
    { id:"U3", name:"헤지 마법사", cost:26, hp:220, atk:22, rate:0.7, range:140, speed:60,  unlockAt: "1-01" },
    { id:"U4", name:"포지션 브레이커", cost:36, hp:360, atk:38, rate:0.9, range:45,  speed:80,  unlockAt: "1-02" },
    { id:"U5", name:"리밸런스 대포",   cost:52, hp:260, atk:78, rate:1.6, range:170, speed:55,  unlockAt: "1-04" },
  ];

  function isUnlockedUnit(u){ return (u && u.id === "U1") || (getBestProgress(u.unlockAt || "1-01") >= 30); }
  function unitCost(u){ return Math.max(1, Math.ceil((u.cost || 0) * ((state.fx || 1000) / 1000))); }

  function buildCards(){
    if(!cardsWrap) return;
    cardsWrap.innerHTML = "";
    UNIT_DB.forEach((u, idx)=>{
      const btn = document.createElement("button"); btn.className = "card"; btn.type = "button";
      const unlocked = isUnlockedUnit(u); btn.disabled = !unlocked;
      btn.innerHTML = '<div class="name">'+escapeHtml(u.name)+'</div><div class="meta"><span>비용 '+unitCost(u)+'</span>' + (unlocked ? '<span style="opacity:.75">#'+(idx+1)+'</span>' : '<span style="opacity:.85">해금: '+escapeHtml(u.unlockAt)+' 30%+</span>') + '</div>';
      btn.addEventListener("click", ()=>spawnUnit(u));
      cardsWrap.appendChild(btn);
    });
  }

  // =========================
  // Game state & Graphic Settings
  // =========================
  const state = {
    running:false, stageCode:"1-01", main:1, sub:1,
    fx:1000, fxNext:1100, fxT:0, play:0, timeLeft:CFG.durationSec, mana:0, score:0, coins:0,
    baseP: {...CFG.baseP}, baseE: {...CFG.baseE}, units:[], enemies:[], kills:0, dmgToEnemyBase:0,
    patternNow:"-", patternNext:"-", patternQueue:[], shakeT:0, enemySpawnT:0, paused:false,
    doomActive:false, doomWarn15:false, doomStory15:false, doomStory10:false, doomFired:false,
    particles: [], bgCandles: null
  };

  // =========================
  // Graphics - Particle & Background System
  // =========================
  function spawnDamageText(x, y, amount, isEnemyHit) {
    state.particles.push({
      type: 'text',
      x: x + (Math.random() * 20 - 10),
      y: y + (Math.random() * 20 - 10),
      text: "-" + amount,
      color: isEnemyHit ? "#ff4747" : "#00cec9", 
      life: 0.8,
      maxLife: 0.8,
      vy: -40
    });
  }

  function spawnHitEffect(x, y, color) {
    state.particles.push({
      type: 'hit',
      x: x + (Math.random() * 20 - 10),
      y: y + (Math.random() * 20 - 10),
      radius: 4,
      color: color || "rgba(255, 255, 255, 0.8)",
      life: 0.25,
      maxLife: 0.25
    });
  }

  function updateParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
      let p = state.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        state.particles.splice(i, 1);
        continue;
      }
      if (p.type === 'text') {
        p.y += p.vy * dt;
        p.vy += 30 * dt; // gravity
      } else if (p.type === 'hit') {
        p.radius += 30 * dt; // expand
      }
    }
  }

  function generateBackgroundCandles(w, h) {
    let candles = [];
    let cx = 0;
    let cy = h / 2;
    for (let i = 0; i < 50; i++) {
      let isUp = Math.random() > 0.5;
      let bodyH = Math.random() * 60 + 10;
      let shadowH = bodyH + Math.random() * 60;
      cy += (Math.random() * 50 - 25); 
      cy = clamp(cy, h*0.2, h*0.8);
      candles.push({ x: cx, y: cy, bodyH, shadowH, isUp });
      cx += 35;
    }
    return candles;
  }

  // =========================
  // Core Game Logic
  // =========================
  function resetStateForStage(code){
    const {main, sub} = parseStageCode(code); const master = masterFor(main);
    state.running = true; state.stageCode = code; state.main = main; state.sub = sub;
    state.fx = master.fxMin; state.fxNext = master.fxMax; state.fxT = 0; state.play = 0; state.timeLeft = CFG.durationSec;
    state.mana = 40; state.score = 0; state.coins = 0;
    state.baseP = {...CFG.baseP}; state.baseE = {...CFG.baseE}; state.units = []; state.enemies = []; state.kills = 0; state.dmgToEnemyBase = 0;
    state.patternNow = "-"; state.patternNext = "-"; state.patternQueue = [
      { at: 20, name: "마나 드레인", type:"mana", amount: 25 }, { at: 45, name: "공격 속도 저하", type:"slow", dur: 6 }, { at: 75, name: "환율 급변", type:"fx" }
    ];
    if(main===1) state.patternQueue.push({ at: 105, name: "강제청산", type:"doom" });
    state.patternQueue.sort((a,b)=>a.at-b.at);

    state.shakeT = 0; state.enemySpawnT = enemySpawnInterval();
    state.paused = false; state.particles = []; state.bgCandles = generateBackgroundCandles(1100, 520);
    state.doomActive = (main===1); state.doomWarn15 = false; state.doomStory15 = false; state.doomStory10 = false; state.doomFired = false;

    if(stageHudEl) stageHudEl.textContent = code; 
    if(gimmickHudEl) gimmickHudEl.textContent = master.gimmick; 
    if(bossNameEl) bossNameEl.textContent = master.bossName;
    if(manaMaxEl) manaMaxEl.textContent = String(CFG.manaMax); 
    if(doomChip) doomChip.style.display = state.doomActive ? "flex" : "none";
    
    buildCards(); updateEnemySpawns(0); // spawn initial enemy
    
    const st = storyForStageStart(main, sub); openStory(st.title, st.lines);
    if(sub===MIDBOSS_SUB_INDEX){
      const mb = storyForMidboss(main); storyLines = storyLines.concat(["", "—", ""].concat(mb.lines));
      if(storyTitleEl) storyTitleEl.textContent = st.title; renderStory();
    }
    overlay("게임 시작"); updateHUD();
  }

  function spawnUnit(u){
    if(!state.running) return; const cost = unitCost(u);
    if(state.mana < cost){ overlay("마나 부족"); return; }
    state.mana -= cost;
    state.units.push({ name:u.name, x:CFG.playerSpawnX, y:CFG.laneY, hp:u.hp, maxHp:u.hp, atk:u.atk, rate:u.rate, range:u.range, speed:u.speed, cd:0, attackAnim:0 });
  }

  function spawnEnemy(){
    const m = state.main, isMid = (state.sub===MIDBOSS_SUB_INDEX);
    let hp = 170 + m*28, atk = 13 + m*2, speed = 60 + m*2, rate = 1.0;
    if(isMid){ hp *= 1.55; atk *= 1.35; speed *= 0.92; rate = 0.9; }
    state.enemies.push({ x:CFG.enemySpawnX, y:CFG.laneY, hp:Math.round(hp), maxHp:Math.round(hp), atk:Math.round(atk), rate, range:45, speed, cd:0, attackAnim:0 });
  }

  function enemySpawnInterval(){ let t = CFG.enemySpawnEvery * (1 - (state.main-1)*0.05); if(state.sub===MIDBOSS_SUB_INDEX) t *= 0.92; return clamp(t, 0.9, 3.5); }
  
  function updateEnemySpawns(dt){
    state.enemySpawnT += dt; const itv = enemySpawnInterval();
    while(state.enemySpawnT >= itv){ state.enemySpawnT -= itv; spawnEnemy(); }
  }

  function applyPattern(p){
    state.patternNow = p.name;
    if(p.type==="mana"){ state.mana = Math.max(0, state.mana - (p.amount||0)); overlay("패턴: 마나 드레인"); }
    else if(p.type==="slow"){ overlay("패턴: 공속 저하"); }
    else if(p.type==="fx"){ state.fxT = CFG.fxChangeEverySec - 0.2; overlay("패턴: 환율 급변"); }
    else if(p.type==="doom"){ state.baseP.hp = 0; state.mana = 0; state.doomFired = true; overlay("강제청산 발동"); endGame(false, "강제청산"); }
  }

  function updatePatterns(dt){
    if(!state.patternQueue.length){ state.patternNext = "-"; return; }
    const next = state.patternQueue[0]; state.patternNext = next.name + " · " + fmt1(Math.max(0, next.at - state.play)) + "s";
    const until = next.at - state.play;
    if(until <= CFG.vibrateLeadSec && until > 0) state.shakeT = Math.max(state.shakeT, until);
    if(state.play >= next.at){ state.patternQueue.shift(); applyPattern(next); }
  }

  function updateFX(dt){
    const master = masterFor(state.main); state.fxT += dt;
    const cd = CFG.fxChangeEverySec - state.fxT, announce = cd <= CFG.fxAnnounceSec && cd > 0;
    if(fxNextEl) fxNextEl.textContent = announce ? String(state.fxNext) : "-";
    if(fxCdEl) fxCdEl.textContent = announce ? fmt1(cd) : fmt1(Math.max(0, CFG.fxAnnounceSec));

    if(state.fxT >= CFG.fxChangeEverySec){
      state.fxT = 0; const prevFx = state.fx; state.fx = state.fxNext;
      state.fxNext = master.fxMin + Math.round(Math.random()*(master.fxMax-master.fxMin));
      overlay("환율 변동"); if(prevFx !== state.fx) buildCards();
    }
    if(fxMulEl) fxMulEl.textContent = (state.fx / 1000).toFixed(2);
  }

  function updateEntities(dt){
    const units = state.units, enemies = state.enemies;
    const BODY_R = 14, BLOCK_DIST = BODY_R * 2 + 6;
    const enemyBaseEdge = state.baseE.x - state.baseE.w/2, playerBaseEdge = state.baseP.x + state.baseP.w/2;

    // 아군 유닛 업데이트 로직
    for(const u of units){
      let target = null, best = Infinity;
      for(const e of enemies){ const sdx = e.x - u.x; if(sdx >= 0 && sdx < best){ best = sdx; target = e; } }
      if(!target){ for(const e of enemies){ const dist = Math.abs(e.x - u.x); if(dist < best){ best = dist; target = e; } } }
      
      u.cd = (typeof u.cd === "number") ? u.cd : 0; u.cd -= dt;
      u.attackAnim = Math.max(0, (u.attackAnim || 0) - dt);

      if(!target){
        const dxBase = enemyBaseEdge - u.x;
        if(dxBase <= u.range){
          if(u.cd <= 0){
            state.baseE.hp = Math.max(0, state.baseE.hp - u.atk); state.dmgToEnemyBase += u.atk; u.cd = 1 / Math.max(0.1, u.rate||1);
            u.attackAnim = 0.2; spawnDamageText(enemyBaseEdge, CFG.laneY - 30, u.atk, true); spawnHitEffect(enemyBaseEdge, CFG.laneY);
          }
        }else{ u.x = Math.min(u.x + u.speed*dt, enemyBaseEdge - (BODY_R + 2)); }
      }else{
        const dist = Math.abs(target.x - u.x);
        if(dist <= u.range){
          if(u.cd <= 0){
            target.hp -= u.atk; u.cd = 1 / Math.max(0.1, u.rate||1);
            u.attackAnim = 0.2; spawnDamageText(target.x, target.y - 30, u.atk, false); spawnHitEffect(target.x, target.y);
          }
        }else{ u.x = Math.min(u.x + u.speed*dt, target.x - BLOCK_DIST); }
      }
      u.x = clamp(u.x, playerBaseEdge + (BODY_R + 2), enemyBaseEdge - (BODY_R + 2));
    }

    // 적군 유닛 업데이트 로직
    for(const e of enemies){
      let target = null, best = Infinity;
      for(const u of units){ const sdx = e.x - u.x; if(sdx >= 0 && sdx < best){ best = sdx; target = u; } }
      if(!target){ for(const u of units){ const dist = Math.abs(e.x - u.x); if(dist < best){ best = dist; target = u; } } }

      e.cd = (typeof e.cd === "number") ? e.cd : 0; e.cd -= dt;
      e.attackAnim = Math.max(0, (e.attackAnim || 0) - dt);

      if(!target){
        const dxBase = e.x - playerBaseEdge;
        if(dxBase <= e.range + 20){
          if(e.cd <= 0){
            state.baseP.hp = Math.max(0, state.baseP.hp - e.atk); e.cd = 1 / Math.max(0.1, e.rate||1);
            e.attackAnim = 0.2; spawnDamageText(playerBaseEdge, CFG.laneY - 30, e.atk, true); spawnHitEffect(playerBaseEdge, CFG.laneY, "#ff4747");
          }
        }else{ e.x = Math.max(e.x - e.speed*dt, playerBaseEdge + (BODY_R + 2)); }
      }else{
        const dist = Math.abs(e.x - target.x);
        if(dist <= e.range){
          if(e.cd <= 0){
            target.hp -= e.atk; e.cd = 1 / Math.max(0.1, e.rate||1);
            e.attackAnim = 0.2; spawnDamageText(target.x, target.y - 30, e.atk, true); spawnHitEffect(target.x, target.y, "#ff4747");
          }
        }else{ e.x = Math.max(e.x - e.speed*dt, target.x + BLOCK_DIST); }
      }
      e.x = clamp(e.x, playerBaseEdge + (BODY_R + 2), enemyBaseEdge - (BODY_R + 2));
    }

    // 사망 처리 및 겹침 방지 보정 (NO-PASS SOLVER)
    for(let i=units.length-1;i>=0;i--) if(units[i].hp<=0) units.splice(i,1);
    for(let i=enemies.length-1;i>=0;i--){
      if(enemies[i].hp<=0){ enemies.splice(i,1); state.kills++; state.score+=120; state.coins++; }
    }

    if(units.length && enemies.length){
      units.sort((a,b)=>a.x-b.x); enemies.sort((a,b)=>a.x-b.x);
      for(let i=units.length-2;i>=0;i--) if(units[i].x > units[i+1].x - BLOCK_DIST) units[i].x = units[i+1].x - BLOCK_DIST;
      for(let i=1;i<enemies.length;i++) if(enemies[i].x < enemies[i-1].x + BLOCK_DIST) enemies[i].x = enemies[i-1].x + BLOCK_DIST;

      const uFront = units[units.length-1], eFront = enemies[0];
      if(uFront.x > eFront.x - BLOCK_DIST) uFront.x = eFront.x - BLOCK_DIST;
      if(eFront.x < uFront.x + BLOCK_DIST) eFront.x = uFront.x + BLOCK_DIST;

      for(let i=units.length-2;i>=0;i--) if(units[i].x > units[i+1].x - BLOCK_DIST) units[i].x = units[i+1].x - BLOCK_DIST;
      for(let i=1;i<enemies.length;i++) if(enemies[i].x < enemies[i-1].x + BLOCK_DIST) enemies[i].x = enemies[i-1].x + BLOCK_DIST;

      for(const u of units) u.x = clamp(u.x, playerBaseEdge+(BODY_R+2), enemyBaseEdge-(BODY_R+2));
      for(const e of enemies) e.x = clamp(e.x, playerBaseEdge+(BODY_R+2), enemyBaseEdge-(BODY_R+2));
    }
  }

  function getNextDoomAt(){ const ev = state.patternQueue.find(p=>p && p.type==="doom"); return ev ? ev.at : CFG.doomAtSec; }
  function updateDoomFromEnemyHp(){
    if(!state.doomActive || state.doomFired) return;
    if(!state.baseE || !(state.baseE.maxHp>0)) return;
    const ratio = state.baseE.hp / state.baseE.maxHp;

    if(ratio <= 0.15 && !state.doomWarn15){
      state.doomWarn15 = true; overlay("⚠️ 적 본진 15%↓ : 강제청산 경고");
      if(!state.doomStory15){ state.doomStory15 = true; openStory("⚠️ 강제청산 경고", ["시스템: 적 본진이 15% 아래로 떨어졌습니다.", "시스템: 강제청산이 예고됩니다. 더 빨리 끝내세요."]); }
    }
    if(ratio > 0.10) return;

    const curAt = getNextDoomAt(), desiredAt = state.play + 3;
    if(desiredAt + 0.001 < curAt){
      state.patternQueue = state.patternQueue.filter(p=>p && p.type!=="doom");
      state.patternQueue.push({ at: desiredAt, name:"강제청산", type:"doom" });
      state.patternQueue.sort((a,b)=>a.at-b.at);
      overlay("💀 적 본진 10%↓ : 3초 후 강제청산");
    }
    if(!state.doomStory10){ state.doomStory10 = true; openStory("💀 강제청산 임박", ["시스템: 적 본진이 10% 아래로 붕괴했습니다.", "시스템: 3초 후 강제청산 발동. 지금 끝내세요!"]); }
  }

  function updateHUD(){
    if(timeEl) timeEl.textContent = fmt1(state.timeLeft); 
    if(playEl) playEl.textContent = fmt1(state.play); 
    if(manaEl) manaEl.textContent = String(Math.floor(state.mana));
    if(fxEl) fxEl.textContent = String(state.fx);
    
    if(state.doomActive){
      if(doomTextEl) doomTextEl.textContent = fmt1(Math.max(0, getNextDoomAt() - state.play));
      const warn = (!state.doomFired) && ((state.baseE.hp/state.baseE.maxHp) <= 0.15);
      if(doomLabelEl) doomLabelEl.textContent = warn ? "강제청산 경고" : "강제청산까지"; 
      if(doomUnitEl) doomUnitEl.textContent = "s";
      if(doomChip){ doomChip.classList.toggle("danger", warn); doomChip.style.display = "flex"; }
    }else{ 
      if(doomChip){ doomChip.classList.remove("danger"); doomChip.style.display = "none"; }
    }
    
    if(scoreEl) scoreEl.textContent = String(state.score); 
    if(coinsEl) coinsEl.textContent = String(state.coins);
    if(basePEl) basePEl.textContent = String(Math.max(0, state.baseP.hp)); 
    if(baseEEl) baseEEl.textContent = String(Math.max(0, state.baseE.hp));
    if(patternTextEl) patternTextEl.textContent = state.patternNow; 
    if(nextPatternTextEl) nextPatternTextEl.textContent = state.patternNext;
    
    const progress = clamp(Math.round((state.dmgToEnemyBase / state.baseE.maxHp) * 100), 0, 100);
    if(progressPctEl) progressPctEl.textContent = String(progress); 
    if(progressBarEl) progressBarEl.style.width = progress + "%";
  }

  // =========================
  // Rendering
  // =========================
  function drawBackground(w, h) {
    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let x=0; x<w; x+=60) { ctx.moveTo(x,0); ctx.lineTo(x,h); }
    for(let y=0; y<h; y+=60) { ctx.moveTo(0,y); ctx.lineTo(w,y); }
    ctx.stroke();

    // Chart Candles
    if (state.bgCandles) {
      let scrollOffset = (state.play * 20) % 35; // pan left slowly
      ctx.save();
      ctx.translate(-scrollOffset, 0);
      for(let c of state.bgCandles) {
        ctx.fillStyle = c.isUp ? "rgba(255, 71, 71, 0.12)" : "rgba(105, 210, 255, 0.12)";
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(c.x + 10, c.y - c.shadowH/2);
        ctx.lineTo(c.x + 10, c.y + c.shadowH/2);
        ctx.stroke();
        ctx.fillRect(c.x, c.y - c.bodyH/2, 20, c.bodyH);
      }
      ctx.restore();
    }

    // Ground / Lane line (Cyberpunk neon)
    ctx.strokeStyle = (state.doomActive && state.doomWarn15) ? "rgba(255, 71, 71, 0.6)" : "rgba(105, 210, 255, 0.4)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, CFG.laneY);
    ctx.lineTo(w, CFG.laneY);
    ctx.stroke();
  }

  function drawBase(x, y, w, h, ratio, isPlayer) {
    ctx.save();
    ctx.translate(x, y);

    if (isPlayer) {
      // Player Base: Retail Vault
      let gradient = ctx.createLinearGradient(-w/2, 0, w/2, h);
      gradient.addColorStop(0, "#0984e3"); gradient.addColorStop(1, "#00cec9");
      ctx.fillStyle = gradient;
      ctx.beginPath(); ctx.roundRect(-w/2, 0, w, h, 12); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(-w/2 + 10, 10, w - 20, h - 20);
      ctx.fillStyle = "#fff"; ctx.font = "bold 16px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("💰 개미 펀드", 0, h/2);
    } else {
      // Enemy Base: Central Bank Skyscraper
      let gradient = ctx.createLinearGradient(-w/2, 0, w/2, h);
      gradient.addColorStop(0, "#d63031"); gradient.addColorStop(1, "#2d3436");
      ctx.fillStyle = gradient;
      ctx.fillRect(-w/2, 0, w, h);
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      for(let wx = -w/2 + 15; wx < w/2 - 10; wx+= 25) {
        for(let wy = 15; wy < h - 25; wy+= 20) {
          if(Math.random() > 0.15) { // Twinkling lights
            ctx.fillStyle = (state.play % 1 < 0.5 && Math.random()>0.7) ? "#ff7675" : "#fdcb6e";
            ctx.fillRect(wx, wy, 12, 12);
          }
        }
      }
      ctx.fillStyle = "#fff"; ctx.font = "bold 15px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("🏦 거대 자본", 0, h - 10);
    }
    ctx.restore();

    // Health bar
    let bw = w;
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(x - bw/2, y - 15, bw, 8);
    ctx.fillStyle = isPlayer ? "#00ff88" : "#ff4747";
    ctx.fillRect(x - bw/2, y - 15, bw * clamp(ratio, 0, 1), 8);
  }

  function drawUnit(u, isPlayer) {
    ctx.save();
    // Attack bump animation
    let animOffset = 0;
    if (u.attackAnim > 0) {
      let progress = u.attackAnim / 0.2;
      animOffset = Math.sin(progress * Math.PI) * (isPlayer ? 15 : -15);
    }
    let drawX = u.x + animOffset;
    let drawY = u.y;

    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(drawX, drawY + 18, 14, 4, 0, 0, Math.PI*2);
    ctx.fill();

    // Draw Procedural Character Instead of Emoji
    if (isPlayer) {
      drawPlayerUnit(ctx, u, drawX, drawY);
    } else {
      drawEnemyUnit(ctx, u, drawX, drawY);
    }

    // Health bar
    let hpRatio = clamp(u.hp / u.maxHp, 0, 1);
    let bw = 28;
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(drawX - bw/2, drawY + 22, bw, 4);
    ctx.fillStyle = isPlayer ? "#00ff88" : "#ff4747";
    ctx.fillRect(drawX - bw/2, drawY + 22, bw * hpRatio, 4);

    ctx.restore();
  }

  function drawPlayerUnit(ctx, u, x, y) {
    ctx.fillStyle = "#00cec9"; // Neon Mint
    ctx.strokeStyle = "#00cec9";
    ctx.lineWidth = 2;

    // Abdomen (배)
    ctx.beginPath(); ctx.ellipse(x - 12, y + 2, 7, 5, 0, 0, Math.PI*2); ctx.fill();
    // Thorax (가슴)
    ctx.beginPath(); ctx.ellipse(x - 2, y - 2, 6, 5, 0, 0, Math.PI*2); ctx.fill();
    // Head (머리)
    ctx.beginPath(); ctx.arc(x + 6, y - 6, 5, 0, Math.PI*2); ctx.fill();
    // Eye
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(x + 7, y - 7, 1.5, 0, Math.PI*2); ctx.fill();

    // Legs
    ctx.beginPath(); ctx.moveTo(x - 2, y + 2); ctx.lineTo(x - 6, y + 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x + 2, y + 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 2, y); ctx.lineTo(x + 8, y + 10); ctx.stroke();

    // Antenna
    ctx.beginPath(); ctx.moveTo(x + 8, y - 10); ctx.lineTo(x + 12, y - 15); ctx.stroke();

    // Specific Equipments (병종별 장비 시각화)
    if (u.name.includes("단타")) {
      ctx.fillStyle = "#dfe6e9";
      ctx.fillRect(x + 8, y - 2, 8, 2); // right dagger
      ctx.fillRect(x + 4, y + 4, 8, 2); // left dagger
    } else if (u.name.includes("마법사")) {
      ctx.strokeStyle = "#fdcb6e"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + 6, y - 10); ctx.lineTo(x + 10, y + 12); ctx.stroke();
      ctx.fillStyle = "#74b9ff";
      ctx.beginPath(); ctx.arc(x + 6, y - 12, 4, 0, Math.PI*2); ctx.fill();
    } else if (u.name.includes("브레이커")) {
      ctx.strokeStyle = "rgba(0, 206, 201, 0.6)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x + 10, y, 12, -Math.PI/3, Math.PI/3); ctx.stroke();
    } else if (u.name.includes("대포")) {
      ctx.fillStyle = "#636e72";
      ctx.fillRect(x - 10, y - 16, 20, 6);
      ctx.fillStyle = "#ff7675"; // Cannon tip
      ctx.fillRect(x + 10, y - 16, 4, 6);
    }
  }

  function drawEnemyUnit(ctx, u, x, y) {
    if (u.maxHp > 800) { // Big Boss (Bull Market Demon)
      ctx.fillStyle = "#d63031"; // Red
      ctx.beginPath(); ctx.arc(x, y - 10, 16, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#2d3436";
      ctx.beginPath(); ctx.moveTo(x - 12, y - 22); ctx.lineTo(x - 20, y - 35); ctx.lineTo(x - 5, y - 24); ctx.fill(); // Left Horn
      ctx.beginPath(); ctx.moveTo(x + 12, y - 22); ctx.lineTo(x + 20, y - 35); ctx.lineTo(x + 5, y - 24); ctx.fill(); // Right Horn
      // Eyes
      ctx.fillStyle = "#ffeaa7";
      ctx.beginPath(); ctx.arc(x - 6, y - 12, 3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 6, y - 12, 3, 0, Math.PI*2); ctx.fill();
    } else if (u.maxHp > 300) { // Mid Boss (Bear Market)
      ctx.fillStyle = "#b2bec3"; // Dark gray
      ctx.beginPath(); ctx.arc(x, y - 5, 14, 0, Math.PI*2); ctx.fill();
      // Ears
      ctx.beginPath(); ctx.arc(x - 10, y - 16, 5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 10, y - 16, 5, 0, Math.PI*2); ctx.fill();
      // Eyes
      ctx.fillStyle = "#ff7675";
      ctx.beginPath(); ctx.arc(x - 5, y - 6, 2, 0, Math.PI*2); ctx.fill();
    } else { // Suit agent (일반 요원)
      ctx.fillStyle = "#2d3436"; // Suit
      ctx.fillRect(x - 6, y - 8, 12, 20); // Body
      ctx.fillStyle = "#ffeaa7"; // Skin
      ctx.beginPath(); ctx.arc(x, y - 14, 6, 0, Math.PI*2); ctx.fill(); // Head
      ctx.fillStyle = "#d63031"; // Tie
      ctx.beginPath(); ctx.moveTo(x - 2, y - 8); ctx.lineTo(x + 2, y - 8); ctx.lineTo(x, y + 4); ctx.fill();
      // Briefcase (서류가방)
      ctx.fillStyle = "#636e72";
      ctx.fillRect(x - 12, y + 2, 6, 8);
    }
  }

  function drawParticlesSystem() {
    for (let p of state.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      if (p.type === 'text') {
        ctx.fillStyle = p.color;
        ctx.font = "900 20px system-ui";
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 4;
        ctx.fillText(p.text, p.x, p.y);
      } else if (p.type === 'hit') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function draw(){
    if(!canvas || !ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);

    let sx=0, sy=0;
    if(state.shakeT>0){ const amp = 6; sx = (Math.random()*2-1)*amp; sy = (Math.random()*2-1)*amp; }

    ctx.save();
    ctx.translate(sx, sy);

    drawBackground(w, h);

    drawBase(state.baseP.x, CFG.laneY-150, state.baseP.w, state.baseP.h, state.baseP.hp/state.baseP.maxHp, true);
    drawBase(state.baseE.x, CFG.laneY-190, state.baseE.w, state.baseE.h, state.baseE.hp/state.baseE.maxHp, false);

    for(const u of state.units) drawUnit(u, true);
    for(const e of state.enemies) drawUnit(e, false);

    drawParticlesSystem();

    ctx.restore();

    ctx.fillStyle = "rgba(255,255,255,.14)"; ctx.font = "900 16px system-ui"; ctx.fillText("STAGE " + state.stageCode, 18, 24);
  }

  // =========================
  // Game End & Loop
  // =========================
  function endGame(win, reason){
    if(!state.running) return; state.running = false;
    let progress = clamp(Math.round((state.dmgToEnemyBase / state.baseE.maxHp) * 100), 0, 100);
    const {main} = parseStageCode(state.stageCode); if(main===1) progress = Math.max(progress, 30);
    recordProgress(state.stageCode, progress);
    const bonus = progress>=90 ? 80 : (progress>=60 ? 40 : (progress>=30 ? 20 : 0)); state.coins += bonus; updateHUD();
    
    if(el("endStage")) el("endStage").textContent = state.stageCode;
    const title = el("endTitle"); 
    if(title){ title.textContent = win ? "CLEARED" : "DEFEAT"; title.classList.toggle("lose", !win); }
    if(el("star1")) el("star1").classList.toggle("on", progress>=30); 
    if(el("star2")) el("star2").classList.toggle("on", progress>=60); 
    if(el("star3")) el("star3").classList.toggle("on", progress>=90);
    
    if(el("endScore")) el("endScore").textContent = String(state.score); 
    if(el("endCoins")) el("endCoins").textContent = String(state.coins); 
    if(el("endTime")) el("endTime").textContent = fmt1(state.play);
    if(el("endProgress")) el("endProgress").textContent = String(progress); 
    if(el("endKills")) el("endKills").textContent = String(state.kills); 
    if(el("endDmg")) el("endDmg").textContent = String(state.dmgToEnemyBase);
    if(el("endBonus")) el("endBonus").textContent = String(bonus); 
    if(el("bonusWhy")) el("bonusWhy").textContent = (bonus>0) ? (progress>=90?"90%+":"30/60%+") : (reason||"기본");
    
    const map = el("stageMap"); 
    if(map){
      map.innerHTML = "";
      for(let i=1;i<=SUB_STAGE_COUNT;i++){
        const node = document.createElement("div"); node.className = "node" + (i===MIDBOSS_SUB_INDEX?" mid":""); node.textContent = (i===MIDBOSS_SUB_INDEX) ? "B" : String(i);
        map.appendChild(node); if(i<SUB_STAGE_COUNT){ const c = document.createElement("div"); c.className = "conn"; map.appendChild(c); }
      }
    }
    const campaignPct = getBestProgress(state.stageCode); 
    if(el("campaignPct")) el("campaignPct").textContent = String(campaignPct); 
    if(el("campaignBar")) el("campaignBar").style.width = campaignPct + "%";
    
    showModal(endModal);
  }

  function startGame(code){ hideModal(titleModal); hideModal(startMenuModal); hideModal(stageModal); hideModal(loadoutModal); resetStateForStage(code); }

  window.addEventListener("keydown", (e)=>{
    if(e.key==="1") spawnUnit(UNIT_DB[0]); if(e.key==="2") spawnUnit(UNIT_DB[1]); if(e.key==="3") spawnUnit(UNIT_DB[2]);
    if(e.key==="r" || e.key==="R") if(!state.running) { hideModal(endModal); startGame(selectedStageCode); }
    if(e.key==="n" || e.key==="N") if(!state.running){ const cur = parseStageCode(selectedStageCode); const nx = nextStage(cur.main, cur.sub); if(nx){ hideModal(endModal); selectedStageCode = nx; startGame(selectedStageCode); } }
  });

  let lastTs = performance.now();
  function tick(ts){
    const dt = Math.min(0.05, (ts-lastTs)/1000); lastTs = ts;
    if(state.running){
      if(pausedByModal){ updateHUD(); draw(); requestAnimationFrame(tick); return; }
      state.play += dt; state.timeLeft = Math.max(0, CFG.durationSec - state.play);
      updateFX(dt); updatePatterns(dt); state.mana = clamp(state.mana + CFG.manaRegenPerSec * dt, 0, CFG.manaMax);
      updateEnemySpawns(dt); updateEntities(dt); updateParticles(dt); updateDoomFromEnemyHp(); // 파티클 업데이트 추가됨
      const doomAt = getNextDoomAt();
      if(state.doomActive && !state.doomFired && state.play >= doomAt){ applyPattern({ name:"강제청산", type:"doom" }); }
      state.shakeT = Math.max(0, state.shakeT - dt);
      if(state.baseE.hp<=0) endGame(true, "승리"); else if(state.baseP.hp<=0) endGame(false, "본진 파괴"); else if(state.timeLeft<=0) endGame(false, "시간 종료");
      updateHUD();
    }
    draw(); requestAnimationFrame(tick);
  }

  function boot(){ loadProgress(); loadLoadout(); selectedStageCode = stageCode(1,1); selectedMain = 1; showModal(titleModal); buildCards(); renderLoadout(); requestAnimationFrame(tick); }
  
  // Start the game loop
  boot();
})();
