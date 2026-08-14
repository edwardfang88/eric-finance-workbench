/* =========================================================================
   个人研究与知识工作台  app.js
   纯前端 / 离线 / localStorage 持久化 / 零外链
   模块：首页 | 股票复盘 | 读书笔记 | 个人知识库 | 任务与提醒 | 全局搜索 | 设置
   ========================================================================= */
(function(){
'use strict';

/* ----------------------------- 工具函数 ----------------------------- */
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));
const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = p => (p||'id')+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const todayStr = ()=> new Date().toISOString().slice(0,10);
const nowStr = ()=>{ const d=new Date(); const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };
function fmtDate(d, withWeek){ d=d?new Date(d):new Date(); const w=['日','一','二','三','四','五','六'][d.getDay()]; const p=n=>String(n).padStart(2,'0'); const s=`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; return withWeek?`${s} 周${w}`:s; }
function fmtMoney(n, cur){ if(n==null||isNaN(n)) return '—'; const v=Math.abs(n).toLocaleString('zh-CN',{maximumFractionDigits:2}); const sign=n<0?'-':''; const sym=cur==='HK$'?'HK$':cur==='US$'?'$':'¥'; return sign+sym+v; }
function fmtPct(n){ if(n==null||isNaN(n)) return '—'; return (n>0?'+':'')+n.toFixed(2)+'%'; }
function clsForPct(n){ return n>0?'up':(n<0?'down':''); }
const cnWeek = d=>['日','一','二','三','四','五','六'][new Date(d).getDay()];

/* ----------------------------- 存储层 ----------------------------- */
const PREFIX='wb_';
const store={
  get(k,def){ try{ const v=localStorage.getItem(PREFIX+k); return v==null?def:JSON.parse(v);}catch(e){ return def; } },
  set(k,v){ try{ localStorage.setItem(PREFIX+k, JSON.stringify(v)); }catch(e){ toast('保存失败：本地存储异常'); } },
  del(k){ localStorage.removeItem(PREFIX+k); },
  raw(k,def){ try{ const v=localStorage.getItem(k); return v==null?def:JSON.parse(v);}catch(e){ return def; } },
  rawSet(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
};

/* 便捷访问各集合 */
const COL={
  settings:()=>store.get('settings',null),
  tags:()=>store.get('tags',[]),
  tasks:()=>store.get('tasks',[]),
  reminders:()=>store.get('reminders',[]),
  attachments:()=>store.get('attachments',[]),
  recent:()=>store.get('recent',[]),
  timeline:()=>store.get('timeline',[]),
  books:()=>store.get('books',[]),
  booknotes:()=>store.get('booknotes',[]),
  booktopics:()=>store.get('booktopics',[]),
  bookreviews:()=>store.get('bookreviews',[]),
  bookrecs:()=>store.get('bookrecs',[]),
  kb:()=>store.get('kb',[]),
  kbtopics:()=>store.get('kbtopics',[]),
  kbpractice:()=>store.get('kbpractice',[]),
  holdings:()=>store.get('stock_holdings',[]),
  pnl:()=>store.get('stock_pnl',[]),
  stockReviews:()=>store.get('stock_reviews',[]),
  stockAnn:()=>store.get('stock_ann',[]),
  stockSectors:()=>store.get('stock_sectors',[]),
  stockIpo:()=>store.get('stock_ipo',[]),
  stockQuotes:()=>store.get('stock_quotes',null)
};
const SAVE={
  settings:v=>store.set('settings',v), tags:v=>store.set('tags',v), tasks:v=>store.set('tasks',v),
  reminders:v=>store.set('reminders',v), attachments:v=>store.set('attachments',v), recent:v=>store.set('recent',v),
  timeline:v=>store.set('timeline',v), books:v=>store.set('books',v), booknotes:v=>store.set('booknotes',v),
  booktopics:v=>store.set('booktopics',v), bookreviews:v=>store.set('bookreviews',v), bookrecs:v=>store.set('bookrecs',v),
  kb:v=>store.set('kb',v), kbtopics:v=>store.set('kbtopics',v), kbpractice:v=>store.set('kbpractice',v),
  holdings:v=>store.set('stock_holdings',v), pnl:v=>store.set('stock_pnl',v), stockReviews:v=>store.set('stock_reviews',v),
  stockAnn:v=>store.set('stock_ann',v), stockSectors:v=>store.set('stock_sectors',v), stockIpo:v=>store.set('stock_ipo',v),
  stockQuotes:v=>store.set('stock_quotes',v)
};

/* ----------------------------- 默认设置 ----------------------------- */
function defaultSettings(){
  return {
    name:'Eric', marketRiskPct:-8, reviewIntervalDays:7,
    disclaimer:true, theme:'fresh', createdAt:nowStr()
  };
}
function applyTheme(theme){
  const t=theme||(getSettings().theme)||'fresh';
  document.documentElement.setAttribute('data-theme',t);
}
function getSettings(){ let s=COL.settings(); if(!s){ s=defaultSettings(); SAVE.settings(s);} return s; }

/* ----------------------------- 标签 ----------------------------- */
const TAG_COLORS=['#2563eb','#16a34a','#ea580c','#9333ea','#0891b2','#db2777','#ca8a04','#475569'];
function ensureTag(name){
  name=(name||'').trim(); if(!name) return null;
  let tags=COL.tags(); let t=tags.find(x=>x.name===name);
  if(!t){ t={id:uid('tag'),name,color:TAG_COLORS[tags.length%TAG_COLORS.length]}; tags.push(t); SAVE.tags(tags); }
  return t;
}
function tagById(id){ return COL.tags().find(t=>t.id===id)||null; }
function renderTagsInput(selected, container){
  // selected: array of tag ids
  container.innerHTML='';
  const all=COL.tags();
  const render=()=>{
    container.innerHTML='';
    selected.forEach(id=>{ const t=tagById(id); if(!t) return;
      const s=document.createElement('span'); s.className='tag'; s.style.borderColor=t.color; s.style.color=t.color;
      s.innerHTML=`${esc(t.name)} <span class="x" data-rm="${t.id}">×</span>`; container.appendChild(s);
    });
    const add=document.createElement('input'); add.placeholder='+ 标签'; add.style.cssText='border:none;outline:none;flex:1;min-width:80px;font-size:12px;background:transparent';
    add.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===','){ e.preventDefault(); const t=ensureTag(add.value); if(t&&!selected.includes(t.id)){ selected.push(t.id); render(); } add.value=''; } });
    container.appendChild(add);
  };
  container.addEventListener('click',e=>{ const x=e.target.closest('[data-rm]'); if(x){ const id=x.getAttribute('data-rm'); selected.splice(selected.indexOf(id),1); render(); } });
  render();
}
function tagsHtml(ids){ if(!ids||!ids.length) return '<span class="muted-small">无标签</span>'; return ids.map(id=>{const t=tagById(id);return t?`<span class="tag" style="border-color:${t.color};color:${t.color}">${esc(t.name)}</span>`:'';}).join(' '); }

/* ----------------------------- 最近访问 / 时间线 ----------------------------- */
function pushRecent(module,title,sub){ let r=COL.recent(); r=r.filter(x=>!(x.module===module&&x.title===title)); r.unshift({module,title,sub:sub||'',ts:Date.now()}); r=r.slice(0,20); SAVE.recent(r); }
function logActivity(action,module,detail){ let t=COL.timeline(); t.unshift({ts:Date.now(),action,module,detail:detail||''}); t=t.slice(0,100); SAVE.timeline(t); }

/* ----------------------------- 模态框 / 确认 ----------------------------- */
const modalMask=$('#modalMask'), modalEl=$('#modal');
function openModal(html,opts){ opts=opts||{}; modalEl.className='modal'+(opts.wide?' wide':''); modalEl.innerHTML=html; modalMask.classList.add('open'); }
function closeModal(){ modalMask.classList.remove('open'); modalEl.innerHTML=''; }
modalMask.addEventListener('click',e=>{ if(e.target===modalMask && !modalEl.querySelector('[data-noclose]')) closeModal(); });
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),2200); }
function confirmDialog(title,body,okText){ return new Promise(res=>{ openModal(`<div class="modal-head"><h3>${esc(title)}</h3><button class="x-close" data-x>×</button></div><div class="modal-body">${esc(body||'')}</div><div class="modal-foot"><button class="btn" data-c="0">取消</button><button class="btn danger" data-c="1">${esc(okText||'确认')}</button></div>`); modalEl.querySelector('[data-x]').onclick=()=>{closeModal();res(false);}; modalEl.querySelector('[data-c="0"]').onclick=()=>{closeModal();res(false);}; modalEl.querySelector('[data-c="1"]').onclick=()=>{closeModal();res(true);}; }); }

/* ----------------------------- 示例数据（仅外部/参考数据，明确标记） ----------------------------- */
function seedSampleData(){
  if(!store.get('seeded')){
    store.set('seeded',true);
  // 股票：示例持仓（用户真实持仓在持仓管理录入；此处提供默认样本以便模块联动演示）
  SAVE.holdings([
    {id:uid('h'),name:'荣昌生物',code:'688331.SH',market:'A股',cur:'¥',shares:1000,cost:48.20,current:62.30,sample:true},
    {id:uid('h'),name:'荣昌生物',code:'09995.HK',market:'港股',cur:'HK$',shares:2000,cost:38.50,current:48.20,sample:true},
    {id:uid('h'),name:'中控技术',code:'688777.SH',market:'A股',cur:'¥',shares:800,cost:52.10,current:48.90,sample:true},
    {id:uid('h'),name:'中宠股份',code:'002891.SZ',market:'A股',cur:'¥',shares:1200,cost:30.40,current:35.10,sample:true}
  ]);
  // 股票：外部参考数据一律标记 示例/模拟
  SAVE.stockAnn([
    {id:uid('a'),title:'【示例】某公司拟回购股份不超过10亿元',date:'2026-08-12',market:'A股',sample:true},
    {id:uid('a'),title:'【示例】行业政策：算力基础设施扶持细则落地',date:'2026-08-11',market:'A股',sample:true},
    {id:uid('a'),title:'【示例】港股通标的调整，多只生物科技股纳入',date:'2026-08-10',market:'港股',sample:true}
  ]);
  SAVE.stockSectors([
    {id:uid('s'),name:'半导体',pct:2.49,lead:'存储芯片 +9%',sample:true},
    {id:uid('s'),name:'光通信',pct:3.10,lead:'Lumentum +13%',sample:true},
    {id:uid('s'),name:'贵金属',pct:0.63,lead:'COMEX黄金 +0.63%',sample:true},
    {id:uid('s'),name:'油气开采',pct:0.08,lead:'布伦特 +0.08%',sample:true},
    {id:uid('s'),name:'互联网',pct:-1.40,lead:'中概普跌',sample:true}
  ]);
  SAVE.stockIpo([
    {id:uid('i'),name:'【示例】某科技股份',code:'688XXX.SH',date:'2026-08-15',price:23.50,market:'科创板',sample:true},
    {id:uid('i'),name:'【示例】某生物制药',code:'002XXX.SZ',date:'2026-08-18',price:12.80,market:'主板',sample:true}
  ]);
  SAVE.stockQuotes({live:false,asof:'示例数据',updated:nowStr(),data:{
    '688331.SH':{name:'荣昌生物',price:62.30,preClose:60.10,pct:3.66},
    '09995.HK':{name:'荣昌生物',price:48.20,preClose:47.10,pct:2.34},
    '688777.SH':{name:'中控技术',price:48.90,preClose:49.60,pct:-1.41},
    '002891.SZ':{name:'中宠股份',price:35.10,preClose:34.20,pct:2.63}
  }});
  }
  // 读书模块示例数据（独立标记，即使主线已播种也会注入一次）
  if(!store.get('seededBook')){
    store.set('seededBook',true);
    SAVE.books([
      {id:uid('bk'),title:'投资中最简单的事',author:'邱国鹭',publisher:'中国人民大学出版社',isbn:'9787300240464',status:'已读',currentPage:248,totalPages:248,myRating:9,recommendLevel:'强烈推荐',category:'投资',doubanRating:8.5,doubanRaters:'12000',doubanUrl:'https://book.douban.com/subject/25752977/',cover:'https://img3.doubanio.com/view/subject/l/public/s27185773.jpg',readingLog:[{date:'2026-08-01',minutes:60}],relatedStocks:['688777.SH'],summary:'价值投资框架：便宜是硬道理，定价权与护城河优先。',tags:[],sample:true,createdAt:Date.now()-86400000*20},
      {id:uid('bk'),title:'穷查理宝典',author:'查理·芒格',publisher:'中信出版社',isbn:'9787508664316',status:'在读',currentPage:120,totalPages:460,myRating:9,recommendLevel:'强烈推荐',category:'投资',doubanRating:8.7,doubanRaters:'30000',doubanUrl:'https://book.douban.com/subject/10786655/',cover:'https://img2.doubanio.com/view/subject/l/public/s24597511.jpg',readingLog:[{date:'2026-08-10',minutes:40}],relatedStocks:[],summary:'多元思维模型与逆向思考，能力圈原则。',tags:[],sample:true,createdAt:Date.now()-86400000*5}
    ]);
    const nb=COL.books()[0];
    SAVE.booknotes([
      {id:uid('bn'),title:'便宜是硬道理：估值与安全边际',bookId:nb.id,type:'核心观点',content:'好公司也要有好价格；均值回归终将发生，逆向布局需要耐心。',quote:'“买好的不如买得好。”',keyPoint:'估值与安全边际优先于成长性叙事。',inspiration:'对成长股需区分“真成长”与“贵成长”。',relatedStocks:['688777.SH','002891.SZ'],relatedTopics:['价值投资','估值'],noteStatus:'新建',tags:[],createdAt:Date.now()-86400000*3}
    ]);
    const sn=COL.booknotes()[0];
    SAVE.bookreviews([
      {id:uid('rv'),noteId:sn.id,noteTitle:sn.title,nextDate:todayStr(),stage:0,done:false,history:[]}
    ]);
    SAVE.bookrecs([
      {id:uid('rc'),title:'聪明的投资者',author:'本杰明·格雷厄姆',isbn:'9787115234957',cover:'https://img3.doubanio.com/view/subject/l/public/s6462582.jpg',doubanRating:9.0,doubanRaters:'80000',year:2016,category:'投资',recReason:'价值投资圣经，市场先生与安全边际概念的基础。',suitableStage:'入门到进阶',difficulty:'中',relatedDirection:'价值投资/估值',doubanUrl:'https://book.douban.com/subject/5243775/',fetchedAt:'(示例数据)',status:'推荐',sample:true,createdAt:Date.now()-86400000*2}
    ]);
  }
  // 个人知识库示例数据（独立标记，即使主线已播种也会注入一次）
  if(!store.get('seededKb')){
    store.set('seededKb',true);
    const nb=COL.books()[0];
    SAVE.kb([
      {id:uid('kb'),title:'手机拍摄夜景的 6 个实操要点',url:'https://www.xiaohongshu.com/example/night',domain:'xiaohongshu.com',platform:'小红书',author:'摄影日记',publishedAt:'2026-07-20',cover:'',isbn:'',type:'攻略',origSummary:'',mySummary:'夜景用专业模式：低 ISO、慢快门、对焦亮处、用三脚架、RAW 格式、后期降噪。',whySave:'周末想拍城市夜景样片，可复用的方法论。',keyPoints:'ISO 100-400、快门 1/10-2s、对焦霓虹灯、稳定支撑、拍 RAW、Lightroom 降噪。',steps:'1)开专业模式 2)ISO 调低 3)快门 1s 起 4)对焦亮部 5)三脚架 6)连拍',methods:'同一机位拍 3 张不同快门做堆栈。',scenarios:'城市天台、江边、车流。',cautions:'手持必糊，必须支撑物。',myRating:5,worthPractice:'yes',theme:'摄影',subTheme:'夜景',tags:[ensureTag('手机摄影').id,ensureTag('夜景').id],relatedBooks:[],relatedStocks:[],relatedIndustries:[],relatedTasks:[],relatedProjects:[],relatedNotes:[],status:'已读',nextAction:'周末拍 3 组夜景样片',planDate:todayStr(),practiceStatus:'已加入计划',practiceResult:'',neededMaterials:'手机+三脚架',reviewNote:'',reuseCount:0,lastReuse:null,archived:false,createdAt:Date.now()-86400000*6,updatedAt:nowStr(),sample:true},
      {id:uid('kb'),title:'创新药出海 License-out 交易结构笔记',url:'https://mp.weixin.qq.com/example/licenseout',domain:'mp.weixin.qq.com',platform:'微信公众号',author:'医药投研',publishedAt:'2026-08-01',cover:'',isbn:'',type:'文章',origSummary:'',mySummary:'首付款+里程碑+销售分成的典型结构；关注首付比例与销售峰值假设。',whySave:'理解创新药出海估值，可对照荣昌生物 BD。',keyPoints:'首付/里程碑/分成三段；峰值销售决定分成价值。',steps:'',methods:'用交易结构反推管线峰值预期。',scenarios:'评估 BD 事件对股价影响。',cautions:'里程碑能否达成存在不确定性。',myRating:4,worthPractice:'yes',theme:'投资理财',subTheme:'医药',tags:[ensureTag('风控').id],relatedBooks:[],relatedStocks:['688331.SH','09995.HK'],relatedIndustries:['创新药'],relatedTasks:[],relatedProjects:[],relatedNotes:nb?[(function(){var n=COL.booknotes()[0];return n?n.id:null;})()].filter(Boolean):[],status:'待读',nextAction:'',planDate:'',practiceStatus:'未计划',practiceResult:'',neededMaterials:'',reviewNote:'',reuseCount:0,lastReuse:null,archived:false,createdAt:Date.now()-86400000*3,updatedAt:nowStr(),sample:true},
      {id:uid('kb'),title:'宠物经济：主粮国产化替代趋势',url:'',domain:'',platform:'手动输入',author:'',publishedAt:'',cover:'',isbn:'',type:'待验证信息',origSummary:'',mySummary:'中宠股份所在赛道，国产品牌份额提升，需验证最新市占率数据。',whySave:'关联持仓中宠股份，跟踪行业趋势。',keyPoints:'国产替代、渠道线上化、高端化。',steps:'',methods:'',scenarios:'中宠股份基本面跟踪。',cautions:'需核实最新份额数据，标记为待验证。',myRating:'',worthPractice:'no',theme:'投资理财',subTheme:'宠物经济',tags:[ensureTag('资产配置').id],relatedBooks:[],relatedStocks:['002891.SZ'],relatedIndustries:['宠物经济'],relatedTasks:[],relatedProjects:[],relatedNotes:[],status:'待读',nextAction:'',planDate:'',practiceStatus:'未计划',practiceResult:'',neededMaterials:'',reviewNote:'',reuseCount:0,lastReuse:null,archived:false,createdAt:Date.now()-86400000*2,updatedAt:nowStr(),sample:true},
      {id:uid('kb'),title:'番茄工作法实操清单',url:'https://example.com/pomodoro',domain:'example.com',platform:'普通网页',author:'效率笔记',publishedAt:'2026-06-15',cover:'',isbn:'',type:'清单',origSummary:'',mySummary:'25 分钟专注 + 5 分钟休息，4 轮后长休；任务拆小、记录打断。',whySave:'提升日常复盘与写作效率。',keyPoints:'单任务、计时、记录打断、每日回顾。',steps:'1)列任务 2)设 25min 3)专注 4)休息 5)循环',methods:'配合纸笔记录打断原因。',scenarios:'写复盘、读财报时。',cautions:'任务要小到 25 分钟内可完成。',myRating:4,worthPractice:'unknown',theme:'工作效率',subTheme:'时间管理',tags:[ensureTag('时间管理').id],relatedBooks:[],relatedStocks:[],relatedIndustries:[],relatedTasks:[],relatedProjects:[],relatedNotes:[],status:'待整理',nextAction:'',planDate:'',practiceStatus:'未计划',practiceResult:'',neededMaterials:'',reviewNote:'',reuseCount:0,lastReuse:null,archived:false,createdAt:Date.now()-86400000*1,updatedAt:nowStr(),sample:true}
    ]);
  }
}

/* 尝试拉取实时行情（腾讯 gtimg，失败则回退示例数据） */
function fetchLiveQuotes(codes){
  return new Promise(resolve=>{
    if(!codes||!codes.length){ resolve(null); return; }
    const q=codes.map(c=>'v_'+c.toLowerCase()).join(',');
    const sc=document.createElement('script');
    const cb='_wbqt'+Date.now();
    let done=false;
    const finish=(data,ok)=>{ if(done)return; done=true; try{delete window[cb];}catch(e){} sc.remove(); resolve(ok?data:null); };
    window[cb]=function(){}; // placeholder
    const timeout=setTimeout(()=>finish(null,false),4500);
    sc.onerror=()=>{ clearTimeout(timeout); finish(null,false); };
    sc.src='https://qt.gtimg.cn/q='+q;
    document.head.appendChild(sc);
    setTimeout(()=>{
      try{
        const data={};
        codes.forEach(c=>{ const v=window['v_'+c.toLowerCase()]; if(v){ const f=v.split('~'); data[c]={name:f[1],price:parseFloat(f[3]),preClose:parseFloat(f[4]),pct:parseFloat(f[32])}; } });
        if(Object.keys(data).length){ clearTimeout(timeout); finish({live:true,updated:nowStr(),data},true); }
        else { clearTimeout(timeout); finish(null,false); }
      }catch(e){ clearTimeout(timeout); finish(null,false); }
    },1500);
  });
}

/* =========================================================================
   股票数据引擎（同步自 eric-review.html，适配本工作台 COL/SAVE/PREFIX）
   - 行情：腾讯财经 qt.gtimg.cn（emToQq 映射，修正 gtimg 符号格式）
   - 涨跌家数 / 板块：东方财富 push2（JSONP）
   - K线：东方财富 push2his
   - 隔夜外盘：premarket.json(同域) > 存量的 wb_premarket > 新浪外盘兜底
   - 汇率：exchangerate.host（HKD→CNY，用于 A+H 折算）
   - 新股：东方财富 datacenter-web
   ========================================================================= */
function emToQq(secid){
  if(secid==='100.HSI') return 'hkHSI';
  if(secid==='1.HSTECH') return 'hkHSTECH';
  const i=secid.indexOf('.'); if(i<0) return secid;
  const m=secid.slice(0,i), code=secid.slice(i+1);
  if(m==='1') return 'sh'+code;
  if(m==='0'||m==='2'||m==='3') return 'sz'+code;
  if(m==='116'||m==='100'||m==='105'||m==='115') return 'hk'+code;
  return secid;
}
function engineLoadScript(url,timeout){
  timeout=timeout||9000;
  return new Promise(function(resolve,reject){
    const s=document.createElement('script'); s.async=true;
    const t=setTimeout(function(){ cleanup(); reject(new Error('timeout')); },timeout);
    function cleanup(){ clearTimeout(t); if(s.parentNode) s.parentNode.removeChild(s); }
    s.onload=function(){ cleanup(); resolve(); };
    s.onerror=function(){ cleanup(); reject(new Error('load error')); };
    s.src=url; document.head.appendChild(s);
  });
}
function engineJsonp(url,timeout){
  timeout=timeout||9000;
  return new Promise(function(resolve,reject){
    const cbName='__em_jp_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);
    const timer=setTimeout(function(){ cleanup(); reject(new Error('timeout')); },timeout);
    function cleanup(){ clearTimeout(timer); if(s.parentNode) s.parentNode.removeChild(s); try{ delete window[cbName]; }catch(e){ window[cbName]=undefined; } }
    const s=document.createElement('script'); s.async=true;
    window[cbName]=function(data){ cleanup(); resolve(data); };
    s.onerror=function(){ cleanup(); reject(new Error('load error')); };
    s.src=url+(url.indexOf('?')>=0?'&':'?')+'cb='+encodeURIComponent(cbName);
    document.head.appendChild(s);
  });
}
async function engineFetchQQ(symbols){
  const url='https://qt.gtimg.cn/q='+symbols.join(',');
  try{ await engineLoadScript(url); }catch(e){ return {}; }
  const out={};
  symbols.forEach(function(sym){
    const raw=window['v_'+sym];
    if(typeof raw!=='string'||!raw) return;
    let f; try{ f=raw.replace(/^"|"$/g,'').split('~'); }catch(e){ return; }
    if(f.length<39) return;
    const price=parseFloat(f[3]),prev=parseFloat(f[4]),open=parseFloat(f[5]),high=parseFloat(f[33]),low=parseFloat(f[34]),change=parseFloat(f[31]),pct=parseFloat(f[32]),vol=parseFloat(f[36])||0,amount=(parseFloat(f[37])||0);
    if(!(price>0)) return;
    out[sym]={price:price,prev:prev,open:open,high:high,low:low,vol:vol,amount:amount,change:change,pct:pct,code:f[2]};
  });
  return out;
}
/* 行情引擎 */
const StockAPI={
  secidIndex:{'1.000001':'上证指数','0.399001':'深证成指','0.399006':'创业板指','1.000688':'科创50','100.HSI':'恒生指数','1.HSTECH':'恒生科技'},
  _jsonp:function(url,timeout){ return engineJsonp(url,timeout); },
  async breadth(){
    const base='https://push2.eastmoney.com/api/qt/clist/get?pz=100&po=1&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&fid=f3&fs=m:0+t:6,m:0+t:13,m:0+t:80,m:1+t:2,m:1+t:23&fields=f3,f12,f14&pn=';
    const one=function(p){ return this._jsonp(base+p,12000).catch(function(){ return null; }); }.bind(this);
    const oneRetry=function(p){ return one(p).then(function(r){ return r?r:one(p); }); };
    try{
      const first=await oneRetry(1);
      if(!first||!first.data||!first.data.diff||!first.data.total) return null;
      const total=first.data.total;
      const pages=Math.ceil(total/100);
      const all=first.data.diff.slice();
      const failed=[];
      const batchSize=8;
      for(let i=2;i<=pages;i+=batchSize){
        const end=Math.min(i+batchSize-1,pages);
        const tasks=[];
        for(let p=i;p<=end;p++) tasks.push(oneRetry(p));
        const res=await Promise.all(tasks);
        res.forEach(function(r,idx){ const pg=i+idx; if(r&&r.data&&r.data.diff) all.push.apply(all,r.data.diff); else failed.push(pg); });
      }
      if(failed.length){ const rs=await Promise.all(failed.map(function(p){ return oneRetry(p); })); rs.forEach(function(r){ if(r&&r.data&&r.data.diff) all.push.apply(all,r.data.diff); }); }
      if(all.length<total*0.9) return null;
      let up=0,down=0,flat=0,limitUp=0,limitDown=0;
      all.forEach(function(d){
        const pct=parseFloat(d.f3)||0;
        if(pct>0.001) up++; else if(pct<-0.001) down++; else flat++;
        const code=String(d.f12||'');
        const is20=/^(300|301|688|689)/.test(code);
        const is30=/^(430|8[3789]|92)/.test(code);
        const name=String(d.f14||'');
        const isST=/^(ST|\*ST|S)/.test(name);
        const upLimit=isST?5:(is30?30:(is20?20:10));
        if(pct>=upLimit-0.05) limitUp++;
        if(pct<=-(upLimit-0.05)) limitDown++;
      });
      return {up:up,down:down,flat:flat,total:up+down+flat,limitUp:limitUp,limitDown:limitDown,maxBoard:0,blastRate:0,prevLimitUpPremium:0};
    }catch(e){ return null; }
  },
  async sectors(){
    const base='https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=200&po=1&np=1&fltt=2&invt=2&fid=f3&fs=';
    const fld='&fields=f12,f14,f3,f62,f104,f105,f128,f136,f140';
    const parse=function(r){ if(!r||!r.data||!r.data.diff) return []; return r.data.diff.map(function(d){ return { code:String(d.f12||''),name:String(d.f14||''),pct:parseFloat(d.f3)||0, flow:(parseFloat(d.f62)||0)/1e8, up:parseInt(d.f104)||0, down:parseInt(d.f105)||0, leader:String(d.f128||''), leaderPct:parseFloat(d.f136)||0, leaderCode:String(d.f140||'') }; }); };
    try{
      const res=await Promise.all([
        this._jsonp(base+'m:90+t:2'+fld,12000).catch(function(){ return null; }),
        this._jsonp(base+'m:90+t:3'+fld,12000).catch(function(){ return null; })
      ]);
      const industries=parse(res[0]), concepts=parse(res[1]);
      if(!industries.length&&!concepts.length) return null;
      const all=industries.concat(concepts);
      return { industries:industries, concepts:concepts,
        strong:all.slice().sort(function(a,b){ return b.pct-a.pct; }).slice(0,10),
        weak:all.slice().sort(function(a,b){ return a.pct-b.pct; }).slice(0,6) };
    }catch(e){ return null; }
  },
  async kline(secid){
    const u='https://push2his.eastmoney.com/api/qt/stock/kline?secid='+secid+'&fields1=f1,f2,f3&fields2=f51,f52,f53,f54,f55,f56,f57,f58&klt=101&fqt=1&end=20500101&lmt=260&_='+Date.now();
    try{ const r=await fetch(u); const j=await r.json(); if(!j.data||!j.data.klines) return null;
      const arr=j.data.klines.map(function(s){ const p=s.split(','); return {date:p[0],open:+p[1],close:+p[2],high:+p[3],low:+p[4],vol:+p[5]}; });
      return arr.length>=20?arr:null;
    }catch(e){ return null; }
  }
};
/* 汇率 HKD→CNY */
const StockFX={hkd2cny:0.9180,asof:'示例汇率(未联网)'};
(function(){ try{ const _fxs=store.raw(PREFIX+'stock_fx',null); if(_fxs){ StockFX.hkd2cny=_fxs.hkd2cny; StockFX.asof=_fxs.asof; } }catch(e){} })();
async function refreshFx(){
  try{ const fr=await fetch('https://api.exchangerate.host/latest?base=HKD&symbols=CNY'); const fj=await fr.json();
    if(fj&&fj.rates&&fj.rates.CNY){ StockFX.hkd2cny=fj.rates.CNY; StockFX.asof=new Date().toLocaleString('zh-CN')+' (实时)'; store.rawSet(PREFIX+'stock_fx',{hkd2cny:StockFX.hkd2cny,asof:StockFX.asof}); } }catch(e){}
}
/* 隔夜外盘 / 盘前热点 */
const SEED_PREMARKET_FB={date:todayStr(),asof:'示例数据',live:false,
  summary:'示例盘前摘要：请在联网后点「刷新外盘」获取昨夜美股、黄金、原油及中概表现。',
  indices:[{region:'美股',name:'纳斯达克',pct:0.54},{region:'美股',name:'道琼斯',pct:-0.04},{region:'美股',name:'标普500',pct:0.26},{region:'外汇',name:'美元指数',pct:0},{region:'商品',name:'COMEX黄金',pct:0.3},{region:'商品',name:'WTI原油',pct:-0.2}],
  hotspots:[{sector:'示例',move:'待更新',lead:'刷新后显示热点板块映射',summary:''}]
};
const StockPremarket={
  get:function(){ const saved=store.raw(PREFIX+'premarket',null); if(saved&&saved.date===todayStr()) return saved; const pm=Object.assign({},SEED_PREMARKET_FB); pm._stale=true; return pm; },
  live:function(){ const p=store.raw(PREFIX+'premarket',null); return !!(p&&p.date===todayStr()&&p.live); },
  async refresh(silent){
    if(!silent) toast('正在生成盘前摘要…');
    try{ const r=await fetch('./premarket.json?_='+Date.now()); if(r.ok){ const j=await r.json(); if(j&&j.date===todayStr()){ store.rawSet(PREFIX+'premarket',j); if(parseHash().module==='stock') renderStock(parseHash().sub||'quotes'); if(!silent) toast('盘前摘要已更新（自动化）'); return; } } }catch(e){}
    try{
      const urls=['https://hq.sinajs.cn/list=int_nasdaq,int_dji,int_sp500,gb_$dxy,hf_GC,hf_CL','https://hq.sinajs.cn/list=gb_hq33'];
      const out=await Promise.all(urls.map(function(u){ return fetch(u,{referrerPolicy:'no-referrer'}).then(function(r){ return r.text(); }).catch(function(){ return ''; }); }));
      const q1=out[0], q2=out[1];
      const parse=function(txt,symbol){ const m=txt.match(new RegExp('var hq_str_'+symbol+'="([^"]*)"')); return m?m[1].split(','):null; };
      const ndq=parse(q1,'int_nasdaq'),dji=parse(q1,'int_dji'),spx=parse(q1,'int_sp500'),dxy=parse(q1,'gb_$dxy'),gc=parse(q1,'hf_GC'),cl=parse(q1,'hf_CL');
      const calc=function(arr,baseIdx){ if(!arr||arr.length<2) return null; const price=parseFloat(arr[0]||0),prev=parseFloat(arr[baseIdx]||0); return prev?((price-prev)/prev*100):null; };
      const pctOr=function(arr,baseIdx,def){ const v=calc(arr,baseIdx); return v==null?def:parseFloat(v.toFixed(2)); };
      const live={date:todayStr(),asof:new Date().toLocaleString('zh-CN'),live:true,
        indices:[
          {region:'美股',name:'纳斯达克',pct:pctOr(ndq,2,0.54)},{region:'美股',name:'道琼斯',pct:pctOr(dji,2,-0.04)},{region:'美股',name:'标普500',pct:pctOr(spx,2,0.26)},
          {region:'外汇',name:'美元指数',pct:pctOr(dxy,1,0)},{region:'商品',name:'COMEX黄金',pct:pctOr(gc,7,0)},{region:'商品',name:'WTI原油',pct:pctOr(cl,7,0)}
        ],
        hotspots:[
          {sector:'外盘指数',move:'更新',lead:'纳指 '+pct2(pctOr(ndq,2,0.54))+' / 标普 '+pct2(pctOr(spx,2,0.26)),summary:'外盘指数已更新'},
          {sector:'大宗商品',move:'更新',lead:'黄金 '+pct2(pctOr(gc,7,0))+' / 原油 '+pct2(pctOr(cl,7,0)),summary:'黄金原油已更新'}
        ],
        summary:'隔夜外盘行情已刷新：美股'+(pctOr(ndq,2,0)>=0?'上涨':'下跌')+'，黄金'+(pctOr(gc,7,0)>=0?'上涨':'下跌')+'，原油'+(pctOr(cl,7,0)>=0?'上涨':'下跌')+'。具体热点板块映射请结合盘前新闻补充。'
      };
      store.rawSet(PREFIX+'premarket',live);
      if(parseHash().module==='stock') renderStock(parseHash().sub||'quotes');
      if(!silent) toast('盘前摘要已更新（实时行情）'); return;
    }catch(e){}
    if(!silent) toast('外盘源暂不可达，已显示示例/历史数据；可手动编辑');
  },
  edit:function(){
    const pm=this.get();
    openModal('<h3>编辑盘前摘要</h3><div class="label">摘要</div><textarea id="pm_summary" rows="3" style="width:100%">'+(pm.summary||'')+'</textarea>'+
      '<div class="label">外盘指数 JSON</div><textarea id="pm_indices" rows="5" style="width:100%;font-family:monospace">'+esc(JSON.stringify(pm.indices||[],null,2))+'</textarea>'+
      '<div class="label">热点板块 JSON</div><textarea id="pm_hotspots" rows="5" style="width:100%;font-family:monospace">'+esc(JSON.stringify(pm.hotspots||[],null,2))+'</textarea>'+
      '<div class="ft"><button class="btn gray" data-x>取消</button><button class="btn" data-save>保存</button></div>');
  $$('[data-x]',modalEl).forEach(b=>b.onclick=closeModal);
  modalEl.querySelector('[data-save]').onclick=function(){ StockPremarket.save(); };
  },
  save:function(){
    try{ const summary=$('#pm_summary').value; const indices=JSON.parse($('#pm_indices').value); const hotspots=JSON.parse($('#pm_hotspots').value);
      store.rawSet(PREFIX+'premarket',{date:todayStr(),asof:new Date().toLocaleString('zh-CN'),live:true,summary:summary,indices:indices,hotspots:hotspots});
      closeModal(); if(parseHash().module==='stock') renderStock(parseHash().sub||'quotes'); toast('盘前摘要已保存');
    }catch(e){ toast('JSON 格式错误，请检查'); }
  }
};
/* 新股申购 */
function boardOf(code){ const m=(code||'').match(/\d+/); const n=m?m[0]:''; if(!n) return '其他'; if(/^688/.test(n)) return '科创板'; if(/^[489]/.test(n)&&n.length>=6) return '北交所'; if(/^30/.test(n)) return '创业板'; if(/^60/.test(n)) return '沪市主板'; if(/^00/.test(n)) return '深市主板'; return '其他'; }
const StockIPO={ filter:'全部',
  async fetch(silent){
    const url='https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPTA_APP_IPOAPPLY&columns=ALL&sortColumns=APPLY_DATE&sortTypes=-1&pageSize=80&pageNumber=1&source=WEB&client=WEB';
    try{
      const r=await fetch(url); const j=await r.json();
      if(!j.success||!j.result||!j.result.data) throw new Error('empty');
      const t=todayStr(); const cutoff=addDays(t,-12);
      const rows=j.result.data.filter(function(x){ const d=(x.APPLY_DATE||'').slice(0,10); return d&&d>=cutoff; }).map(function(x){
        const code=x.SECUCODE||(x.APPLY_CODE||''); const apply=(x.APPLY_DATE||'').slice(0,10);
        const win=(x.BALLOT_NUM_DATE||x.ASSIGN_DATE||'').slice(0,10)||'-';
        const pay=(x.BALLOT_PAY_DATE||'').slice(0,10)||'-';
        const list=x.LISTING_DATE?(x.LISTING_DATE+'').slice(0,10):null;
        const price=x.ISSUE_PRICE!=null?x.ISSUE_PRICE:(x.PREDICT_ISSUE_PRICE||null);
        const pe=x.AFTER_ISSUE_PE!=null?x.AFTER_ISSUE_PE:(x.PREDICT_ISSUE_PE||x.PREDICT_PE||null);
        const board=boardOf(code)||((x.MARKET||'').replace('深交所','').replace('上交所','').replace('北京',''))||'其他';
        return {id:'ipo_'+code,name:x.SECURITY_NAME,code:code,date:apply,price:price,pe:pe,board:board,online:x.ONLINE_ISSUE_NUM,limit:x.ONLINE_APPLY_UPPER,win:win,pay:pay,list:list,status:'未申购',live:true};
      });
      const prev=COL.stockIpo()||[]; const pm={}; prev.forEach(function(p){ if(p&&p.code) pm[p.code]=p; });
      rows.forEach(function(o){ const p=pm[o.code]; if(p&&p.status&&p.status!=='未申购') o.status=p.status; });
      SAVE.stockIpo(rows); store.rawSet(PREFIX+'stock_ipo_live',true); store.rawSet(PREFIX+'stock_ipo_asof',new Date().toLocaleString('zh-CN'));
      if(!silent) toast('新股数据已更新（实时）');
    }catch(e){
      const hasLive=store.raw(PREFIX+'stock_ipo_live',false);
      store.rawSet(PREFIX+'stock_ipo_asof',hasLive?'（保留上次实时数据）':'示例数据 · 未连实时源');
      if(!silent) toast(hasLive?'新股源不可达，保留上次实时数据':'新股使用示例数据（网络受限）');
    }
    if(parseHash().module==='stock'&&parseHash().sub==='ipo') renderStock('ipo');
  },
  set:function(f){ this.filter=f; if(parseHash().module==='stock'&&parseHash().sub==='ipo') renderStock('ipo'); }
};
/* 技术指标（纯函数，与 eric-review 一致） */
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function MA(arr,n){ return arr.map(function(_,i){ if(i<n-1) return null; let s=0; for(let j=i-n+1;j<=i;j++) s+=arr[j]; return s/n; }); }
function EMA(arr,n){ const k=2/(n+1); const out=[]; let prev=null; for(let i=0;i<arr.length;i++){ if(i===0) prev=arr[0]; else prev=arr[i]*k+prev*(1-k); out.push(prev); } return out; }
function MACD(arr){ const e12=EMA(arr,12),e26=EMA(arr,26); const dif=e12.map(function(v,i){ return v-e26[i]; }); const dea=EMA(dif,9); const bar=dif.map(function(v,i){ return (v-dea[i])*2; }); return {dif:dif,dea:dea,bar:bar}; }
function RSI(arr,n){ n=n||14; const out=[]; const len=arr.length; for(let i=0;i<len;i++) out.push(null); if(len<=n) return out;
  let g=0,l=0; for(let i=1;i<=n;i++){ const d=arr[i]-arr[i-1]; if(d>=0) g+=d; else l-=d; }
  let ag=g/n,al=l/n; out[n]=al===0?100:100-100/(1+ag/al);
  for(let i=n+1;i<len;i++){ const d=arr[i]-arr[i-1]; const gd=Math.max(d,0),ld=Math.max(-d,0); ag=(ag*(n-1)+gd)/n; al=(al*(n-1)+ld)/n; out[i]=al===0?100:100-100/(1+ag/al); }
  return out;
}
function KDJ(arr,n){ n=n||9; const K=[],D=[],J=[]; let pk=50,pd=50;
  for(let i=0;i<arr.length;i++){ const s=Math.max(0,i-n+1); let hh=-1e9,ll=1e9; for(let j=s;j<=i;j++){ hh=Math.max(hh,arr[j].high); ll=Math.min(ll,arr[j].low); }
    const rsv=hh===ll?50:(arr[i].close-ll)/(hh-ll)*100; pk=pk+(2/3)*(rsv-pk); pd=pd+(1/3)*(pk-pd); K.push(pk); D.push(pd); J.push(3*pk-2*pd); }
  return {K:K,D:D,J:J};
}
function Bollinger(arr,n,m){ n=n||20; m=m||2; const mid=MA(arr,n);
  const up=mid.map(function(v,i){ if(v==null) return null; let s=0; for(let j=i-n+1;j<=i;j++) s+=(arr[j]-v)*(arr[j]-v); return v+Math.sqrt(s/n)*m; });
  const lo=mid.map(function(v,i){ if(v==null) return null; let s=0; for(let j=i-n+1;j<=i;j++) s+=(arr[j]-v)*(arr[j]-v); return v-Math.sqrt(s/n)*m; });
  return {mid:mid,up:up,lo:lo};
}
function ATR(kl,n){ n=n||14; const tr=kl.map(function(k,i){ if(i===0) return k.high-k.low; return Math.max(k.high-k.low,k.high-kl[i-1].close,kl[i-1].close-k.low); }); return MA(tr,n); }
function computeLevels(kl,price,boll){
  const n=kl.length,last=n-1; const highs=[],lows=[];
  const addH=function(p,note){ if(p&&p>price*1.003) highs.push({price:p,note:note}); };
  const addL=function(p,note){ if(p&&p<price*0.997) lows.push({price:p,note:note}); };
  if(n>=20){ addH(Math.max.apply(null,kl.slice(n-20).map(function(k){ return k.high; })),'近20日高点'); addL(Math.min.apply(null,kl.slice(n-20).map(function(k){ return k.low; })),'近20日低点'); }
  if(n>=60){ addH(Math.max.apply(null,kl.slice(n-60).map(function(k){ return k.high; })),'近60日高点'); addL(Math.min.apply(null,kl.slice(n-60).map(function(k){ return k.low; })),'近60日低点'); }
  if(n>=120){ addH(Math.max.apply(null,kl.slice(n-120).map(function(k){ return k.high; })),'近120日高点'); addL(Math.min.apply(null,kl.slice(n-120).map(function(k){ return k.low; })),'近120日低点'); }
  if(boll&&boll.up&&boll.up[last]!=null) addH(boll.up[last],'布林上轨');
  if(boll&&boll.lo&&boll.lo[last]!=null) addL(boll.lo[last],'布林下轨');
  addH(Math.max.apply(null,kl.map(function(k){ return k.high; })),'阶段前高'); addL(Math.min.apply(null,kl.map(function(k){ return k.low; })),'阶段前低');
  highs.sort(function(a,b){ return a.price-b.price; }); lows.sort(function(a,b){ return b.price-a.price; });
  const uniq=function(arr){ const out=[]; for(const x of arr){ if(out.length===0) out.push(x); else if(Math.abs(x.price-out[out.length-1].price)/price>0.012) out.push(x); if(out.length>=2) break; } return out; };
  let h2=uniq(highs), l2=uniq(lows);
  if(!h2[0]) h2.push({price:price*1.03,note:'心理关口'});
  if(!h2[1]) h2.push({price:h2[0].price*1.05,note:'投射压力'});
  if(!l2[0]) l2.push({price:price*0.97,note:'心理关口'});
  if(!l2[1]) l2.push({price:l2[0].price*0.95,note:'投射支撑'});
  return [{type:'resistance',price:h2[0].price,note:h2[0].note},{type:'resistance',price:h2[1].price,note:h2[1].note},{type:'support',price:l2[0].price,note:l2[0].note},{type:'support',price:l2[1].price,note:l2[1].note}];
}
/* 诊断辅助格式（引擎本地，避免与全局命名冲突） */
function fmt2(n,d){ if(n==null||isNaN(n)||n===Infinity||n===-Infinity) return '-'; d=d==null?2:d; return Number(n).toLocaleString('zh-CN',{minimumFractionDigits:d,maximumFractionDigits:d}); }
function pct2(n){ if(n==null||isNaN(n)) return '-'; return (n>0?'+':'')+fmt2(n,2)+'%'; }
function cls2(n){ return n>0?'up':(n<0?'down':'flat'); }
function money2(n,c){ if(n==null||isNaN(n)) return '-'; const s=n<0?'-':''; return s+(c||'¥')+fmt2(Math.abs(n),0); }
/* K线存取 + 离线样本回退 */
function secidOf(h){
  if(h.secid) return h.secid;
  const raw=(h.code||'').split('.')[0].replace(/[^0-9]/g,'');
  if(!raw) return '1.000001';
  if(h.market==='港股') return '116.'+raw;
  if(/^688|^689/.test(raw)||/^8/.test(raw)||/^4/.test(raw)) return '1.'+raw;
  if(/^60/.test(raw)) return '1.'+raw;
  return '0.'+raw;
}
function hashString(s){ let h=0; for(let i=0;i<s.length;i++){ h=((h<<5)-h)+s.charCodeAt(i); h|=0; } return h>>>0; }
function getKline(id){
  const sk=store.raw(PREFIX+'stock_kline_'+id,null);
  if(sk&&sk.length>=20){ sk._sample=false; return sk; }
  const h=COL.holdings().find(function(x){ return x.id===id; });
  const q=COL.stockQuotes(); const price=(q&&q.data&&h&&q.data[h.code])?q.data[h.code].price:30;
  const rnd=mulberry32(hashString(id||'x'));
  const arr=[]; let p=price*0.92;
  for(let i=0;i<200;i++){ const ch=(rnd()-0.48)*0.04; p=p*(1+ch); const o=p*(1+(rnd()-0.5)*0.02); const hi=Math.max(o,p)*(1+rnd()*0.015); const lo=Math.min(o,p)*(1-rnd()*0.015); const v=5e6*(0.55+rnd()*0.9); arr.push({close:p,open:o,high:hi,low:lo,vol:v}); }
  const f=price/arr[arr.length-1].close; arr.forEach(function(k){ k.close*=f; k.open*=f; k.high*=f; k.low*=f; }); arr._sample=true; return arr;
}
function setKline(id,kl){ store.rawSet(PREFIX+'stock_kline_'+id, kl); }
/* 单标的诊断计算 */
function diagCompute(h){
  const kl=getKline(h.id);
  const closes=kl.map(function(k){ return k.close; });
  const q=(COL.stockQuotes()&&COL.stockQuotes().data)?COL.stockQuotes().data[h.code]:null;
  const price=q?q.price:closes[closes.length-1];
  const ma5=MA(closes,5),ma10=MA(closes,10),ma20=MA(closes,20),ma60=MA(closes,60),ma120=MA(closes,120);
  const macd=MACD(closes),rsi=RSI(closes),kdj=KDJ(kl),boll=Bollinger(closes),atr=ATR(kl);
  const n=closes.length,last=n-1;
  const vma=MA(kl.map(function(k){ return k.vol; }),20); const volRatio=(kl[last].vol/(vma[last]||1));
  const aboveMA=ma5[last]>ma20[last]&&ma20[last]>ma60[last];
  const belowMA=ma5[last]<ma20[last]&&ma20[last]<ma60[last];
  const trend=aboveMA?'上升':(belowMA?'下降':'震荡');
  const hi52=Math.max.apply(null,closes),lo52=Math.min.apply(null,closes); const posPct=(price-lo52)/(hi52-lo52)*100;
  const posLabel=(!kl._sample&&n>=240)?'52周区间':('近'+n+'日区间');
  const pos=posPct<33?'低位':(posPct>66?'高位':'中位');
  let vp='健康'; if(volRatio>1.8&&price<kl[last-1].close) vp='异常'; else if(volRatio>1.6&&price>kl[last-1].close) vp='健康'; else if(volRatio<0.6) vp='背离';
  const rsiV=(rsi[last]!=null)?rsi[last]:50;
  const shortS=price>ma5[last]&&rsiV>50?'强势':(price<ma5[last]&&rsiV<50?'弱势':'中性');
  let divergence='无'; const macdPeak=Math.max.apply(null,macd.dif.slice(Math.max(0,n-30)));
  if(price>=hi52*0.99&&macd.dif[last]<macdPeak*0.92) divergence='顶背离';
  const loCl=Math.min.apply(null,closes.slice(Math.max(0,n-30))); const macdLo=Math.min.apply(null,macd.dif.slice(Math.max(0,n-30)));
  if(price<=loCl*1.01&&macd.dif[last]>macdLo*1.08) divergence='底背离';
  const levels=computeLevels(kl,price,boll);
  let sc=50; if(aboveMA) sc+=15; if(belowMA) sc-=15; if(rsiV>45&&rsiV<75) sc+=8; if(rsiV>80) sc-=10; if(volRatio>1.4&&price>kl[last-1].close) sc+=8; if(divergence==='顶背离') sc-=12; if(divergence==='底背离') sc+=6; if(price>boll.mid[last]) sc+=5; if(price<boll.lo[last]*1.01) sc-=5; sc=Math.max(5,Math.min(98,Math.round(sc)));
  const atrPct=(atr[last]&&price)?atr[last]/price*100:2.5; let risk=atrPct>4?'高':(atrPct>2.5?'中':'低'); if(divergence==='顶背离'&&risk==='低') risk='中';
  const distCost=h.cost?((price-h.cost)/h.cost*100):0;
  const mv=(h.shares||0)*price, costV=(h.shares||0)*(h.cost||0), pnl=mv-costV, pnlPct=costV?pnl/costV*100:0;
  return {h:h,kl:kl,price:price,q:q,sample:!!kl._sample,ma5:ma5[last],ma10:ma10[last],ma20:ma20[last],ma60:ma60[last],ma120:ma120[last],macd:macd,rsi:rsiV,rsiArr:rsi,kdj:kdj.J[last],boll:boll,atr:atr[last],atrPct:atrPct,volRatio:volRatio,turn:q?q.turn:null,amp:q?q.amp:null,lv:q?q.lv:null,trend:trend,pos:pos,posPct:posPct,posLabel:posLabel,vp:vp,shortS:shortS,divergence:divergence,levels:levels,sc:sc,risk:risk,distCost:distCost,pnl:pnl,pnlPct:pnlPct,mv:mv,costV:costV,ma5a:ma5,ma20a:ma20};
}
function diagSuggest(d){
  if(d.divergence==='顶背离') return {sug:'分批止盈',trigger:'放量滞涨或跌破'+fmt2(d.levels[2].price),voidc:'放量突破'+fmt2(d.levels[0].price)+'且MACD金叉',period:'3-5日',risk:'高位背离回落风险'};
  if(d.trend==='上升'&&d.price>d.ma20&&d.rsi<75) return {sug:'持有观察',trigger:'收盘守住MA20('+fmt2(d.ma20)+')',voidc:'跌破MA20或放量长阴',period:'5-10日',risk:'板块走弱拖累'};
  if(d.trend==='下降') return {sug:'控制仓位',trigger:'反弹至'+fmt2(d.levels[0].price)+'承压',voidc:'放量站上MA20',period:'5-10日',risk:'下行趋势延续'};
  if(d.divergence==='底背离') return {sug:'回调关注',trigger:'回踩'+fmt2(d.levels[2].price)+'不破',voidc:'跌破'+fmt2(d.levels[3].price),period:'5-10日',risk:'筑底失败'};
  if(d.volRatio>1.5&&d.price>d.ma20) return {sug:'等待突破确认',trigger:'放量突破'+fmt2(d.levels[0].price),voidc:'冲高回落收长上影',period:'1-3日',risk:'假突破'};
  if(d.price<d.levels[2].price) return {sug:'跌破支撑后重新评估',trigger:'跌破'+fmt2(d.levels[2].price)+'且次日未收回',voidc:'收回支撑上方',period:'3-5日',risk:'趋势转弱'};
  return {sug:'暂不操作',trigger:'维持现状观望',voidc:'出现放量信号或破位',period:'3-5日',risk:'等待更清晰信号'};
}
function sectorPctOf(name){ if(!name) return 0.2; const arr=COL.stockSectors(); const m=arr.find(function(x){ return x.name===name; }); return m?m.pct:0.2; }
function compositeScore(h){
  const d=diagCompute(h);
  const market=55;
  const secPct=sectorPctOf(h.sector);
  const sector=Math.max(20,Math.min(80,50+secPct*8));
  const tech=d.sc;
  const fund=50;
  const ann=COL.stockAnn().filter(function(x){ return (x.title||'').indexOf(h.name)>=0; });
  const ev=ann.some(function(x){ return (x.title||'').indexOf('利空')>=0; })?45:(ann.some(function(x){ return (x.title||'').indexOf('利好')>=0; })?65:55);
  const total=Math.round(market*0.2+sector*0.2+tech*0.25+fund*0.2+ev*0.15);
  const trend=total>=70?'强':total>=50?'中':'弱';
  const risk=(d.risk==='高'||ev===45)?'高':(trend==='弱'?'高':'中');
  const basis=['市场环境(20%)：分歧市，评分'+market,'板块强度(20%)：'+(h.sector||'—')+(secPct>0?' 强势 +'+fmt2(secPct)+'%':' 中性')+'，评分'+Math.round(sector),'技术面(25%)：'+d.trend+'/'+d.shortS+'，评分'+tech,'基本面(20%)：暂无接入财务数据，评分'+fund,'事件估值(15%)：'+(ann.length?ann.map(function(x){ return x.title; }).join('/'):'无重大事件')+'，评分'+ev];
  return {total:total,trend:trend,risk:risk,basis:basis,market:market,sector:sector,tech:tech,fund:fund,ev:ev};
}
function drawDiagChart(sel,kl,levels,ma20,sample){
  const box=$(sel); if(!box) return;
  if(!kl||kl.length<2){ box.innerHTML='<div class="empty-state">走势图需数据</div>'; return; }
  const W=680,H=240,pad=30; const closes=kl.map(function(k){ return k.close; }); let min=Math.min.apply(null,closes),max=Math.max.apply(null,closes); levels.forEach(function(l){ min=Math.min(min,l.price); max=Math.max(max,l.price); });
  const rg=(max-min)||1; min-=rg*0.08; max+=rg*0.08; const n=kl.length;
  const X=function(i){ return pad+i/(n-1)*(W-pad*2); }; const Y=function(v){ return H-pad-(v-min)/(max-min)*(H-pad*2); };
  let line='',maLine=''; kl.forEach(function(k,i){ line+=(i?' ':'')+X(i).toFixed(1)+','+Y(k.close).toFixed(1); });
  closes.forEach(function(_,i){ if(i<19) return; let s=0; for(let j=i-19;j<=i;j++) s+=closes[j]; maLine+=(maLine?' ':'')+X(i).toFixed(1)+','+Y(s/20).toFixed(1); });
  let grid=''; for(let g=0;g<=4;g++){ const yy=pad+g/4*(H-pad*2); const val=max-g/4*(max-min); grid+='<line x1="'+pad+'" y1="'+yy+'" x2="'+(W-pad)+'" y2="'+yy+'" stroke="#eef1f6"/><text x="'+(pad-4)+'" y="'+(yy+3)+'" font-size="10" fill="#9aa4b2" text-anchor="end">'+fmt2(val)+'</text>'; }
  let lv=''; levels.forEach(function(l){ const yy=Y(l.price); const col=l.type==='resistance'?'#e23b3b':'#16a34a'; lv+='<line x1="'+pad+'" y1="'+yy+'" x2="'+(W-pad)+'" y2="'+yy+'" stroke="'+col+'" stroke-dasharray="5 4"/><text x="'+(W-pad)+'" y="'+(yy-4)+'" font-size="10" fill="'+col+'" text-anchor="end">'+(l.type==='resistance'?'压力 ':'支撑 ')+fmt2(l.price)+'</text>'; });
  const last=kl[n-1]; const tag=sample?'模拟走势':'实时/前复权';
  box.innerHTML='<svg class="chart" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none">'+grid+'<polyline fill="none" stroke="#f59e0b" stroke-width="1.5" points="'+maLine+'"/><polyline fill="none" stroke="#2f6df0" stroke-width="2" points="'+line+'"/><circle cx="'+X(n-1).toFixed(1)+'" cy="'+Y(last.close).toFixed(1)+'" r="3" fill="#2f6df0"/>'+lv+'<text x="'+pad+'" y="'+(H-8)+'" font-size="10" fill="#9aa4b2">'+tag+'</text></svg>';
}
/* 实时刷新编排 */
var diagCurId=null;
async function refreshStockData(silent){
  if(!silent) toast('正在刷新行情…');
  try{
    const hs=COL.holdings();
    const qqMap={};
    hs.forEach(function(h){ const s=secidOf(h); qqMap[emToQq(s)]=s; });
    Object.keys(StockAPI.secidIndex).forEach(function(k){ qqMap[emToQq(k)]=k; });
    const allSyms=Object.keys(qqMap);
    const batch=await engineFetchQQ(allSyms);
    const data={}; let liveN=0;
    hs.forEach(function(h){ const d=batch[emToQq(secidOf(h))]; if(d){ data[h.code]={name:h.name,price:d.price,prev:d.prev,open:d.open,high:d.high,low:d.low,vol:d.vol,amount:d.amount,change:d.change,pct:d.pct}; liveN++; } });
    const indexData={};
    Object.keys(StockAPI.secidIndex).forEach(function(k){ const d=batch[emToQq(k)]; if(d) indexData[k]={name:StockAPI.secidIndex[k],price:d.price,prev:d.prev,pct:d.pct,amount:d.amount}; });
    if(liveN) SAVE.stockQuotes({live:true,updated:nowStr(),asof:'腾讯财经公开接口',data:data});
    if(Object.keys(indexData).length) store.rawSet(PREFIX+'stock_index', indexData);
    let kN=0;
    for(const h of hs){ try{ const kl=await StockAPI.kline(secidOf(h)); if(kl){ setKline(h.id,kl); kN++; } }catch(e){} }
    try{ const md=await StockAPI.breadth(); if(md){ store.rawSet(PREFIX+'stock_breadth', md); store.rawSet(PREFIX+'stock_breadth_time', Date.now()); } }catch(e){}
    try{ const sd=await StockAPI.sectors(); if(sd){ const flat=sd.strong.concat(sd.weak).map(function(s){ return {name:s.name,pct:s.pct,lead:s.leader,flow:s.flow,kind:s.kind||''}; }); SAVE.stockSectors(flat); store.rawSet(PREFIX+'stock_sectors_live', true); } }catch(e){}
    try{ const pm=store.raw(PREFIX+'premarket',null); if(!pm||pm.date!==todayStr()){ await StockPremarket.refresh(true); } }catch(e){}
    try{ await refreshFx(); }catch(e){}
    try{ await StockIPO.fetch(true); }catch(e){}
    store.rawSet(PREFIX+'stock_liveflag', liveN>0);
    store.rawSet(PREFIX+'stock_quoteTime', new Date().toLocaleString('zh-CN'));
    if(liveN>0 && hs.length){ try{ recordPnlSnapshot(true); }catch(e){} }
  }catch(e){}
  if(parseHash().module==='stock'){ const sub=parseHash().sub; renderStock(['quotes','holdings','diag','sector','ipo','review','ann'].indexOf(sub)>=0?sub:'holdings'); }
  if(!silent){ const live=store.raw(PREFIX+'stock_liveflag',false); toast(live?'已刷新实时行情（持仓'+Object.keys(COL.stockQuotes()?COL.stockQuotes().data||{}:{}).length+'·指数·涨跌家数·板块·外盘·K线·新股）':'实时获取失败，保留示例数据'); }
}
function setDiagId(id){ diagCurId=id; renderStock('diag'); }
/* 从旧版 Eric 复盘台迁移真实数据（同 origin localStorage 直读；兼容 file:// 用户用导出文件导入） */
function migrateEricData(){
  let nHold=0,nPm=0,nRev=0;
  try{
    const eh=store.raw('wb_eric_holdings',null);
    if(eh&&eh.length){
      const mapOne=function(h){ return {
        id:h.id||uid('h'), name:h.name, code:h.code, secid:h.secid||null,
        market:(h.market==='HK'?'港股':'A股'), cur:h.currency||(h.market==='HK'?'HK$':'¥'),
        shares:h.qty||0, cost:h.cost||0, current:'',
        sector:h.sector||'', concepts:h.concepts||'', logic:h.logic||'', period:h.period||'', tp:h.tp||null, sl:h.sl||null, riskNote:h.riskNote||'', group:h.group||'核心持仓', updated:h.updated||'', type:h.type||(h.market==='HK'?'H':'A'), costCny:h.costCny||null, lot:h.lot||'', hkex:h.hkex||'', liquidity:h.liquidity||'', migrated:true
      }; };
      const mapped=eh.map(mapOne);
      const existing=COL.holdings();
      const nonSample=existing.filter(function(e){ return !e.sample; });
      const add=mapped.filter(function(m){ return !nonSample.some(function(e){ return e.code===m.code; }); });
      SAVE.holdings(nonSample.concat(add));
      nHold=add.length;
    }
    const epm=store.raw('wb_eric_premarket',null);
    if(epm){ store.rawSet(PREFIX+'premarket', epm); nPm=1; }
    const erev=store.raw('wb_eric_reviews',null);
    if(erev&&erev.length){
      const mapRev=function(r){ const envLine=r.env?r.env.replace('今日一句话结论：',''):''; const holdR=(r.hold||[]).map(function(h){ return {name:h.name,code:h.code||'',pct:h.pct,risk:h.risk,sug:h.sug||''}; });
        return { id:'mig_'+r.date, title:r.date+' 盘面复盘', date:r.date,
          content:(envLine?('【结论】'+envLine+'\n'):'')+(r.hold&&r.hold.length?('\n【持仓】'+r.hold.map(function(h){ return h.name+' '+(h.pct>=0?'+':'')+h.pct+'% 风险'+h.risk; }).join('；')+'\n'):'')+(r.hot&&r.hot.length?('\n【热点】'+r.hot.join('、')):'')+(r.events&&r.events.length?('\n【事件】'+r.events.join('；')):''),
          tags:[], link:null, auto:true, hold:holdR, env:envLine, savedAt:r.savedAt||'', migrated:true }; };
      const cur=COL.stockReviews(); const exDates={}; cur.forEach(function(x){ exDates[x.date]=1; });
      const add=erev.map(mapRev).filter(function(m){ return !exDates[m.date]; });
      SAVE.stockReviews(cur.concat(add));
      nRev=add.length;
    }
    if(nHold||nPm||nRev){
      logActivity('迁移旧版数据','stock','持仓'+nHold+'·外盘'+nPm+'·复盘'+nRev);
      toast('已从旧版 Eric 复盘台同步：持仓 '+nHold+' 条 · 盘前外盘 '+nPm+' · 复盘 '+nRev+' 条');
      if(parseHash().module==='stock') renderStock(parseHash().sub||'holdings');
    }
  }catch(e){ toast('迁移失败：'+e.message); }
  return {nHold:nHold,nPm:nPm,nRev:nRev};
}
function importEricBackup(json){
  try{
    let d=(json&&json.data)?json.data:json; let moved=0;
    const setIf=function(key){ if(d&&d[key]!=null){ let v=d[key]; if(typeof v==='string'){ try{ v=JSON.parse(v); }catch(e){ return; } } store.rawSet(key, v); moved++; } };
    setIf('wb_eric_holdings'); setIf('wb_eric_premarket'); setIf('wb_eric_reviews');
    if(!moved) throw new Error('备份中未找到 wb_eric_ 前缀数据');
    migrateEricData();
  }catch(e){ toast('导入失败：'+e.message); }
}

/* ----------------------------- 导航定义 ----------------------------- */
const NAV=[
  {id:'home',label:'工作台首页',ico:'🏠',hash:'#/home',bottom:true},
  {id:'stock',label:'股票复盘',ico:'📈',hash:'#/stock',bottom:true},
  {id:'book',label:'读书笔记',ico:'📚',hash:'#/book',bottom:true},
  {id:'kb',label:'个人知识库',ico:'🔗',hash:'#/kb',bottom:true},
  {id:'task',label:'任务与提醒',ico:'✅',hash:'#/task'},
  {id:'search',label:'全局搜索',ico:'🔍',hash:'#/search'},
  {id:'settings',label:'设置',ico:'⚙️',hash:'#/settings'}
];
const SUBNAV={
  stock:[
    {key:'holdings',label:'持仓管理'},{key:'quotes',label:'行情速览'},{key:'diag',label:'个股诊断'},
    {key:'review',label:'复盘记录'},{key:'ann',label:'公告事件'},{key:'sector',label:'板块数据'},{key:'ipo',label:'新股申购'}
  ],
  book:[
    {key:'home',label:'阅读首页'},{key:'library',label:'我的书架'},{key:'notes',label:'读书笔记'},{key:'review',label:'待复习'},{key:'topics',label:'主题地图'},{key:'recs',label:'书籍推荐'}
  ],
  kb:[
    {key:'home',label:'知识库首页'},{key:'inbox',label:'待整理'},{key:'collection',label:'全部收藏'},
    {key:'themes',label:'主题分类'},{key:'practice',label:'待实践'},{key:'featured',label:'精选内容'},{key:'archive',label:'归档'}
  ],
  task:[
    {key:'list',label:'任务列表'},{key:'reminder',label:'提醒'},{key:'calendar',label:'日历'}
  ],
  settings:[
    {key:'general',label:'通用'},{key:'tags',label:'标签管理'},{key:'data',label:'数据备份与恢复'},{key:'about',label:'关于'}
  ]
};

function renderSidebar(){
  const s=$('#sidebar');
  const counts=moduleCounts();
  let html='<div class="nav-group-label">主导航</div>';
  NAV.forEach(n=>{ if(n.id==='search') return;
    const c=counts[n.id]; const badge=c?`<span class="ni-count">${c}</span>`:'';
    html+=`<a class="nav-item" data-nav="${n.id}" href="${n.hash}"><span class="ni-ico">${n.ico}</span>${n.label}${badge}</a>`;
  });
  html+='<div class="nav-group-label">工具</div>';
  html+=`<a class="nav-item" data-nav="search" href="#/search"><span class="ni-ico">🔍</span>全局搜索</a>`;
  html+=`<a class="nav-item" data-nav="settings" href="#/settings"><span class="ni-ico">⚙️</span>设置</a>`;
  s.innerHTML=html;
  $$('.nav-item',s).forEach(a=>a.addEventListener('click',()=>{ location.hash=a.getAttribute('href').slice(1); }));
}
function renderBottomNav(){
  const b=$('#bottomnav');
  const items=NAV.filter(n=>n.bottom);
  b.innerHTML=items.map(n=>`<a data-nav="${n.id}" href="${n.hash}"><span class="bi-ico">${n.ico}</span>${n.label}</a>`).join('');
  $$('a',b).forEach(a=>a.addEventListener('click',()=>{ location.hash=a.getAttribute('href').slice(1); }));
}
function setActiveNav(id){
  $$('.nav-item').forEach(a=>a.classList.toggle('active',a.getAttribute('data-nav')===id));
  $$('#bottomnav a').forEach(a=>a.classList.toggle('active',a.getAttribute('data-nav')===id));
}
function moduleCounts(){
  const tasks=COL.tasks().filter(t=>!t.done).length;
  const reminders=COL.reminders().filter(r=>!r.done).length;
  const reviews=dueReviews().length;
  const kbTodo=COL.kb().filter(kbIsInbox).length;
  const practice=COL.kb().filter(k=>k.worthPractice==='yes'&&k.practiceStatus!=='已验证有效'&&k.practiceStatus!=='已验证无效'&&!k.archived).length;
  return {home:0,stock:COL.holdings().length,book:COL.books().length,kb:kbTodo,task:tasks+reminders,search:0,settings:0,
    _reviews:reviews,_practice:practice};
}

/* ----------------------------- 关联解析 ----------------------------- */
const MODULE_LABEL={book:'读书',kb:'知识库',stock:'股票',task:'任务',topic:'主题'};
function assocHtml(link){ if(!link||!link.type) return ''; const map={book:'📚',kb:'🔗',stock:'📈',task:'✅',booktopic:'🏷️',kbtopic:'🏷️'};
  return `<div class="assoc-row"><span class="a-ico">${map[link.type]||'🔗'}</span><span>关联${MODULE_LABEL[link.type.replace('topic','')]||''}：${esc(link.title)}</span><span class="muted-small" style="margin-left:auto">${esc(link.sub||'')}</span></div>`;
}
function linkTo(type,id){ if(type==='book'){ const b=COL.books().find(x=>x.id===id); return b?{type,id,title:b.title}:null; }
  if(type==='kb'){ const k=COL.kb().find(x=>x.id===id); return k?{type,id,title:k.title}:null; }
  if(type==='stock'){ const h=COL.holdings().find(x=>x.id===id); return h?{type,id,title:h.name+'('+h.code+')'}:null; }
  if(type==='task'){ const t=COL.tasks().find(x=>x.id===id); return t?{type,id,title:t.title}:null; }
  return null; }

/* 关联选择器（返回 HTML + 绑定） */
function linkPickerField(current, types){
  const opts=[];
  types.forEach(t=>{
    if(t==='book') COL.books().forEach(b=>opts.push({type:'book',id:b.id,title:b.title,sub:'书籍'}));
    if(t==='kb') COL.kb().forEach(k=>opts.push({type:'kb',id:k.id,title:k.title,sub:'收藏'}));
    if(t==='stock') COL.holdings().forEach(h=>opts.push({type:'stock',id:h.id,title:h.name+'('+h.code+')',sub:'股票'}));
    if(t==='task') COL.tasks().forEach(t2=>opts.push({type:'task',id:t2.id,title:t2.title,sub:'任务'}));
  });
  if(!opts.length) return '<p class="muted-small">暂无可关联内容（先去对应模块创建）。</p>';
  const sel=`<select id="linkSel"><option value="">— 不关联 —</option>${opts.map(o=>`<option value="${o.type}:${o.id}" ${current&&current.type===o.type&&current.id===o.id?'selected':''}>[${o.sub}] ${esc(o.title)}</option>`).join('')}</select>`;
  return `<div class="field"><label>关联内容（可选）</label>${sel}</div>`;
}
function readLinkPicker(){ const s=$('#linkSel'); if(!s||!s.value) return null; const [type,id]=s.value.split(':'); return {type,id,title:s.options[s.selectedIndex].text.replace(/^\[.*?\]\s*/,'')}; }

/* =========================================================================
   路由
   ========================================================================= */
function parseHash(){
  let h=location.hash.replace(/^#\/?/,'');
  const qIdx=h.indexOf('?'); let q=''; if(qIdx>=0){ q=h.slice(qIdx+1); h=h.slice(0,qIdx); }
  const parts=h.split('/').filter(Boolean);
  const module=parts[0]||'home'; const sub=parts[1]||null;
  const params={}; q.split('&').forEach(kv=>{ const [k,v]=kv.split('='); if(k) params[k]=decodeURIComponent(v||''); });
  return {module,sub,params};
}
function router(){
  const {module,sub,params}=parseHash();
  setActiveNav(module);
  renderRightbar();
  const view=$('#view');
  view.scrollTop=0;
  const map={
    home:renderHome, stock:renderStock, book:renderBook, kb:renderKb,
    task:renderTask, search:renderSearch, settings:renderSettings
  };
  const fn=map[module]||renderHome;
  try{ fn(sub,params); }catch(e){ console.error(e); view.innerHTML=`<div class="empty"><div class="e-ico">⚠️</div>页面渲染出错：${esc(e.message)}</div>`; }
  pushRecentSafe(module,sub);
}
function pushRecentSafe(module,sub){
  const titles={home:'工作台首页',stock:'股票复盘',book:'读书笔记',kb:'个人知识库',task:'任务与提醒',search:'全局搜索',settings:'设置'};
  let title=titles[module]||module;
  if(sub&&SUBNAV[module]){ const sn=SUBNAV[module].find(s=>s.key===sub); if(sn) title+=` / ${sn.label}`; }
  pushRecent(module,title,sub||'');
}

/* ----------------------------- 顶部栏交互 ----------------------------- */
function bindTopbar(){
  $('#addBtn').addEventListener('click',e=>{ e.stopPropagation(); $('#addMenu').classList.toggle('open'); });
  document.addEventListener('click',()=>$('#addMenu').classList.remove('open'));
  $('#addMenu').addEventListener('click',e=>{ const b=e.target.closest('[data-add]'); if(b){ $('#addMenu').classList.remove('open'); openAdd(b.getAttribute('data-add')); } });
  $('#settingsBtn').addEventListener('click',()=>location.hash='#/settings');
  $('#reminderBtn').addEventListener('click',()=>location.hash='#/task/reminder');
  $('#globalSearch').addEventListener('keydown',e=>{ if(e.key==='Enter'){ const q=$('#globalSearch').value.trim(); if(q) location.hash='#/search?q='+encodeURIComponent(q); } });
}

/* 新建菜单分发 */
function openAdd(kind){
  switch(kind){
    case 'stock': location.hash='#/stock/holdings'; setTimeout(()=>openHoldingForm(),200); break;
    case 'book': location.hash='#/book/library'; setTimeout(()=>openBookForm(),200); break;
    case 'note': location.hash='#/book/notes'; setTimeout(()=>openNoteForm(),200); break;
    case 'kb': location.hash='#/kb/home'; setTimeout(()=>openKbForm(),200); break;
    case 'task': location.hash='#/task/list'; setTimeout(()=>openTaskForm(),200); break;
    case 'reminder': location.hash='#/task/reminder'; setTimeout(()=>openReminderForm(),200); break;
  }
}

/* ----------------------------- 通用 UI 片段 ----------------------------- */
function pageHead(title,sub,actions,icon){ return `<div class="page-head"><div class="ph-main">${icon?`<span class="ph-ico">${esc(icon)}</span>`:''}<div class="ph-titles"><h1>${title}</h1>${sub?`<div class="sub">${sub}</div>`:''}</div></div><div class="flex">${actions||''}</div></div>`; }
function subnav(module,active){ const items=SUBNAV[module]||[]; return `<div class="subnav">${items.map(s=>`<button data-sub="${s.key}" class="${s.key===active?'active':''}">${s.label}</button>`).join('')}</div>`; }
function bindSubnav(module){ $$('.subnav [data-sub]').forEach(b=>b.onclick=()=>{ location.hash=`#/${module}/${b.getAttribute('data-sub')}`; }); }
function emptyState(ico,text,actionLabel,onClick){ return `<div class="empty"><div class="e-ico">${ico}</div><div>${esc(text)}</div>${actionLabel?`<span class="e-link" data-empty-act>${esc(actionLabel)}</span>`:''}</div>`; }
function loadingState(text){ return `<div class="loading"><div class="spin"></div>${esc(text||'加载中…')}</div>`; }

/* 日期选择辅助 */
function dateInput(value){ return `<input type="date" id="f_date" value="${esc(value||todayStr())}">`; }

/* =========================================================================
   首页
   ========================================================================= */
function renderHome(){
  const view=$('#view');
  const counts=moduleCounts();
  const books=COL.books(); const notes=COL.booknotes(); const kb=COL.kb(); const tasks=COL.tasks(); const holdings=COL.holdings();
  const readBook=books.find(b=>b.status==='在读')||books.find(b=>b.status==='想读');
  const readingPct=readBook?Math.round((readBook.currentPage/readBook.totalPages)*100):0;
  const dueRev=dueReviews().length;
  const kbTodo=kb.filter(kbIsInbox).length;
  const practice=kb.filter(k=>k.worthPractice==='yes'&&k.practiceStatus!=='已验证有效'&&k.practiceStatus!=='已验证无效'&&!k.archived).length;
  const todayTasks=tasks.filter(t=>!t.done && (!t.due || t.due<=todayStr()));
  const risk=stockRiskAlerts();
  const recent=COL.recent().slice(0,8);

  view.innerHTML=`
    ${pageHead('工作台首页', fmtDate(new Date(),true)+' · 全局概览', `<button class="btn primary" id="homeAdd">＋ 快速新建</button>`,'🏠')}
    <div class="grid cards-4">
      <div class="card clickable" data-go="#/task/list">
        <div class="stat-row"><div class="stat-ico">✅</div><div><div class="stat-num">${todayTasks.length}</div><div class="stat-label">今日待办</div></div></div>
      </div>
      <div class="card clickable ${risk.length?'':''}" data-go="#/stock/holdings">
        <div class="stat-row"><div class="stat-ico" style="background:${risk.length?'#fef2f2;color:#dc2626':'#eef3ff;color:#2563eb'}">📈</div><div><div class="stat-num" style="${risk.length?'color:#dc2626':''}">${risk.length}</div><div class="stat-label">股票风险提醒</div></div></div>
      </div>
      <div class="card clickable" data-go="#/book/library">
        <div class="stat-row"><div class="stat-ico" style="background:#f0fdf4;color:#16a34a">📚</div><div><div class="stat-num">${readingPct}%</div><div class="stat-label">当前阅读进度${readBook?'《'+esc(readBook.title.slice(0,8))+'…》':''}</div></div></div>
      </div>
      <div class="card clickable" data-go="#/book/review">
        <div class="stat-row"><div class="stat-ico" style="background:#fff7ed;color:#ea580c">🔁</div><div><div class="stat-num">${dueRev}</div><div class="stat-label">待读笔记复习</div></div></div>
      </div>
      <div class="card clickable" data-go="#/kb/inbox">
        <div class="stat-row"><div class="stat-ico" style="background:#faf5ff;color:#9333ea">🔗</div><div><div class="stat-num">${kbTodo}</div><div class="stat-label">待整理收藏</div></div></div>
      </div>
      <div class="card clickable" data-go="#/kb/practice">
        <div class="stat-row"><div class="stat-ico" style="background:#ecfeff;color:#0891b2">🛠️</div><div><div class="stat-num">${practice}</div><div class="stat-label">待实践内容</div></div></div>
      </div>
      <div class="card clickable" data-go="#/book/notes">
        <div class="stat-row"><div class="stat-ico">✏️</div><div><div class="stat-num">${notes.length}</div><div class="stat-label">读书笔记总数</div></div></div>
      </div>
      <div class="card clickable" data-go="#/stock/holdings">
        <div class="stat-row"><div class="stat-ico">💼</div><div><div class="stat-num">${holdings.length}</div><div class="stat-label">持仓标的数</div></div></div>
      </div>
    </div>

    <div class="grid" style="grid-template-columns:1.4fr 1fr;margin-top:16px;align-items:start">
      <div>
        ${ risk.length? `<div class="panel"><h2>⚠️ 股票风险提醒</h2>${risk.map(r=>`<div class="kv"><span class="k">${esc(r.name)}</span><span class="v ${clsForPct(r.pct)}">${fmtPct(r.pct)} · ${esc(r.reason)}</span></div>`).join('')}</div>`:'' }
        <div class="panel">
          <h2>📌 今日待办与提醒</h2>
          ${ todayTasks.length? todayTasks.slice(0,6).map(t=>`<div class="kv"><span class="k">${esc(t.title)}</span><span class="v ${t.priority==='高'?'up':''}">${esc(t.priority||'普通')}${t.due&&t.due!==todayStr()?' · '+t.due:''}</span></div>`).join('') : '<p class="muted-small">暂无今日待办</p>' }
          ${ dueReminders().length? dueReminders().slice(0,4).map(r=>`<div class="kv"><span class="k">⏰ ${esc(r.title)}</span><span class="v muted-small">${esc(r.time||'')}</span></div>`).join('') : '' }
        </div>
      </div>
      <div>
        <div class="panel">
          <h2>🕘 最近访问</h2>
          ${ recent.length? recent.map(r=>`<div class="tl-item"><div style="cursor:pointer" data-go="${'#/'+r.module+(r.sub?'/'+r.sub:'')}">${esc(r.title)}</div><div class="t-time">${new Date(r.ts).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div></div>`).join('') : '<p class="muted-small">暂无访问记录</p>' }
        </div>
      </div>
    </div>

    <div class="panel mt">
      <div class="panel-head"><h2>⚡ 快速入口</h2></div>
      <div class="flex flex-wrap">
        <button class="chip" data-go="#/stock/holdings">📈 持仓管理</button>
        <button class="chip" data-go="#/stock/review">📝 写复盘</button>
        <button class="chip" data-go="#/book/library">📚 书库</button>
        <button class="chip" data-go="#/book/notes">✏️ 读书笔记</button>
        <button class="chip" data-go="#/kb/home">🔗 知识库</button>
        <button class="chip" data-go="#/task/list">✅ 任务</button>
        <button class="chip" data-go="#/search">🔍 搜索</button>
        <button class="chip" data-go="#/settings">⚙️ 设置</button>
      </div>
    </div>
  `;
  $$('[data-go]',view).forEach(el=>el.onclick=()=>location.hash=el.getAttribute('data-go'));
  $('#homeAdd').onclick=()=>{ $('#addMenu').classList.add('open'); };
}

/* 股票风险提醒 */
function stockRiskAlerts(){
  const h=COL.holdings(); const q=COL.stockQuotes(); const set=getSettings();
  const out=[];
  h.forEach(x=>{ const cur=(q&&q.data&&q.data[x.code])?q.data[x.code].price:x.current; if(cur==null) return; const pnl=cur-x.cost; const pct=x.cost?pnl/x.cost*100:0; if(pct<=set.marketRiskPct){ out.push({name:x.name,code:x.code,pct:pct,reason:'浮亏超阈值'}); } });
  return out;
}
function dueReminders(){ return COL.reminders().filter(r=>!r.done); }
function dueReviews(){
  const rev=COL.bookreviews(); const today=todayStr();
  return rev.filter(r=>!r.done && r.nextDate && r.nextDate<=today);
}

/* =========================================================================
   股票复盘模块
   ========================================================================= */
function renderStock(sub){
  sub=sub||'holdings'; const view=$('#view');
  view.innerHTML=pageHead('股票复盘', '持仓 · 行情 · 诊断 · 复盘 · 公告 · 板块 · 新股', `<button class="btn primary" id="stockAdd">＋ 新建</button>`,'📈')+
    subnav('stock',sub);
  const body=document.createElement('div'); view.appendChild(body);
  renderStockSub(sub, body);
  bindSubnav('stock');
  $('#stockAdd').onclick=()=>{ if(sub==='holdings') openHoldingForm(); else if(sub==='review') openStockReviewForm(); else if(sub==='quotes') refreshQuotes(); else toast('该视图为参考/示例数据，无需新建'); };
}
function renderStockSub(sub,body){
  ({holdings:stockHoldings,quotes:stockQuotes,diag:stockDiag,review:stockReview,ann:stockAnn,sector:stockSector,ipo:stockIpo})[sub](body);
}
function stockHoldings(body){
  let h=COL.holdings(); const q=COL.stockQuotes();
  const totalMv=h.reduce((s,x)=>{ const cur=(q&&q.data&&q.data[x.code])?q.data[x.code].price:x.current; return s+(cur||0)*(x.shares||0); },0);
  const totalCost=h.reduce((s,x)=>s+(x.cost||0)*(x.shares||0),0);
  const totalPnl=totalMv-totalCost;
  const fx=StockFX.hkd2cny||1; const fxAsOf=StockFX.asof||'';
  let mvA=0,costA=0,tdA=0,mvHcny=0,costHcny=0,tdHcny=0;
  h.forEach(function(x){
    const qd=(q&&q.data&&q.data[x.code])||null;
    const price=qd?qd.price:(x.current||x.cost||0);
    const prev=qd?qd.prev:(x.current||x.cost||0);
    const mv=(price||0)*(x.shares||0), cost=(x.cost||0)*(x.shares||0), td=(price-prev)*(x.shares||0);
    if(x.market==='港股'){ mvHcny+=mv*fx; costHcny+=cost*fx; tdHcny+=td*fx; } else { mvA+=mv; costA+=cost; tdA+=td; }
  });
  const mvCny=mvA+mvHcny, costCny=costA+costHcny, pnlCny=mvCny-costCny, tdCny=tdA+tdHcny, pctCny=costCny?pnlCny/costCny*100:0;
  const hkRows=h.filter(function(x){ return x.market==='港股'; }).length;
  const kpi2='<div class="grid cards-4 mb" style="margin-top:12px">'
    +'<div class="card"><div class="stat-num">'+fmtMoney(mvCny)+'</div><div class="stat-label">总市值 (A+H 折算 ¥)</div></div>'
    +'<div class="card"><div class="stat-num '+(clsForPct(pnlCny))+'">'+fmtMoney(pnlCny)+'</div><div class="stat-label">浮动盈亏 (折算)</div></div>'
    +'<div class="card"><div class="stat-num '+(clsForPct(tdCny))+'">'+fmtMoney(tdCny)+'</div><div class="stat-label">今日盈亏 (折算)</div></div>'
    +'<div class="card"><div class="stat-num" style="font-size:18px">'+(fx?fx.toFixed(4):'-')+'</div><div class="stat-label">港币→人民币'+(hkRows?'':' (无港股)')+'</div></div>'
    +'</div>'
    +'<div class="muted-small">折算口径：A 股按 ¥ 计，港股市值/盈亏按汇率折合人民币（'+esc(fxAsOf)+'）。'+(hkRows?'':'当前无港股持仓，折算值与原始一致。')+'</div>';
  body.innerHTML=`
    <div class="grid cards-4 mb">
      <div class="card"><div class="stat-num">${fmtMoney(totalMv)}</div><div class="stat-label">总市值（示例行情估算）</div></div>
      <div class="card"><div class="stat-num ${clsForPct(totalPnl)}">${fmtMoney(totalPnl)}</div><div class="stat-label">浮动盈亏</div></div>
      <div class="card"><div class="stat-num ${clsForPct(totalCost?totalPnl/totalCost*100:0)}">${fmtPct(totalCost?totalPnl/totalCost*100:0)}</div><div class="stat-label">总收益率</div></div>
      <div class="card"><div class="stat-num">${h.length}</div><div class="stat-label">持仓标的数</div></div>
    </div>
    ${kpi2}
    ${pnlChart()}
    <div class="panel mt">
      <div class="panel-head"><h2>💼 持仓明细</h2><span class="badge gray">数据为用户录入，本地保存</span></div>
      ${ h.length? `<table><thead><tr><th>名称/代码</th><th>市场</th><th class="num">持股</th><th class="num">成本</th><th class="num">现价</th><th class="num">市值</th><th class="num">盈亏%</th><th></th></tr></thead><tbody>
        ${h.map(x=>{ const cur=(q&&q.data&&q.data[x.code])?q.data[x.code].price:x.current; const mv=(cur||0)*(x.shares||0); const pnl=mv-(x.cost||0)*(x.shares||0); const pct=x.cost?pnl/((x.cost||0)*(x.shares||0))*100:0;
          return `<tr><td><b>${esc(x.name)}</b><br><span class="muted-small">${esc(x.code)}</span></td><td>${esc(x.market||'A股')}</td><td class="num">${(x.shares||0).toLocaleString()}</td><td class="num">${fmtMoney(x.cost,x.cur)}</td><td class="num">${cur!=null?fmtMoney(cur,x.cur):'—'}</td><td class="num">${fmtMoney(mv,x.cur)}</td><td class="num ${clsForPct(pct)}">${fmtPct(pct)}</td><td><div class="row-actions"><button class="mini-btn" data-edit="${x.id}">编辑</button><button class="mini-btn danger" data-del="${x.id}">删</button></div></td></tr>`;
        }).join('')}
      </tbody></table>` : emptyState('💼','暂无持仓，点击右上角「新建」添加','添加持仓',null)+`<div class="muted-small mt" style="text-align:center;max-width:540px;margin:14px auto 0;line-height:1.8">数据保存在<b>当前浏览器 + 当前网址</b>下（按网址隔离，不跨设备/浏览器）。若你是在另一台设备、另一个浏览器、或用 <code>file://</code> 打开本地文件、或清过网站缓存时查看，这里就会是空的。<br>请回到你平时录入持仓的<b>公网链接</b>打开并硬刷新（Mac Cmd+Shift+R / Win Ctrl+F5）；并建议到「设置 → 导出全部数据」存一份 JSON 备份，以后用「导入备份」即可随时恢复。</div>` }
    </div>
    ${ relatedBookNotesHtml() }
    ${ relatedKbHtml() }`;
  $$('[data-edit]',body).forEach(b=>b.onclick=()=>openHoldingForm(b.getAttribute('data-edit')));
  $$('[data-del]',body).forEach(b=>b.onclick=async()=>{ if(await confirmDialog('删除持仓','确认删除该持仓？此操作不可撤销。','删除')){ let a=COL.holdings(); a=a.filter(x=>x.id!==b.getAttribute('data-del')); SAVE.holdings(a); logActivity('删除持仓','stock'); renderStock('holdings'); toast('已删除'); } });
  const rp=$('#recPnl'); if(rp) rp.onclick=function(){ recordPnlSnapshot(false); };
}
function recordPnlSnapshot(silent){
  const h=COL.holdings();
  if(!h.length){ if(!silent) toast('请先添加持仓'); return; }
  const q=COL.stockQuotes(); const fx=StockFX.hkd2cny||1;
  let mvA=0,costA=0,mvHcny=0,costHcny=0;
  h.forEach(function(x){
    const qd=(q&&q.data&&q.data[x.code])||null;
    const price=qd?qd.price:(x.current||x.cost||0);
    const mv=(price||0)*(x.shares||0), cost=(x.cost||0)*(x.shares||0);
    if(x.market==='港股'){ mvHcny+=mv*fx; costHcny+=cost*fx; } else { mvA+=mv; costA+=cost; }
  });
  const totalValue=mvA+mvHcny, totalPnl=totalValue-(costA+costHcny);
  let pnl=COL.pnl(); pnl.push({date:todayStr(),totalValue:Math.round(totalValue*100)/100,totalPnl:Math.round(totalPnl*100)/100});
  pnl=pnl.sort((a,b)=>a.date.localeCompare(b.date));
  SAVE.pnl(pnl); if(!silent){ logActivity('记录市值快照','stock',todayStr()); toast('已记录今日快照'); renderStock('holdings'); }
}
function pnlChart(){
  let pnl=COL.pnl()||[];
  pnl=pnl.slice(-30);
  const w=600,h=160,pad=28;
  let chart='';
  if(pnl.length){
    const vals=pnl.map(p=>p.totalValue); const min=Math.min(...vals),max=Math.max(...vals); const rng=(max-min)||1;
    const X=i=>pad+(w-2*pad)*i/(pnl.length-1||1); const Y=v=>h-pad-(h-2*pad)*(v-min)/rng;
    const line=pnl.map((p,i)=>`${i?'L':'M'}${X(i).toFixed(1)},${Y(p.totalValue).toFixed(1)}`).join(' ');
    const line2=pnl.map((p,i)=>`${i?'L':'M'}${X(i).toFixed(1)},${Y(p.totalPnl).toFixed(1)}`).join(' ');
    chart=`<svg viewBox="0 0 ${w} ${h}"><line x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}" stroke="#e6e9f0"/><path d="${line}" fill="none" stroke="#2563eb" stroke-width="2"/><path d="${line2}" fill="none" stroke="#9333ea" stroke-width="2" stroke-dasharray="4 3"/></svg>`;
  } else {
    chart=`<div class="empty" style="padding:24px 0"><div class="e-ico" style="font-size:28px">📈</div><p class="muted-small">暂无历史快照，点击右上角按钮记录第一条</p></div>`;
  }
  return `<div class="panel mt"><div class="panel-head"><h2>📊 市值 / 盈亏曲线</h2><button class="btn sm" id="recPnl">记录今日快照</button></div><div class="chart-wrap">${chart}</div><div class="muted-small" style="margin-top:6px">蓝线=总市值　紫线=累计盈亏　（A+H 按港币→人民币折算）</div></div>`;
}
function stockQuotes(body){
  const q=COL.stockQuotes();
  const idx=store.raw(PREFIX+'stock_index',null);
  const b=store.raw(PREFIX+'stock_breadth',null);
  const pm=StockPremarket.get();
  const pmLive=StockPremarket.live();
  const live=q&&q.live;
  let html=`<div class="banner info"><span class="b-ico">ℹ️</span><div>点击「刷新行情」将尝试通过公开接口获取实时数据（腾讯财经行情 / 东方财富涨跌家数·板块 / 新浪外盘 / 东方财富新股），失败则保留示例数据。</div></div>`;
  html+=`<div class="panel"><div class="panel-head"><h2>📡 行情速览 ${live?'<span class="badge">实时行情</span>':'<span class="badge sample">示例数据</span>'}</h2><button class="btn primary sm" id="refreshQ">🔄 刷新行情</button></div>`;
  if(idx&&Object.keys(idx).length){
    html+='<div class="grid cards-3" style="margin-bottom:12px">';
    Object.values(idx).forEach(function(i){ html+='<div class="card"><div class="stat-num '+(i.pct==null?'':clsForPct(i.pct))+'">'+fmtMoney(i.price)+'</div><div class="stat-label">'+esc(i.name)+' '+(i.pct==null?'':fmtPct(i.pct))+'</div></div>'; });
    html+='</div>';
  }
  if(b){
    const btime=store.raw(PREFIX+'stock_breadth_time',0);
    html+='<div class="panel mt"><div class="panel-head"><h2>📊 涨跌家数 '+(btime?'<span class="badge">实时</span>':'<span class="badge sample">示例</span>')+'</h2></div><div class="grid cards-4"><div class="card"><div class="stat-num up">'+fmt2(b.up)+'</div><div class="stat-label">上涨</div></div><div class="card"><div class="stat-num down">'+fmt2(b.down)+'</div><div class="stat-label">下跌</div></div><div class="card"><div class="stat-num">'+fmt2(b.limitUp)+'</div><div class="stat-label">涨停</div></div><div class="card"><div class="stat-num">'+fmt2(b.limitDown)+'</div><div class="stat-label">跌停</div></div></div><div class="muted-small">市场宽度 '+(b.up>b.down?'偏强':b.down>b.up?'偏弱':'均衡')+(btime?'（实时）':'（示例）')+'</div></div>';
  }
  if(q&&q.data&&Object.keys(q.data).length){
    html+='<div class="panel mt"><h2>💼 持仓行情</h2><table><thead><tr><th>名称/代码</th><th class="num">现价</th><th class="num">涨跌幅</th><th class="num">昨收</th></tr></thead><tbody>';
    Object.entries(q.data).forEach(function(e){ const c=e[0],d=e[1]; const h=COL.holdings().find(function(x){ return x.code===c; }); const cur=h?h.cur:'¥';
      html+='<tr><td><b>'+esc(d.name)+'</b><br><span class="muted-small">'+esc(c)+'</span></td><td class="num">'+fmtMoney(d.price,cur)+'</td><td class="num '+clsForPct(d.pct)+'">'+fmtPct(d.pct)+'</td><td class="num muted-small">'+fmtMoney((d.prev!=null?d.prev:d.preClose),cur)+'</td></tr>'; });
    html+='</tbody></table><div class="src-line">更新时间：'+esc((q.updated||q.asof||''))+'　来源：'+(live?'腾讯财经公开接口':'示例数据（非实时）')+'</div></div>';
  } else { html+=loadingState('正在获取行情…'); }
  const idxRows=(pm.indices||[]).map(function(i){ return '<div class="card"><div class="note">'+esc(i.region)+' · '+esc(i.name)+'</div><div class="stat-num '+(i.pct>0?'up':i.pct<0?'down':'')+'" style="font-size:18px">'+pct2(i.pct)+'</div></div>'; }).join('');
  const hotRows=(pm.hotspots||[]).map(function(h){ return '<div class="between" style="padding:6px 0"><span><span class="badge '+(h.move==='大涨'||h.move==='上涨'?'b-up':h.move==='下跌'?'b-down':'b-warn')+'">'+esc(h.move)+'</span> '+esc(h.sector)+'</span><span class="note">'+esc(h.lead||'')+'</span></div>'; }).join('');
  html+='<div class="panel mt"><div class="panel-head"><h2>🌐 隔夜外盘 / 盘前热点 <span class="badge '+(pmLive?'':'sample')+'">'+(pmLive?'实时/摘要':'示例/过期')+'</span></h2><div><button class="btn sm" id="refreshPm">🔄 刷新外盘</button> <button class="btn sm ghost" id="editPm">编辑</button></div></div>'+
    '<div class="grid cards-3" style="margin-bottom:10px">'+idxRows+'</div>'+
    '<div class="note" style="line-height:1.6">'+esc(pm.summary||'')+'</div>'+
    '<div class="label mt">热点板块映射</div>'+(hotRows||'<div class="empty-state">暂无</div>')+
    '<div class="muted-small mt">更新时间 '+esc(pm.asof||'')+(pmLive?'':'（点刷新或手动编辑）')+'</div></div>';
  body.innerHTML=html;
  $('#refreshQ').onclick=refreshQuotes;
  $('#refreshPm').onclick=function(){ StockPremarket.refresh(false); };
  $('#editPm').onclick=function(){ StockPremarket.edit(); };
}
async function refreshQuotes(){ await refreshStockData(false); }
function stockDiag(body){
  const hs=COL.holdings();
  if(!hs.length){ body.innerHTML=emptyState('🔍','暂无持仓可诊断','去添加持仓',null); return; }
  const id=(diagCurId&&hs.some(function(x){ return x.id===diagCurId; }))?diagCurId:hs[0].id;
  diagCurId=id;
  const h=hs.find(function(x){ return x.id===id; });
  const d=diagCompute(h);
  const c=h.cur||'¥';
  const s=diagSuggest(d);
  const cs=compositeScore(h);
  let html='<div class="banner warn"><span class="b-ico">⚠️</span><div>个股诊断基于实时/示例行情与 K 线技术指标计算，仅供参考，<b>不构成投资建议</b>。K线为公开前复权数据，离线时以示例走势演示。</div></div>';
  html+='<div id="diagSeg" class="seg">'+(COL.holdings().map(function(x){ return '<button class="'+(x.id===id?'on':'')+'" data-did="'+x.id+'">'+esc(x.name)+' '+esc(x.code)+'</button>'; }).join(''))+'</div>';
  html+='<div class="grid cards-2" style="margin-top:10px"><div class="card"><div class="stat-label">'+esc(h.name)+' '+esc(h.code)+'</div><div class="stat-num '+(d.q?clsForPct(d.q.pct):'')+'" style="font-size:22px">'+fmtMoney(d.price,c)+'</div><div class="muted-small">现价 · '+(d.q?pct2(d.q.pct):'示例')+'</div></div>'+
    '<div class="card"><div class="stat-label">成本价 / 持仓</div><div class="stat-num" style="font-size:18px">'+fmtMoney(h.cost,c)+' · '+fmt2(h.shares)+'股</div><div class="muted-small">行业 '+(h.sector||'—')+'</div></div></div>';
  html+='<div class="grid cards-2" style="margin-top:10px"><div class="card"><div class="stat-label">浮动盈亏</div><div class="stat-num '+(d.pnl>=0?'up':'down')+'" style="font-size:18px">'+money2(d.pnl,c)+' ('+pct2(d.pnlPct)+')</div></div>'+
    '<div class="card"><div class="stat-label">距成本</div><div class="stat-num '+(d.distCost>=0?'up':'down')+'" style="font-size:18px">'+pct2(d.distCost)+'</div></div></div>';
  html+='<div class="panel mt"><div class="panel-head"><h2>📈 走势与关键价位</h2><span class="badge '+(d.sample?'sample':'')+'">'+(d.sample?'示例走势':'实时/前复权')+'</span></div><div id="diagChart" class="chart-wrap"></div></div>';
  html+='<div class="grid cards-4" style="margin-top:10px">'+
    '<div class="card"><div class="stat-label">第一压力</div><div class="stat-num up" style="font-size:16px">'+fmt2(d.levels[0].price)+'</div><div class="muted-small">'+esc(d.levels[0].note||'')+'</div></div>'+
    '<div class="card"><div class="stat-label">第二压力</div><div class="stat-num up" style="font-size:16px">'+fmt2(d.levels[1].price)+'</div><div class="muted-small">'+esc(d.levels[1].note||'')+'</div></div>'+
    '<div class="card"><div class="stat-label">第一支撑</div><div class="stat-num down" style="font-size:16px">'+fmt2(d.levels[2].price)+'</div><div class="muted-small">'+esc(d.levels[2].note||'')+'</div></div>'+
    '<div class="card"><div class="stat-label">第二支撑</div><div class="stat-num down" style="font-size:16px">'+fmt2(d.levels[3].price)+'</div><div class="muted-small">'+esc(d.levels[3].note||'')+'</div></div></div>';
  let tech='<div class="panel mt"><div class="panel-head"><h2>🧮 技术指标</h2></div><table><thead><tr><th>指标</th><th class="num">数值</th><th>解读</th></tr></thead><tbody>';
  tech+='<tr><td>MA5/10/20/60/120</td><td class="num">'+[d.ma5,d.ma10,d.ma20,d.ma60,d.ma120].map(function(v){ return v==null?'-':fmt2(v); }).join(' / ')+'</td><td>'+diagMaState(d)+'</td></tr>';
  tech+='<tr><td>MACD(12,26,9)</td><td class="num">DIF '+fmt2(d.macd.dif[d.macd.dif.length-1])+' / DEA '+fmt2(d.macd.dea[d.macd.dea.length-1])+'</td><td>'+diagMacdState(d)+'</td></tr>';
  tech+='<tr><td>RSI(14)</td><td class="num">'+fmt2(d.rsi)+'</td><td>'+(d.rsi>70?'超买':d.rsi<30?'超卖':'中性')+'</td></tr>';
  tech+='<tr><td>KDJ(J)</td><td class="num">'+fmt2(d.kdj)+'</td><td>'+(d.kdj>100?'高位':d.kdj<0?'低位':'中性')+'</td></tr>';
  tech+='<tr><td>布林带(20,2)</td><td class="num">'+fmt2(d.boll.up[d.boll.up.length-1])+' / '+fmt2(d.boll.mid[d.boll.mid.length-1])+' / '+fmt2(d.boll.lo[d.boll.lo.length-1])+'</td><td>'+diagBollState(d)+'</td></tr>';
  tech+='<tr><td>ATR波动率</td><td class="num">'+fmt2(d.atr)+' ('+fmt2(d.atrPct)+'%)</td><td>'+(d.atrPct>4?'高波动':d.atrPct>2.5?'中等':'低波动')+'</td></tr>';
  tech+='<tr><td>量比/换手/振幅</td><td class="num">'+(d.lv==null?'-':fmt2(d.lv))+' / '+(d.turn==null?'-':fmt2(d.turn)+'%')+' / '+(d.amp==null?'-':fmt2(d.amp)+'%')+'</td><td>'+d.vp+'</td></tr>';
  tech+='</tbody></table><div class="note">信号：'+[d.divergence!=='无'?d.divergence:'无背离',d.volRatio>1.5?'放量':'缩量',d.price>d.ma20?'站上MA20':'处于MA20下方'].join(' · ')+'</div></div>';
  html+=tech;
  html+='<div class="panel mt"><div class="panel-head"><h2>🎯 诊断结论</h2></div>';
  html+='<div class="grid cards-3" style="margin-bottom:10px">'+diagCard('趋势',d.trend,'')+diagCard('位置',d.pos,d.posLabel+' '+fmt2(d.posPct)+'%')+diagCard('量价',d.vp,'')+'</div>';
  html+='<div class="grid cards-3" style="margin-bottom:10px">'+diagCard('短线',d.shortS,'')+diagCard('技术评分',d.sc+' 分',cls2(d.sc-50))+diagCard('风险等级',d.risk,d.risk==='高'?'b-danger':d.risk==='中'?'b-warn':'b-up')+'</div>';
  html+='<div class="envbox" style="border:none;box-shadow:none;padding:12px"><div style="font-weight:700;margin-bottom:6px">操作建议：<span class="badge '+(d.risk==='高'?'b-danger':d.risk==='中'?'b-warn':'b-main')+'">'+s.sug+'</span></div>'+
    '<div class="basis">触发条件：'+s.trigger+'<br>失效条件：'+s.voidc+'<br>观察周期：'+s.period+'<br>风险提示：'+s.risk+'</div></div>';
  html+='<div class="panel mt"><div class="panel-head"><h2>📊 综合评分（市场20%·板块20%·技术25%·基本面20%·事件15%）</h2></div>'+
    '<div class="grid cards-3" style="margin-bottom:10px">'+diagCard('综合评分',cs.total+' 分',cls2(cs.total-50))+diagCard('综合趋势',cs.trend,'')+diagCard('综合风险',cs.risk,cs.risk==='高'?'b-danger':cs.risk==='中'?'b-warn':'b-up')+'</div>'+
    '<div class="note">'+cs.basis.join('；')+'。</div>'+
    '<div class="note">基本面权重因本工作台未接入财务数据暂以中性(50)计；如需更精确评分，可在持仓表单补充相关信息或后续接入财务接口。</div></div>';
  body.innerHTML=html;
  $$('#diagSeg [data-did]',body).forEach(function(b){ b.onclick=function(){ setDiagId(b.getAttribute('data-did')); }; });
  drawDiagChart('#diagChart', d.kl, d.levels, d.ma20a, d.sample);
}
function diagCard(k,v,sub){ return '<div class="card"><div class="stat-label">'+k+'</div><div class="stat-num '+(sub||'')+'" style="font-size:18px">'+v+'</div></div>'; }
function diagMaState(d){ if(d.ma5>d.ma20&&d.ma20>d.ma60) return '多头排列'; if(d.ma5<d.ma20&&d.ma20<d.ma60) return '空头排列'; return '均线缠绕/震荡'; }
function diagMacdState(d){ const i=d.macd.dif.length-1; if(d.macd.dif[i]>0&&d.macd.dif[i]>d.macd.dea[i]) return '金叉/多头'; if(d.macd.dif[i]<0&&d.macd.dif[i]<d.macd.dea[i]) return '死叉/空头'; return '黏合'; }
function diagBollState(d){ const i=d.boll.mid.length-1; if(d.price>d.boll.up[i]) return '触及上轨(偏强)'; if(d.price<d.boll.lo[i]) return '触及下轨(偏弱)'; return '中轨附近'; }
let stockReviewFilter='全部'; let stockReviewQ='';
function stockReview(body){
  body.innerHTML=`<div class="panel"><div class="panel-head"><h2>📝 复盘记录</h2>
      <div class="row" style="gap:8px">
        <button class="btn primary sm" id="saveTodayRev">💾 保存今日复盘</button>
        <button class="btn sm" id="newRev">＋ 写复盘</button>
      </div></div>
    <div class="row" style="margin:10px 0;gap:8px;flex-wrap:wrap">
      ${['全部','自动','手动'].map(f=>`<button class="btn ${f===stockReviewFilter?'':'ghost'} sm" data-rf="${f}">${f}</button>`).join('')}
      <input id="revSearch" placeholder="搜索标题/内容/持仓…" value="${esc(stockReviewQ)}" style="flex:1;min-width:160px">
    </div>
    <div id="revList"></div>
  </div>`;
  $('#saveTodayRev').onclick=saveStockReviewToday;
  $('#newRev').onclick=()=>openStockReviewForm();
  $('#revSearch').oninput=e=>{ stockReviewQ=e.target.value; renderRevList(); };
  $$('[data-rf]',body).forEach(b=>b.onclick=()=>{ stockReviewFilter=b.getAttribute('data-rf'); $$('[data-rf]',body).forEach(x=>x.className='btn '+(x.getAttribute('data-rf')===stockReviewFilter?'':'ghost')+' sm'); renderRevList(); });
  renderRevList();
}
function renderRevList(){
  const listEl=$('#revList'); if(!listEl) return;
  let r=COL.stockReviews().slice().sort((a,b)=>b.date.localeCompare(a.date));
  if(stockReviewFilter==='自动') r=r.filter(x=>x.auto);
  else if(stockReviewFilter==='手动') r=r.filter(x=>!x.auto);
  const q=stockReviewQ.trim().toLowerCase();
  if(q) r=r.filter(x=>(x.title||'').toLowerCase().includes(q)||(x.content||'').toLowerCase().includes(q)||(x.hold||[]).some(h=>(h.name||'').toLowerCase().includes(q)||(h.code||'').toLowerCase().includes(q)));
  listEl.innerHTML=r.length?r.map(revCard).join('') : emptyState('📝','还没有复盘记录','写一条复盘',null);
  $$('[data-open]',listEl).forEach(b=>b.onclick=()=>openStockReviewDetail(b.getAttribute('data-open')));
  $$('[data-del]',listEl).forEach(b=>b.onclick=async()=>{ if(await confirmDialog('删除复盘','确认删除该复盘记录？','删除')){ SAVE.stockReviews(COL.stockReviews().filter(x=>x.id!==b.getAttribute('data-del'))); renderRevList(); toast('已删除'); } });
}
function revCard(x){
  const holdR=(x.hold||[]).map(h=>h.name+'('+fmtPct(h.pct)+',风险'+h.risk+')').join(' · ')||'—';
  return `<div class="card mb" style="box-shadow:none">
    <div class="flex between"><b>${esc(x.title)}</b><span class="muted-small">${esc(x.date)} ${x.auto?'<span class="badge">自动</span>':'<span class="badge gray">手动</span>'}</span></div>
    ${x.env?`<div class="note" style="margin:6px 0">${esc(x.env)}</div>`:''}
    <div class="note">持仓：${esc(holdR)}</div>
    ${x.content?`<div style="font-size:13px;margin-top:6px;white-space:pre-wrap;line-height:1.5">${esc(x.content)}</div>`:''}
    <div class="flex flex-wrap" style="gap:6px;margin-top:6px">${tagsHtml(x.tags)}${x.link?assocHtml(x.link):''}</div>
    <div class="row-actions mt"><button class="mini-btn" data-open="${x.id}">查看</button><button class="mini-btn danger" data-del="${x.id}">删除</button></div>
  </div>`;
}
function genStockEnv(avgPct,hold){
  const mkt=avgPct>0.6?'强势':avgPct<-0.5?'弱势':'震荡';
  const strong=hold.filter(h=>h.pct>0).map(h=>h.name);
  const weak=hold.filter(h=>h.pct<0).map(h=>h.name);
  const concl=mkt==='强势'?'市场偏强，持仓整体上行，可积极跟踪强势标的与突破信号。':mkt==='弱势'?'市场偏弱，持仓承压，以防守与控仓为主，严控风险。':'指数震荡、结构分化，控制仓位以“业绩+板块强度”为主线，聚焦强于大盘的标的。';
  return '市场环境：'+mkt+'（持仓平均'+(avgPct>0?'+':'')+avgPct.toFixed(2)+'%）。'+concl+(strong.length?' 强于大盘：'+strong.slice(0,5).join('、')+'.':'')+(weak.length?' 偏弱：'+weak.slice(0,5).join('、')+'.':'');
}
function genStockReviewContent(avgPct,hold,totalMv,totalPnl){
  let s='【持仓概览】\n总市值 '+fmtMoney(totalMv)+'；总浮动盈亏 '+fmtMoney(totalPnl)+'（平均涨跌 '+(avgPct>0?'+':'')+avgPct.toFixed(2)+'%）。\n\n【个股表现】\n';
  hold.forEach(h=>{ s+=h.name+'：'+fmtPct(h.pct)+'，浮动'+fmtMoney(h.pnl)+'（'+fmtPct(h.pnlPct)+'），风险'+h.risk+'，建议'+h.sug+'。\n'; });
  s+='\n【明日关注】\n跟踪强势标的量能延续，弱势标的控制仓位与止损执行；结合板块与外围市场变化调整节奏。';
  return s;
}
function saveStockReviewToday(){
  const h=COL.holdings(); const q=COL.stockQuotes();
  if(!h.length){ toast('请先在持仓管理中添加标的'); return; }
  const t=todayStr();
  let totalMv=0,totalCost=0,sumPct=0,nWithPct=0;
  const hold=h.map(x=>{
    const d=(q&&q.data&&q.data[x.code])||null;
    const price=d?d.price:(x.current||x.cost||0);
    const pct=d?d.pct:(x.current&&x.cost?((x.current-x.cost)/x.cost*100):0);
    const mv=(price||0)*(x.shares||0);
    const pnl=mv-(x.cost||0)*(x.shares||0);
    const pnlPct=x.cost?pnl/((x.cost||0)*(x.shares||0))*100:0;
    totalMv+=mv; totalCost+=(x.cost||0)*(x.shares||0);
    if(d&&d.pct!=null){ sumPct+=d.pct; nWithPct++; }
    const risk=pnlPct>=15?'中':pnlPct<=-10?'中':(pct>3?'低':pct<-3?'中':'低');
    const sug=pct>0?'持有观察':pct<-3?'控制仓位':'等待突破确认';
    return {id:x.id,name:x.name,code:x.code,cur:x.cur,price:Math.round(price*100)/100,pct:Math.round(pct*100)/100,pnl:Math.round(pnl*100)/100,pnlPct:Math.round(pnlPct*100)/100,risk,sug};
  });
  const avgPct=nWithPct?sumPct/nWithPct:0;
  const totalPnl=totalMv-totalCost;
  const env=genStockEnv(avgPct,hold);
  const content=genStockReviewContent(avgPct,hold,totalMv,totalPnl);
  let arr=COL.stockReviews();
  const i=arr.findIndex(r=>r.date===t && r.auto);
  const rec={id:i>=0?arr[i].id:uid('sr'),date:t,auto:true,title:t+' 盘面复盘',env,mood:3,
    totalMv:Math.round(totalMv*100)/100,totalPnl:Math.round(totalPnl*100)/100,avgPct:Math.round(avgPct*100)/100,
    hold,content,tags:['自动复盘'],link:null,savedAt:new Date().toLocaleString('zh-CN')};
  if(i>=0) arr[i]=rec; else arr.unshift(rec);
  SAVE.stockReviews(arr); logActivity('保存复盘','stock',t+' 自动复盘'); renderStock('review'); toast('已保存今日复盘');
}
function openStockReviewDetail(id){
  const arr=COL.stockReviews(); const x=arr.find(r=>r.id===id); if(!x) return;
  const moodLabels=['很差','偏差','一般','不错','很好'];
  const holdRows=(x.hold||[]).map(h=>`<tr><td>${esc(h.name)}<div class="note">${esc(h.code)}</div></td><td class="num ${clsForPct(h.pct)}">${fmtPct(h.pct)}</td><td class="num">${fmtMoney(h.price,h.cur)}</td><td class="num ${clsForPct(h.pnl)}">${fmtMoney(h.pnl,h.cur)}</td><td class="num ${clsForPct(h.pnlPct)}">${fmtPct(h.pnlPct)}</td><td>${esc(h.risk)}</td><td>${esc(h.sug)}</td></tr>`).join('');
  const moodOpts=[1,2,3,4,5].map(m=>`<option value="${m}" ${(x.mood===m)?'selected':''}>${moodLabels[m-1]}</option>`).join('');
  openModal(`<div class="modal-head"><h3>${esc(x.title)}</h3><button class="x-close" data-x>×</button></div>
    <div class="modal-body">
      ${x.env?`<div class="banner info"><span class="b-ico">📌</span><div>${esc(x.env)}</div></div>`:''}
      ${x.auto?`<div class="kv"><span class="k">总市值</span><span class="v">${fmtMoney(x.totalMv)}</span></div><div class="kv"><span class="k">总浮动盈亏</span><span class="v ${clsForPct(x.totalPnl)}">${fmtMoney(x.totalPnl)}</span></div><div class="kv"><span class="k">平均涨跌</span><span class="v ${clsForPct(x.avgPct)}">${fmtPct(x.avgPct)}</span></div>`:''}
      ${holdRows?`<div class="panel" style="margin:10px 0"><h3>持仓快照</h3><table><thead><tr><th>名称</th><th class="num">涨跌</th><th class="num">现价</th><th class="num">浮动盈亏</th><th class="num">收益率</th><th>风险</th><th>建议</th></tr></thead><tbody>${holdRows}</tbody></table></div>`:''}
      <div class="field"><label>复盘内容</label><textarea id="d_content">${esc(x.content||'')}</textarea></div>
      <div class="field"><label>心情</label><select id="d_mood">${moodOpts}</select></div>
      <div class="field"><label>标签</label><div id="d_tags" class="flex flex-wrap" style="gap:6px;border:1px solid var(--line-strong);border-radius:9px;padding:8px;min-height:38px"></div></div>
      ${linkPickerField(x.link,['book','kb'])}
      <div class="note">保存时间：${esc(x.savedAt||'—')}</div>
    </div>
    <div class="modal-foot"><button class="btn" data-x>取消</button><button class="btn primary" id="d_save">保存</button></div>`);
  $$('[data-x]',modalEl).forEach(b=>b.onclick=closeModal);
  const sel=(x.tags||[]).slice(); renderTagsInput(sel,$('#d_tags'));
  $('#d_save').onclick=()=>{
    x.content=$('#d_content').value; x.mood=parseInt($('#d_mood').value)||3; x.tags=sel.slice(); x.link=readLinkPicker();
    if(x.auto) x.title=x.date+' 盘面复盘';
    SAVE.stockReviews(COL.stockReviews().map(r=>r.id===id?x:r));
    closeModal(); renderStock('review'); toast('已更新');
  };
}
function stockAnn(body){
  const a=COL.stockAnn();
  body.innerHTML=`<div class="banner warn"><span class="b-ico">⚠️</span><div>以下公告为<b>示例数据</b>，仅用于演示结构。实际请在对应券商/交易所获取权威公告。</div></div>
    <div class="panel"><h2>📋 公告事件</h2>
    ${ a.length? a.map(x=>`<div class="kv"><span class="k">${esc(x.date)} · ${esc(x.market||'')}</span><span class="v">${esc(x.title)} <span class="badge sample">示例</span></span></div>`).join('') : '<p class="muted-small">暂无</p>' }
    </div>`;
}
function stockSector(body){
  const s=COL.stockSectors();
  const live=store.raw(PREFIX+'stock_sectors_live',false);
  let html='<div class="banner info"><span class="b-ico">ℹ️</span><div>板块数据来自东方财富板块行情'+(live?'（实时）':'（示例，点「刷新行情」获取实时）')+'。点击「刷新行情」将同时更新涨跌家数、板块、外盘与新股。</div></div>';
  html+='<div class="panel"><div class="panel-head"><h2>🏭 板块数据 '+(live?'<span class="badge">实时</span>':'<span class="badge sample">示例</span>')+'</h2><button class="btn primary sm" id="refreshSector">🔄 刷新行情</button></div>';
  if(s.length){
    const strong=s.filter(function(x){ return x.pct>0; }).sort(function(a,b){ return b.pct-a.pct; }).slice(0,12);
    const weak=s.filter(function(x){ return x.pct<0; }).sort(function(a,b){ return a.pct-b.pct; }).slice(0,8);
    html+='<h3 style="margin:10px 0 6px">强势板块</h3><table><thead><tr><th>板块</th><th class="num">涨跌幅</th><th>领涨</th><th class="num">主力净流入</th></tr></thead><tbody>'+strong.map(function(x){ return '<tr><td>'+esc(x.name)+'</td><td class="num '+clsForPct(x.pct)+'">'+fmtPct(x.pct)+'</td><td>'+esc(x.lead||'—')+'</td><td class="num '+(x.flow>=0?'up':'down')+'">'+(x.flow!=null?(x.flow>=0?'+':'')+fmt2(x.flow)+'亿':'—')+'</td></tr>'; }).join('')+'</tbody></table>';
    if(weak.length){ html+='<h3 style="margin:14px 0 6px">弱势板块</h3><table><thead><tr><th>板块</th><th class="num">涨跌幅</th><th>领涨</th><th class="num">主力净流入</th></tr></thead><tbody>'+weak.map(function(x){ return '<tr><td>'+esc(x.name)+'</td><td class="num '+clsForPct(x.pct)+'">'+fmtPct(x.pct)+'</td><td>'+esc(x.lead||'—')+'</td><td class="num '+(x.flow>=0?'up':'down')+'">'+(x.flow!=null?(x.flow>=0?'+':'')+fmt2(x.flow)+'亿':'—')+'</td></tr>'; }).join('')+'</tbody></table>'; }
  } else { html+='<p class="muted-small">暂无板块数据，点「刷新行情」获取。</p>'; }
  html+='</div>';
  body.innerHTML=html;
  const rb=$('#refreshSector'); if(rb) rb.onclick=refreshQuotes;
}
function stockIpo(body){
  const arr=COL.stockIpo().map(function(o){ return Object.assign({},o,{board:o.board||boardOf(o.code)||'其他'}); });
  const live=store.raw(PREFIX+'stock_ipo_live',false);
  const asof=store.raw(PREFIX+'stock_ipo_asof','示例数据');
  const boards=['全部'].concat(Array.from(new Set(arr.map(function(o){ return o.board; }).filter(Boolean))));
  const filter=StockIPO.filter||'全部';
  const list=filter==='全部'?arr:arr.filter(function(o){ return o.board===filter; });
  let html='<div class="banner info"><span class="b-ico">ℹ️</span><div>新股数据来自东方财富新股日历'+(live?'（实时）':'（示例，点「刷新行情」获取实时）')+'。更新：'+(asof||'—')+'</div></div>';
  html+='<div class="panel"><div class="panel-head"><h2>🆕 新股申购 '+(live?'<span class="badge">实时</span>':'<span class="badge sample">示例</span>')+'</h2><button class="btn primary sm" id="refreshIpo">🔄 刷新新股</button></div>';
  if(COL.stockIpo().length) html+='<div class="row" style="gap:6px;flex-wrap:wrap;margin:8px 0">'+boards.map(function(b){ return '<button class="btn '+(b===filter?'':'ghost')+' sm" data-board="'+esc(b)+'">'+esc(b)+'</button>'; }).join('')+'</div>';
  if(list.length){
    html+='<table><thead><tr><th>名称/代码</th><th>板块</th><th>申购日</th><th class="num">发行价</th><th class="num">PE</th><th>中签/缴款</th><th>上市</th><th>状态</th></tr></thead><tbody>'+list.map(function(o){
      const stC=o.status==='已中签'?'b-up':o.status==='已申购'?'b-main':o.status==='未中签'?'b-gray':'b-warn';
      return '<tr><td><b>'+esc(o.name)+'</b><br><span class="muted-small">'+esc(o.code)+'</span></td><td>'+esc(o.board)+'</td><td>'+esc(o.date)+'</td><td class="num">'+(o.price?fmtMoney(o.price):'-')+'</td><td class="num">'+(o.pe?fmt2(o.pe):'-')+'</td><td class="note">'+(o.win||'-')+(o.pay&&o.pay!=='-'?' / '+o.pay:'')+'</td><td class="note">'+(o.list||'-')+'</td><td><span class="badge '+stC+'">'+esc(o.status)+'</span></td></tr>';
    }).join('')+'</tbody></table>';
  } else { html+='<p class="muted-small">近 12 日无新股申购。</p>'; }
  html+='</div>';
  body.innerHTML=html;
  $$('[data-board]',body).forEach(function(b){ b.onclick=function(){ StockIPO.set(b.getAttribute('data-board')); }; });
  const rb=$('#refreshIpo'); if(rb) rb.onclick=function(){ StockIPO.fetch(false); };
}

/* 持仓表单 */
function openHoldingForm(id){
  const h=id?COL.holdings().find(x=>x.id===id):null;
  openModal(`<div class="modal-head"><h3>${h?'编辑持仓':'添加持仓'}</h3><button class="x-close" data-x>×</button></div>
    <div class="modal-body">
      <div class="field-row">
        <div class="field"><label>股票名称</label><input id="f_name" value="${esc(h?h.name:'')}" placeholder="如 荣昌生物"></div>
        <div class="field"><label>代码</label><input id="f_code" value="${esc(h?h.code:'')}" placeholder="如 688331.SH"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>市场</label><select id="f_market"><option ${!h||h.market==='A股'?'selected':''}>A股</option><option ${h&&h.market==='港股'?'selected':''}>港股</option><option ${h&&h.market==='美股'?'selected':''}>美股</option></select></div>
        <div class="field"><label>币种</label><select id="f_cur"><option ${!h||h.cur==='¥'?'selected':''}>¥</option><option ${h&&h.cur==='HK$'?'selected':''}>HK$</option><option ${h&&h.cur==='US$'?'selected':''}>US$</option></select></div>
      </div>
      <div class="field-row">
        <div class="field"><label>持股数量</label><input id="f_shares" type="number" value="${h?h.shares:''}"></div>
        <div class="field"><label>成本价</label><input id="f_cost" type="number" step="0.01" value="${h?h.cost:''}"></div>
      </div>
      <div class="field"><label>当前价（用于盈亏估算，可不填）</label><input id="f_current" type="number" step="0.01" value="${h&&h.current!=null?h.current:''}"></div>
    </div>
    <div class="modal-foot"><button class="btn" data-x>取消</button><button class="btn primary" id="saveH">保存</button></div>`,{wide:false});
  $$('[data-x]',modalEl).forEach(b=>b.onclick=closeModal);
  $('#saveH').onclick=()=>{
    const name=$('#f_name').value.trim(), code=$('#f_code').value.trim();
    if(!name||!code){ toast('请填写名称和代码'); return; }
    const obj={ name, code, market:$('#f_market').value, cur:$('#f_cur').value,
      shares:parseFloat($('#f_shares').value)||0, cost:parseFloat($('#f_cost').value)||0,
      current: $('#f_current').value===''?'':parseFloat($('#f_current').value) };
    let a=COL.holdings();
    if(h){ obj.id=h.id; a=a.map(x=>x.id===h.id?obj:x); } else { obj.id=uid('h'); a.push(obj); }
    SAVE.holdings(a); logActivity(h?'编辑持仓':'添加持仓','stock',name); closeModal(); renderStock('holdings'); toast('已保存');
  };
}
/* 复盘表单 */
function openStockReviewForm(){
  openModal(`<div class="modal-head"><h3>写复盘记录</h3><button class="x-close" data-x>×</button></div>
    <div class="modal-body">
      <div class="field"><label>标题</label><input id="f_title" placeholder="如 8月12日盘面复盘"></div>
      <div class="field"><label>日期</label>${dateInput(todayStr())}</div>
      <div class="field"><label>内容</label><textarea id="f_content" placeholder="市场概况、操作、反思…"></textarea></div>
      <div class="field"><label>标签</label><div id="tagBox" class="flex flex-wrap" style="gap:6px;border:1px solid var(--line-strong);border-radius:9px;padding:8px;min-height:38px"></div></div>
      ${linkPickerField(null,['book','kb'])}
    </div>
    <div class="modal-foot"><button class="btn" data-x>取消</button><button class="btn primary" id="saveR">保存</button></div>`);
  $$('[data-x]',modalEl).forEach(b=>b.onclick=closeModal);
  const sel=[]; renderTagsInput(sel,$('#tagBox'));
  $('#saveR').onclick=()=>{
    const title=$('#f_title').value.trim(); if(!title){ toast('请填写标题'); return; }
    const obj={id:uid('sr'),title,date:$('#f_date').value,content:$('#f_content').value,
      tags:sel.slice(),link:readLinkPicker()};
    let a=COL.stockReviews(); a.push(obj); SAVE.stockReviews(a); logActivity('写复盘','stock',title); closeModal(); renderStock('review'); toast('已保存');
  };
}

/* =========================================================================
   读书笔记模块（独立数据结构 / 页面 / 交互；复用全局标签·任务·提醒·搜索·备份）
   子导航：阅读首页 / 我的书架 / 读书笔记 / 待复习 / 主题地图 / 书籍推荐
   ========================================================================= */
const BOOK_STATUS=['想读','在读','暂停','已读','弃读'];
const NOTE_TYPES=['核心观点','原文摘录','投资方法','企业分析','行为金融','市场规律','工作方法','反思复盘','待验证观点','行动清单'];
const NOTE_STATUS=['新建','已理解','待验证','已复习','已修订','已归档'];
const REVIEW_STAGES=[1,7,30,90]; // 间隔复习：1天 / 7天 / 30天 / 90天
const DEFAULT_TOPICS=['价值投资','成长投资','竞争优势','现金流','估值','行为金融','市场情绪','风险控制','宏观经济','企业经营','个人成长','写作与表达'];

/* 本地精选书库：真实高分书籍（评分取自豆瓣公开数据近似汇总，约值，非实时抓取）。
   供「智能找书」按关键词匹配，以及「书籍推荐」页默认展示各类别 TOP3 使用。
   如书名/评分有误，可在「＋书架」加入后自行编辑。 */
const BOOK_BRAIN=[
 {title:'史蒂夫·乔布斯传',author:'沃尔特·艾萨克森',category:'传记',tags:['人物传记','科技','企业家','苹果'],doubanRating:8.7,doubanRaters:'30000',year:2014,summary:'苹果创始人乔布斯生平，创新与管理'},
 {title:'邓小平时代',author:'傅高义',category:'传记',tags:['人物传记','历史','中国','改革开放'],doubanRating:9.3,doubanRaters:'80000',year:2013,summary:'改革开放总设计师的时代'},
 {title:'人类群星闪耀时',author:'茨威格',category:'传记',tags:['人物传记','历史','文学'],doubanRating:9.0,doubanRaters:'100000',year:2016,summary:'十四篇历史瞬间的人物特写',classic:true},
 {title:'苏东坡传',author:'林语堂',category:'传记',tags:['人物传记','文学','历史','中国'],doubanRating:8.5,doubanRaters:'50000',year:2012,summary:'北宋文豪苏轼的跌宕一生',classic:true},
 {title:'曾国藩传',author:'张宏杰',category:'传记',tags:['人物传记','历史','中国','晚清'],doubanRating:8.8,doubanRaters:'60000',year:2019,summary:'晚清名臣曾国藩的修身与功业'},
 {title:'毛泽东传',author:'罗斯·特里尔',category:'传记',tags:['人物传记','历史','中国'],doubanRating:8.4,doubanRaters:'40000',year:2010,summary:'毛泽东的生平与中国革命'},
 {title:'富兰克林自传',author:'本杰明·富兰克林',category:'传记',tags:['人物传记','自我成长','美国','经典'],doubanRating:8.6,doubanRaters:'30000',year:2008,summary:'美国开国元勋的奋斗与美德',classic:true},
 {title:'渴望生活：梵高传',author:'欧文·斯通',category:'传记',tags:['人物传记','艺术','荷兰','经典'],doubanRating:8.7,doubanRaters:'30000',year:2008,summary:'画家梵高的激情与苦难',classic:true},
 {title:'拿破仑传',author:'埃米尔·路德维希',category:'传记',tags:['人物传记','历史','法国','军事','经典'],doubanRating:8.7,doubanRaters:'20000',year:2009,summary:'法兰西皇帝拿破仑的崛起与陨落',classic:true},
 {title:'曾国藩',author:'唐浩明',category:'传记',tags:['人物传记','历史','中国','晚清'],doubanRating:8.6,doubanRaters:'20000',year:2005,summary:'长篇历史小说式曾国藩传记'},

 {title:'明朝那些事儿',author:'当年明月',category:'历史',tags:['历史','中国','明朝','通俗'],doubanRating:9.1,doubanRaters:'200000',year:2009,summary:'通俗讲明朝三百年'},
 {title:'万历十五年',author:'黄仁宇',category:'历史',tags:['历史','中国','明朝','大历史'],doubanRating:9.0,doubanRaters:'150000',year:2006,summary:'以1587年看明代制度衰败',classic:true},
 {title:'人类简史',author:'尤瓦尔·赫拉利',category:'历史',tags:['历史','人类学','认知','社会'],doubanRating:9.1,doubanRaters:'200000',year:2014,summary:'从认知革命到科学革命',classic:true},
 {title:'未来简史',author:'尤瓦尔·赫拉利',category:'历史',tags:['历史','未来','科技','社会'],doubanRating:8.4,doubanRaters:'100000',year:2017,summary:'人类未来的走向与意义'},
 {title:'枪炮、病菌与钢铁',author:'贾雷德·戴蒙德',category:'历史',tags:['历史','地理','文明','人类'],doubanRating:8.9,doubanRaters:'80000',year:2006,summary:'为何是欧亚文明征服世界',classic:true},
 {title:'全球通史',author:'斯塔夫里阿诺斯',category:'历史',tags:['历史','世界','文明'],doubanRating:9.0,doubanRaters:'40000',year:2006,summary:'从史前到二十一世纪的世界史经典教材',classic:true},
 {title:'大秦帝国',author:'孙皓晖',category:'历史',tags:['历史','中国','战国','秦朝'],doubanRating:8.7,doubanRaters:'30000',year:2008,summary:'秦国崛起统一六国的史诗'},
 {title:'中国大历史',author:'黄仁宇',category:'历史',tags:['历史','中国','宏观'],doubanRating:8.5,doubanRaters:'20000',year:2007,summary:'宏观视角下的中国历代'},
 {title:'罗马人的故事',author:'盐野七生',category:'历史',tags:['历史','罗马','欧洲','帝国'],doubanRating:8.8,doubanRaters:'30000',year:2012,summary:'罗马千年兴衰的全景'},
 {title:'何以中国',author:'许宏',category:'历史',tags:['历史','中国','考古','先秦'],doubanRating:8.5,doubanRaters:'10000',year:2014,summary:'最早的中国从何而来'},
 {title:'史记',author:'司马迁',category:'历史',tags:['历史','中国','正史','经典'],doubanRating:9.5,doubanRaters:'100000',year:-91,summary:'中国第一部纪传体通史',classic:true},

 {title:'聪明的投资者',author:'本杰明·格雷厄姆',category:'投资',tags:['投资','价值投资','经典','股票'],doubanRating:9.0,doubanRaters:'80000',year:2016,summary:'价值投资圣经，安全边际与市场先生',classic:true,cover:'https://img3.doubanio.com/view/subject/l/public/s6462582.jpg'},
 {title:'穷查理宝典',author:'查理·芒格',category:'投资',tags:['投资','多元思维','芒格','智慧'],doubanRating:8.9,doubanRaters:'100000',year:2010,summary:'芒格的智慧与多元思维模型',classic:true,cover:'https://img2.doubanio.com/view/subject/l/public/s24597511.jpg'},
 {title:'巴菲特致股东的信',author:'沃伦·巴菲特',category:'投资',tags:['投资','巴菲特','价值','股票'],doubanRating:9.0,doubanRaters:'40000',year:2011,summary:'巴菲特历年股东信精华',classic:true},
 {title:'投资中最简单的事',author:'邱国鹭',category:'投资',tags:['投资','价值','A股','入门'],doubanRating:8.7,doubanRaters:'40000',year:2014,summary:'化繁为简的价值投资',cover:'https://img3.doubanio.com/view/subject/l/public/s27185773.jpg'},
 {title:'投资最重要的事',author:'霍华德·马克斯',category:'投资',tags:['投资','周期','风险','价值'],doubanRating:8.8,doubanRaters:'30000',year:2015,summary:'逆向投资与风险控制'},
 {title:'漫步华尔街',author:'伯顿·马尔基尔',category:'投资',tags:['投资','指数','随机漫步','经典'],doubanRating:8.5,doubanRaters:'30000',year:2012,summary:'随机漫步与指数投资的经典论述',classic:true},
 {title:'彼得·林奇的成功投资',author:'彼得·林奇',category:'投资',tags:['投资','成长股','选股','入门'],doubanRating:8.7,doubanRaters:'30000',year:2010,summary:'业余投资者的选股法则',classic:true},
 {title:'股票作手回忆录',author:'埃德温·勒菲弗',category:'投资',tags:['投资','交易','投机','股票'],doubanRating:8.6,doubanRaters:'40000',year:2006,summary:'投机家利弗莫尔的一生',classic:true},
 {title:'原则',author:'瑞·达利欧',category:'投资',tags:['投资','桥水','原则','管理'],doubanRating:8.4,doubanRaters:'100000',year:2018,summary:'桥水创始人的生活与工作原则'},
 {title:'价值',author:'张磊',category:'投资',tags:['投资','价值','中国','长期'],doubanRating:8.5,doubanRaters:'40000',year:2020,summary:'高瓴张磊的长期价值投资'},
 {title:'证券分析',author:'本杰明·格雷厄姆',category:'投资',tags:['投资','价值','财报','经典'],doubanRating:8.9,doubanRaters:'30000',year:1934,summary:'价值投资的奠基之作',classic:true},

 {title:'经济学原理',author:'曼昆',category:'经济',tags:['经济','入门','宏观','微观'],doubanRating:9.0,doubanRaters:'50000',year:2009,summary:'最畅销的经济学入门',classic:true},
 {title:'置身事内',author:'兰小欢',category:'经济',tags:['经济','中国','体制','发展'],doubanRating:9.0,doubanRaters:'100000',year:2021,summary:'理解中国政府与经济发展'},
 {title:'薛兆丰经济学讲义',author:'薛兆丰',category:'经济',tags:['经济','入门','通俗','中国'],doubanRating:8.5,doubanRaters:'50000',year:2018,summary:'用经济学看真实世界'},
 {title:'贫穷的本质',author:'班纳吉',category:'经济',tags:['经济','贫困','发展','社会'],doubanRating:8.5,doubanRaters:'30000',year:2013,summary:'穷人为何贫穷与反贫困'},
 {title:'激荡三十年',author:'吴晓波',category:'经济',tags:['经济','中国','企业','改革'],doubanRating:8.6,doubanRaters:'40000',year:2008,summary:'改革开放企业史',classic:true},
 {title:'大国大城',author:'陆铭',category:'经济',tags:['经济','城市','中国','区域'],doubanRating:8.7,doubanRaters:'20000',year:2016,summary:'城市化与区域平衡'},
 {title:'21世纪资本论',author:'皮凯蒂',category:'经济',tags:['经济','不平等','资本','贫富'],doubanRating:8.0,doubanRaters:'30000',year:2014,summary:'资本与贫富差距'},
 {title:'经济解释',author:'张五常',category:'经济',tags:['经济','制度','产权','学派'],doubanRating:8.8,doubanRaters:'10000',year:2010,summary:'新制度经济学阐释'},
 {title:'国富论',author:'亚当·斯密',category:'经济',tags:['经济','古典','市场','经典'],doubanRating:8.8,doubanRaters:'50000',year:1776,summary:'现代经济学的奠基之作',classic:true},
 {title:'就业、利息和货币通论',author:'凯恩斯',category:'经济',tags:['经济','宏观','凯恩斯','经典'],doubanRating:8.6,doubanRaters:'30000',year:1936,summary:'宏观经济学的里程碑',classic:true},
 {title:'通往奴役之路',author:'哈耶克',category:'经济',tags:['经济','自由主义','制度','经典'],doubanRating:8.7,doubanRaters:'40000',year:1944,summary:'计划与自由的经典辩驳',classic:true},

 {title:'高效能人士的七个习惯',author:'史蒂芬·柯维',category:'商业管理',tags:['管理','自我成长','效率','习惯'],doubanRating:8.5,doubanRaters:'100000',year:2010,summary:'高效能的底层习惯',classic:true},
 {title:'卓有成效的管理者',author:'彼得·德鲁克',category:'商业管理',tags:['管理','德鲁克','效率','组织'],doubanRating:8.9,doubanRaters:'50000',year:2009,summary:'知识工作者的自我管理',classic:true},
 {title:'从0到1',author:'彼得·蒂尔',category:'商业管理',tags:['创业','商业','创新','垄断'],doubanRating:7.5,doubanRaters:'60000',year:2015,summary:'初创企业如何创造垄断价值'},
 {title:'精益创业',author:'埃里克·莱斯',category:'商业管理',tags:['创业','商业','方法论','迭代'],doubanRating:8.4,doubanRaters:'20000',year:2012,summary:'用最小可行产品快速试错'},
 {title:'影响力',author:'罗伯特·西奥迪尼',category:'商业管理',tags:['心理学','说服','商业','营销'],doubanRating:8.6,doubanRaters:'80000',year:2010,summary:'说服与影响力的六大原则',classic:true},
 {title:'定位',author:'杰克·特劳特',category:'商业管理',tags:['营销','商业','品牌','战略'],doubanRating:8.7,doubanRaters:'30000',year:2011,summary:'抢占用户心智的定位理论',classic:true},
 {title:'创新者的窘境',author:'克莱顿·克里斯坦森',category:'商业管理',tags:['商业','创新','管理','颠覆'],doubanRating:8.5,doubanRaters:'20000',year:2010,summary:'大公司为何被颠覆式创新打败',classic:true},
 {title:'原则（工作篇）',author:'瑞·达利欧',category:'商业管理',tags:['管理','原则','组织','桥水'],doubanRating:8.3,doubanRaters:'20000',year:2019,summary:'桥水的管理与决策原则'},
 {title:'赋能',author:'斯坦利·麦克里斯特尔',category:'商业管理',tags:['管理','团队','组织','军事'],doubanRating:8.4,doubanRaters:'10000',year:2017,summary:'应对不确定性的团队赋能'},
 {title:'管理的实践',author:'彼得·德鲁克',category:'商业管理',tags:['管理','德鲁克','经典','组织'],doubanRating:8.8,doubanRaters:'40000',year:1954,summary:'现代管理学奠基之作',classic:true},
 {title:'竞争战略',author:'迈克尔·波特',category:'商业管理',tags:['管理','战略','竞争','经典'],doubanRating:8.5,doubanRaters:'30000',year:1980,summary:'五力模型与三种通用战略',classic:true},

 {title:'思考，快与慢',author:'丹尼尔·卡尼曼',category:'心理学',tags:['心理学','认知','行为','决策'],doubanRating:8.8,doubanRaters:'60000',year:2012,summary:'系统1与系统2的思维',classic:true},
 {title:'乌合之众',author:'古斯塔夫·勒庞',category:'心理学',tags:['心理学','群体','社会','经典'],doubanRating:8.6,doubanRaters:'100000',year:2010,summary:'群体心理与盲目',classic:true},
 {title:'非暴力沟通',author:'马歇尔·卢森堡',category:'心理学',tags:['心理学','沟通','关系','自我成长'],doubanRating:8.4,doubanRaters:'80000',year:2009,summary:'用沟通化解冲突'},
 {title:'被讨厌的勇气',author:'岸见一郎',category:'心理学',tags:['心理学','阿德勒','自我成长','勇气'],doubanRating:8.6,doubanRaters:'100000',year:2015,summary:'阿德勒式的人生哲学'},
 {title:'心理学与生活',author:'津巴多',category:'心理学',tags:['心理学','入门','教材','认知'],doubanRating:9.0,doubanRaters:'30000',year:2008,summary:'经典心理学导论',classic:true},
 {title:'心流',author:'米哈里',category:'心理学',tags:['心理学','幸福','专注','自我成长'],doubanRating:8.3,doubanRaters:'60000',year:2011,summary:'最优体验的专注状态'},
 {title:'自控力',author:'凯利·麦格尼格尔',category:'心理学',tags:['心理学','习惯','自律','自我成长'],doubanRating:8.2,doubanRaters:'80000',year:2012,summary:'提升意志力的科学'},
 {title:'社会性动物',author:'埃利奥特·阿伦森',category:'心理学',tags:['心理学','社会','人际','认知'],doubanRating:9.1,doubanRaters:'20000',year:2007,summary:'社会心理学的经典',classic:true},
 {title:'梦的解析',author:'弗洛伊德',category:'心理学',tags:['心理学','精神分析','经典','潜意识'],doubanRating:8.3,doubanRaters:'50000',year:1899,summary:'精神分析学派的奠基之作',classic:true},

 {title:'活出生命的意义',author:'维克多·弗兰克尔',category:'自我成长',tags:['自我成长','意义','心理','哲学'],doubanRating:9.0,doubanRaters:'100000',year:2010,summary:'在苦难中寻找意义',classic:true},
 {title:'刻意练习',author:'安德斯·艾利克森',category:'自我成长',tags:['自我成长','练习','技能','方法'],doubanRating:8.6,doubanRaters:'40000',year:2016,summary:'成为高手的练习方法'},
 {title:'终身成长',author:'卡罗尔·德韦克',category:'自我成长',tags:['自我成长','思维','成长型','教育'],doubanRating:8.3,doubanRaters:'40000',year:2017,summary:'固定型与成长型思维'},
 {title:'认知觉醒',author:'周岭',category:'自我成长',tags:['自我成长','认知','方法论','习惯'],doubanRating:8.4,doubanRaters:'40000',year:2020,summary:'开启自我改变的原动力'},
 {title:'把时间当作朋友',author:'李笑来',category:'自我成长',tags:['自我成长','时间','方法论','学习'],doubanRating:8.6,doubanRaters:'40000',year:2009,summary:'用时间积累成长'},
 {title:'跃迁',author:'古典',category:'自我成长',tags:['自我成长','成长','方法论','认知'],doubanRating:8.2,doubanRaters:'20000',year:2017,summary:'成为高手的进阶之路'},
 {title:'人性的弱点',author:'戴尔·卡耐基',category:'自我成长',tags:['自我成长','人际','沟通','经典'],doubanRating:8.4,doubanRaters:'100000',year:1936,summary:'人际关系与自我影响的经典指南',classic:true},

 {title:'活着',author:'余华',category:'文学小说',tags:['小说','中国','文学','苦难'],doubanRating:9.4,doubanRaters:'500000',year:2012,summary:'福贵苦难而坚韧的一生',classic:true},
 {title:'百年孤独',author:'加西亚·马尔克斯',category:'文学小说',tags:['小说','魔幻现实','文学','经典'],doubanRating:9.3,doubanRaters:'300000',year:2011,summary:'布恩迪亚家族的百年',classic:true},
 {title:'三体',author:'刘慈欣',category:'文学小说',tags:['小说','科幻','中国','宇宙'],doubanRating:9.4,doubanRaters:'400000',year:2008,summary:'地球与三体文明的博弈',classic:true},
 {title:'围城',author:'钱钟书',category:'文学小说',tags:['小说','中国','文学','幽默'],doubanRating:9.0,doubanRaters:'200000',year:2009,summary:'婚姻与人生的围城',classic:true},
 {title:'平凡的世界',author:'路遥',category:'文学小说',tags:['小说','中国','文学','奋斗'],doubanRating:9.0,doubanRaters:'300000',year:2005,summary:'孙少安兄弟的奋斗',classic:true},
 {title:'小王子',author:'圣埃克苏佩里',category:'文学小说',tags:['小说','童话','文学','哲理'],doubanRating:9.0,doubanRaters:'300000',year:2005,summary:'孩子与玫瑰的寓言',classic:true},
 {title:'追风筝的人',author:'卡勒德·胡赛尼',category:'文学小说',tags:['小说','阿富汗','文学','救赎'],doubanRating:8.9,doubanRaters:'300000',year:2006,summary:'背叛与救赎的温情'},
 {title:'解忧杂货店',author:'东野圭吾',category:'文学小说',tags:['小说','日本','治愈','文学'],doubanRating:8.6,doubanRaters:'200000',year:2014,summary:'穿越时空的烦恼咨询'},
 {title:'1984',author:'乔治·奥威尔',category:'文学小说',tags:['小说','反乌托邦','政治','经典'],doubanRating:9.4,doubanRaters:'200000',year:2010,summary:'极权社会的永恒寓言',classic:true},
 {title:'白夜行',author:'东野圭吾',category:'文学小说',tags:['小说','日本','推理','黑暗'],doubanRating:9.1,doubanRaters:'200000',year:2008,summary:'绝望而绵长的爱'},
 {title:'挪威的森林',author:'村上春树',category:'文学小说',tags:['小说','日本','青春','文学'],doubanRating:8.4,doubanRaters:'100000',year:2007,summary:'青春与失落的爱'},
 {title:'沉默的大多数',author:'王小波',category:'文学小说',tags:['杂文','中国','文学','理性'],doubanRating:9.2,doubanRaters:'100000',year:2011,summary:'王小波的清醒与幽默'},
 {title:'傲慢与偏见',author:'简·奥斯汀',category:'文学小说',tags:['小说','爱情','英国','经典'],doubanRating:8.9,doubanRaters:'200000',year:1813,summary:'经典爱情与社会讽刺小说',classic:true},

 {title:'时间简史',author:'史蒂芬·霍金',category:'科学',tags:['科学','物理','宇宙','科普'],doubanRating:8.8,doubanRaters:'150000',year:2011,summary:'从大爆炸到黑洞',classic:true},
 {title:'自私的基因',author:'理查德·道金斯',category:'科学',tags:['科学','生物','进化','基因'],doubanRating:8.7,doubanRaters:'50000',year:2012,summary:'基因视角下的演化',classic:true},
 {title:'上帝掷骰子吗',author:'曹天元',category:'科学',tags:['科学','物理','量子','科普'],doubanRating:9.2,doubanRaters:'50000',year:2019,summary:'量子物理史话'},
 {title:'失控',author:'凯文·凯利',category:'科学',tags:['科学','科技','系统','未来'],doubanRating:8.7,doubanRaters:'30000',year:2010,summary:'失控与涌现的系统'},
 {title:'复杂',author:'梅拉妮·米切尔',category:'科学',tags:['科学','复杂系统','网络','跨学科'],doubanRating:8.6,doubanRaters:'10000',year:2018,summary:'复杂系统的入门'},
 {title:'万物简史',author:'比尔·布莱森',category:'科学',tags:['科学','科普','宇宙','生命'],doubanRating:8.7,doubanRaters:'20000',year:2011,summary:'宇宙与生命的趣味史'},
 {title:'昆虫记',author:'法布尔',category:'科学',tags:['科学','生物','自然','科普'],doubanRating:9.0,doubanRaters:'10000',year:2008,summary:'昆虫世界的诗意观察',classic:true},
 {title:'物种起源',author:'查尔斯·达尔文',category:'科学',tags:['科学','生物','进化','经典'],doubanRating:8.9,doubanRaters:'30000',year:1859,summary:'进化论的开山之作',classic:true},

 {title:'苏菲的世界',author:'乔斯坦·贾德',category:'哲学',tags:['哲学','入门','文学','西方'],doubanRating:8.6,doubanRaters:'100000',year:2007,summary:'哲学史的启蒙小说',classic:true},
 {title:'哲学家们都干了些什么',author:'林欣浩',category:'哲学',tags:['哲学','入门','通俗','西方'],doubanRating:8.7,doubanRaters:'30000',year:2015,summary:'轻松的哲学史'},
 {title:'中国哲学简史',author:'冯友兰',category:'哲学',tags:['哲学','中国','思想','入门'],doubanRating:9.0,doubanRaters:'50000',year:2013,summary:'中国哲学的脉络',classic:true},
 {title:'沉思录',author:'马可·奥勒留',category:'哲学',tags:['哲学','斯多葛','自我','古典'],doubanRating:8.7,doubanRaters:'80000',year:2008,summary:'罗马皇帝的省思',classic:true},
 {title:'理想国',author:'柏拉图',category:'哲学',tags:['哲学','西方','政治','古典'],doubanRating:8.9,doubanRaters:'50000',year:2012,summary:'正义与理想城邦',classic:true},
 {title:'论语',author:'孔子',category:'哲学',tags:['哲学','中国','儒家','经典'],doubanRating:9.2,doubanRaters:'100000',year:2006,summary:'儒家思想与修身治国的根本经典',classic:true},

 {title:'乡土中国',author:'费孝通',category:'社会学',tags:['社会学','中国','乡村','经典'],doubanRating:9.2,doubanRaters:'100000',year:2013,summary:'中国基层社会的结构',classic:true},
 {title:'娱乐至死',author:'尼尔·波兹曼',category:'社会学',tags:['社会学','媒体','传播','批判'],doubanRating:8.5,doubanRaters:'60000',year:2011,summary:'媒介如何塑造文化',classic:true},
 {title:'毫无意义的工作',author:'大卫·格雷伯',category:'社会学',tags:['社会学','劳动','批判','经济'],doubanRating:8.6,doubanRaters:'30000',year:2022,summary:'狗屁工作的反思'},
 {title:'菊与刀',author:'鲁思·本尼迪克特',category:'社会学',tags:['社会学','日本','文化','人类学'],doubanRating:8.5,doubanRaters:'30000',year:2010,summary:'日本文化的双重性',classic:true},
 {title:'第二性',author:'西蒙娜·波伏娃',category:'社会学',tags:['社会学','女性','性别','哲学'],doubanRating:8.6,doubanRaters:'20000',year:2011,summary:'女性处境的经典',classic:true},
 {title:'规训与惩罚',author:'米歇尔·福柯',category:'社会学',tags:['社会学','权力','监狱','哲学'],doubanRating:9.0,doubanRaters:'20000',year:2012,summary:'权力与惩罚的演变',classic:true},
 {title:'资本论',author:'马克思',category:'社会学',tags:['社会学','经济','资本','经典'],doubanRating:8.8,doubanRaters:'50000',year:1867,summary:'资本主义批判与社会分析的巨著',classic:true}

];

function bookProgress(b){ if(!b) return 0; if(b.status==='已读') return 100; const t=Number(b.totalPages)||0, c=Number(b.currentPage)||0; return t?Math.min(100,Math.round(c/t*100)):0; }
function addDays(ds,n){ const d=new Date(ds+'T00:00:00'); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
function tagsToNames(ids){ if(!ids||!ids.length) return []; return ids.map(id=>{const t=tagById(id);return t?t.name:null;}).filter(Boolean); }
function stockName(code){ const h=COL.holdings().find(x=>x.code===code); return h?h.name+'('+code+')':code; }
function attrEsc(v){ return esc(String(v==null?'':v)).replace(/"/g,'&quot;'); }
function coverImg(url, title, author, isbn){
  var t=String(title||'书');
  var init=esc(t.slice(0,2));
  var palette=['#2563eb','#7c3aed','#db2777','#ea580c','#16a34a','#0891b2','#4f46e5','#be123c','#0f766e','#854d0e','#4338ca','#0ea5e9'];
  var idx=Math.abs(init.split('').reduce(function(a,c){ return a+c.charCodeAt(0); },0)) % palette.length;
  var bg=palette[idx];
  var svg='<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 54 74" preserveAspectRatio="none"><rect width="54" height="74" fill="'+bg+'"/><text x="27" y="44" text-anchor="middle" fill="#ffffff" font-size="18" font-weight="700" font-family="system-ui,-apple-system,sans-serif">'+init+'</text></svg>';
  var ph='<div class="cov-ph">'+svg+'</div>';
  var attrs='class="cov-img" alt="'+attrEsc(t)+'"';
  if(url){
    return '<div class="cover-box">'+ph+'<img '+attrs+' src="'+attrEsc(url)+'" onload="this.previousElementSibling.style.display=\'none\'" onerror="this.style.display=\'none\'"></div>';
  }
  // 无 cover URL：显示占位，同时埋入 data-fetch 让 ensureCovers 自动抓取
  var fetchAttrs='data-fetch="1" data-ft="'+attrEsc(t)+'"';
  if(author) fetchAttrs+=' data-fa="'+attrEsc(author)+'"';
  if(isbn) fetchAttrs+=' data-fi="'+attrEsc(isbn)+'"';
  return '<div class="cover-box">'+ph+'<img '+attrs+' '+fetchAttrs+' style="display:none" onload="this.previousElementSibling.style.display=\'none\'" onerror="this.style.display=\'none\'"></div>';
}
var __coverCache=store.get('bookCoverCache',{});
function saveCoverCache(){ store.set('bookCoverCache',__coverCache); }
function ensureCovers(scope){
  if(!scope||!scope.querySelectorAll) return;
  var imgs=scope.querySelectorAll('img.cov-img[data-fetch]');
  if(!imgs||!imgs.length) return;
  Array.prototype.forEach.call(imgs,function(img){
    var t=img.getAttribute('data-ft'), a=img.getAttribute('data-fa'), isbn=img.getAttribute('data-fi');
    img.removeAttribute('data-fetch');
    if(isbn){
      var key='isbn:'+isbn.toLowerCase();
      if(Object.prototype.hasOwnProperty.call(__coverCache,key)&&__coverCache[key]){ img.src=__coverCache[key]; return; }
      var u='https://covers.openlibrary.org/b/isbn/'+encodeURIComponent(isbn)+'-M.jpg?default=false';
      img.src=u; __coverCache[key]=u; saveCoverCache();
      return;
    }
    if(!t) return;
    var key=(t+'|'+(a||'')).toLowerCase();
    if(Object.prototype.hasOwnProperty.call(__coverCache,key)){ if(__coverCache[key]) img.src=__coverCache[key]; return; }
    if(typeof fetch!=='function'){ __coverCache[key]=null; return; }
    fetch('https://openlibrary.org/search.json?title='+encodeURIComponent(t)+(a?('&author='+encodeURIComponent(a)):'')+'&fields=cover_i&limit=1')
      .then(function(r){return r.json();}).then(function(j){
        var id=j&&j.docs&&j.docs[0]&&j.docs[0].cover_i;
        if(id){ var u='https://covers.openlibrary.org/b/id/'+id+'-M.jpg'; __coverCache[key]=u; saveCoverCache(); img.src=u; }
        else { return tryGoogleBooks(t,a,key,img); }
      }).catch(function(){ return tryGoogleBooks(t,a,key,img); });
  });
}
function tryGoogleBooks(t,a,key,img){
  if(typeof fetch!=='function'){ __coverCache[key]=null; return; }
  var q=encodeURIComponent(t+(a?' '+a:''));
  fetch('https://www.googleapis.com/books/v1/volumes?q='+q+'&maxResults=1&fields=items(volumeInfo(imageLinks))')
    .then(function(r){return r.json();}).then(function(j){
      var links=j&&j.items&&j.items[0]&&j.items[0].volumeInfo&&j.items[0].volumeInfo.imageLinks;
      var u=links&&(links.thumbnail||links.smallThumbnail);
      if(u){ u=u.replace('http:','https:'); __coverCache[key]=u; saveCoverCache(); img.src=u; }
      else { __coverCache[key]=null; }
    }).catch(function(){ __coverCache[key]=null; });
}
function fetchBookCover(title,author,isbn,callback){
  callback=callback||function(){};
  if(typeof fetch!=='function'){ callback(null); return; }
  var t=String(title||'').trim(), a=String(author||'').trim(), is=String(isbn||'').trim();
  if(!t && !is){ callback(null); return; }
  var done=false;
  function finish(u){ if(done) return; done=true; callback(u||null); }
  function timed(ms,p){ return new Promise(function(resolve){ var to=setTimeout(function(){resolve(null);},ms); p.then(function(u){clearTimeout(to);resolve(u);}).catch(function(){clearTimeout(to);resolve(null);}); }); }
  function olIsbn(){ return new Promise(function(resolve){ if(!is){resolve(null);return;} var u='https://covers.openlibrary.org/b/isbn/'+encodeURIComponent(is)+'-M.jpg?default=false'; fetch(u,{method:'HEAD',mode:'cors'}).then(function(r){ resolve(r.ok?u:null); }).catch(function(){resolve(null);}); }); }
  function gbIsbn(){ return new Promise(function(resolve){ if(!is){resolve(null);return;} fetch('https://www.googleapis.com/books/v1/volumes?q=isbn:'+encodeURIComponent(is)+'&maxResults=1&fields=items(volumeInfo(imageLinks))').then(function(r){return r.json();}).then(function(j){ var links=j&&j.items&&j.items[0]&&j.items[0].volumeInfo&&j.items[0].volumeInfo.imageLinks; var u=links&&(links.thumbnail||links.smallThumbnail); resolve(u?u.replace('http:','https:'):null); }).catch(function(){resolve(null);}); }); }
  function olSearch(){ return new Promise(function(resolve){ if(!t){resolve(null);return;} fetch('https://openlibrary.org/search.json?title='+encodeURIComponent(t)+(a?('&author='+encodeURIComponent(a)):'')+'&fields=cover_i&limit=1').then(function(r){return r.json();}).then(function(j){ var id=j&&j.docs&&j.docs[0]&&j.docs[0].cover_i; resolve(id?'https://covers.openlibrary.org/b/id/'+id+'-M.jpg':null); }).catch(function(){resolve(null);}); }); }
  function gbSearch(){ return new Promise(function(resolve){ if(!t){resolve(null);return;} var q=encodeURIComponent(t+(a?' '+a:'')); fetch('https://www.googleapis.com/books/v1/volumes?q='+q+'&maxResults=1&fields=items(volumeInfo(imageLinks))').then(function(r){return r.json();}).then(function(j){ var links=j&&j.items&&j.items[0]&&j.items[0].volumeInfo&&j.items[0].volumeInfo.imageLinks; var u=links&&(links.thumbnail||links.smallThumbnail); resolve(u?u.replace('http:','https:'):null); }).catch(function(){resolve(null);}); }); }
  Promise.all([timed(8000,olIsbn()),timed(8000,gbIsbn()),timed(8000,olSearch()),timed(8000,gbSearch())]).then(function(results){ finish(results.find(function(x){return !!x;})); });
}
function ensureCovers(scope){
  if(!scope||!scope.querySelectorAll) return;
  var imgs=scope.querySelectorAll('img.cov-img[data-fetch]');
  if(!imgs||!imgs.length) return;
  Array.prototype.forEach.call(imgs,function(img){
    var t=img.getAttribute('data-ft'), a=img.getAttribute('data-fa'), isbn=img.getAttribute('data-fi');
    img.removeAttribute('data-fetch');
    var key=isbn?('isbn:'+isbn.toLowerCase()):((t+'|'+(a||'')).toLowerCase());
    if(Object.prototype.hasOwnProperty.call(__coverCache,key)){ if(__coverCache[key]) img.src=__coverCache[key]; return; }
    fetchBookCover(t,a,isbn,function(u){ __coverCache[key]=u||null; saveCoverCache(); if(u) img.src=u; });
  });
}
function recentNoteFor(bookId){ const ns=COL.booknotes().filter(n=>n.bookId===bookId).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)); return ns[0]||null; }
function kvRaw(k,v){ return '<div class="kv"><span class="k">'+esc(k)+'</span><span class="v">'+esc(v)+'</span></div>'; }
function statCard(ico,label,val,cls){ return '<div class="card"><div class="stat-row"><div class="stat-ico">'+ico+'</div><div><div class="stat-num '+(cls||'')+'">'+esc(val)+'</div><div class="stat-label">'+esc(label)+'</div></div></div></div>'; }

function renderBook(sub){
  sub=sub||'home'; const view=$('#view');
  view.innerHTML=pageHead('读书笔记','阅读首页 · 书架 · 笔记 · 复习 · 主题 · 推荐', `<button class="btn primary" id="bookAdd">＋ 新建</button>`,'📚')+subnav('book',sub);
  const body=document.createElement('div'); view.appendChild(body);
  ({home:bookHome,library:bookLibrary,notes:bookNotes,review:bookReview,topics:bookTopics,recs:bookRecs})[sub](body);
  ensureCovers(view);
  bindSubnav('book');
  $('#bookAdd').onclick=()=>{ if(sub==='library') openBookForm(); else if(sub==='notes') openNoteForm(); else if(sub==='topics') openTopicForm(); else if(sub==='recs') openRecForm(); else openBookForm(); };
}

/* ---------- 阅读首页 ---------- */
function bookHome(body){
  const books=COL.books(), notes=COL.booknotes(), recs=COL.bookrecs();
  const cnt=st=>books.filter(b=>b.status===st).length;
  const now=new Date(); const ym=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  const monthMin=books.reduce((s,b)=>s+(b.readingLog||[]).filter(l=>l.date&&String(l.date).startsWith(ym)).reduce((a,l)=>a+(Number(l.minutes)||0),0),0);
  const monthNotes=notes.filter(n=>n.createdAt && new Date(n.createdAt).toISOString().slice(0,7)===ym).length;
  const dueRev=dueReviews().length;
  const readBook=books.find(b=>b.status==='在读')||books.find(b=>b.status==='想读');
  const recentNotes=notes.slice().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0,5);
  const completed=books.filter(b=>b.status==='已读').sort((a,b)=>(b.finishDate||'').localeCompare(a.finishDate||'')).slice(0,3);
  const recList=recs.filter(r=>!r.status||r.status==='想读'||r.status==='推荐').slice(0,4);
  const rn=readBook?recentNoteFor(readBook.id):null;
  let html='';
  html+='<div class="grid cards-4 mb">';
  html+=statCard('📚','想读',cnt('想读'));
  html+=statCard('📖','在读',cnt('在读'));
  html+=statCard('✅','已读',cnt('已读'));
  html+=statCard('⏸️','暂停',cnt('暂停'));
  html+=statCard('⏱️','本月阅读时长',(monthMin?monthMin+' 分钟':'暂无'));
  html+=statCard('✏️','本月新增笔记',monthNotes);
  html+=statCard('🔁','待复习笔记',dueRev,dueRev?'up':'');
  html+='</div>';
  if(readBook){
    html+='<div class="panel"><div class="panel-head"><h2>📖 当前阅读</h2>'+(readBook.sample?'<span class="badge sample">示例</span>':'')+'</div>';
    html+='<div class="flex" style="gap:14px;align-items:flex-start">'+coverImg(readBook.cover,readBook.title,readBook.author,readBook.isbn);
    html+='<div style="flex:1;min-width:0">';
    html+='<div class="flex between"><b style="font-size:16px">'+esc(readBook.title)+'</b><span class="badge '+(readBook.status==='已读'?'ok':readBook.status==='在读'?'':'gray')+'">'+esc(readBook.status)+'</span></div>';
    html+='<div class="muted-small">'+esc(readBook.author||'佚名')+(readBook.translator?(' 译/'+esc(readBook.translator)):'')+' · '+esc(readBook.publisher||'')+'</div>';
    html+='<div class="progress" style="margin:10px 0"><i style="width:'+bookProgress(readBook)+'%"></i></div>';
    html+=kvRaw('阅读进度',bookProgress(readBook)+'% · '+(readBook.currentPage||0)+'/'+(readBook.totalPages||0)+' 页');
    html+=kvRaw('当前章节',readBook.currentChapter||'—');
    html+=kvRaw('开始 / 最近阅读',(readBook.startDate||'—')+' / '+(readBook.lastReadDate||'—'));
    html+=kvRaw('阅读状态',readBook.status);
    html+=kvRaw('下一步阅读计划',readBook.nextPlan||'—');
    html+=kvRaw('最近一条笔记', rn?esc(rn.title||'(无标题)'):'暂无');
    html+='<div class="flex flex-wrap mt" style="gap:6px"><button class="mini-btn" data-be="'+readBook.id+'">编辑</button><button class="mini-btn" data-bp="'+readBook.id+'">更新进度</button><button class="mini-btn" data-bn="'+readBook.id+'">写笔记</button></div>';
    html+='</div></div></div>';
  } else { html+=emptyState('📖','还没有在读或想读的书籍','',null); }
  html+='<div class="grid" style="grid-template-columns:1.3fr 1fr 1fr;margin-top:16px;align-items:start">';
  html+='<div class="panel"><h2>✏️ 最近新增笔记</h2>'+(recentNotes.length?recentNotes.map(function(n){const b=COL.books().find(function(z){return z.id===n.bookId;});return '<div class="kv"><span class="k"><b>'+esc(n.title||'(无标题)')+'</b><br><span class="muted-small">'+(b?esc(b.title):'未关联')+(n.type?' · '+esc(n.type):'')+'</span></span><span class="v muted-small">'+esc((n.createdAt?new Date(n.createdAt).toLocaleDateString('zh-CN'):''))+'</span></div>';}).join(''):'<p class="muted-small">暂无笔记</p>')+'</div>';
  const due=dueReviews();
  html+='<div class="panel"><h2>🔁 今日待复习</h2>'+(due.length?due.slice(0,6).map(function(r){return '<div class="kv"><span class="k">'+esc(r.noteTitle||'(笔记)')+'</span><span class="v"><a class="link" href="#/book/review">去复习 →</a></span></div>';}).join(''):'<p class="muted-small">暂无到期复习</p>')+'</div>';
  html+='<div class="panel"><h2>✅ 最近完成的书</h2>'+(completed.length?completed.map(function(b){return '<div class="kv"><span class="k"><b>'+esc(b.title)+'</b></span><span class="v muted-small">'+(b.finishDate||'—')+'</span></div>';}).join(''):'<p class="muted-small">暂无已读</p>')+'</div>';
  html+='</div>';
  html+='<div class="panel mt"><div class="panel-head"><h2>⭐ 近期推荐书籍</h2><button class="btn sm" id="goRecs">查看全部</button></div>'+(recList.length?('<div class="grid cards-4">'+recList.map(recCard).join('')+'</div>'):'<p class="muted-small">暂无推荐</p>')+'</div>';
  body.innerHTML=html;
  $$('[data-be]',body).forEach(function(b){b.onclick=function(){openBookForm(b.getAttribute('data-be'));};});
  $$('[data-bp]',body).forEach(function(b){b.onclick=function(){openProgressForm(b.getAttribute('data-bp'));};});
  $$('[data-bn]',body).forEach(function(b){b.onclick=function(){openNoteForm({bookId:b.getAttribute('data-bn')});};});
  const gr=$('#goRecs'); if(gr) gr.onclick=function(){location.hash='#/book/recs';};
}

/* ---------- 我的书架 ---------- */
function bookLibrary(body){
  const books=COL.books();
  const f=body._f||'all';
  const list= f==='all'?books:books.filter(function(b){return b.status===f;});
  let html='<div class="flex flex-wrap mb" style="gap:6px">';
  html+='<button class="chip '+(f==='all'?'active':'')+'" data-f="all">全部 '+books.length+'</button>';
  BOOK_STATUS.forEach(function(s){ html+='<button class="chip '+(f===s?'active':'')+'" data-f="'+s+'">'+s+' '+books.filter(function(b){return b.status===s;}).length+'</button>'; });
  html+='</div>';
  if(list.length){ html+='<div class="grid cards-3">'; list.forEach(function(b){ html+=bookCard(b); }); html+='</div>'; }
  else { html+=emptyState('📚','该分类下还没有书籍','',null); }
  body.innerHTML=html;
  $$('[data-f]',body).forEach(function(c){c.onclick=function(){ body._f=c.getAttribute('data-f'); bookLibrary(body); };});
  $$('[data-bk]',body).forEach(function(c){c.onclick=function(e){ if(e.target.closest('[data-act]'))return; openBookModal(c.getAttribute('data-bk')); };});
  $$('[data-act]',body).forEach(function(btn){btn.onclick=function(){ const p=btn.getAttribute('data-act').split(':'); const act=p[0],id=p[1]; if(act==='edit')openBookForm(id); else if(act==='prog')openProgressForm(id); else if(act==='note')openNoteForm({bookId:id}); else if(act==='del')delBook(id); else if(act==='arch')archBook(id); };});
}
function bookCard(b){
  let h='<div class="card clickable" data-bk="'+b.id+'">';
  h+='<div class="flex" style="gap:10px;align-items:flex-start">'+coverImg(b.cover,b.title,b.author,b.isbn);
  h+='<div style="min-width:0;flex:1"><div class="flex between"><b style="font-size:14px">'+esc(b.title)+'</b><span class="badge '+(b.status==='已读'?'ok':b.status==='在读'?'':b.status==='弃读'?'gray':'')+'">'+esc(b.status)+'</span></div>';
  h+='<div class="muted-small">'+esc(b.author||'佚名')+(b.translator?' 译':'')+'</div>';
  h+='<div class="progress" style="margin:8px 0"><i style="width:'+bookProgress(b)+'%"></i></div>';
  h+='<div class="muted-small" style="margin-bottom:8px">'+(b.currentPage||0)+'/'+(b.totalPages||0)+' 页 · '+bookProgress(b)+'%</div>';
  h+='<div class="flex flex-wrap" style="gap:5px">';
  h+='<button class="mini-btn" data-act="edit:'+b.id+'">编辑</button>';
  h+='<button class="mini-btn" data-act="prog:'+b.id+'">进度</button>';
  h+='<button class="mini-btn" data-act="note:'+b.id+'">笔记</button>';
  h+='<button class="mini-btn" data-act="arch:'+b.id+'">'+(b.archived?'取消归档':'归档')+'</button>';
  h+='<button class="mini-btn danger" data-act="del:'+b.id+'">删</button>';
  h+='</div></div></div></div>';
  return h;
}
function openBookModal(id){
  const b=COL.books().find(function(x){return x.id===id;}); if(!b) return;
  let html='<div class="modal-head"><h3>'+esc(b.title)+'</h3><button class="x-close" data-x>×</button></div><div class="modal-body">';
  html+='<div class="flex" style="gap:12px;margin-bottom:10px">'+coverImg(b.cover,b.title,b.author,b.isbn)+'<div style="flex:1;min-width:0"><div class="muted-small">'+esc(b.author||'佚名')+(b.translator?(' 译/'+esc(b.translator)):'')+'</div>';
  html+='<div class="muted-small">'+esc(b.publisher||'')+(b.isbn?(' · ISBN '+esc(b.isbn)):'')+'</div>';
  html+='<div style="margin-top:6px">'+(b.doubanRating!=null&&b.doubanRating!==''?('豆瓣 '+esc(b.doubanRating)+' 分 · '+(b.doubanRaters?esc(b.doubanRaters)+'人':'暂无人数')):'豆瓣：暂无数据')+(b.doubanUrl?' <a class="link" href="'+esc(b.doubanUrl)+'" target="_blank" rel="noopener">豆瓣页↗</a>':'')+'</div></div></div>';
  html+=kvRaw('状态',b.status);
  html+=kvRaw('进度',bookProgress(b)+'% · '+(b.currentPage||0)+'/'+(b.totalPages||0)+' 页');
  html+=kvRaw('分类',b.category||'—');
  html+=kvRaw('开始 / 完成',(b.startDate||'—')+' / '+(b.finishDate||'—'));
  html+=kvRaw('最近阅读',b.lastReadDate||'—');
  html+=kvRaw('当前章节',b.currentChapter||'—');
  html+=kvRaw('下一步计划',b.nextPlan||'—');
  html+=kvRaw('我的评分',b.myRating?b.myRating+'/5':'—');
  html+=kvRaw('推荐程度',b.recommendLevel||'—');
  html+=kvRaw('阅读目的',b.purpose||'—');
  if(b.summary) html+=kvRaw('一句话总结',b.summary);
  html+='<div style="margin:8px 0">'+tagsHtml(b.tags)+'</div>';
  if(b.relatedStocks&&b.relatedStocks.length) html+=kvRaw('关联股票',b.relatedStocks.map(stockName).join('、'));
  if(b.relatedIndustries&&b.relatedIndustries.length) html+=kvRaw('关联行业',b.relatedIndustries.join('、'));
  if(b.relatedKb&&b.relatedKb.length){ const ks=b.relatedKb.map(function(kid){const k=COL.kb().find(function(x){return x.id===kid;});return k?k.title:null;}).filter(Boolean); if(ks.length) html+=kvRaw('关联知识库',ks.join('、')); }
  if(b.updatedAt) html+='<div class="src-line">最近更新：'+esc(b.updatedAt)+'</div>';
  html+='<div class="row-actions mt"><button class="btn sm" id="mEdit">编辑</button><button class="btn sm" id="mProg">更新进度</button><button class="btn sm" id="mNote">写笔记</button><button class="btn sm" id="mRem">添加提醒</button></div>';
  html+='</div>';
  openModal(html,{wide:true});
  $$('[data-x]',modalEl).forEach(b=>b.onclick=closeModal);
  $('#mEdit').onclick=function(){ closeModal(); openBookForm(id); };
  $('#mProg').onclick=function(){ closeModal(); openProgressForm(id); };
  $('#mNote').onclick=function(){ closeModal(); openNoteForm({bookId:id}); };
  $('#mRem').onclick=function(){ closeModal(); openReminderForm(); };
}
async function delBook(id){ if(await confirmDialog('删除书籍','确认删除该书？相关笔记不会自动删除。','删除')){ let a=COL.books(); SAVE.books(a.filter(function(x){return x.id!==id;})); logActivity('删除书籍','book'); renderBook('library'); toast('已删除'); } }
function archBook(id){ let a=COL.books(); const b=a.find(function(x){return x.id===id;}); if(b){ b.archived=!b.archived; b.updatedAt=nowStr(); SAVE.books(a); renderBook('library'); } }
function openProgressForm(id){
  const b=COL.books().find(function(x){return x.id===id;}); if(!b) return;
  openModal('<div class="modal-head"><h3>更新阅读进度 · '+esc(b.title)+'</h3><button class="x-close" data-x>×</button></div>'+
    '<div class="modal-body">'+
    '<div class="field-row"><div class="field"><label>当前页数</label><input id="f_cur" type="number" value="'+(b.currentPage||0)+'"></div>'+
    '<div class="field"><label>总页数</label><input id="f_total" type="number" value="'+(b.totalPages||0)+'"></div></div>'+
    '<div class="field"><label>当前章节</label><input id="f_chap" value="'+esc(b.currentChapter||'')+'"></div>'+
    '<div class="field-row"><div class="field"><label>本次阅读时长（分钟，可选）</label><input id="f_min" type="number" placeholder="如 30"></div>'+
    '<div class="field"><label>最近阅读日期</label><input type="date" id="f_date" value="'+todayStr()+'"></div></div>'+
    '<div class="field"><label>下一步阅读计划</label><input id="f_plan" value="'+esc(b.nextPlan||'')+'"></div>'+
    '<div class="field"><label>阅读状态</label><select id="f_status">'+BOOK_STATUS.map(function(s){return '<option '+(b.status===s?'selected':'')+'>'+s+'</option>';}).join('')+'</select></div>'+
    '</div><div class="modal-foot"><button class="btn" data-x>取消</button><button class="btn primary" id="saveP">保存</button></div>');
  $$('[data-x]',modalEl).forEach(b=>b.onclick=closeModal);
  $('#saveP').onclick=function(){
    const cur=parseInt($('#f_cur').value)||0, total=parseInt($('#f_total').value)||b.totalPages||0;
    const mins=parseInt($('#f_min').value)||0; const dt=$('#f_date').value||todayStr(); const st=$('#f_status').value;
    b.currentPage=Math.min(cur,total); b.totalPages=total; b.currentChapter=$('#f_chap').value.trim();
    b.nextPlan=$('#f_plan').value.trim(); b.lastReadDate=dt; b.status=st;
    if(st==='已读'&&!b.finishDate) b.finishDate=dt; if(st!=='已读') b.finishDate=b.finishDate||'';
    b.readingLog=b.readingLog||[]; if(mins>0) b.readingLog.push({date:dt,minutes:mins});
    b.updatedAt=nowStr();
    let a=COL.books(); a=a.map(function(x){return x.id===b.id?b:x;}); SAVE.books(a); logActivity('更新进度','book',b.title); closeModal(); renderBook(parseHash().sub==='home'?'home':'library'); toast('已保存');
  };
}

/* ---------- 读书笔记 ---------- */
function bookNotes(body){
  const notes=COL.booknotes();
  const fType=body._ft||'', fStatus=body._fs||'', fBook=body._fb||'';
  let html='<div class="flex flex-wrap mb" style="gap:6px">';
  html+='<select id="nfType" class="mini-btn" style="height:30px"><option value="">全部类型</option>'+NOTE_TYPES.map(function(t){return '<option '+(fType===t?'selected':'')+'>'+t+'</option>';}).join('')+'</select>';
  html+='<select id="nfStatus" class="mini-btn" style="height:30px"><option value="">全部状态</option>'+NOTE_STATUS.map(function(t){return '<option '+(fStatus===t?'selected':'')+'>'+t+'</option>';}).join('')+'</select>';
  html+='<select id="nfBook" class="mini-btn" style="height:30px"><option value="">全部书籍</option>'+COL.books().map(function(b){return '<option value="'+b.id+'" '+(fBook===b.id?'selected':'')+'>'+esc(b.title)+'</option>';}).join('')+'</select>';
  html+='<button class="btn sm" id="nfTpl">查看模板</button>';
  html+='</div>';
  let list=notes.slice();
  if(fType) list=list.filter(function(n){return n.type===fType;});
  if(fStatus) list=list.filter(function(n){return (n.noteStatus||'新建')===fStatus;});
  if(fBook) list=list.filter(function(n){return n.bookId===fBook;});
  list.sort(function(a,b){return (b.createdAt||0)-(a.createdAt||0);});
  if(list.length){ html+='<div class="grid">'+list.map(noteCard).join('')+'</div>'; }
  else { html+=emptyState('✏️','还没有匹配的读书笔记','',null); }
  body.innerHTML=html;
  $('#nfType').onchange=function(e){ body._ft=e.target.value; bookNotes(body); };
  $('#nfStatus').onchange=function(e){ body._fs=e.target.value; bookNotes(body); };
  $('#nfBook').onchange=function(e){ body._fb=e.target.value; bookNotes(body); };
  $('#nfTpl').onclick=function(){ showNoteTemplate(); };
  $$('[data-note]',body).forEach(function(c){c.onclick=function(e){ if(e.target.closest('[data-act]'))return; openNoteModal(c.getAttribute('data-note')); };});
  $$('[data-act]',body).forEach(function(btn){btn.onclick=function(){ const p=btn.getAttribute('data-act').split(':'); const act=p[0],id=p[1]; if(act==='edit')openNoteForm({id:id}); else if(act==='task')noteToTask(id); else if(act==='del')delNote(id); else if(act==='arch')archNote(id); };});
}
function noteCard(n){
  const b=COL.books().find(function(z){return z.id===n.bookId;});
  let h='<div class="card clickable" data-note="'+n.id+'">';
  h+='<div class="flex between"><span><b>'+esc(n.title||'(无标题)')+'</b> '+(n.type?'<span class="badge gray">'+esc(n.type)+'</span>':'')+'</span><span class="badge '+(n.noteStatus==='已归档'?'gray':n.noteStatus==='待验证'?'sample':'ok')+'">'+esc(n.noteStatus||'新建')+'</span></div>';
  h+='<div class="muted-small" style="margin:4px 0">'+(b?esc(b.title):'未关联书')+(n.chapter?(' · '+esc(n.chapter)):'')+'</div>';
  if(n.quote) h+='<div style="margin:6px 0;padding:8px 10px;background:#f8fafc;border-left:3px solid var(--line-strong);font-size:12.5px;color:#475569">“'+esc(n.quote)+'”</div>';
  if(n.keyPoint) h+='<div class="muted-small"><b>核心观点：</b>'+esc(n.keyPoint)+'</div>';
  if(n.inspiration) h+='<div class="muted-small"><b>启发：</b>'+esc(n.inspiration)+'</div>';
  if(n.relatedStocks&&n.relatedStocks.length) h+='<div class="muted-small"><b>关联股票：</b>'+n.relatedStocks.map(stockName).join('、')+'</div>';
  if(n.relatedIndustries&&n.relatedIndustries.length) h+='<div class="muted-small"><b>关联行业：</b>'+n.relatedIndustries.join('、')+'</div>';
  if(n.relatedTopics&&n.relatedTopics.length) h+='<div class="muted-small"><b>关联主题：</b>'+n.relatedTopics.join('、')+'</div>';
  if(n.nextAction) h+='<div class="muted-small"><b>下一步行动：</b>'+esc(n.nextAction)+'</div>';
  if(n.nextReviewDate) h+='<div class="muted-small"><b>下次复习：</b>'+esc(n.nextReviewDate)+(dueReviews().some(function(r){return r.noteId===n.id;})?' <span class="badge risk">待复习</span>':'')+'</div>';
  const kbc=kbCountForNote(n.id);
  h+='<div class="flex flex-wrap" style="gap:6px;margin-top:8px">'+tagsHtml(n.tags)+(n.link?assocHtml(n.link):'')+(kbc?'<a class="badge" href="#/kb/collection" style="text-decoration:none">🔗 相关资料 '+kbc+'</a>':'')+'</div>';
  h+='<div class="row-actions mt"><button class="mini-btn" data-act="edit:'+n.id+'">编辑</button><button class="mini-btn" data-act="task:'+n.id+'">转任务</button><button class="mini-btn" data-act="arch:'+n.id+'">'+(n.noteStatus==='已归档'?'取消归档':'归档')+'</button><button class="mini-btn danger" data-act="del:'+n.id+'">删</button></div>';
  h+='</div>';
  return h;
}
function openNoteModal(id){
  const n=COL.booknotes().find(function(x){return x.id===id;}); if(!n) return;
  let html='<div class="modal-head"><h3>'+esc(n.title||'(无标题)')+'</h3><button class="x-close" data-x>×</button></div><div class="modal-body">'+noteDetail(n)+'<div class="row-actions mt"><button class="btn sm" id="nEdit">编辑</button><button class="btn sm" id="nTask">转任务</button></div></div>';
  openModal(html,{wide:true});
  $$('[data-x]',modalEl).forEach(b=>b.onclick=closeModal);
  $('#nEdit').onclick=function(){ closeModal(); openNoteForm({id:id}); };
  $('#nTask').onclick=function(){ closeModal(); noteToTask(id); };
}
function noteDetail(n){
  const b=COL.books().find(function(z){return z.id===n.bookId;});
  let h='';
  h+='<div class="flex between" style="margin-bottom:8px"><span class="muted-small">'+(b?esc(b.title):'未关联书')+(n.chapter?(' · '+esc(n.chapter)):'')+(n.type?(' · '+esc(n.type)):'')+'</span><span class="badge">'+esc(n.noteStatus||'新建')+'</span></div>';
  const row=function(k,v){ return v?('<div style="margin:8px 0"><div class="muted-small" style="color:#475569;font-weight:600">'+k+'</div><div style="white-space:pre-wrap">'+esc(v)+'</div></div>'):''; };
  h+=row('原文摘录',n.quote);
  h+=row('核心观点',n.keyPoint);
  h+=row('我的理解',n.myUnderstanding);
  h+=row('适用条件',n.conditions);
  h+=row('可能的反例',n.counterExamples);
  h+=row('对投资或工作的启发',n.inspiration);
  h+=row('可验证指标',n.verifyMetric);
  h+=row('下一步行动',n.nextAction);
  if(n.relatedStocks&&n.relatedStocks.length) h+=row('关联股票',n.relatedStocks.map(stockName).join('、'));
  if(n.relatedIndustries&&n.relatedIndustries.length) h+=row('关联行业',n.relatedIndustries.join('、'));
  if(n.relatedTopics&&n.relatedTopics.length) h+=row('关联主题',n.relatedTopics.join('、'));
  if(n.nextReviewDate) h+=row('下次复习日期',n.nextReviewDate);
  h+='<div class="flex flex-wrap" style="gap:6px;margin-top:8px">'+tagsHtml(n.tags)+(n.link?assocHtml(n.link):'')+'</div>';
  h+='<div class="src-line">创建：'+(n.createdAt?new Date(n.createdAt).toLocaleString('zh-CN'):'—')+(n.updatedAt?(' · 更新：'+n.updatedAt):'')+'</div>';
  return h;
}
async function delNote(id){ if(await confirmDialog('删除笔记','确认删除该笔记？相关复习计划会一并移除。','删除')){ let a=COL.booknotes(); SAVE.booknotes(a.filter(function(x){return x.id!==id;})); let r=COL.bookreviews(); SAVE.bookreviews(r.filter(function(x){return x.noteId!==id;})); logActivity('删除笔记','book'); renderBook('notes'); toast('已删除'); } }
function archNote(id){ let a=COL.booknotes(); const n=a.find(function(x){return x.id===id;}); if(n){ n.noteStatus='已归档'; n.updatedAt=nowStr(); SAVE.booknotes(a); renderBook('notes'); } }
function noteToTask(id){ const n=COL.booknotes().find(function(x){return x.id===id;}); if(!n)return; openTaskForm({title:(n.title||'读书笔记')+' → 行动', note:(n.nextAction||n.keyPoint||n.content||'')}); }
function showNoteTemplate(){
  const t='书籍：\n章节：\n笔记标题：\n\n原文摘录：\n核心观点：\n\n我的理解：\n适用条件：\n可能的反例：\n\n对投资或工作的启发：\n关联股票：\n关联行业：\n需要验证的数据：\n\n下一步行动：\n下次复习日期：';
  openModal('<div class="modal-head"><h3>结构化笔记模板</h3><button class="x-close" data-x>×</button></div><div class="modal-body"><pre style="white-space:pre-wrap;font-family:inherit;font-size:13px;background:#f8fafc;padding:12px;border-radius:9px;line-height:1.7">'+esc(t)+'</pre></div><div class="modal-foot"><button class="btn primary" data-x>关闭</button></div>');
  $$('[data-x]',modalEl).forEach(b=>b.onclick=closeModal);
}

/* ---------- 待复习（间隔复习） ---------- */
function bookReview(body){
  const rev=COL.bookreviews(); const today=todayStr();
  const due=rev.filter(function(r){return !r.done&&r.nextDate<=today;});
  const upcoming=rev.filter(function(r){return !r.done&&r.nextDate>today;}).sort(function(a,b){return a.nextDate.localeCompare(b.nextDate);});
  const done=rev.filter(function(r){return r.done;}).sort(function(a,b){return (b.lastReviewed||'').localeCompare(a.lastReviewed||'');}).slice(0,8);
  let html='<div class="grid cards-3 mb">';
  html+=statCard('⏰','已到期待复习',due.length,due.length?'up':'');
  html+=statCard('📅','即将到来',upcoming.length);
  html+=statCard('✅','已完成复习',done.length);
  html+='</div>';
  html+='<div class="panel"><h2>🔁 间隔复习（1天 / 7天 / 30天 / 90天）</h2>';
  if(due.length){ html+='<h3 style="font-size:13px;margin:6px 0 8px" class="up">已到期</h3>'+due.map(reviewRow).join(''); }
  else html+='<p class="muted-small">暂无到期复习 🎉</p>';
  if(upcoming.length){ html+='<h3 style="font-size:13px;margin:14px 0 8px">即将到来</h3>'+upcoming.map(reviewRow).join(''); }
  if(!rev.length) html+=emptyState('🔁','还没有复习计划。在「读书笔记」写笔记时填写「下次复习日期」即可。','',null);
  html+='</div>';
  if(done.length){ html+='<div class="panel mt"><h2>✅ 已完成复习</h2>'+done.map(function(r){return '<div class="kv"><span class="k"><b>'+esc(r.noteTitle||'(笔记)')+'</b></span><span class="v muted-small">末次 '+esc(r.lastReviewed||'—')+'</span></div>';}).join('')+'</div>'; }
  body.innerHTML=html;
  $$('[data-review]',body).forEach(function(b){b.onclick=function(){ openReviewModal(b.getAttribute('data-review')); };});
}
function reviewRow(r){
  const t=todayStr();
  return '<div class="kv"><span class="k"><b>'+esc(r.noteTitle||'(笔记)')+'</b><br><span class="muted-small">阶段 '+(r.stage+1)+'/4 · 下次 '+esc(r.nextDate)+'</span></span><span class="v"><button class="mini-btn '+(r.nextDate<=t?'danger':'')+'" data-review="'+r.id+'">复习</button></span></div>';
}
function openReviewModal(rId){
  const r=COL.bookreviews().find(function(x){return x.id===rId;}); if(!r) return;
  const n=COL.booknotes().find(function(x){return x.id===r.noteId;});
  openModal('<div class="modal-head"><h3>复习 · '+esc(r.noteTitle||'(笔记)')+'</h3><button class="x-close" data-x>×</button></div>'+
    '<div class="modal-body">'+
    (n&&n.keyPoint?'<div class="banner info"><span class="b-ico">💡</span><div>'+esc(n.keyPoint)+'</div></div>':'')+
    '<div class="field"><label>① 是否仍然记得这条观点？</label><select id="q1"><option value="是">是</option><option value="部分">部分</option><option value="否">否</option></select></div>'+
    '<div class="field"><label>② 是否仍然认同？</label><select id="q2"><option value="是">是</option><option value="部分">部分</option><option value="否">否</option></select></div>'+
    '<div class="field"><label>③ 是否出现新的支持证据？</label><input id="q3" placeholder="可选，简述"></div>'+
    '<div class="field"><label>④ 是否出现反例？</label><input id="q4" placeholder="可选，简述"></div>'+
    '<div class="field"><label>⑤ 是否需要关联到股票或知识库？</label><input id="q5" placeholder="可选，如 荣昌生物 / 某收藏"></div>'+
    '<div class="field"><label>⑥ 是否需要修改原笔记？</label><select id="q6"><option value="否">否</option><option value="是">是，将标记为待修订</option></select></div>'+
    '<div class="field"><label>更新笔记状态</label><select id="qStatus">'+NOTE_STATUS.map(function(s){return '<option '+(n&&n.noteStatus===s?'selected':'')+'>'+s+'</option>';}).join('')+'</select></div>'+
    '</div><div class="modal-foot"><button class="btn" data-x>取消</button><button class="btn primary" id="saveRv">完成本次复习</button></div>');
  $$('[data-x]',modalEl).forEach(b=>b.onclick=closeModal);
  $('#saveRv').onclick=function(){
    const rec={date:todayStr(),stillRecall:$('#q1').value,stillAgree:$('#q2').value,newEvidence:$('#q3').value.trim(),newCounter:$('#q4').value.trim(),needLink:$('#q5').value.trim(),needRevise:$('#q6').value};
    r.history=r.history||[]; r.history.push(rec);
    if(r.stage>=REVIEW_STAGES.length-1){ r.done=true; } else { r.stage=r.stage+1; }
    r.lastReviewed=todayStr();
    if(!r.done) r.nextDate=addDays(todayStr(),REVIEW_STAGES[r.stage]);
    let a=COL.bookreviews(); a=a.map(function(x){return x.id===r.id?r:x;}); SAVE.bookreviews(a);
    if(n){ n.noteStatus=($('#q6').value==='是')?'待修订':($('#qStatus').value||n.noteStatus); if(r.done&&n.noteStatus!=='待修订') n.noteStatus='已复习'; n.updatedAt=nowStr(); let na=COL.booknotes(); na=na.map(function(x){return x.id===n.id?n:x;}); SAVE.booknotes(na); }
    logActivity('完成复习','book',r.noteTitle); closeModal(); renderBook('review'); toast('复习已记录，已顺延下次日期');
  };
}

/* ---------- 主题地图 ---------- */
function bookTopics(body){
  const topic=body._topic?COL.booktopics().find(function(x){return x.id===body._topic;}):null;
  if(topic){ body.innerHTML=topicDetailHtml(topic); bindTopicDetail(body,topic); return; }
  const ts=COL.booktopics();
  let html='<div class="flex between" style="margin-bottom:10px"><span class="muted-small">点击主题查看相关书籍 / 笔记 / 股票 / 知识库</span><button class="btn sm" id="addT">＋ 主题</button></div>';
  html+='<div class="grid cards-3">'+ts.map(function(t){ const c=itemsByTopic(t.name); return '<div class="card clickable" data-topic="'+t.id+'"><b>'+esc(t.name)+'</b>'+(t.isDefault?'<span class="badge gray" style="margin-left:6px">默认</span>':'')+'<p class="muted-small" style="margin-top:6px">'+esc(t.desc||'')+'</p><div class="muted-small" style="margin-top:8px">📚'+c.books.length+' · ✏️'+c.notes.length+' · 📈'+c.stocks.length+' · 🔗'+c.kb.length+'</div></div>'; }).join('')+'</div>';
  body.innerHTML=html;
  $('#addT').onclick=function(){ openTopicForm(); };
  $$('[data-topic]',body).forEach(function(c){c.onclick=function(){ body._topic=c.getAttribute('data-topic'); bookTopics(body); };});
}
function itemsByTopic(name){
  const out={books:[],notes:[],stocks:[],kb:[]};
  COL.books().forEach(function(b){ if(tagsToNames(b.tags).indexOf(name)>=0||(b.relatedTopics&&b.relatedTopics.indexOf(name)>=0)) out.books.push(b); });
  COL.booknotes().forEach(function(n){ if((n.relatedTopics&&n.relatedTopics.indexOf(name)>=0)||tagsToNames(n.tags).indexOf(name)>=0) out.notes.push(n); });
  const noteStocks=[]; out.notes.forEach(function(n){ (n.relatedStocks||[]).forEach(function(s){ if(noteStocks.indexOf(s)<0) noteStocks.push(s); }); });
  out.stocks=noteStocks;
  COL.kb().forEach(function(k){ if(tagsToNames(k.tags).indexOf(name)>=0) out.kb.push(k); });
  return out;
}
function topicDetailHtml(t){
  const c=itemsByTopic(t.name);
  let h='<button class="btn sm" id="backT">← 返回主题列表</button>';
  h+='<div class="panel mt"><div class="panel-head"><h2>🏷️ '+esc(t.name)+'</h2><button class="btn sm" id="editT">编辑</button></div>';
  h+='<p class="muted-small">'+esc(t.desc||'')+'</p>';
  h+='<div class="grid cards-2" style="margin-top:10px">';
  h+='<div><h3 style="font-size:13px">📚 相关书籍（'+c.books.length+'）</h3>'+(c.books.length?c.books.map(function(b){return '<div class="kv"><span class="k"><b>'+esc(b.title)+'</b></span><span class="v">'+esc(b.status)+'</span></div>';}).join(''):'<p class="muted-small">暂无</p>')+'</div>';
  h+='<div><h3 style="font-size:13px">✏️ 相关笔记（'+c.notes.length+'）</h3>'+(c.notes.length?c.notes.map(function(n){return '<div class="kv"><span class="k"><b>'+esc(n.title||'(无标题)')+'</b></span><span class="v"><a class="link" href="#/book/notes">查看</a></span></div>';}).join(''):'<p class="muted-small">暂无</p>')+'</div>';
  h+='<div><h3 style="font-size:13px">📈 关联股票（'+c.stocks.length+'）</h3>'+(c.stocks.length?c.stocks.map(function(s){return '<div class="kv"><span class="k">'+esc(stockName(s))+'</span><span class="v"><a class="link" href="#/stock/holdings">查看</a></span></div>';}).join(''):'<p class="muted-small">暂无</p>')+'</div>';
  h+='<div><h3 style="font-size:13px">🔗 关联知识库（'+c.kb.length+'）</h3>'+(c.kb.length?c.kb.map(function(k){return '<div class="kv"><span class="k"><b>'+esc(k.title)+'</b></span><span class="v"><a class="link" href="#/kb/collection">查看</a></span></div>';}).join(''):'<p class="muted-small">暂无</p>')+'</div>';
  h+='</div>';
  h+='<div class="grid cards-2 mt">';
  h+='<div class="panel"><h2>💭 我的观点变化</h2><p style="white-space:pre-wrap">'+esc(t.note||'（暂无，点击编辑填写）')+'</p></div>';
  h+='<div class="panel"><h2>❓ 待验证问题</h2><p style="white-space:pre-wrap">'+esc(t.questions||'（暂无）')+'</p></div>';
  h+='</div></div>';
  return h;
}
function bindTopicDetail(body,t){
  $('#backT').onclick=function(){ body._topic=null; bookTopics(body); };
  $('#editT').onclick=function(){ openTopicForm(t.id); };
}
function openTopicForm(id){
  const t=id?COL.booktopics().find(function(x){return x.id===id;}):null;
  openModal('<div class="modal-head"><h3>'+(t?'编辑主题':'新建主题')+'</h3><button class="x-close" data-x>×</button></div>'+
    '<div class="modal-body">'+
    '<div class="field"><label>主题名称</label><input id="f_name" value="'+esc(t?t.name:'')+'"></div>'+
    '<div class="field"><label>说明</label><textarea id="f_desc">'+esc(t?t.desc:'')+'</textarea></div>'+
    '<div class="field"><label>我的观点变化</label><textarea id="f_note">'+esc(t?t.note:'')+'</textarea></div>'+
    '<div class="field"><label>待验证问题</label><textarea id="f_q">'+esc(t?t.questions:'')+'</textarea></div>'+
    '</div><div class="modal-foot"><button class="btn" data-x>取消</button><button class="btn primary" id="saveT">保存</button></div>');
  $$('[data-x]',modalEl).forEach(b=>b.onclick=closeModal);
  $('#saveT').onclick=function(){ const name=$('#f_name').value.trim(); if(!name){toast('请填写名称');return;} const obj={name:name,desc:$('#f_desc').value.trim(),note:$('#f_note').value.trim(),questions:$('#f_q').value.trim()}; let a=COL.booktopics(); if(t){ obj.id=t.id; obj.isDefault=t.isDefault; a=a.map(function(x){return x.id===t.id?Object.assign({},t,obj):x;}); } else { obj.id=uid('bt'); obj.isDefault=false; a.push(obj); } SAVE.booktopics(a); logActivity('主题','book',name); closeModal(); renderBook('topics'); toast('已保存'); };
}

/* ---------- 书籍推荐 ---------- */
function bookRecs(body){
  const r=COL.bookrecs();
  let html='<div class="banner info"><span class="b-ico">ℹ️</span><div>书籍评分、推荐与内容摘要仅用于阅读筛选，<b>不代表书籍观点一定正确，也不构成任何投资建议</b>。豆瓣数据如缺失显示「暂无数据」，不编造。</div></div>';
  html+='<div class="flex between mb"><span class="muted-small">共 '+r.length+' 条我的推荐</span><span class="flex" style="gap:8px"><button class="btn sm primary" id="smartR">🤖 智能找书</button><button class="btn sm" id="addR">＋ 添加推荐</button></span></div>';
  if(r.length){ html+='<div class="grid cards-3">'+r.map(recCardFull).join('')+'</div>'; }
  else html+=emptyState('⭐','推荐书单为空','',null);
  html+='<div class="section-head mt"><h3>豆瓣各类别 TOP3（本地精选 · 非实时抓取）</h3></div>';
  html+='<div class="banner warn" style="margin-bottom:10px"><span class="b-ico">⚠️</span><div>评分取自豆瓣公开数据的近似汇总（约值），<b>非实时抓取</b>。「历史经典」按书籍的<b>历史总体评价</b>筛选（与出版年份无关，再版书也归经典）；近期新书按出版年份由近到远优先展示（近1年→近5年→该分类下最新），严格近半年新书需接入实时数据源；如书名/评分有误，可在「＋书架」加入后自行编辑。</div></div>';
  html+=defaultTopHtml();
  body.innerHTML=html;
  $('#addR').onclick=function(){ openRecForm(); };
  $('#smartR').onclick=function(){ openSmartRec(); };
  $$('[data-rec]',body).forEach(function(c){c.onclick=function(){ openRecModal(c.getAttribute('data-rec')); };});
  bindDefaultTop(body);
}
function recCard(rec){
  let rating=(rec.doubanRating!=null&&rec.doubanRating!=='')?('豆瓣 '+esc(rec.doubanRating)+' 分'+(rec.doubanRaters?(' · '+esc(rec.doubanRaters)+' 人评'):'')):'暂无数据';
  return '<div class="card"><div class="flex" style="gap:10px">'+coverImg(rec.cover,rec.title,rec.author,rec.isbn)+
    '<div style="min-width:0"><div><b>'+esc(rec.title)+'</b></div><div class="muted-small">'+esc(rec.author||'')+'</div>'+
    '<div class="muted-small" style="margin-top:4px">'+rating+'</div>'+
    '<div class="muted-small">'+esc(rec.reason||'')+'</div></div></div></div>';
}
function recCardFull(rec){
  let h='<div class="card clickable" data-rec="'+rec.id+'">'+coverImg(rec.cover,rec.title,rec.author,rec.isbn);
  h+='<div style="min-width:0;flex:1"><div class="flex between"><b>'+esc(rec.title)+'</b></div>';
  h+='<div class="muted-small">'+esc(rec.author||'')+(rec.year?(' · '+rec.year+'年'):'')+'</div>';
  h+= (rec.doubanRating!=null&&rec.doubanRating!=='')?('<div class="muted-small">豆瓣 '+esc(rec.doubanRating)+' 分 · '+(rec.doubanRaters?esc(rec.doubanRaters)+' 人评':'暂无评分人数')+'</div>'):'<div class="muted-small">豆瓣：暂无数据</div>';
  if(rec.category) h+='<div class="muted-small">分类：'+esc(rec.category)+'</div>';
  if(rec.reason) h+='<div class="muted-small" style="margin-top:4px">'+esc(rec.reason)+'</div>';
  if(rec.relevance) h+='<div class="muted-small">关联研究方向：'+esc(rec.relevance)+'</div>';
  h+= rec.sample?'<div class="badge sample">模拟数据</div>':(rec.fetchedAt?'<div class="badge gray">录入 '+esc(rec.fetchedAt)+'</div>':'');
  h+='</div></div>';
  return h;
}
function openRecModal(id){
  const rec=COL.bookrecs().find(function(x){return x.id===id;}); if(!rec) return;
  let html='<div class="modal-head"><h3>'+esc(rec.title)+'</h3><button class="x-close" data-x>×</button></div><div class="modal-body">';
  html+='<div class="flex" style="gap:12px;margin-bottom:10px">'+coverImg(rec.cover,rec.title,rec.author,rec.isbn)+'<div style="flex:1"><div class="muted-small">'+esc(rec.author||'')+(rec.year?(' · '+rec.year):'')+'</div>';
  html+= (rec.doubanRating!=null&&rec.doubanRating!=='')?('<div class="muted-small">豆瓣 '+esc(rec.doubanRating)+' 分 · '+(rec.doubanRaters?esc(rec.doubanRaters)+' 人评':'暂无评分人数')+(rec.fetchedAt?(' · 抓取 '+esc(rec.fetchedAt)):'')+'</div>'):'<div class="muted-small">豆瓣：暂无数据</div>';
  html+= rec.doubanUrl?('<a class="link" href="'+esc(rec.doubanUrl)+'" target="_blank" rel="noopener">豆瓣页↗</a>'):'';
  html+='</div></div>';
  if(rec.reason) html+=kvRaw('推荐理由',rec.reason);
  if(rec.stage) html+=kvRaw('适合阶段',rec.stage);
  if(rec.difficulty) html+=kvRaw('阅读难度',rec.difficulty);
  if(rec.relevance) html+=kvRaw('关联研究方向',rec.relevance);
  html+='<div class="row-actions mt"><button class="btn sm primary" id="addLib">加入书架</button><button class="btn sm" id="editR">编辑</button><button class="btn sm danger" id="delR">删除</button></div>';
  html+='</div>';
  openModal(html,{wide:true});
  $$('[data-x]',modalEl).forEach(b=>b.onclick=closeModal);
  $('#addLib').onclick=function(){ openBookForm(null,{title:rec.title,author:rec.author}); let a=COL.bookrecs(); a=a.map(function(x){return x.id===rec.id?Object.assign({},x,{status:'已加书库'}):x;}); SAVE.bookrecs(a); closeModal(); renderBook('recs'); };
  $('#editR').onclick=function(){ closeModal(); openRecForm(rec.id); };
  $('#delR').onclick=async function(){ if(await confirmDialog('删除','确认删除该推荐？','删除')){ let a=COL.bookrecs(); SAVE.bookrecs(a.filter(function(x){return x.id!==rec.id;})); closeModal(); renderBook('recs'); } };
}
function openRecForm(id){
  const r=id?COL.bookrecs().find(function(x){return x.id===id;}):null;
  openModal('<div class="modal-head"><h3>'+(r?'编辑推荐':'添加推荐')+'</h3><button class="x-close" data-x>×</button></div>'+
    '<div class="modal-body">'+
    '<div class="field-row"><div class="field"><label>书名</label><input id="f_title" value="'+esc(r?r.title:'')+'"></div><div class="field"><label>作者</label><input id="f_author" value="'+esc(r?r.author:'')+'"></div></div>'+
    '<div class="field-row"><div class="field"><label>封面URL（可选）</label><input id="f_cover" value="'+esc(r?r.cover:'')+'"></div><div class="field"><label>出版年份</label><input id="f_year" value="'+esc(r?r.year:'')+'"></div></div>'+
    '<div class="field-row"><div class="field"><label>豆瓣评分（可选）</label><input id="f_rate" value="'+esc(r&&r.doubanRating!=null?r.doubanRating:'')+'" placeholder="如 8.5，留空则显示暂无数据"></div><div class="field"><label>评分人数（可选）</label><input id="f_raters" value="'+esc(r?r.doubanRaters:'')+'"></div></div>'+
    '<div class="field-row"><div class="field"><label>分类</label><input id="f_cat" value="'+esc(r?r.category:'')+'"></div><div class="field"><label>阅读难度</label><select id="f_diff"><option>入门</option><option>进阶</option><option>专业</option><option>困难</option></select></div></div>'+
    '<div class="field"><label>推荐理由</label><textarea id="f_reason">'+esc(r?r.reason:'')+'</textarea></div>'+
    '<div class="field"><label>适合阅读阶段</label><input id="f_stage" value="'+esc(r?r.stage:'')+'" placeholder="如 入门/进阶/复习"></div>'+
    '<div class="field"><label>与当前研究方向的关联</label><input id="f_rel" value="'+esc(r?r.relevance:'')+'"></div>'+
    '<div class="field"><label>豆瓣链接（可选）</label><input id="f_url" value="'+esc(r?r.doubanUrl:'')+'"></div>'+
    '</div><div class="modal-foot"><button class="btn" data-x>取消</button><button class="btn primary" id="saveR">保存</button></div>');
  $$('[data-x]',modalEl).forEach(b=>b.onclick=closeModal);
  $('#saveR').onclick=function(){
    const title=$('#f_title').value.trim(); if(!title){toast('请填写书名');return;}
    const rateRaw=$('#f_rate').value.trim();
    const obj={title:title,author:$('#f_author').value.trim(),cover:$('#f_cover').value.trim(),year:$('#f_year').value.trim(),
      doubanRating: rateRaw===''?null:parseFloat(rateRaw), doubanRaters:$('#f_raters').value.trim(),
      category:$('#f_cat').value.trim(),difficulty:$('#f_diff').value,reason:$('#f_reason').value.trim(),
      stage:$('#f_stage').value.trim(),relevance:$('#f_rel').value.trim(),doubanUrl:$('#f_url').value.trim(),
      fetchedAt: r?r.fetchedAt:todayStr(), status: r?(r.status||'想读'):'想读', sample: r?r.sample:false};
    let a=COL.bookrecs(); if(r){ obj.id=r.id; a=a.map(function(x){return x.id===r.id?Object.assign({},r,obj):x;}); } else { obj.id=uid('rc'); a.push(obj); }
    SAVE.bookrecs(a); logActivity('推荐书','book',title); closeModal(); renderBook('recs'); toast('已保存');
  };
}

/* ---------- 智能找书（本地精选书库） ---------- */
let lastSmartResults=[];
const SMART_SYN={ '人物传记':'传记','传记':'传记','传记类':'传记','人物':'传记','理财':'投资','炒股':'投资','股票':'投资','基金':'投资','价值':'投资','投资':'投资','投资类':'投资','投资入门':'投资','创业':'商业管理','经商':'商业管理','管理':'商业管理','营销':'商业管理','商业':'商业管理','商业类':'商业管理','沟通':'心理学','人际':'心理学','认知':'心理学','思维':'心理学','心理':'心理学','心理学':'心理学','心理学类':'心理学','自我':'自我成长','成长':'自我成长','习惯':'自我成长','励志':'自我成长','自我成长':'自我成长','自我成长类':'自我成长','小说':'文学小说','文学':'文学小说','科幻':'文学小说','小说类':'文学小说','历史':'历史','中国史':'历史','历史类':'历史','哲学':'哲学','哲学类':'哲学','科学':'科学','科普':'科学','物理':'科学','科学类':'科学','经济':'经济','经济类':'经济','社会':'社会学','社会学':'社会学','社会学类':'社会学' };
function doubanSearch(t){ return 'https://book.douban.com/subject_search?search_text='+encodeURIComponent(t); }
function tokenizeQuery(q){
  const out=[]; const raw=(q||'').replace(/[\s,，。、；;：:！!？?\n()（）]/g,'');
  Object.keys(SMART_SYN).forEach(function(k){ if(q && q.indexOf(k)>=0) out.push(SMART_SYN[k]); });
  (q||'').split(/[\s,，。、；;：:！!？?\n()（）]/).forEach(function(seg){ if(seg) out.push(seg); });
  for(let i=0;i+2<=raw.length;i++){ out.push(raw.substr(i,2)); }
  for(let i=0;i+3<=raw.length;i++){ out.push(raw.substr(i,3)); }
  const seen={}; return out.filter(function(t){ t=t.trim(); if(!t||seen[t]) return false; seen[t]=1; return true; });
}
function smartRec(query){
  const terms=tokenizeQuery(query);
  if(!terms.length) return [];
  const scored=BOOK_BRAIN.map(function(b){
    let score=0; const cat=(b.category||'').toLowerCase();
    const tags=(b.tags||[]).join(' ').toLowerCase();
    const hay=(cat+' '+tags+' '+(b.title||'')+' '+(b.author||'')+' '+(b.summary||'')).toLowerCase();
    terms.forEach(function(t){ const tl=t.toLowerCase(); if(!tl) return; const inCat=cat.indexOf(tl)>=0, inTag=tags.indexOf(tl)>=0; if(inCat||inTag) score+=3; else if(hay.indexOf(tl)>=0) score+=1; });
    return {b:b,score:score};
  }).filter(function(x){return x.score>0;});
  scored.sort(function(a,b){ return b.score-a.score || b.b.doubanRating-a.b.doubanRating; });
  return scored.slice(0,10).map(function(x){return x.b;});
}
function defaultTopByCategory(){
  const now=new Date().getFullYear();
  const sortRate=function(a,b){return b.doubanRating-a.doubanRating;};
  const sortYearRate=function(a,b){return (b.year||0)-(a.year||0) || b.doubanRating-a.doubanRating;};
  const cats=[]; BOOK_BRAIN.forEach(function(b){ if(cats.indexOf(b.category)<0) cats.push(b.category); });
  return cats.map(function(cat){
    const list=BOOK_BRAIN.filter(function(b){return b.category===cat;});
    const classic=list.filter(function(b){return b.classic;}).sort(sortRate).slice(0,3);
    const modern=list.filter(function(b){return !b.classic && b.year&&b.year>=1990&&b.year<2010;}).sort(sortRate).slice(0,3);
    let recent=list.filter(function(b){return !b.classic && b.year&&b.year>=now-1;}).sort(sortYearRate).slice(0,3);
    let recentLabel='近一年新书 TOP3';
    if(!recent.length){
      recent=list.filter(function(b){return b.year&&b.year>=now-5;}).sort(sortYearRate).slice(0,3);
      recentLabel='近五年新书 TOP3';
    }
    if(!recent.length){
      recent=list.slice().sort(sortYearRate).slice(0,3);
      recentLabel='较新出版 TOP3';
    }
    return {cat:cat,classic:classic,modern:modern,recent:recent,recentLabel:recentLabel};
  });
}
function topCard(b){
  const durl=b.doubanUrl||doubanSearch(b.title);
  return '<div class="card clickable" data-top="'+esc(b.title)+'" title="点击跳转到豆瓣"><div class="flex" style="gap:8px">'+coverImg(b.cover,b.title,b.author,b.isbn)+
    '<div style="min-width:0;flex:1"><div><b>'+esc(b.title)+'</b></div>'+
    '<div class="muted-small">'+esc(b.author||'')+(b.year?(' · '+b.year):'')+'</div>'+
    '<div class="muted-small">豆瓣 '+esc(b.doubanRating)+' 分'+(b.doubanRaters?(' · '+esc(b.doubanRaters)+' 人评'):'')+'</div>'+
    '<div class="row-actions mt" style="gap:6px"><button class="btn sm primary" data-addtop="'+esc(b.title)+'">＋书架</button>'+
    '<a class="btn sm" href="'+esc(durl)+'" target="_blank" rel="noopener" data-douban="'+esc(b.title)+'" onclick="event.stopPropagation();">豆瓣↗</a></div></div></div></div>';
}
function defaultTopHtml(){
  const data=defaultTopByCategory(); let h='';
  data.forEach(function(d){
    if(!d.classic.length && !d.modern.length && !d.recent.length) return;
    h+='<div class="topic-block"><div class="topic-title">📚 '+esc(d.cat)+'</div>';
    if(d.classic.length){ h+='<div class="muted-small" style="margin:4px 0">历史经典 TOP3（按历史总体评价）</div><div class="grid cards-3">'+d.classic.map(topCard).join('')+'</div>'; }
    if(d.modern.length){ h+='<div class="muted-small" style="margin:8px 0 4px">近代佳作 TOP3（1990–2009）</div><div class="grid cards-3">'+d.modern.map(topCard).join('')+'</div>'; }
    if(d.recent.length){ h+='<div class="muted-small" style="margin:8px 0 4px">'+esc(d.recentLabel)+'</div><div class="grid cards-3">'+d.recent.map(topCard).join('')+'</div>'; }
    h+='</div>';
  });
  return h;
}
function bindDefaultTop(body){
  $$('[data-top]',body).forEach(function(c){
    const b=BOOK_BRAIN.find(function(x){return x.title===c.getAttribute('data-top');});
    if(!b) return;
    c.onclick=function(){ window.open(b.doubanUrl||doubanSearch(b.title),'_blank','noopener,noreferrer'); };
  });
  $$('[data-addtop]',body).forEach(function(btn){ btn.onclick=function(event){ event.stopPropagation(); const b=BOOK_BRAIN.find(function(x){return x.title===btn.getAttribute('data-addtop');}); if(!b) return; var img=btn.closest('[data-top]').querySelector('img.cov-img'); var cov=(img&&img.getAttribute('src')&&img.getAttribute('src').indexOf('openlibrary')>=0)?img.getAttribute('src'):(b.cover||''); openBookForm(null,{title:b.title,author:b.author,category:b.category,doubanRating:b.doubanRating,doubanRaters:b.doubanRaters,year:b.year,doubanUrl:b.doubanUrl,cover:cov}); }; });
}
function smartCard(b,i){
  return '<div class="card"><div class="flex" style="gap:10px">'+coverImg(b.cover,b.title,b.author,b.isbn)+
    '<div style="min-width:0;flex:1"><div><b>'+esc(b.title)+'</b></div>'+
    '<div class="muted-small">'+esc(b.author||'')+(b.year?(' · '+b.year):'')+'</div>'+
    '<div class="muted-small">豆瓣 '+esc(b.doubanRating)+' 分 · '+(b.doubanRaters?esc(b.doubanRaters)+'人评':'')+'</div>'+
    '<div class="muted-small">分类：'+esc(b.category)+' · '+(b.tags||[]).slice(0,3).map(function(t){return esc(t);}).join('/')+'</div>'+
    '<div class="row-actions mt"><button class="btn sm primary" data-addbook="'+i+'">＋书架</button>'+
    '<a class="btn sm" href="'+esc(b.doubanUrl||doubanSearch(b.title))+'" target="_blank" rel="noopener">豆瓣↗</a></div>'+
    '</div></div></div>';
}
function openSmartRec(){
  let html='<div class="modal-head"><h3>🤖 智能找书</h3><button class="x-close" data-x>×</button></div><div class="modal-body">'+
    '<div class="muted-small mb">输入你感兴趣的方向，例如「想看历史人物传记类」「想学投资入门」「提升沟通与心理学」，自动匹配本地精选高分书单（最多 10 本）。</div>'+
    '<textarea id="smartQ" placeholder="例如：想看历史人物传记类" style="min-height:64px"></textarea>'+
    '<div class="row-actions mt"><button class="btn primary" id="genR">生成 10 本高分书</button></div>'+
    '<div id="smartRes" class="mt"></div></div>';
  openModal(html,{wide:true});
  $$('[data-x]',modalEl).forEach(b=>b.onclick=closeModal);
  $('#genR').onclick=function(){
    const q=$('#smartQ').value.trim();
    const res=smartRec(q); lastSmartResults=res; const box=$('#smartRes');
    if(!res.length){ box.innerHTML='<div class="muted-small">没找到匹配书籍，换个说法试试，例如「投资入门」「心理学」「科幻小说」「中国历史人物」。</div>'; return; }
    box.innerHTML='<div class="muted-small mb">为你匹配到 '+res.length+' 本（按相关度 + 评分排序）</div><div class="grid cards-3">'+res.map(function(b,i){return smartCard(b,i);}).join('')+'</div>';
    $$('[data-addbook]',box).forEach(function(el){ el.onclick=function(){ const b=lastSmartResults[parseInt(el.getAttribute('data-addbook'))]; if(b){ var card=el.closest('.card'); var img=card?card.querySelector('img.cov-img'):null; var cov=(img&&img.getAttribute('src')&&img.getAttribute('src').indexOf('openlibrary')>=0)?img.getAttribute('src'):(b.cover||''); openBookForm(null,{title:b.title,author:b.author,category:b.category,doubanRating:b.doubanRating,doubanRaters:b.doubanRaters,year:b.year,doubanUrl:b.doubanUrl,cover:cov}); } }; });
  };
}

/* ---------- 书籍表单（全字段） ---------- */
function relatedPickerHtml(b){
  const stocks=(b&&b.relatedStocks)?b.relatedStocks.join(','):'';
  const inds=(b&&b.relatedIndustries)?b.relatedIndustries.join(','):'';
  const kbOpts=COL.kb().map(function(k){return '<option value="'+k.id+'" '+((b&&b.relatedKb&&b.relatedKb.indexOf(k.id)>=0)?'selected':'')+'>'+esc(k.title)+'</option>';}).join('');
  return '<div class="field"><label>关联股票（代码逗号分隔）</label><input id="f_relstocks" value="'+esc(stocks)+'" placeholder="如 688331.SH,002891.SZ"></div>'+
    '<div class="field"><label>关联行业（逗号分隔）</label><input id="f_relind" value="'+esc(inds)+'" placeholder="如 创新药,宠物经济"></div>'+
    '<div class="field"><label>关联知识库内容（可多选）</label><select id="f_relkb" multiple size="3" style="height:auto">'+kbOpts+'</select></div>';
}
function readRelatedPicker(){
  const parse=function(v){return v.split(',').map(function(s){return s.trim();}).filter(Boolean);};
  const sel=Array.from($('#f_relkb').selectedOptions||[]).map(function(o){return o.value;});
  return { stocks:parse($('#f_relstocks').value), industries:parse($('#f_relind').value), kb:sel };
}
function openBookForm(id,preset){
  preset=preset||{};
  const editing = id && typeof id==='string' && COL.books().find(function(b){return b.id===id;});
  const b = editing || null;
  openModal('<div class="modal-head"><h3>'+(b?'编辑书籍':'添加书籍')+'</h3><button class="x-close" data-x>×</button></div>'+
    '<div class="modal-body">'+
    '<div class="field-row"><div class="field"><label>书名 *</label><input id="f_title" value="'+esc(b?b.title:(preset.title||''))+'"></div><div class="field"><label>作者</label><input id="f_author" value="'+esc(b?b.author:(preset.author||''))+'"></div></div>'+
    '<div class="field-row"><div class="field"><label>译者</label><input id="f_trans" value="'+esc(b?b.translator:'')+'"></div><div class="field"><label>出版社</label><input id="f_pub" value="'+esc(b?b.publisher:'')+'"></div></div>'+
    '<div class="field-row"><div class="field"><label>ISBN</label><input id="f_isbn" value="'+esc(b?b.isbn:'')+'"></div><div class="field"><label>封面URL</label><div class="flex" style="gap:6px"><input id="f_cover" value="'+esc(b?b.cover:'')+'" style="flex:1" placeholder="粘贴豆瓣/京东等封面图片地址"><button class="btn sm" id="autoCover" type="button">自动获取</button><button class="btn sm ghost" id="searchDoubanCover" type="button">去豆瓣搜</button></div><div class="muted-small" style="margin-top:4px">提示：国内网络下自动获取常失败，最稳做法是去豆瓣书籍页 → 右键封面 → 复制图片地址，贴到上方。</div></div></div>'+
    '<div class="field-row"><div class="field"><label>豆瓣评分</label><input id="f_drate" placeholder="可选" value="'+esc(b&&b.doubanRating!=null?b.doubanRating:'')+'"></div><div class="field"><label>评分人数</label><input id="f_draters" value="'+esc(b?b.doubanRaters:'')+'"></div></div>'+
    '<div class="field-row"><div class="field"><label>豆瓣链接</label><input id="f_durl" value="'+esc(b?b.doubanUrl:'')+'"></div><div class="field"><label>书籍分类</label><input id="f_cat" value="'+esc(b?b.category:'')+'"></div></div>'+
    '<div class="field-row"><div class="field"><label>总页数</label><input id="f_total" type="number" value="'+(b?b.totalPages:'')+'"></div><div class="field"><label>已读页数</label><input id="f_cur" type="number" value="'+(b?b.currentPage:0)+'"></div></div>'+
    '<div class="field"><label>阅读状态</label><select id="f_status">'+BOOK_STATUS.map(function(s){return '<option '+(b&&b.status===s?'selected':'')+'>'+s+'</option>';}).join('')+'</select></div>'+
    '<div class="field-row"><div class="field"><label>开始日期</label><input type="date" id="f_start" value="'+esc(b?b.startDate:'')+'"></div><div class="field"><label>完成日期</label><input type="date" id="f_finish" value="'+esc(b?b.finishDate:'')+'"></div></div>'+
    '<div class="field-row"><div class="field"><label>我的评分(1-5)</label><input id="f_myrate" value="'+esc(b?b.myRating:'')+'"></div><div class="field"><label>推荐程度</label><input id="f_reclevel" value="'+esc(b?b.recommendLevel:'')+'" placeholder="如 力荐/推荐/一般"></div></div>'+
    '<div class="field"><label>阅读目的</label><input id="f_purpose" value="'+esc(b?b.purpose:'')+'"></div>'+
    '<div class="field"><label>一句话总结</label><textarea id="f_summary">'+esc(b?b.summary:'')+'</textarea></div>'+
    '<div class="field"><label>标签</label><div id="tagBox" class="flex flex-wrap" style="gap:6px;border:1px solid var(--line-strong);border-radius:9px;padding:8px;min-height:38px"></div></div>'+
    relatedPickerHtml(b)+
    '</div><div class="modal-foot"><button class="btn" data-x>取消</button><button class="btn primary" id="saveB">保存</button></div>');
  $$('[data-x]',modalEl).forEach(b=>b.onclick=closeModal);
  $('#autoCover').onclick=function(){
    var title=$('#f_title').value.trim(), author=$('#f_author').value.trim(), isbn=$('#f_isbn').value.trim();
    if(!title && !isbn){ toast('请至少填写书名或 ISBN'); return; }
    var btn=$('#autoCover'); btn.disabled=true; btn.textContent='获取中…';
    fetchBookCover(title,author,isbn,function(u){
      btn.disabled=false; btn.textContent='自动获取';
      if(u){ $('#f_cover').value=u; toast('已获取封面'); }
      else {
        var q=title||isbn;
        toast('自动获取失败，已打开豆瓣搜索，请复制封面图片地址');
        window.open('https://www.douban.com/search?q='+encodeURIComponent(q),'_blank','noopener,noreferrer');
      }
    });
  };
  $('#searchDoubanCover').onclick=function(){ window.open('https://www.douban.com/search?q='+encodeURIComponent($('#f_title').value.trim()||$('#f_isbn').value.trim()||''),'_blank','noopener,noreferrer'); };
  const sel=b?b.tags.slice():[]; renderTagsInput(sel,$('#tagBox'));
  $('#saveB').onclick=function(){
    const title=$('#f_title').value.trim(); if(!title){toast('请填写书名');return;}
    const total=parseInt($('#f_total').value)||0, cur=parseInt($('#f_cur').value)||0;
    const dr=$('#f_drate').value.trim();
    const obj={title:title,author:$('#f_author').value.trim(),translator:$('#f_trans').value.trim(),publisher:$('#f_pub').value.trim(),
      isbn:$('#f_isbn').value.trim(),cover:$('#f_cover').value.trim(),
      doubanRating: dr===''?null:parseFloat(dr), doubanRaters:$('#f_draters').value.trim(), doubanUrl:$('#f_durl').value.trim(),
      category:$('#f_cat').value.trim(), totalPages:total, currentPage:Math.min(cur,total), status:$('#f_status').value,
      startDate:$('#f_start').value||null, finishDate:$('#f_finish').value||null,
      myRating:$('#f_myrate').value.trim(), recommendLevel:$('#f_reclevel').value.trim(), purpose:$('#f_purpose').value.trim(), summary:$('#f_summary').value.trim(),
      tags:sel.slice(), updatedAt:nowStr()};
    const rel=readRelatedPicker(); obj.relatedStocks=rel.stocks; obj.relatedIndustries=rel.industries; obj.relatedKb=rel.kb;
    if(b){ obj.id=b.id; obj.readingLog=b.readingLog||[]; obj.sample=b.sample||false; obj.createdAt=b.createdAt; let a=COL.books(); a=a.map(function(x){return x.id===b.id?obj:x;}); SAVE.books(a); }
    else { obj.id=uid('bk'); obj.readingLog=[]; obj.sample=false; obj.createdAt=Date.now(); let a=COL.books(); a.push(obj); SAVE.books(a); }
    logActivity(b?'编辑书籍':'添加书籍','book',title); closeModal(); renderBook(parseHash().sub==='home'?'home':'library'); toast('已保存');
  };
}

/* ---------- 笔记表单（结构化 + 关联） ---------- */
function openNoteForm(opts){
  opts=opts||{};
  const n=(opts.id && COL.booknotes().find(function(x){return x.id===opts.id;}))||null;
  const bookId=n?n.bookId:(opts.bookId||'');
  const presetLink=n?(n.link||null):(opts.link||null);
  const books=COL.books();
  let html='<div class="modal-head"><h3>'+(n?'编辑笔记':'写读书笔记')+'</h3><button class="x-close" data-x>×</button></div><div class="modal-body">';
  html+='<div class="field"><label>关联书籍</label><select id="f_book"><option value="">— 不关联 —</option>'+books.map(function(b){return '<option value="'+b.id+'" '+((n?n.bookId:bookId)===b.id?'selected':'')+'>'+esc(b.title)+'</option>';}).join('')+'</select></div>';
  html+='<div class="field-row"><div class="field"><label>所属章节</label><input id="f_chapter" value="'+esc(n?n.chapter:'')+'"></div><div class="field"><label>笔记标题</label><input id="f_title" value="'+esc(n?n.title:(opts.title||''))+'"></div></div>';
  html+='<div class="field"><label>笔记类型</label><select id="f_type">'+NOTE_TYPES.map(function(t){return '<option '+(n&&n.type===t?'selected':'')+'>'+t+'</option>';}).join('')+'</select></div>';
  html+='<div class="field"><label>原文摘录</label><textarea id="f_quote" placeholder="原文摘抄">'+esc(n?n.quote:(opts.content&&!opts.title?opts.content:''))+'</textarea></div>';
  html+='<div class="field"><label>核心观点</label><textarea id="f_keypoint">'+esc(n?n.keyPoint:'')+'</textarea></div>';
  html+='<div class="field"><label>我的理解</label><textarea id="f_understand">'+esc(n?n.myUnderstanding:'')+'</textarea></div>';
  html+='<div class="field-row"><div class="field"><label>适用条件</label><textarea id="f_cond">'+esc(n?n.conditions:'')+'</textarea></div><div class="field"><label>可能的反例</label><textarea id="f_counter">'+esc(n?n.counterExamples:'')+'</textarea></div></div>';
  html+='<div class="field"><label>对投资或工作的启发</label><textarea id="f_insp">'+esc(n?n.inspiration:(opts.content&&opts.title?opts.content:''))+'</textarea></div>';
  html+='<div class="field"><label>关联股票（代码逗号分隔）</label><input id="f_nstocks" value="'+esc(n&&n.relatedStocks?n.relatedStocks.join(','):'')+'"></div>';
  html+='<div class="field"><label>关联行业（逗号分隔）</label><input id="f_nind" value="'+esc(n&&n.relatedIndustries?n.relatedIndustries.join(','):'')+'"></div>';
  html+='<div class="field"><label>关联主题（逗号分隔，如 估值,行为金融）</label><input id="f_ntopic" value="'+esc(n&&n.relatedTopics?n.relatedTopics.join(','):'')+'"></div>';
  html+='<div class="field"><label>可验证指标</label><input id="f_verify" value="'+esc(n?n.verifyMetric:'')+'"></div>';
  html+='<div class="field"><label>下一步行动</label><input id="f_next" value="'+esc(n?n.nextAction:'')+'"></div>';
  html+='<div class="field-row"><div class="field"><label>下次复习日期（留空则不安排）</label><input type="date" id="f_review" value="'+esc(n?n.nextReviewDate:'')+'"></div><div class="field"><label>笔记状态</label><select id="f_nstatus">'+NOTE_STATUS.map(function(t){return '<option '+(n&&n.noteStatus===t?'selected':'')+'>'+t+'</option>';}).join('')+'</select></div></div>';
  html+='<div class="field"><label>标签</label><div id="tagBox" class="flex flex-wrap" style="gap:6px;border:1px solid var(--line-strong);border-radius:9px;padding:8px;min-height:38px"></div></div>';
  html+=linkPickerField(presetLink,['kb','stock']);
  html+='</div><div class="modal-foot"><button class="btn" data-x>取消</button><button class="btn primary" id="saveN">保存</button></div>';
  openModal(html,{wide:true});
  $$('[data-x]',modalEl).forEach(b=>b.onclick=closeModal);
  const sel=n?n.tags.slice():[]; renderTagsInput(sel,$('#tagBox'));
  $('#saveN').onclick=function(){
    const title=$('#f_title').value.trim(); if(!title && !$('#f_quote').value.trim() && !$('#f_keypoint').value.trim()){ toast('请至少填写标题、原文摘录或核心观点之一'); return; }
    const parse=function(v){return v.split(',').map(function(s){return s.trim();}).filter(Boolean);};
    const obj={bookId:$('#f_book').value||null, chapter:$('#f_chapter').value.trim(), title:title, type:$('#f_type').value,
      quote:$('#f_quote').value.trim(), keyPoint:$('#f_keypoint').value.trim(), myUnderstanding:$('#f_understand').value.trim(),
      conditions:$('#f_cond').value.trim(), counterExamples:$('#f_counter').value.trim(), inspiration:$('#f_insp').value.trim(),
      relatedStocks:parse($('#f_nstocks').value), relatedIndustries:parse($('#f_nind').value), relatedTopics:parse($('#f_ntopic').value),
      verifyMetric:$('#f_verify').value.trim(), nextAction:$('#f_next').value.trim(),
      nextReviewDate:$('#f_review').value||null, noteStatus:$('#f_nstatus').value, tags:sel.slice(), link:readLinkPicker(), updatedAt:nowStr()};
    if(n){ obj.id=n.id; obj.createdAt=n.createdAt; let a=COL.booknotes(); a=a.map(function(x){return x.id===n.id?obj:x;}); SAVE.booknotes(a);
      let r=COL.bookreviews(); let ri=r.find(function(x){return x.noteId===n.id;});
      if(obj.nextReviewDate){ if(ri){ ri.nextDate=obj.nextReviewDate; } else { r.push({id:uid('rv'),noteId:obj.id,noteTitle:obj.title||'(无标题)',nextDate:obj.nextReviewDate,stage:0,done:false,history:[]}); } SAVE.bookreviews(r); }
      else if(ri){ r=r.filter(function(x){return x.noteId!==n.id;}); SAVE.bookreviews(r); }
      logActivity('编辑笔记','book',title);
    } else { obj.id=uid('bn'); obj.createdAt=Date.now(); let a=COL.booknotes(); a.push(obj); SAVE.booknotes(a);
      if(obj.nextReviewDate){ let r=COL.bookreviews(); r.push({id:uid('rv'),noteId:obj.id,noteTitle:obj.title||'(无标题)',nextDate:obj.nextReviewDate,stage:0,done:false,history:[]}); SAVE.bookreviews(r); }
      logActivity('写笔记','book',title);
    }
    closeModal(); renderBook('notes'); toast('已保存');
  };
}

/* =========================================================================
   个人知识库模块
   发现 → 保存 → 整理 → 提炼 → 实践 → 归档
   ========================================================================= */
const KB_PLATFORMS=['小红书','微信公众号','普通网页','视频平台','图片','PDF或文件','手动输入'];
const KB_TYPES=['文章','攻略','教程','视频','清单','工具推荐','案例','灵感','商品','地点','菜谱','待验证信息'];
const KB_PRACTICE=['未计划','已加入计划','实践中','已完成','已验证有效','已验证无效','暂不实践'];
const KB_STATUS=['待整理','待读','已读'];
const DEFAULT_KB_THEMES=[
  {name:'做饭',tags:['家常菜','烘焙','快手菜','减脂餐','汤羹','面食','调味'],desc:'菜谱与下厨技巧'},
  {name:'摄影',tags:['手机摄影','人像','构图','夜景','后期','风光'],desc:'拍摄与修图'},
  {name:'视频剪辑',tags:['剪辑技巧','转场','字幕','调色','脚本','BGM'],desc:'短视频制作'},
  {name:'旅游规划',tags:['路线','住宿','预算','交通','景点','美食','签证'],desc:'出行与攻略'},
  {name:'家居生活',tags:['收纳','清洁','布置','好物','绿植'],desc:'居家与好物'},
  {name:'健身健康',tags:['力量训练','有氧','饮食','睡眠','拉伸'],desc:'运动与身体管理'},
  {name:'数码工具',tags:['App推荐','效率软件','硬件','插件','AI工具'],desc:'工具与软件'},
  {name:'工作效率',tags:['时间管理','会议','复盘','自动化','笔记法'],desc:'方法与提效'},
  {name:'投资理财',tags:['基金','股票','资产配置','财报','风控'],desc:'理财与投资'},
  {name:'读书写作',tags:['读书方法','写作技巧','卡片笔记','选题'],desc:'阅读与表达'},
  {name:'审美设计',tags:['配色','排版','字体','灵感','UI'],desc:'设计与审美'},
  {name:'个人成长',tags:['习惯','目标','心态','学习','副业'],desc:'自我提升'},
  {name:'待分类',tags:[],desc:'尚未归类的内容'}
];
var KB_THEME_FILTER='';
var kbF={};
function kbPlatformIco(p){ const m={'小红书':'📕','微信公众号':'🟢','普通网页':'🌐','视频平台':'🎬','图片':'🖼️','PDF或文件':'📄','手动输入':'✍️'}; return m[p]||'🔗'; }
function kbTypeIco(t){ const m={'文章':'📄','攻略':'🗺️','教程':'📘','视频':'🎬','清单':'📋','工具推荐':'🛠️','案例':'📁','灵感':'💡','商品':'🛒','地点':'📍','菜谱':'🍳','待验证信息':'❓'}; return m[t]||'📄'; }
function kbIsInbox(k){
  if(k.archived) return false;
  if(k.status==='待整理') return true;
  if(!k.theme || k.theme==='待分类') return true;
  if(!k.mySummary || !k.mySummary.trim()) return true;
  if(!k.tags || !k.tags.length) return true;
  if(k.worthPractice!=='yes' && k.worthPractice!=='no') return true;
  return false;
}
function kbStats(){
  const all=COL.kb();
  const nonArch=all.filter(function(k){return !k.archived;});
  const inbox=nonArch.filter(kbIsInbox).length;
  const collection=nonArch.length;
  const toRead=nonArch.filter(function(k){return k.status==='待读';}).length;
  const toPractice=nonArch.filter(function(k){return k.worthPractice==='yes'&&k.practiceStatus!=='已验证有效'&&k.practiceStatus!=='已验证无效';}).length;
  const practiced=nonArch.filter(function(k){return k.worthPractice==='yes'&&(k.practiceStatus==='已验证有效'||k.practiceStatus==='已验证无效');}).length;
  const weekNew=all.filter(function(k){return k.createdAt && (Date.now()-k.createdAt)<=7*86400000;}).length;
  const archived=all.filter(function(k){return k.archived;}).length;
  return {inbox:inbox,collection:collection,toRead:toRead,toPractice:toPractice,practiced:practiced,weekNew:weekNew,archived:archived};
}
function kbCover(k){ return coverImg(k.cover,k.title,'',k.isbn); }
function kbRelHtml(k){
  k=k||{};
  const bookSel=COL.books().map(function(b){return '<option value="'+b.id+'" '+((k.relatedBooks||[]).indexOf(b.id)>=0?'selected':'')+'>'+esc(b.title)+'</option>';}).join('');
  const noteSel=COL.booknotes().map(function(n){return '<option value="'+n.id+'" '+((k.relatedNotes||[]).indexOf(n.id)>=0?'selected':'')+'>'+esc(n.title||'(无标题)')+'</option>';}).join('');
  const taskSel=COL.tasks().map(function(t){return '<option value="'+t.id+'" '+((k.relatedTasks||[]).indexOf(t.id)>=0?'selected':'')+'>'+esc(t.title)+'</option>';}).join('');
  const stocks=(k.relatedStocks||[]).join(',');
  const inds=(k.relatedIndustries||[]).join(',');
  const projs=(k.relatedProjects||[]).join(',');
  return '<div class="field-row"><div class="field"><label>关联股票（代码逗号分隔）</label><input id="f_relstocks" value="'+esc(stocks)+'" placeholder="如 688331.SH,002891.SZ"></div>'+
    '<div class="field"><label>关联行业（逗号分隔）</label><input id="f_relind" value="'+esc(inds)+'" placeholder="如 创新药,宠物经济"></div></div>'+
    '<div class="field"><label>关联书籍（可多选）</label><select id="f_relbooks" multiple size="3" style="height:auto">'+bookSel+'</select></div>'+
    '<div class="field"><label>关联读书笔记（可多选）</label><select id="f_relnotes" multiple size="3" style="height:auto">'+noteSel+'</select></div>'+
    '<div class="field"><label>关联任务（可多选）</label><select id="f_reltasks" multiple size="3" style="height:auto">'+taskSel+'</select></div>'+
    '<div class="field"><label>关联项目（逗号分隔）</label><input id="f_relproj" value="'+esc(projs)+'"></div>';
}
function readKbRel(){
  const parse=function(v){return (v||'').split(',').map(function(s){return s.trim();}).filter(Boolean);};
  const multi=function(id){const sel=$('#'+id); return sel?Array.from(sel.selectedOptions||[]).map(function(o){return o.value;}):[];};
  return { stocks:parse($('#f_relstocks').value), industries:parse($('#f_relind').value), books:multi('f_relbooks'), notes:multi('f_relnotes'), tasks:multi('f_reltasks'), projects:parse($('#f_relproj').value) };
}
function kbThemeOptions(sel){
  const ts=COL.kbtopics().map(function(t){return t.name;});
  if(ts.indexOf('待分类')<0) ts.push('待分类');
  return ts.map(function(n){return '<option '+(sel===n?'selected':'')+'>'+esc(n)+'</option>';}).join('');
}
function kbCard(k){
  const ext = k.url? '<a class="link" href="'+esc(k.url)+'" target="_blank" rel="noopener" data-ext="'+esc(k.domain||'未知域名')+'">'+esc(k.url)+'</a>' : '';
  const badges = '<span class="badge '+(k.archived?'gray':k.status==='待整理'?'sample':k.status==='待读'?'warn':'ok')+'">'+esc(k.archived?'已归档':k.status)+'</span>'+
    (k.worthPractice==='yes'?'<span class="badge warn">待实践</span>':'')+
    (k.myRating?('<span class="badge">'+esc(k.myRating)+'★</span>'):'');
  return '<div class="card mb" data-kb="'+k.id+'">'+
    '<div class="flex" style="gap:10px;align-items:flex-start">'+
      kbCover(k)+
      '<div style="flex:1;min-width:0">'+
        '<div class="flex between"><b>'+esc(k.title)+'</b>'+badges+'</div>'+
        '<div class="muted-small" style="margin:4px 0">'+kbPlatformIco(k.platform)+' '+(k.platform||'')+(k.author?(' · '+esc(k.author)):'')+(k.domain?(' · '+esc(k.domain)):'')+'</div>'+
        (k.url?('<div class="muted-small" style="margin:4px 0;word-break:break-all">'+ext+'</div>'):'')+
        (k.mySummary?('<p class="muted-small" style="margin:6px 0;white-space:pre-wrap">'+esc(k.mySummary)+'</p>'):(k.origSummary?('<p class="muted-small" style="margin:6px 0;white-space:pre-wrap">'+esc(k.origSummary)+'</p>'):''))+
        (k.theme?('<div class="muted-small">主题：'+esc(k.theme)+(k.subTheme?(' / '+esc(k.subTheme)):'')+'</div>'):'')+
        '<div class="flex flex-wrap" style="gap:6px;margin-top:6px">'+tagsHtml(k.tags)+'</div>'+
      '</div>'+
    '</div>'+
    '<div class="row-actions mt">'+
      '<button class="mini-btn" data-act="view:'+k.id+'">查看</button>'+
      '<button class="mini-btn" data-act="edit:'+k.id+'">编辑</button>'+
      '<button class="mini-btn" data-act="note:'+k.id+'">转笔记</button>'+
      '<button class="mini-btn" data-act="task:'+k.id+'">转任务</button>'+
      '<button class="mini-btn" data-act="arch:'+k.id+'">'+(k.archived?'取消归档':'归档')+'</button>'+
      '<button class="mini-btn danger" data-act="del:'+k.id+'">删</button>'+
    '</div>'+
  '</div>';
}
function handleKbAct(act){
  const i=act.indexOf(':'); const kind=act.slice(0,i), id=act.slice(i+1);
  const k=COL.kb().find(function(x){return x.id===id;}); if(!k) return;
  if(kind==='view') openKbDetail(id);
  else if(kind==='edit') openKbForm(id);
  else if(kind==='note') openNoteForm({title:k.title,content:k.mySummary||k.origSummary,link:{type:'kb',id:id,title:k.title}});
  else if(kind==='task') openTaskForm({title:k.title,link:{type:'kb',id:id,title:k.title}});
  else if(kind==='arch'){ k.archived=!k.archived; k.updatedAt=nowStr(); SAVE.kb(COL.kb()); toast(k.archived?'已归档':'已取消归档'); renderKb(parseHash().sub); }
  else if(kind==='del'){ confirmDialog('删除收藏','确认删除？此操作不可撤销。','删除').then(function(y){ if(y){ let a=COL.kb(); SAVE.kb(a.filter(function(x){return x.id!==id;})); toast('已删除'); renderKb(parseHash().sub); } }); }
  else if(kind==='prac') openKbPracticeForm(id);
  else if(kind==='reuse'){ k.reuseCount=(k.reuseCount||0)+1; k.lastReuse=nowStr(); k.updatedAt=nowStr(); SAVE.kb(COL.kb()); toast('已记录复用（+1）'); renderKb(parseHash().sub); }
}
function bindKbBody(body){
  body.addEventListener('click',function(e){
    const ext=e.target.closest('[data-ext]'); if(ext){ return; }
    const act=e.target.closest('[data-act]'); if(act){ handleKbAct(act.getAttribute('data-act')); return; }
    const th=e.target.closest('[data-theme]'); if(th){ KB_THEME_FILTER=th.getAttribute('data-theme'); renderKb('collection'); return; }
    const card=e.target.closest('[data-kb]'); if(card){ openKbDetail(card.getAttribute('data-kb')); }
  });
}
function renderKb(sub){
  sub=sub||'home'; const view=$('#view');
  view.innerHTML=pageHead('个人知识库','发现 → 保存 → 整理 → 提炼 → 实践 → 归档', `<button class="btn primary" id="kbAdd">＋ 新建收藏</button>`,'🔗')+subnav('kb',sub);
  const body=document.createElement('div'); view.appendChild(body);
  ({home:kbHome,inbox:kbInbox,collection:kbCollection,themes:kbThemes,practice:kbPracticePage,featured:kbFeatured,archive:kbArchive})[sub](body);
  bindSubnav('kb');
  $('#kbAdd').onclick=function(){ openKbForm(); };
}
/* ---------------- 首页 ---------------- */
function kbQuickSaveHtml(){
  return '<div class="panel quick-save"><div class="panel-head"><h2>⚡ 快速保存</h2><span class="muted-small">粘贴链接或手动记录，自动进入「待整理」</span></div>'+
    '<div class="field-row"><div class="field" style="flex:2"><label>链接 URL（小红书 / 公众号 / 网页 / 视频等）</label><input id="qs_url" placeholder="https://…"></div>'+
    '<div class="field"><label>标题</label><input id="qs_title" placeholder="内容标题"></div></div>'+
    '<div class="field-row"><div class="field"><label>来源平台</label><select id="qs_platform">'+KB_PLATFORMS.map(function(p){return '<option>'+p+'</option>';}).join('')+'</select></div>'+
    '<div class="field"><label>作者 / 账号</label><input id="qs_author"></div>'+
    '<div class="field"><label>封面图 / 截图</label><input id="qs_img" type="file" accept="image/*"></div></div>'+
    '<div class="field"><label>原文摘要（无法读取外部页面时请手动粘贴；本工作台不自动编造标题/作者/摘要）</label><textarea id="qs_summary" placeholder="粘贴原文摘要或你的初步记录"></textarea></div>'+
    '<div class="row-actions"><button class="btn primary" id="qs_save">保存到待整理</button>'+
    '<button class="btn" id="qs_full">展开完整表单</button>'+
    '<span class="muted-small" id="qs_hint"></span></div></div>';
}
function bindQuickSave(scope){
  const img=$('#qs_img',scope); if(img) img.addEventListener('change',function(){ const f=img.files&&img.files[0]; if(!f) return; const r=new FileReader(); r.onload=function(){ scope._qsCover=r.result; $('#qs_hint',scope).textContent='已选图片（'+Math.round(f.size/1024)+'KB），保存时作为封面'; }; r.readAsDataURL(f); });
  const url=$('#qs_url',scope); if(url) url.addEventListener('blur',function(){ const u=url.value.trim(); if(u){ try{ $('#qs_hint',scope).textContent='来源域名：'+new URL(u).hostname+'（本工作台不自动读取外部页面，请手动补充摘要）'; }catch(e){ $('#qs_hint',scope).textContent=''; } } });
  const save=$('#qs_save',scope); if(save) save.onclick=function(){
    const title=$('#qs_title',scope).value.trim(); const urlv=$('#qs_url',scope).value.trim();
    if(!title&&!urlv){ toast('请填写标题或链接'); return; }
    let domain=''; if(urlv){ try{ domain=new URL(urlv).hostname; }catch(e){} }
    const t=title||'(未命名收藏)';
    const obj={ id:uid('kb'), title:t, url:urlv, domain:domain, platform:$('#qs_platform',scope).value, author:$('#qs_author',scope).value.trim(),
      publishedAt:'', cover:scope._qsCover||'', isbn:'', type:'', origSummary:$('#qs_summary',scope).value.trim(),
      mySummary:'', whySave:'', keyPoints:'', steps:'', methods:'', scenarios:'', cautions:'', myRating:'', worthPractice:'unknown',
      theme:'待分类', subTheme:'', tags:[], relatedBooks:[], relatedStocks:[], relatedIndustries:[], relatedTasks:[], relatedProjects:[], relatedNotes:[],
      status:'待整理', nextAction:'', planDate:'', practiceStatus:'未计划', practiceResult:'', neededMaterials:'', reviewNote:'', reuseCount:0, lastReuse:null,
      archived:false, createdAt:Date.now(), updatedAt:nowStr(), sample:false };
    let a=COL.kb(); a.push(obj); SAVE.kb(a); logActivity('快速收藏','kb',t); toast('已保存到待整理'); renderKb('inbox');
  };
  const full=$('#qs_full',scope); if(full) full.onclick=function(){ openKbForm(); };
}
function kbHome(body){
  const s=kbStats(); const all=COL.kb();
  const recent=all.slice().sort(function(a,b){return (b.createdAt||0)-(a.createdAt||0);}).slice(0,6);
  const updated=all.slice().sort(function(a,b){return (b.updatedAt||b.createdAt||0)-(a.updatedAt||a.createdAt||0);}).slice(0,6);
  const themeCount={};
  all.forEach(function(k){ const t=k.theme||'待分类'; themeCount[t]=(themeCount[t]||0)+1; });
  const hot=Object.keys(themeCount).map(function(t){return {name:t,c:themeCount[t]};}).sort(function(a,b){return b.c-a.c;}).slice(0,8);
  const pending=all.filter(function(k){return !k.archived && (kbIsInbox(k) || (k.worthPractice==='yes'&&k.practiceStatus!=='已验证有效'&&k.practiceStatus!=='已验证无效'));}).slice(0,6);
  const stat=function(num,label,go,cls){ return '<div class="card clickable" data-go="'+go+'"><div class="stat-row"><div class="stat-num '+(cls||'')+'">'+num+'</div><div class="stat-label">'+label+'</div></div></div>'; };
  let h=kbQuickSaveHtml();
  h+='<div class="grid cards-4" style="margin-top:14px">'+
    stat(s.inbox,'待整理','#/kb/inbox')+
    stat(s.collection,'全部收藏','#/kb/collection')+
    stat(s.toRead,'待读','#/kb/collection')+
    stat(s.toPractice,'待实践','#/kb/practice')+
    stat(s.practiced,'已实践','#/kb/featured')+
    stat(s.weekNew,'本周新增','#/kb/collection')+
  '</div>';
  h+='<div class="row-actions mt mb"><button class="btn sm primary" id="qa_add">＋ 新增收藏</button>'+
    '<button class="btn sm" id="qa_theme">＋ 新增主题</button>'+
    '<button class="btn sm" id="qa_prac">＋ 新增待实践事项</button>'+
    '<button class="btn sm" id="qa_search">🔍 搜索内容</button>'+
    '<button class="btn sm" id="qa_inbox">查看待整理</button></div>';
  h+='<div class="grid" style="grid-template-columns:1fr 1fr;gap:14px;align-items:start">';
  h+='<div><div class="panel"><div class="panel-head"><h2>🆕 最近收藏</h2></div>'+(recent.length?recent.map(function(k){return '<div class="kv"><span class="k"><b>'+esc(k.title)+'</b></span><span class="v muted-small">'+(k.platform||'')+'</span></div>';}).join(''):'<p class="muted-small">暂无</p>')+'</div>'+
    '<div class="panel mt"><div class="panel-head"><h2>🕘 最近更新</h2></div>'+(updated.length?updated.map(function(k){return '<div class="kv"><span class="k"><b>'+esc(k.title)+'</b></span><span class="v muted-small">'+(k.updatedAt||'')+'</span></div>';}).join(''):'<p class="muted-small">暂无</p>')+'</div></div>';
  h+='<div><div class="panel"><div class="panel-head"><h2>🔥 热门主题</h2></div><div class="flex flex-wrap" style="gap:8px">'+(hot.length?hot.map(function(t){return '<span class="chip" data-theme="'+esc(t.name)+'">'+esc(t.name)+' <b>'+t.c+'</b></span>';}).join(''):'<p class="muted-small">暂无</p>')+'</div></div>'+
    '<div class="panel mt"><div class="panel-head"><h2>📌 待处理事项</h2></div>'+(pending.length?pending.map(function(k){return '<div class="kv"><span class="k"><b>'+esc(k.title)+'</b>'+(kbIsInbox(k)?' <span class="badge sample">待整理</span>':' <span class="badge warn">待实践</span>')+'</span><span class="v"><button class="mini-btn" data-act="view:'+k.id+'">处理</button></span></div>';}).join(''):'<p class="muted-small">全部处理完毕 🎉</p>')+'</div></div>';
  h+='</div>';
  body.innerHTML=h;
  bindQuickSave(body);
  bindKbBody(body);
  $('#qa_add').onclick=function(){ openKbForm(); };
  $('#qa_theme').onclick=function(){ openKbThemeForm(); };
  $('#qa_prac').onclick=function(){ openKbForm({worthPractice:'yes',practiceStatus:'已加入计划',status:'待读'}); };
  $('#qa_search').onclick=function(){ location.hash='#/search'; };
  $('#qa_inbox').onclick=function(){ renderKb('inbox'); };
}
/* ---------------- 待整理 ---------------- */
function kbInbox(body){
  const all=COL.kb().filter(kbIsInbox);
  let h='<div class="banner warn" style="margin-bottom:10px"><span class="b-ico">📥</span><div>待整理 = 缺少主题 / 标签 / 我的摘要，或尚未判断是否值得实践的内容。快速补全后即可进入「全部收藏」。</div></div>';
  if(!all.length){ h+=emptyState('📥','待整理已清空','去收藏一条',null); body.innerHTML=h; return; }
  h+='<div class="grid">';
  all.forEach(function(k){
    h+='<div class="card mb" data-kb="'+k.id+'"><div class="flex between"><b>'+esc(k.title)+'</b><span class="badge sample">待整理</span></div>'+
      (k.url?'<div class="muted-small" style="margin:4px 0;word-break:break-all"><a class="link" href="'+esc(k.url)+'" target="_blank" rel="noopener" data-ext="'+esc(k.domain||'未知')+'">'+esc(k.url)+'</a></div>':'')+
      missingHint(k)+
      '<div class="field-row" style="margin-top:8px"><div class="field"><label>主题</label><select id="in_theme_'+k.id+'">'+kbThemeOptions(k.theme)+'</select></div>'+
      '<div class="field"><label>值得实践</label><select id="in_wp_'+k.id+'">'+['unknown','yes','no'].map(function(v){return '<option value="'+v+'" '+((k.worthPractice||'unknown')===v?'selected':'')+'>'+(v==='unknown'?'未定':v==='yes'?'值得':'不值得')+'</option>';}).join('')+'</select></div></div>'+
      '<div class="field"><label>我的摘要（一句话）</label><input id="in_sum_'+k.id+'" value="'+esc(k.mySummary||'')+'" placeholder="一句话总结这条内容"></div>'+
      '<div class="field"><label>标签</label><div id="in_tags_'+k.id+'" class="flex flex-wrap" style="gap:6px;border:1px solid var(--line-strong);border-radius:9px;padding:8px;min-height:38px"></div></div>'+
      '<div class="row-actions mt">'+
      (k.url?'<a class="mini-btn" href="'+esc(k.url)+'" target="_blank" rel="noopener" data-ext="'+esc(k.domain||'未知')+'">打开链接</a>':'')+
      '<button class="mini-btn primary" data-act="savein:'+k.id+'">保存整理</button>'+
      '<button class="mini-btn" data-act="edit:'+k.id+'">编辑</button>'+
      '<button class="mini-btn" data-act="task:'+k.id+'">加入任务</button>'+
      '<button class="mini-btn" data-act="arch:'+k.id+'">归档</button>'+
      '<button class="mini-btn danger" data-act="del:'+k.id+'">删</button></div></div>';
  });
  h+='</div>';
  body.innerHTML=h; bindKbBody(body);
  all.forEach(function(k){
    const sel=[]; renderTagsInput(sel,$('#in_tags_'+k.id,body));
    $('#in_tags_'+k.id,body)._sel=sel;
  });
  $$('[data-act^="savein:"]',body).forEach(function(b){ b.onclick=function(){
    const id=b.getAttribute('data-act').slice(7); const k=COL.kb().find(function(x){return x.id===id;}); if(!k) return;
    k.theme=$('#in_theme_'+id,body).value; k.worthPractice=$('#in_wp_'+id,body).value; k.mySummary=$('#in_sum_'+id,body).value.trim();
    const sel=$('#in_tags_'+id,body)._sel||[]; k.tags=sel.slice();
    k.updatedAt=nowStr();
    if(k.theme && k.theme!=='待分类' && k.mySummary && k.tags.length && k.worthPractice!=='unknown'){ k.status='待读'; toast('整理完成，已移到全部收藏'); }
    else { toast('已保存进度'); }
    SAVE.kb(COL.kb()); renderKb('inbox');
  }; });
}
function missingHint(k){
  const m=[];
  if(!k.theme||k.theme==='待分类') m.push('缺主题');
  if(!k.tags||!k.tags.length) m.push('缺标签');
  if(!k.mySummary||!k.mySummary.trim()) m.push('缺摘要');
  if(k.worthPractice!=='yes'&&k.worthPractice!=='no') m.push('未判断实践');
  if(!m.length) return '';
  return '<div class="muted-small" style="margin:6px 0">'+m.map(function(x){return '<span class="badge sample">'+x+'</span>';}).join(' ')+'</div>';
}
/* ---------------- 全部收藏（搜索/筛选） ---------------- */
function kbCollection(body){
  const all=COL.kb();
  const themes=COL.kbtopics().map(function(t){return t.name;}); if(themes.indexOf('待分类')<0) themes.push('待分类');
  let f=Object.assign({q:'',theme:'',type:'',platform:'',status:'',practice:'',archived:''},kbF);
  if(KB_THEME_FILTER){ f.theme=KB_THEME_FILTER; }
  let list=all.slice();
  if(f.q){ const q=f.q.toLowerCase(); list=list.filter(function(k){ const hay=(k.title+' '+(k.origSummary||'')+' '+(k.mySummary||'')+' '+(k.keyPoints||'')+' '+(k.whySave||'')+' '+(k.author||'')+' '+(k.domain||'')+' '+tagsToNames(k.tags).join(' ')+' '+(k.relatedStocks||[]).join(' ')).toLowerCase(); return hay.indexOf(q)>=0; }); }
  if(f.theme) list=list.filter(function(k){return (k.theme||'待分类')===f.theme;});
  if(f.type) list=list.filter(function(k){return k.type===f.type;});
  if(f.platform) list=list.filter(function(k){return k.platform===f.platform;});
  if(f.status) list=list.filter(function(k){return (k.archived?'已归档':k.status)===f.status;});
  if(f.practice==='yes') list=list.filter(function(k){return k.worthPractice==='yes';});
  else if(f.practice==='no') list=list.filter(function(k){return k.worthPractice!=='yes';});
  if(f.archived==='yes') list=list.filter(function(k){return k.archived;});
  else if(f.archived==='no') list=list.filter(function(k){return !k.archived;});
  let h='';
  if(KB_THEME_FILTER){ h+='<div class="banner" style="margin-bottom:10px"><span class="b-ico">🏷️</span><div>正在筛选主题：<b>'+esc(KB_THEME_FILTER)+'</b> <button class="mini-btn" id="clrF">清除筛选</button></div></div>'; }
  h+='<div class="panel"><div class="panel-head"><h2>🔗 全部收藏</h2><span class="badge gray">'+list.length+' 条</span></div>';
  h+='<div class="field-row" style="margin-bottom:10px"><div class="field" style="flex:2"><input id="f_q" value="'+esc(f.q)+'" placeholder="搜索标题/摘要/核心要点/标签/作者/关联股票"></div>'+
    '<div class="field"><select id="f_theme">'+['<option value="">全部主题</option>'].concat(themes.map(function(t){return '<option '+(f.theme===t?'selected':'')+'>'+esc(t)+'</option>';})).join('')+'</select></div>'+
    '<div class="field"><select id="f_type"><option value="">全部类型</option>'+KB_TYPES.map(function(t){return '<option '+(f.type===t?'selected':'')+'>'+t+'</option>';}).join('')+'</select></div></div>';
  h+='<div class="field-row" style="margin-bottom:10px"><div class="field"><select id="f_platform"><option value="">全部平台</option>'+KB_PLATFORMS.map(function(t){return '<option '+(f.platform===t?'selected':'')+'>'+t+'</option>';}).join('')+'</select></div>'+
    '<div class="field"><select id="f_status"><option value="">全部状态</option>'+['待整理','待读','已读','已归档'].map(function(t){return '<option '+(f.status===t?'selected':'')+'>'+t+'</option>';}).join('')+'</select></div>'+
    '<div class="field"><select id="f_practice"><option value="">是否待实践</option><option value="yes" '+(f.practice==='yes'?'selected':'')+'>值得实践</option><option value="no" '+(f.practice==='no'?'selected':'')+'>非实践</option></select></div>'+
    '<div class="field"><select id="f_arch"><option value="">归档不限</option><option value="no" '+(f.archived==='no'?'selected':'')+'>未归档</option><option value="yes" '+(f.archived==='yes'?'selected':'')+'>已归档</option></select></div></div>';
  h+= list.length? ('<div class="grid">'+list.map(kbCard).join('')+'</div>') : emptyState('🔗','没有符合条件的内容','去收藏一条',null);
  h+='</div>';
  body.innerHTML=h; bindKbBody(body);
  const re=function(){ kbF={q:$('#f_q',body).value,theme:$('#f_theme',body).value,type:$('#f_type',body).value,platform:$('#f_platform',body).value,status:$('#f_status',body).value,practice:$('#f_practice',body).value,archived:$('#f_arch',body).value}; renderKb('collection'); };
  ['f_q','f_theme','f_type','f_platform','f_status','f_practice','f_arch'].forEach(function(id){ const el=$('#'+id,body); if(el) el.onchange=re; });
  const q=$('#f_q',body); if(q) q.onkeyup=function(){ kbF.q=q.value; renderKb('collection'); };
  const clr=$('#clrF',body); if(clr) clr.onclick=function(){ KB_THEME_FILTER=''; kbF={}; renderKb('collection'); };
}
/* ---------------- 主题分类 ---------------- */
function kbThemes(body){
  const all=COL.kb();
  const ts=COL.kbtopics();
  const countOf=function(name){ return all.filter(function(k){return (k.theme||'待分类')===name && !k.archived;}).length; };
  let h='<div class="panel"><div class="panel-head"><h2>🏷️ 主题分类</h2><button class="btn sm" id="addT">＋ 新建主题</button></div>';
  h+='<div class="grid cards-3">';
  ts.forEach(function(t){
    const cnt=countOf(t.name);
    const tags=(t.tags||[]).map(function(x){return '<span class="tag" style="border-color:var(--primary);color:var(--primary)">'+esc(x)+'</span>';}).join(' ');
    h+='<div class="card"><div class="flex between"><b>'+esc(t.name)+'</b><span class="badge gray">'+cnt+' 条</span></div>'+
      (t.desc?('<div class="muted-small" style="margin:4px 0">'+esc(t.desc)+'</div>'):'')+
      (tags?'<div class="flex flex-wrap" style="gap:6px;margin:6px 0">'+tags+'</div>':'')+
      '<div class="row-actions mt"><button class="mini-btn" data-theme="'+esc(t.name)+'">查看内容</button>'+
      '<button class="mini-btn" data-act="edt:'+t.id+'">编辑</button>'+
      '<button class="mini-btn danger" data-act="delt:'+t.id+'">删</button></div></div>';
  });
  h+='</div></div>';
  body.innerHTML=h; bindKbBody(body);
  $('#addT').onclick=function(){ openKbThemeForm(); };
  $$('[data-act^="edt:"]',body).forEach(function(b){ b.onclick=function(){ const id=b.getAttribute('data-act').slice(4); openKbThemeForm(COL.kbtopics().find(function(x){return x.id===id;})); }; });
  $$('[data-act^="delt:"]',body).forEach(function(b){ b.onclick=function(){ const id=b.getAttribute('data-act').slice(5); confirmDialog('删除主题','确认删除该主题？相关内容会变为「待分类」。','删除').then(function(y){ if(y){ const nm=(COL.kbtopics().find(function(x){return x.id===id;})||{}).name; let k=COL.kb(); k.forEach(function(x){ if(x.theme===nm) x.theme='待分类'; }); SAVE.kb(k); SAVE.kbtopics(COL.kbtopics().filter(function(x){return x.id!==id;})); toast('已删除'); renderKb('themes'); } }); }; });
}
/* ---------------- 待实践 ---------------- */
function kbPracticePage(body){
  const list=COL.kb().filter(function(k){return k.worthPractice==='yes' && !k.archived;});
  let h='<div class="banner" style="margin-bottom:10px"><span class="b-ico">🛠️</span><div>待实践 = 你标记为「值得实践」的内容。更新实践状态、记录结果与复盘，验证有效的方法沉淀为经验。</div></div>';
  if(!list.length){ h+=emptyState('🛠️','还没有值得实践的内容','去收藏并标记',null); body.innerHTML=h; return; }
  h+='<div class="grid">';
  list.forEach(function(k){
    h+='<div class="card mb" data-kb="'+k.id+'"><div class="flex between"><b>'+esc(k.title)+'</b><span class="badge '+(k.practiceStatus==='已验证有效'?'ok':k.practiceStatus==='已验证无效'?'gray':'warn')+'">'+esc(k.practiceStatus)+'</span></div>'+
      '<div class="muted-small" style="margin:4px 0">主题：'+(k.theme||'待分类')+(k.subTheme?(' / '+esc(k.subTheme)):'')+'</div>'+
      (k.nextAction?('<div class="muted-small"><b>实践目标：</b>'+esc(k.nextAction)+'</div>'):'')+
      (k.planDate?('<div class="muted-small"><b>计划日期：</b>'+esc(k.planDate)+'</div>'):'')+
      (k.neededMaterials?('<div class="muted-small"><b>所需材料：</b>'+esc(k.neededMaterials)+'</div>'):'')+
      (k.practiceResult?('<div class="muted-small"><b>实践结果：</b>'+esc(k.practiceResult)+'</div>'):'')+
      (k.reviewNote?('<div class="muted-small"><b>复盘/改进：</b>'+esc(k.reviewNote)+'</div>'):'')+
      '<div class="row-actions mt"><button class="mini-btn primary" data-act="prac:'+k.id+'">更新实践</button>'+
      '<button class="mini-btn" data-act="ok:'+k.id+'">验证有效</button>'+
      '<button class="mini-btn" data-act="no:'+k.id+'">验证无效</button>'+
      '<button class="mini-btn" data-act="task:'+k.id+'">转任务</button>'+
      '<button class="mini-btn danger" data-act="del:'+k.id+'">删</button></div></div>';
  });
  h+='</div>';
  body.innerHTML=h; bindKbBody(body);
  $$('[data-act^="ok:"]',body).forEach(function(b){ b.onclick=function(){ const k=COL.kb().find(function(x){return x.id===b.getAttribute('data-act').slice(3);}); if(k){ k.practiceStatus='已验证有效'; k.updatedAt=nowStr(); SAVE.kb(COL.kb()); toast('已验证有效'); renderKb('practice'); } }; });
  $$('[data-act^="no:"]',body).forEach(function(b){ b.onclick=function(){ const k=COL.kb().find(function(x){return x.id===b.getAttribute('data-act').slice(3);}); if(k){ k.practiceStatus='已验证无效'; k.updatedAt=nowStr(); SAVE.kb(COL.kb()); toast('已验证无效'); renderKb('practice'); } }; });
}
/* ---------------- 精选内容 ---------------- */
function kbFeatured(body){
  const list=COL.kb().filter(function(k){ return !k.archived && (k.myRating>=4 || k.practiceStatus==='已验证有效'); });
  let h='<div class="banner" style="margin-bottom:10px"><span class="b-ico">⭐</span><div>精选 = 我的评分 ≥ 4★，或已验证有效的实践内容。这里是你沉淀下来的高质量资料库。</div></div>';
  if(!list.length){ h+=emptyState('⭐','还没有精选内容','去收藏并评分',null); body.innerHTML=h; return; }
  h+='<div class="grid">'+list.map(kbCard).join('')+'</div>';
  body.innerHTML=h; bindKbBody(body);
}
/* ---------------- 归档 ---------------- */
function kbArchive(body){
  const list=COL.kb().filter(function(k){return k.archived;});
  let h='<div class="panel"><div class="panel-head"><h2>🗄️ 归档内容</h2><span class="badge gray">'+list.length+' 条</span></div>';
  h+= list.length? ('<div class="grid">'+list.map(kbCard).join('')+'</div>') : emptyState('🗄️','暂无归档内容','',null);
  h+='</div>';
  body.innerHTML=h; bindKbBody(body);
}
/* ---------------- 详情（4 区） ---------------- */
function openKbDetail(id){
  const k=COL.kb().find(function(x){return x.id===id;}); if(!k) return;
  const relBooks=(k.relatedBooks||[]).map(function(i){const b=COL.books().find(function(x){return x.id===i;});return b?b.title:null;}).filter(Boolean);
  const relNotes=(k.relatedNotes||[]).map(function(i){const n=COL.booknotes().find(function(x){return x.id===i;});return n?(n.title||'(无标题)'):null;}).filter(Boolean);
  const relTasks=(k.relatedTasks||[]).map(function(i){const t=COL.tasks().find(function(x){return x.id===i;});return t?t.title:null;}).filter(Boolean);
  const row=function(label,val){ if(!val) return ''; return kvRaw(label,val); };
  let h='<div class="modal-head"><h3>'+esc(k.title)+'</h3><button class="x-close" data-x>×</button></div><div class="modal-body kb-detail">';
  h+='<div class="kb-region"><h4>① 原始内容</h4>';
  h+=row('来源平台',k.platform); h+=row('作者/账号',k.author); h+=row('发布时间',k.publishedAt); h+=row('来源域名',k.domain); h+=row('内容类型',k.type);
  if(k.url) h+='<div class="kv"><span class="k">原始链接</span><span class="v"><a class="link" href="'+esc(k.url)+'" target="_blank" rel="noopener" data-ext="'+esc(k.domain||'未知')+'">'+esc(k.url)+'</a></span></div>';
  if(k.linkBroken) h+='<div class="kv"><span class="k">链接状态</span><span class="v"><span class="badge gray">⚠️ 标记失效</span></span></div>';
  h+=row('原文摘要',k.origSummary);
  h+='</div>';
  h+='<div class="kb-region"><h4>② 我的整理</h4>';
  h+=row('一句话总结',k.mySummary); h+=row('为什么收藏',k.whySave); h+=row('核心要点',k.keyPoints); h+=row('关键步骤',k.steps);
  h+=row('可复用方法',k.methods); h+=row('适用场景',k.scenarios); h+=row('注意事项',k.cautions);
  h+=row('我的评分',k.myRating?k.myRating+'★':''); h+=row('是否值得实践',k.worthPractice==='yes'?'值得':k.worthPractice==='no'?'不值得':'未定');
  h+=row('主题',(k.theme||'')+(k.subTheme?(' / '+k.subTheme):''));
  h+='<div class="kv"><span class="k">标签</span><span class="v">'+tagsHtml(k.tags)+'</span></div>';
  h+='</div>';
  h+='<div class="kb-region"><h4>③ 实践计划</h4>';
  h+=row('实践状态',k.practiceStatus); h+=row('下一步行动',k.nextAction); h+=row('计划日期',k.planDate); h+=row('所需材料',k.neededMaterials);
  h+=row('实践结果',k.practiceResult); h+=row('复盘记录',k.reviewNote);
  h+=row('复用次数',(k.reuseCount||0)+(k.lastReuse?('（最近 '+k.lastReuse+'）'):''));
  h+='</div>';
  h+='<div class="kb-region"><h4>④ 关联内容</h4>';
  h+=row('关联书籍',relBooks.join('、')); h+=row('关联读书笔记',relNotes.join('、'));
  h+=row('关联股票',(k.relatedStocks||[]).map(stockName).join('、')); h+=row('关联行业',(k.relatedIndustries||[]).join('、'));
  h+=row('关联任务',relTasks.join('、')); h+=row('关联项目',(k.relatedProjects||[]).join('、'));
  h+='</div>';
  h+='<div class="row-actions mt"><button class="btn sm" id="dEdit">编辑</button><button class="btn sm" id="dNote">转笔记</button><button class="btn sm" id="dTask">转任务</button><button class="btn sm" id="dReuse">记录复用 +1</button><button class="btn sm" id="dBroken">'+(k.linkBroken?'取消失效标记':'标记链接失效')+'</button></div>';
  h+='</div>';
  openModal(h,{wide:true});
  $$('[data-x]',modalEl).forEach(b=>b.onclick=closeModal);
  $('#dEdit').onclick=function(){ closeModal(); openKbForm(id); };
  $('#dNote').onclick=function(){ closeModal(); openNoteForm({title:k.title,content:k.mySummary||k.origSummary,link:{type:'kb',id:id,title:k.title}}); };
  $('#dTask').onclick=function(){ closeModal(); openTaskForm({title:k.title,link:{type:'kb',id:id,title:k.title}}); };
  $('#dReuse').onclick=function(){ k.reuseCount=(k.reuseCount||0)+1; k.lastReuse=nowStr(); k.updatedAt=nowStr(); SAVE.kb(COL.kb()); closeModal(); openKbDetail(id); toast('已记录复用'); };
  $('#dBroken').onclick=function(){ k.linkBroken=!k.linkBroken; k.updatedAt=nowStr(); SAVE.kb(COL.kb()); closeModal(); openKbDetail(id); toast(k.linkBroken?'已标记链接失效':'已取消失效标记'); };
}
/* ---------------- 表单（全字段） ---------------- */
function openKbForm(id,preset){
  preset=preset||{};
  const editing = id && typeof id==='string' && COL.kb().find(function(x){return x.id===id;});
  const k = editing || null;
  const base=(k||preset);
  openModal('<div class="modal-head"><h3>'+(k?'编辑收藏':'新建收藏')+'</h3><button class="x-close" data-x>×</button></div>'+
    '<div class="modal-body">'+
    '<div class="field-row"><div class="field" style="flex:2"><label>标题 *</label><input id="f_title" value="'+esc(k?k.title:(base.title||''))+'"></div>'+
    '<div class="field"><label>来源平台</label><select id="f_platform">'+KB_PLATFORMS.map(function(p){return '<option '+(k&&k.platform===p?'selected':'')+'>'+p+'</option>';}).join('')+'</select></div></div>'+
    '<div class="field"><label>原始链接 URL</label><input id="f_url" value="'+esc(k?k.url:(base.url||''))+'"></div>'+
    '<div class="field-row"><div class="field"><label>作者 / 账号</label><input id="f_author" value="'+esc(k?k.author:(base.author||''))+'"></div>'+
    '<div class="field"><label>发布时间</label><input type="date" id="f_pub" value="'+esc(k?k.publishedAt:'')+'"></div>'+
    '<div class="field"><label>来源域名（自动提取，可改）</label><input id="f_domain" value="'+esc(k?k.domain:'')+'"></div></div>'+
    '<div class="field-row"><div class="field"><label>内容类型</label><select id="f_type"><option value="">—</option>'+KB_TYPES.map(function(t){return '<option '+(k&&k.type===t?'selected':'')+'>'+t+'</option>';}).join('')+'</select></div>'+
    '<div class="field"><label>封面 URL</label><input id="f_cover" value="'+esc(k?k.cover:'')+'"></div>'+
    '<div class="field"><label>上传封面/截图</label><input id="f_img" type="file" accept="image/*"></div></div>'+
    '<div class="field"><label>原文摘要（外部页面无法读取时请手动补充，不自动编造）</label><textarea id="f_osum">'+esc(k?k.origSummary:'')+'</textarea></div>'+
    '<div class="field" style="border-top:1px dashed var(--line);padding-top:10px"><label style="font-weight:700">我的整理</label></div>'+
    '<div class="field"><label>一句话总结（我的摘要）</label><textarea id="f_msum">'+esc(k?k.mySummary:'')+'</textarea></div>'+
    '<div class="field"><label>为什么收藏</label><textarea id="f_why">'+esc(k?k.whySave:'')+'</textarea></div>'+
    '<div class="field"><label>核心要点</label><textarea id="f_kp">'+esc(k?k.keyPoints:'')+'</textarea></div>'+
    '<div class="field"><label>关键步骤</label><textarea id="f_steps">'+esc(k?k.steps:'')+'</textarea></div>'+
    '<div class="field"><label>可复用方法</label><textarea id="f_methods">'+esc(k?k.methods:'')+'</textarea></div>'+
    '<div class="field"><label>适用场景</label><textarea id="f_scen">'+esc(k?k.scenarios:'')+'</textarea></div>'+
    '<div class="field"><label>注意事项</label><textarea id="f_caut">'+esc(k?k.cautions:'')+'</textarea></div>'+
    '<div class="field-row"><div class="field"><label>我的评分(1-5)</label><input id="f_rate" value="'+esc(k?k.myRating:'')+'" placeholder="如 5"></div>'+
    '<div class="field"><label>是否值得实践</label><select id="f_wp">'+['unknown','yes','no'].map(function(v){return '<option value="'+v+'" '+((k?k.worthPractice:'unknown')===v?'selected':'')+'>'+(v==='unknown'?'未定':v==='yes'?'值得':'不值得')+'</option>';}).join('')+'</select></div></div>'+
    '<div class="field" style="border-top:1px dashed var(--line);padding-top:10px"><label style="font-weight:700">分类信息</label></div>'+
    '<div class="field-row"><div class="field"><label>主主题</label><select id="f_theme">'+kbThemeOptions(k?k.theme:'')+'</select></div>'+
    '<div class="field"><label>子主题</label><input id="f_sub" value="'+esc(k?k.subTheme:'')+'"></div></div>'+
    '<div class="field"><label>标签</label><div id="tagBox" class="flex flex-wrap" style="gap:6px;border:1px solid var(--line-strong);border-radius:9px;padding:8px;min-height:38px"></div></div>'+
    kbRelHtml(k)+
    '<div class="field" style="border-top:1px dashed var(--line);padding-top:10px"><label style="font-weight:700">行动信息</label></div>'+
    '<div class="field-row"><div class="field"><label>内容状态</label><select id="f_status">'+KB_STATUS.map(function(s){return '<option '+(k&&k.status===s?'selected':'')+'>'+s+'</option>';}).join('')+'</select></div>'+
    '<div class="field"><label>实践状态</label><select id="f_pstatus">'+KB_PRACTICE.map(function(s){return '<option '+(k&&k.practiceStatus===s?'selected':'')+'>'+s+'</option>';}).join('')+'</select></div></div>'+
    '<div class="field"><label>下一步行动 / 实践目标</label><textarea id="f_next">'+esc(k?k.nextAction:'')+'</textarea></div>'+
    '<div class="field-row"><div class="field"><label>计划实践日期</label><input type="date" id="f_pdate" value="'+esc(k?k.planDate:'')+'"></div>'+
    '<div class="field"><label>所需材料</label><input id="f_mat" value="'+esc(k?k.neededMaterials:'')+'"></div></div>'+
    '<div class="field"><label>实践结果</label><textarea id="f_pres">'+esc(k?k.practiceResult:'')+'</textarea></div>'+
    '<div class="field"><label>复盘记录 / 下一步改进</label><textarea id="f_prev">'+esc(k?k.reviewNote:'')+'</textarea></div>'+
    '<div class="field"><label><input type="checkbox" id="f_arch"'+(k&&k.archived?' checked':'')+'> 已归档</label></div>'+
    '</div><div class="modal-foot"><button class="btn" data-x>取消</button><button class="btn primary" id="saveK">保存</button></div>');
  $$('[data-x]',modalEl).forEach(b=>b.onclick=closeModal);
  const sel=k?k.tags.slice():[]; renderTagsInput(sel,$('#tagBox'));
  let covFile=null;
  const img=$('#f_img'); if(img) img.addEventListener('change',function(){ const f=img.files&&img.files[0]; if(!f) return; const r=new FileReader(); r.onload=function(){ covFile=r.result; }; r.readAsDataURL(f); });
  $('#f_url').addEventListener('blur',function(){ const u=$('#f_url').value.trim(); if(u&&!$('#f_domain').value){ try{ $('#f_domain').value=new URL(u).hostname; }catch(e){} } });
  $('#saveK').onclick=function(){
    const title=$('#f_title').value.trim(); if(!title){ toast('请填写标题'); return; }
    const url=$('#f_url').value.trim(); let domain=$('#f_domain').value.trim();
    if(url){ try{ domain=domain||new URL(url).hostname; }catch(e){} }
    const doSave=function(){
      const cover=covFile||$('#f_cover').value.trim()||(k?k.cover:'');
      const obj={ title:title, platform:$('#f_platform').value, url:url, author:$('#f_author').value.trim(),
        publishedAt:$('#f_pub').value||'', domain:domain, type:$('#f_type').value, cover:cover, origSummary:$('#f_osum').value.trim(),
        mySummary:$('#f_msum').value.trim(), whySave:$('#f_why').value.trim(), keyPoints:$('#f_kp').value.trim(), steps:$('#f_steps').value.trim(),
        methods:$('#f_methods').value.trim(), scenarios:$('#f_scen').value.trim(), cautions:$('#f_caut').value.trim(),
        myRating:$('#f_rate').value.trim(), worthPractice:$('#f_wp').value, theme:$('#f_theme').value, subTheme:$('#f_sub').value.trim(),
        tags:sel.slice(), nextAction:$('#f_next').value.trim(), planDate:$('#f_pdate').value||'', neededMaterials:$('#f_mat').value.trim(),
        practiceResult:$('#f_pres').value.trim(), reviewNote:$('#f_prev').value.trim(), practiceStatus:$('#f_pstatus').value,
        status:$('#f_status').value, archived:$('#f_arch').checked, updatedAt:nowStr(), linkBroken:k?k.linkBroken:false };
      const rel=readKbRel(); obj.relatedBooks=rel.books; obj.relatedStocks=rel.stocks; obj.relatedIndustries=rel.industries;
      obj.relatedTasks=rel.tasks; obj.relatedProjects=rel.projects; obj.relatedNotes=rel.notes;
      if(k){ obj.id=k.id; obj.reuseCount=k.reuseCount||0; obj.lastReuse=k.lastReuse||null; obj.createdAt=k.createdAt; obj.sample=k.sample||false; let a=COL.kb(); a=a.map(function(x){return x.id===k.id?obj:x;}); SAVE.kb(a); }
      else { obj.id=uid('kb'); obj.reuseCount=0; obj.lastReuse=null; obj.createdAt=Date.now(); obj.sample=false; let a=COL.kb(); a.push(obj); SAVE.kb(a); }
      logActivity(k?'编辑收藏':'新建收藏','kb',title); closeModal(); renderKb(parseHash().sub||'home'); toast('已保存');
    };
    // 重复链接检测
    const dup=COL.kb().filter(function(x){return x.id!==(k&&k.id) && url && x.url===url;});
    if(dup.length){ confirmDialog('重复链接','检测到相同链接已存在（'+esc(dup[0].title)+'），仍要保存？','仍要保存').then(function(y){ if(y) doSave(); }); }
    else { doSave(); }
  };
}
function openKbPracticeForm(id){
  const k=COL.kb().find(function(x){return x.id===id;}); if(!k) return;
  let html='<div class="modal-head"><h3>实践计划：'+esc(k.title)+'</h3><button class="x-close" data-x>×</button></div><div class="modal-body">';
  html+='<div class="field"><label>是否值得实践</label><select id="pf_wp">'+['unknown','yes','no'].map(function(v){return '<option value="'+v+'" '+((k.worthPractice||'unknown')===v?'selected':'')+'>'+(v==='unknown'?'未定':v==='yes'?'值得':'不值得')+'</option>';}).join('')+'</select></div>';
  html+='<div class="field"><label>实践状态</label><select id="pf_status">'+KB_PRACTICE.map(function(s){return '<option '+(k.practiceStatus===s?'selected':'')+'>'+s+'</option>';}).join('')+'</select></div>';
  html+='<div class="field"><label>下一步行动 / 实践目标</label><textarea id="pf_next">'+esc(k.nextAction||'')+'</textarea></div>';
  html+='<div class="field-row"><div class="field"><label>计划日期</label><input type="date" id="pf_date" value="'+esc(k.planDate||'')+'"></div><div class="field"><label>所需材料</label><input id="pf_mat" value="'+esc(k.neededMaterials||'')+'"></div></div>';
  html+='<div class="field"><label>实践结果</label><textarea id="pf_res">'+esc(k.practiceResult||'')+'</textarea></div>';
  html+='<div class="field"><label>复盘记录 / 下一步改进</label><textarea id="pf_rev">'+esc(k.reviewNote||'')+'</textarea></div>';
  html+='</div><div class="modal-foot"><button class="btn" data-x>取消</button><button class="btn primary" id="pf_save">保存</button></div>';
  openModal(html,{wide:true});
  $$('[data-x]',modalEl).forEach(b=>b.onclick=closeModal);
  $('#pf_save').onclick=function(){
    k.worthPractice=$('#pf_wp').value; k.practiceStatus=$('#pf_status').value; k.nextAction=$('#pf_next').value.trim();
    k.planDate=$('#pf_date').value||''; k.neededMaterials=$('#pf_mat').value.trim(); k.practiceResult=$('#pf_res').value.trim(); k.reviewNote=$('#pf_rev').value.trim();
    k.updatedAt=nowStr(); SAVE.kb(COL.kb()); if(k.worthPractice==='yes'&&!k.status) k.status='待读';
    logActivity('更新实践','kb',k.title); closeModal(); renderKb(parseHash().sub); toast('已保存');
  };
}
function openKbThemeForm(preset){
  preset=preset||{};
  const editing = preset && preset.id ? COL.kbtopics().find(function(x){return x.id===preset.id;}) : null;
  openModal('<div class="modal-head"><h3>'+(editing?'编辑主题':'新建主题')+'</h3><button class="x-close" data-x>×</button></div>'+
    '<div class="modal-body"><div class="field"><label>主题名称</label><input id="f_name" value="'+esc(editing?editing.name:'')+'"></div>'+
    '<div class="field"><label>说明</label><textarea id="f_desc">'+esc(editing?editing.desc:'')+'</textarea></div>'+
    '<div class="field"><label>预设标签（逗号分隔，示例）</label><input id="f_tags" value="'+esc(editing?(editing.tags||[]).join(','):'')+'" placeholder="如 手机摄影,人像,构图"></div>'+
    '</div><div class="modal-foot"><button class="btn" data-x>取消</button><button class="btn primary" id="saveT">保存</button></div>');
  $$('[data-x]',modalEl).forEach(b=>b.onclick=closeModal);
  $('#saveT').onclick=function(){
    const name=$('#f_name').value.trim(); if(!name){ toast('请填写名称'); return; }
    const tags=$('#f_tags').value.split(',').map(function(s){return s.trim();}).filter(Boolean);
    if(editing){ editing.name=name; editing.desc=$('#f_desc').value.trim(); editing.tags=tags; SAVE.kbtopics(COL.kbtopics()); logActivity('编辑主题','kb',name); }
    else { let a=COL.kbtopics(); a.push({id:uid('kt'),name:name,desc:$('#f_desc').value.trim(),tags:tags,isDefault:false,createdAt:Date.now()}); SAVE.kbtopics(a); logActivity('新建主题','kb',name); }
    closeModal(); renderKb('themes'); toast('已保存');
  };
}
function ensureDefaultKbThemes(){
  const ts=COL.kbtopics(); const have=ts.map(function(t){return t.name;});
  DEFAULT_KB_THEMES.forEach(function(d){ if(have.indexOf(d.name)<0){ ts.push({id:uid('kt'),name:d.name,desc:d.desc,tags:d.tags,isDefault:true,createdAt:Date.now()}); } });
  SAVE.kbtopics(ts);
}
/* 股票持仓页弱关联：列出 relatedStocks 命中持仓代码的收藏内容（不改动股票核心逻辑） */
function relatedKbHtml(){
  const codes=COL.holdings().map(function(h){return h.code;}); if(!codes.length) return '';
  const items=COL.kb().filter(function(k){return k.relatedStocks && k.relatedStocks.some(function(s){return codes.indexOf(s)>=0;});});
  if(!items.length) return '';
  const list=items.slice(0,6).map(function(k){ return '<div class="kv"><span class="k"><b>'+esc(k.title)+'</b><br><span class="muted-small">'+(k.platform||'')+' · 主题：'+(k.theme||'待分类')+'</span></span><span class="v muted-small">'+k.relatedStocks.map(stockName).join('、')+'</span></div>'; }).join('');
  return '<div class="panel mt"><div class="panel-head"><h2>🔗 相关资料库内容</h2><span class="badge '+(items.some(function(k){return !k.archived;})?'':'gray')+'">'+items.length+' 条</span></div>'+list+'<div class="mt"><a class="link" href="#/kb/collection">查看全部收藏 →</a></div></div>';
}
/* 读书笔记页面：统计关联到某笔记的知识库内容数量 */
function kbCountForNote(noteId){ return COL.kb().filter(function(k){return k.relatedNotes && k.relatedNotes.indexOf(noteId)>=0;}).length; }
function cleanTagEverywhere(id){
  const fix=function(arr){ arr.forEach(function(x){ if(x.tags) x.tags=x.tags.filter(function(t){return t!==id;}); }); };
  let b=COL.books(); fix(b); SAVE.books(b);
  let n=COL.booknotes(); fix(n); SAVE.booknotes(n);
  let k=COL.kb(); fix(k); SAVE.kb(k);
  let r=COL.stockReviews(); fix(r); SAVE.stockReviews(r);
}

/* =========================================================================
   任务与提醒 / 日历
   ========================================================================= */
function renderTask(sub){
  sub=sub||'list'; const view=$('#view');
  view.innerHTML=pageHead('任务与提醒','任务 · 提醒 · 日历', `<button class="btn primary" id="taskAdd">＋ 新建</button>`,'✅')+subnav('task',sub);
  const body=document.createElement('div'); view.appendChild(body);
  ({list:taskList,reminder:taskReminder,calendar:taskCalendar})[sub](body);
  bindSubnav('task');
  $('#taskAdd').onclick=()=>{ if(sub==='list') openTaskForm(); else if(sub==='reminder') openReminderForm(); else toast('请在任务或提醒页新建'); };
}
function taskList(body){
  let t=COL.tasks().slice().sort((a,b)=>(a.done?1:0)-(b.done?1:0)|| (a.due||'9999').localeCompare(b.due||'9999'));
  body.innerHTML=`<div class="panel"><div class="panel-head"><h2>✅ 任务列表</h2><span class="badge gray">${t.filter(x=>!x.done).length} 进行中</span></div>
    ${ t.length? t.map(x=>`
      <div class="kv" style="align-items:flex-start">
        <span class="flex" style="gap:10px;flex:1">
          <input type="checkbox" ${x.done?'checked':''} data-chk="${x.id}" style="margin-top:5px;width:16px;height:16px">
          <span style="${x.done?'text-decoration:line-through;color:#9ca3af':''}"><b>${esc(x.title)}</b>${x.priority==='高'?' <span class="badge risk">高优先</span>':''}${x.due?` <span class="muted-small">· ${esc(x.due)}</span>`:''}${x.link?`<div class="muted-small" style="margin-top:2px">关联：${esc(x.link.title)}</div>`:''}</span>
        </span>
        <span class="row-actions"><button class="mini-btn danger" data-del="${x.id}">删</button></span>
      </div>`).join('') : emptyState('✅','还没有任务','新建任务',null) }
  </div>`;
  $$('[data-chk]',body).forEach(c=>c.onchange=()=>{ let a=COL.tasks(); const x=a.find(z=>z.id===c.getAttribute('data-chk')); if(x){ x.done=c.checked; SAVE.tasks(a); if(c.checked) logActivity('完成任务','task',x.title); renderTask('list'); renderRightbar(); } });
  $$('[data-del]',body).forEach(b2=>b2.onclick=async()=>{ if(await confirmDialog('删除任务','确认删除？','删除')){ let a=COL.tasks(); SAVE.tasks(a.filter(x=>x.id!==b2.getAttribute('data-del'))); renderTask('list'); renderRightbar(); } });
}
function taskReminder(body){
  let r=COL.reminders().slice().sort((a,b)=>(a.done?1:0)-(b.done?1:0));
  body.innerHTML=`<div class="panel"><div class="panel-head"><h2>⏰ 提醒</h2><button class="btn sm" id="addR">＋ 提醒</button></div>
    ${ r.length? r.map(x=>`
      <div class="kv" style="align-items:flex-start">
        <span class="flex" style="gap:10px;flex:1"><input type="checkbox" ${x.done?'checked':''} data-chk="${x.id}" style="margin-top:5px;width:16px;height:16px"><span style="${x.done?'text-decoration:line-through;color:#9ca3af':''}"><b>${esc(x.title)}</b>${x.time?` <span class="muted-small">· ${esc(x.time)}</span>`:''}</span></span>
        <span class="row-actions"><button class="mini-btn danger" data-del="${x.id}">删</button></span>
      </div>`).join('') : emptyState('⏰','还没有提醒','添加提醒',null) }
  </div>`;
  $('#addR').onclick=openReminderForm;
  $$('[data-chk]',body).forEach(c=>c.onchange=()=>{ let a=COL.reminders(); const x=a.find(z=>z.id===c.getAttribute('data-chk')); if(x){ x.done=c.checked; SAVE.reminders(a); renderTask('reminder'); renderRightbar(); } });
  $$('[data-del]',body).forEach(b2=>b2.onclick=async()=>{ if(await confirmDialog('删除','确认删除？','删除')){ let a=COL.reminders(); SAVE.reminders(a.filter(x=>x.id!==b2.getAttribute('data-del'))); renderTask('reminder'); renderRightbar(); } });
}
let calendarYM=null;
function taskCalendar(body){
  const now=new Date(); const cur=calendarYM||{y:now.getFullYear(), m:now.getMonth()};
  const y=cur.y, m=cur.m;
  const first=new Date(y,m,1); const startDow=(first.getDay()+6)%7; const days=new Date(y,m+1,0).getDate();
  const tasks=COL.tasks(), rem=COL.reminders();
  const qte=t=>esc(t).replace(/'/g,'&#39;');
  const cellFor=(d,out)=>{ const ds=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const tk=tasks.filter(t=>t.due===ds), rk=rem.filter(r=>r.time&&r.time.startsWith(ds));
    const isToday=ds===todayStr();
    const chips=[
      ...tk.map(t=>`<div class="cal-chip task-chip${t.done?' done':''}" data-task="${t.id}" title="${qte(t.title)}">${esc(t.title)}</div>`),
      ...rk.map(r=>`<div class="cal-chip rem-chip${r.done?' done':''}" data-rem="${r.id}" title="${qte(r.title)}">${esc(r.title)}</div>`)
    ].join('');
    return `<div class="cal-cell ${out?'out':''} ${isToday?'today':''}" data-date="${ds}" style="cursor:pointer">
      <div class="cal-cell-top"><div class="d-num">${d}</div></div>
      <div class="cal-items">${chips}</div>
    </div>`;
  };
  let cells=''; for(let i=0;i<startDow;i++){ const pd=new Date(y,m,0).getDate()-startDow+1+i; cells+=cellFor(pd,true); }
  for(let d=1;d<=days;d++) cells+=cellFor(d,false);
  const tail=(7-(startDow+days)%7)%7; for(let i=1;i<=tail;i++) cells+=cellFor(i,true);
  body.innerHTML=`<div class="panel">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;flex-wrap:wrap;gap:8px">
      <h2 style="margin:0;font-size:18px">📅 ${y}年${m+1}月</h2>
      <div style="display:flex;gap:6px">
        <button class="btn" id="calPrev">‹ 上月</button>
        <button class="btn" id="calToday">今天</button>
        <button class="btn" id="calNext">下月 ›</button>
      </div>
    </div>
    <div class="muted-small mb">蓝色=任务，橙色=提醒；点击日期可直接添加任务/提醒，点击条目可切换完成状态</div>
    <div class="cal-grid">${['一','二','三','四','五','六','日'].map(d=>`<div class="cal-dow">${d}</div>`).join('')}${cells}</div>
  </div>`;
  $('#calPrev',body).onclick=()=>{ calendarYM={y:m===0?y-1:y, m:m===0?11:m-1}; taskCalendar(body); };
  $('#calNext',body).onclick=()=>{ calendarYM={y:m===11?y+1:y, m:m===11?0:m+1}; taskCalendar(body); };
  $('#calToday',body).onclick=()=>{ calendarYM=null; taskCalendar(body); };
  $$('.cal-cell:not(.out)',body).forEach(cell=>cell.onclick=function(e){ if(e.target.closest('.cal-chip')) return; e.stopPropagation(); openDateAction(cell.getAttribute('data-date')); });
  $$('[data-task]',body).forEach(ch=>ch.onclick=function(e){ e.stopPropagation(); const ds=ch.closest('.cal-cell').getAttribute('data-date'); openDateAction(ds); });
  $$('[data-rem]',body).forEach(ch=>ch.onclick=function(e){ e.stopPropagation(); const ds=ch.closest('.cal-cell').getAttribute('data-date'); openDateAction(ds); });
}
function openDateAction(ds){
  const [yy,mm,dd]=ds.split('-');
  const tasks=COL.tasks().filter(t=>t.due===ds), rem=COL.reminders().filter(r=>r.time&&r.time.startsWith(ds));
  const itemRow=(type,obj)=>`<div class="cal-detail-row"><span class="cal-detail-ico">${type==='task'?'✅':'⏰'}</span>
    <span class="cal-detail-title${obj.done?' done':''}">${esc(obj.title)}</span>
    <span class="cal-detail-meta">${type==='rem'&&obj.time?obj.time.slice(11):(type==='task'&&obj.priority?obj.priority:'')}</span>
    <button class="mini-btn" data-edit="${type}:${obj.id}">✎</button>
    <button class="mini-btn" data-toggle="${type}:${obj.id}">${obj.done?'↺':'✓'}</button></div>`;
  const detailHtml=tasks.length||rem.length
    ? `<div class="cal-detail">${tasks.concat(rem).length?tasks.map(t=>itemRow('task',t)).join('')+rem.map(r=>itemRow('rem',r)).join(''):''}</div>`
    : `<p class="muted-small" style="text-align:center;margin:6px 0 0">当天暂无条目</p>`;
  openModal(`<div class="modal-head"><h3>${parseInt(mm,10)}月${parseInt(dd,10)}日</h3><button class="x-close" data-x>×</button></div>
    <div class="modal-body">
      <div class="cal-detail-head">当天条目（${tasks.length+rem.length}）</div>
      ${detailHtml}
      <div style="display:flex;gap:12px;justify-content:center;margin-top:18px">
        <button class="btn primary" id="addTask">✅ 新建任务</button>
        <button class="btn primary" id="addRem">⏰ 添加提醒</button>
      </div>
    </div>`);
  $$('[data-x]',modalEl).forEach(b=>b.onclick=closeModal);
  $('#addTask').onclick=function(){ closeModal(); openTaskForm({due:ds}); };
  $('#addRem').onclick=function(){ closeModal(); openReminderForm({time:ds+'T09:00'}); };
  $$('[data-toggle]',modalEl).forEach(b=>b.onclick=function(){
    const [type,id]=b.getAttribute('data-toggle').split(':');
    if(type==='task'){ let a=COL.tasks(); const x=a.find(t=>t.id===id); if(x){ x.done=!x.done; SAVE.tasks(a);} }
    else { let a=COL.reminders(); const x=a.find(r=>r.id===id); if(x){ x.done=!x.done; SAVE.reminders(a);} }
    openDateAction(ds); renderRightbar();
  });
  $$('[data-edit]',modalEl).forEach(b=>b.onclick=function(){
    const [type,id]=b.getAttribute('data-edit').split(':');
    closeModal();
    if(type==='task'){ const x=COL.tasks().find(t=>t.id===id); if(x) openTaskForm(x); }
    else { const x=COL.reminders().find(r=>r.id===id); if(x) openReminderForm(x); }
  });
}
function openTaskForm(preset){
  preset=preset||{};
  const editing=preset.id||null;
  openModal(`<div class="modal-head"><h3>${editing?'编辑任务':'新建任务'}</h3><button class="x-close" data-x>×</button></div>
    <div class="modal-body">
      <div class="field"><label>任务标题</label><input id="f_title" value="${esc(preset.title||'')}"></div>
      <div class="field"><label>备注</label><textarea id="f_note">${esc(preset.note||'')}</textarea></div>
      <div class="field-row"><div class="field"><label>优先级</label><select id="f_pri">${['普通','高','低'].map(p=>`<option ${p===preset.priority?'selected':''}>${p}</option>`).join('')}</select></div>
      <div class="field"><label>截止日期</label><input type="date" id="f_due" value="${esc(preset.due||'')}"></div></div>
      ${linkPickerField(preset.link,['book','kb','stock'])}
    </div>
    <div class="modal-foot"><button class="btn" data-x>取消</button><button class="btn primary" id="saveT">保存</button></div>`);
  $$('[data-x]',modalEl).forEach(b=>b.onclick=closeModal);
  $('#saveT').onclick=()=>{ const title=$('#f_title').value.trim(); if(!title){toast('请填写标题');return;} let a=COL.tasks();
    if(editing){ const x=a.find(t=>t.id===editing); if(x){ x.title=title; x.note=$('#f_note').value.trim(); x.priority=$('#f_pri').value; x.due=$('#f_due').value||null; x.link=readLinkPicker(); } logActivity('编辑任务','task',title); }
    else { a.push({id:uid('tk'),title,note:$('#f_note').value.trim(),priority:$('#f_pri').value,due:$('#f_due').value||null,link:readLinkPicker(),done:false}); logActivity('新建任务','task',title); }
    SAVE.tasks(a); closeModal(); if(parseHash().module==='task') renderTask(parseHash().sub||'list'); renderRightbar(); toast('已保存'); };
}
function openReminderForm(preset){
  preset=preset||{};
  const editing=preset.id||null;
  openModal(`<div class="modal-head"><h3>${editing?'编辑提醒':'添加提醒'}</h3><button class="x-close" data-x>×</button></div>
    <div class="modal-body"><div class="field"><label>提醒内容</label><input id="f_title" value="${esc(preset.title||'')}"></div><div class="field"><label>时间</label><input type="datetime-local" id="f_time" value="${esc(preset.time||'')}"></div></div>
    <div class="modal-foot"><button class="btn" data-x>取消</button><button class="btn primary" id="saveR">保存</button></div>`);
  $$('[data-x]',modalEl).forEach(b=>b.onclick=closeModal);
  $('#saveR').onclick=()=>{ const title=$('#f_title').value.trim(); if(!title){toast('请填写内容');return;} let a=COL.reminders();
    if(editing){ const x=a.find(r=>r.id===editing); if(x){ x.title=title; x.time=$('#f_time').value||''; } logActivity('编辑提醒','task',title); }
    else { a.push({id:uid('rm'),title,time:$('#f_time').value||'',done:false}); logActivity('添加提醒','task',title); }
    SAVE.reminders(a); closeModal(); if(parseHash().module==='task') renderTask('reminder'); renderRightbar(); toast('已保存'); };
}

/* =========================================================================
   全局搜索
   ========================================================================= */
function renderSearch(sub,params){
  const q=(params&&params.q)||(sub&&sub.q)||''; const view=$('#view');
  view.innerHTML=pageHead('全局搜索','跨模块检索：书籍 / 笔记 / 股票 / 收藏 / 任务','','🔍')
    +`<div class="panel"><div class="field" style="margin:0"><input id="searchInput" value="${esc(q)}" placeholder="输入关键词，回车搜索…" style="height:42px"></div></div>
    <div id="searchResults" style="margin-top:16px"></div>`;
  const run=qq=>{ const res=globalSearch(qq); const box=$('#searchResults');
    if(!qq){ box.innerHTML='<p class="muted-small">输入关键词开始搜索。</p>'; return; }
    if(!res.total){ box.innerHTML=emptyState('🔍','未找到与「'+esc(qq)+'」相关的内容','',null); return; }
    const sec=(title,arr,ico,go)=> arr.length?`<div class="search-section"><h3>${ico} ${title}（${arr.length}）</h3>${arr.map(it=>`<div class="search-result" data-go="${go(it)}"><div class="sr-ico">${ico}</div><div class="sr-main"><div class="sr-title">${hl(it.title,qq)}</div><div class="sr-sub">${hl(it.sub||'',qq)}</div></div></div>`).join('')}</div>`:'';
    box.innerHTML=
      sec('书籍',res.books,'📚',it=>'#/book/library')+
      sec('读书笔记',res.notes,'✏️',it=>'#/book/notes')+
      sec('股票持仓',res.stocks,'📈',it=>'#/stock/holdings')+
      sec('知识库收藏',res.kb,'🔗',it=>'#/kb/collection')+
      sec('任务',res.tasks,'✅',it=>'#/task/list');
    $$('[data-go]',box).forEach(el=>el.onclick=()=>location.hash=el.getAttribute('data-go'));
  };
  $('#searchInput').addEventListener('keydown',e=>{ if(e.key==='Enter'){ const v=e.target.value.trim(); location.hash='#/search?q='+encodeURIComponent(v); run(v); } });
  run(q);
}
function hl(text,q){ if(!text) return ''; const i=text.toLowerCase().indexOf(q.toLowerCase()); if(i<0) return esc(text); return esc(text.slice(0,i))+'<mark>'+esc(text.slice(i,i+q.length))+'</mark>'+esc(text.slice(i+q.length)); }
function globalSearch(q){
  q=q.toLowerCase(); const out={total:0,books:[],notes:[],stocks:[],kb:[],tasks:[]};
  COL.books().forEach(b=>{ const hay=(b.title+' '+(b.author||'')+' '+(b.publisher||'')+' '+(b.isbn||'')+' '+(b.category||'')+' '+(b.relatedStocks||[]).join(' ')+' '+tagsToNames(b.tags).join(' ')).toLowerCase(); if(hay.includes(q)) out.books.push({title:b.title,sub:(b.author||'')+' · '+b.status+' · '+b.currentPage+'/'+b.totalPages+'页'}); });
  COL.booknotes().forEach(n=>{ const b=n.bookId?COL.books().find(x=>x.id===n.bookId):null; const hay=(n.title+' '+(n.content||'')+' '+(n.quote||'')+' '+(n.keyPoint||'')+' '+(n.inspiration||'')+' '+(n.relatedStocks||[]).join(' ')+' '+(n.relatedTopics||[]).join(' ')+' '+tagsToNames(n.tags).join(' ')).toLowerCase(); if(hay.includes(q)){ out.notes.push({title:n.title||'(无标题)',sub:(b?b.title+' · ':'')+(n.type||'')+(n.content?': '+n.content.slice(0,40):'')}); } });
  COL.holdings().forEach(h=>{ if((h.name+' '+h.code).toLowerCase().includes(q)) out.stocks.push({title:h.name,sub:h.code+' · 持仓 '+h.shares+' 股'}); });
  COL.kb().forEach(k=>{ const hay=(k.title+' '+(k.origSummary||'')+' '+(k.mySummary||'')+' '+(k.keyPoints||'')+' '+(k.whySave||'')+' '+(k.author||'')+' '+(k.domain||'')+' '+tagsToNames(k.tags).join(' ')+' '+(k.relatedStocks||[]).join(' ')+(k.relatedBooks||[]).concat((k.relatedNotes||[])).join(' ')).toLowerCase(); if(hay.includes(q)) out.kb.push({title:k.title,sub:(k.domain||'')+(k.theme?(' · '+k.theme):'')+(k.mySummary?': '+k.mySummary.slice(0,40):'')}); });
  COL.tasks().forEach(t=>{ if((t.title+' '+(t.note||'')).toLowerCase().includes(q)) out.tasks.push({title:t.title,sub:(t.done?'已完成 · ':'')+(t.priority||'')+(t.due?' · '+t.due:'')}); });
  out.total=out.books.length+out.notes.length+out.stocks.length+out.kb.length+out.tasks.length;
  return out;
}

/* =========================================================================
   设置
   ========================================================================= */
function renderSettings(sub){
  sub=sub||'general'; const view=$('#view');
  view.innerHTML=pageHead('设置','通用 · 标签 · 数据 · 关于','','⚙️')+subnav('settings',sub);
  const body=document.createElement('div'); view.appendChild(body);
  ({general:setGeneral,tags:setTags,data:setData,about:setAbout})[sub](body);
  bindSubnav('settings');
}
function setGeneral(body){
  const s=getSettings();
  const themes=[
    {key:'fresh',label:'🌿 清新绿',desc:'柔和护眼，自然绿意'},
    {key:'classic',label:'🔷 原版蓝',desc:'经典白底，蓝色高亮'},
    {key:'tech',label:'🌃 科技感',desc:'深色背景，霓虹蓝调'}
  ];
  body.innerHTML=`<div class="panel"><h2>⚙️ 通用设置</h2>
    <div class="field"><label>用户名 / 称呼</label><input id="f_name" value="${esc(s.name||'')}"></div>
    <div class="field-row"><div class="field"><label>股票浮亏风险阈值（%）</label><input id="f_risk" type="number" step="1" value="${s.marketRiskPct!=null?s.marketRiskPct:-8}"></div>
    <div class="field"><label>笔记复习间隔（天）</label><input id="f_rev" type="number" value="${s.reviewIntervalDays||7}"></div></div>
    <label class="flex" style="gap:8px;font-size:13px"><input type="checkbox" id="f_dis" ${s.disclaimer?'checked':''}> 首页/关键页面显示投资免责声明</label>
    <div class="mt"><button class="btn primary" id="saveS">保存设置</button></div>
  </div>
  <div class="panel mt"><h2>🎨 主题配色</h2>
    <div class="theme-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
      ${themes.map(t=>`<div class="theme-card ${s.theme===t.key?'active':''}" data-theme="${t.key}" style="border:1px solid var(--line);border-radius:12px;padding:14px;cursor:pointer;background:var(--card);transition:border-color .15s,box-shadow .15s">
        <div style="font-size:20px;margin-bottom:6px">${t.label.split(' ')[0]}</div>
        <div style="font-weight:700;font-size:13px;color:var(--text)">${t.label.split(' ')[1]}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:3px">${t.desc}</div>
      </div>`).join('')}
    </div>
  </div>
  <div class="panel mt"><h2>📊 数据概览</h2>
    <div class="kv"><span class="k">持仓</span><span class="v">${COL.holdings().length}</span></div>
    <div class="kv"><span class="k">书籍</span><span class="v">${COL.books().length}</span></div>
    <div class="kv"><span class="k">读书笔记</span><span class="v">${COL.booknotes().length}</span></div>
    <div class="kv"><span class="k">知识库收藏</span><span class="v">${COL.kb().length}</span></div>
    <div class="kv"><span class="k">任务</span><span class="v">${COL.tasks().length}</span></div>
    <div class="kv"><span class="k">提醒</span><span class="v">${COL.reminders().length}</span></div>
  </div>`;
  $('#saveS').onclick=()=>{ const ns=getSettings(); ns.name=$('#f_name').value.trim()||'Eric'; ns.marketRiskPct=parseFloat($('#f_risk').value)||-8; ns.reviewIntervalDays=parseInt($('#f_rev').value)||7; ns.disclaimer=$('#f_dis').checked; SAVE.settings(ns); toast('已保存'); };
  $$('.theme-card',body).forEach(c=>c.onclick=()=>{
    const key=c.getAttribute('data-theme');
    const ns=getSettings(); ns.theme=key; SAVE.settings(ns);
    applyTheme(key);
    $$('.theme-card',body).forEach(x=>x.classList.toggle('active',x.getAttribute('data-theme')===key));
    toast('主题已切换');
  });
}
function setTags(body){
  const tags=COL.tags();
  body.innerHTML=`<div class="panel"><div class="panel-head"><h2>🏷️ 标签管理</h2><button class="btn sm" id="addTag">＋ 新建标签</button></div>
    <div class="flex flex-wrap" style="gap:8px">${tags.map(t=>`<span class="tag" style="border-color:${t.color};color:${t.color}">${esc(t.name)} <span class="x" data-del="${t.id}">×</span></span>`).join('')||'<span class="muted-small">暂无标签</span>'}</div>
    <p class="muted-small mt">提示：在任一内容的新建/编辑表单中输入新标签名并回车即可快速创建。</p>
  </div>`;
  $('#addTag').onclick=()=>{ const n=prompt('标签名称：'); if(n){ ensureTag(n); renderSettings('tags'); } };
  $$('[data-del]',body).forEach(b=>b.onclick=async()=>{ if(await confirmDialog('删除标签','确认删除？相关内容上的标记会移除。','删除')){ const id=b.getAttribute('data-del'); SAVE.tags(COL.tags().filter(t=>t.id!==id)); cleanTagEverywhere(id); renderSettings('tags'); } });
}
function setData(body){
  body.innerHTML=`<div class="panel"><h2>💾 数据备份与恢复</h2>
    <p class="muted-small mb">所有数据保存在本机浏览器（localStorage），不上传任何服务器。建议定期导出备份。</p>
    <div class="flex flex-wrap" style="gap:10px">
      <button class="btn primary" id="expAll">⬇️ 导出全部数据 (JSON)</button>
      <button class="btn" id="impBtn">⬆️ 导入 JSON 备份</button>
      <button class="btn" id="copyBtn">📋 复制全部数据</button>
    </div>
    <input type="file" id="impFile" accept="application/json" style="display:none">
  </div>
  <div class="panel mt"><h2>🗑️ 清空数据</h2>
    <p class="muted-small mb">清空将删除全部用户数据（含示例数据标记），操作需二次确认，且不可撤销。</p>
    <button class="btn danger" id="clearBtn">清空全部数据</button>
  </div>
  <div class="panel mt"><h2>🔄 旧版 Eric 复盘台数据</h2>
    <p class="muted-small mb">打开本工作台时已<b>自动同步</b>旧版 eric-review.html 的真实持仓成本/数量、盘前外盘与复盘记录（仅本机浏览器内处理，不上传）。以下按钮用于重新同步，或曾以 <code>file://</code> 单独打开旧版时手动补同步。</p>
    <div class="flex flex-wrap" style="gap:10px">
      <button class="btn" id="migEric">⬆️ 重新同步旧版真实数据</button>
      <button class="btn" id="impEric">📂 导入旧版备份文件 (JSON)</button>
    </div>
    <input type="file" id="impEricFile" accept="application/json" style="display:none">
    <p class="muted-small mt" id="migEricNote"></p>
  </div>
  <div class="panel mt"><h2>🕘 活动时间线</h2>
    <div class="tl">${COL.timeline().slice(0,30).map(t=>`<div class="tl-item"><div>${esc(t.action)} · <span class="muted-small">${MODULE_LABEL[t.module]||t.module}</span>${t.detail?` — ${esc(t.detail)}`:''}</div><div class="t-time">${new Date(t.ts).toLocaleString('zh-CN')}</div></div>`).join('')||'<p class="muted-small">暂无活动</p>'}</div>
  </div>`;
  $('#expAll').onclick=()=>exportData(null);
  $('#impBtn').onclick=()=>$('#impFile').click();
  $('#impFile').onchange=e=>{ const f=e.target.files[0]; if(!f) return; const rd=new FileReader(); rd.onload=()=>{ try{ const data=JSON.parse(rd.result); importData(data); }catch(err){ toast('导入失败：文件格式错误'); } }; rd.readAsText(f); };
  $('#copyBtn').onclick=()=>{ const all=exportDataObj(null); navigator.clipboard?.writeText(JSON.stringify(all)).then(()=>toast('已复制到剪贴板'),()=>toast('复制失败，请改用导出')); };
  $('#clearBtn').onclick=async()=>{ if(await confirmDialog('清空全部数据','此操作将永久删除所有用户数据，且无法恢复。确定继续？','确认清空')){ if(await confirmDialog('二次确认','请再次确认：真的要清空吗？','确认清空')){ ['settings','tags','tasks','reminders','attachments','recent','timeline','books','booknotes','booktopics','bookreviews','bookrecs','kb','kbtopics','kbpractice','stock_holdings','stock_pnl','stock_reviews','stock_ann','stock_sectors','stock_ipo','stock_quotes','seeded'].forEach(k=>store.del(k)); toast('已清空，刷新后重新初始化'); setTimeout(()=>location.reload(),800); } } };
  const migEricBtn=$('#migEric'); if(migEricBtn) migEricBtn.onclick=function(){ const eh=store.raw('wb_eric_holdings',null), epm=store.raw('wb_eric_premarket',null), erev=store.raw('wb_eric_reviews',null); if(!eh&&!epm&&!erev){ toast('未检测到旧版 eric-review.html 数据（同浏览器下应自动识别；file:// 打开请用「导入备份文件」）'); return; } const r=migrateEricData(); const note=$('#migEricNote'); if(note) note.textContent='已迁移：持仓 '+r.nHold+' 条 · 外盘 '+r.nPm+' · 复盘 '+r.nRev+' 条。'; };
  const impEricBtn=$('#impEric'); if(impEricBtn) impEricBtn.onclick=function(){ const f=$('#impEricFile'); if(f) f.click(); };
  const impEricFile=$('#impEricFile'); if(impEricFile) impEricFile.onchange=function(e){ const file=e.target.files[0]; if(!file) return; const rd=new FileReader(); rd.onload=function(){ try{ const data=JSON.parse(rd.result); importEricBackup(data); const note=$('#migEricNote'); if(note) note.textContent='已从备份文件导入并迁移完成。'; }catch(err){ toast('导入失败：文件格式错误'); } }; rd.readAsText(file); };
}
function exportDataObj(keys){ const all={}; const want=keys||['settings','tags','tasks','reminders','attachments','recent','timeline','books','booknotes','booktopics','bookreviews','bookrecs','kb','kbtopics','kbpractice','stock_holdings','stock_pnl','stock_reviews','stock_ann','stock_sectors','stock_ipo','stock_quotes'];
  want.forEach(k=>{ const v=store.raw(PREFIX+k,null); if(v!==null) all[k]=v; });
  all._meta={app:'个人研究与知识工作台',exportedAt:nowStr(),version:1}; return all;
}
function exportData(keys){ const all=exportDataObj(keys); const blob=new Blob([JSON.stringify(all,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='workbench-backup-'+todayStr()+'.json'; a.click(); URL.revokeObjectURL(a.href); toast('已导出'); }
function importData(data){ if(!data||typeof data!=='object'){ toast('导入失败：数据无效'); return; } Object.keys(data).forEach(k=>{ if(k==='_meta') return; store.rawSet(PREFIX+k,data[k]); }); logActivity('导入数据','settings','恢复备份'); toast('导入成功，正在刷新…'); setTimeout(()=>location.reload(),700); }
function setAbout(body){
  const s=getSettings();
  body.innerHTML=`<div class="panel"><h2>ℹ️ 关于</h2>
    <p>个人研究与知识工作台 · 离线版</p>
    <p class="muted-small mt">面向个人的综合工作台：股票复盘、读书笔记、个人知识库、任务提醒统一管理。数据 100% 保存在本地浏览器，不依赖网络与服务器。</p>
    ${s.disclaimer?`<div class="banner warn mt"><span class="b-ico">⚠️</span><div><b>免责声明：</b>本工作台提供的行情、诊断、板块等外部/参考数据如标注为「示例数据」，均为非实时模拟，仅供演示与学习，<b>不构成任何投资建议</b>，亦不自动执行任何交易。请勿据此进行真实投资决策。</div></div>`:''}
    <div class="kv mt"><span class="k">创建于</span><span class="v">${esc(s.createdAt||'—')}</span></div>
    <div class="kv"><span class="k">数据存储</span><span class="v">浏览器本地 (localStorage)</span></div>
  </div>`;
}

/* =========================================================================
   右侧提醒栏
   ========================================================================= */
function renderRightbar(){
  const bar=$('#rightbar'); if(!bar) return;
  const tasks=COL.tasks().filter(t=>!t.done && (!t.due||t.due<=todayStr()));
  const rem=COL.reminders().filter(r=>!r.done);
  const reviews=dueReviews();
  let html='<h4>⏰ 提醒与待办</h4>';
  if(tasks.length){
    html+=tasks.slice(0,5).map(function(t){
      const due=(t.due&&t.due!==todayStr())?esc(t.due):'今日';
      return '<div class="rem-item"><span class="rem-dot '+(t.priority==='高'?'urgent':'')+'"></span><div><div style="font-size:13px">'+esc(t.title)+'</div><div class="muted-small">'+due+' · '+esc(t.priority||'普通')+'</div></div></div>';
    }).join('');
  } else { html+='<p class="muted-small">暂无今日待办</p>'; }
  if(reviews.length){ html+='<div class="rem-item"><span class="rem-dot urgent"></span><div><div style="font-size:13px">'+reviews.length+' 条笔记待复习</div><a class="link muted-small" href="#/book/review">去复习 →</a></div></div>'; }
  if(rem.length){ html+=rem.slice(0,3).map(function(r){ return '<div class="rem-item"><span class="rem-dot"></span><div><div style="font-size:13px">'+esc(r.title)+'</div><div class="muted-small">'+esc(r.time||'')+'</div></div></div>'; }).join(''); }
  html+='<div class="divider"></div><h4>📌 快捷</h4><div class="flex flex-wrap" style="gap:6px"><button class="chip" data-go="#/task/list">＋任务</button><button class="chip" data-go="#/book/notes">✏️笔记</button><button class="chip" data-go="#/kb/collection">🔗收藏</button></div>';
  bar.innerHTML=html;
  $$('[data-go]',bar).forEach(el=>el.onclick=()=>location.hash=el.getAttribute('data-go'));
  const dot=$('#remDot'); const hasUrgent=tasks.some(t=>t.priority==='高')||reviews.length||rem.length; if(dot) dot.style.display=hasUrgent?'block':'none';
}

/* =========================================================================
   初始化
   ========================================================================= */
function ensureDefaultTopics(){
  const ts=COL.booktopics(); const have=ts.map(t=>t.name);
  DEFAULT_TOPICS.forEach(function(name){ if(have.indexOf(name)<0){ ts.push({id:uid('tp'),name:name,isDefault:true,createdAt:Date.now()}); } });
  SAVE.booktopics(ts);
}
/* 股票持仓页弱关联：列出 relatedStocks 命中持仓代码的读书笔记（不改动股票核心逻辑） */
function relatedBookNotesHtml(){
  const codes=COL.holdings().map(h=>h.code); if(!codes.length) return '';
  const notes=COL.booknotes().filter(n=>n.relatedStocks&&n.relatedStocks.some(s=>codes.indexOf(s)>=0));
  if(!notes.length) return '';
  const list=notes.slice(0,6).map(function(n){ const b=n.bookId?COL.books().find(function(z){return z.id===n.bookId;}):null; return '<div class="kv"><span class="k"><b>'+esc(n.title||'(无标题)')+'</b>'+(b?'<br><span class="muted-small">'+esc(b.title)+'</span>':'')+'</span><span class="v muted-small">'+n.relatedStocks.map(stockName).join('、')+'</span></div>'; }).join('');
  return '<div class="panel mt"><div class="panel-head"><h2>📚 相关读书笔记</h2><span class="badge '+(notes.some(function(n){return (n.noteStatus||'新建')!=='已归档';})?'':'gray')+'">'+notes.length+' 条</span></div>'+list+'<div class="mt"><a class="link" href="#/book/notes">查看全部读书笔记 →</a></div></div>';
}
function autoMigrateEric(){
  try{
    const eh=store.raw('wb_eric_holdings',null);
    const done=store.raw(PREFIX+'eric_migrated',false);
    if(eh&&eh.length&&!done){
      store.rawSet(PREFIX+'eric_migrated',true);
      migrateEricData();
    }
  }catch(e){}
}
async function maybeLoadCloudSnapshot(){
  try{
    const hasLocal=store.raw(PREFIX+'stock_holdings',null)||store.raw(PREFIX+'seeded',false)||store.raw(PREFIX+'eric_migrated',false);
    let overrideHoldings=false;
    if(hasLocal){
      // 本地已有数据：仅当持仓全部为示例（用户尚未录入真实持仓）时，才用公网真实快照覆盖持仓，避免覆盖用户已录入的真实数据
      const localHoldings=store.raw(PREFIX+'stock_holdings',null);
      const allSample=!!(localHoldings&&localHoldings.length&&localHoldings.every(function(h){ return h.sample; }));
      if(!allSample) return false;
      overrideHoldings=true;
    }
    const r=await fetch('./data-store.json?_='+Date.now());
    if(!r.ok) return false;
    const data=await r.json();
    if(data&&typeof data==='object'&&Object.keys(data).length){
      if(overrideHoldings){
        if(data.stock_holdings) store.rawSet(PREFIX+'stock_holdings',data.stock_holdings);
        toast('已从公网快照同步真实持仓，正在刷新…');
        setTimeout(function(){ location.reload(); },700);
        return true;
      }
      importData(data); return true;
    }
  }catch(e){}
  return false;
}
function fixSampleBookCovers(){
  const map={
    '投资中最简单的事':'https://img3.doubanio.com/view/subject/l/public/s27185773.jpg',
    '穷查理宝典':'https://img2.doubanio.com/view/subject/l/public/s24597511.jpg',
    '聪明的投资者':'https://img3.doubanio.com/view/subject/l/public/s6462582.jpg'
  };
  let changed=false;
  const books=COL.books().map(function(b){ if(b.sample && !b.cover && map[b.title]){ b.cover=map[b.title]; changed=true; } return b; });
  if(changed) SAVE.books(books);
  const recs=COL.bookrecs().map(function(r){ if(r.sample && !r.cover && map[r.title]){ r.cover=map[r.title]; changed=true; } return r; });
  if(changed) SAVE.bookrecs(recs);
}
async function init(){
  applyTheme();
  const snapped=await maybeLoadCloudSnapshot();
  if(snapped) return;
  seedSampleData();
  fixSampleBookCovers();
  ensureDefaultTopics();
  ensureDefaultKbThemes();
  // 载入隔夜外盘（若存在）供首页市场提醒参考
  try{ const pm=store.raw('wb_premarket',null); if(pm){ /* premarket available */ } }catch(e){}
  renderSidebar(); renderBottomNav(); bindTopbar();
  window.addEventListener('hashchange',router);
  if(!location.hash) location.hash='#/home';
  else router();
  autoMigrateEric();
}
init();
})();
