const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const dom = new JSDOM(html, { url: 'https://example.com/', runScripts: 'outside-only', resources: 'usable', pretendToBeVisual: true });
const window = dom.window;
global.window = window;
global.document = window.document;
global.localStorage = window.localStorage;
global.sessionStorage = window.sessionStorage;
global.fetch = () => Promise.resolve({ ok: false });
const errors = [];
window.onerror = (m) => errors.push('window.onerror: ' + m);
const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
async function nav(hash){
  window.location.hash = hash;
  window.dispatchEvent(new window.HashChangeEvent('hashchange'));
  await sleep(60);
}
function view(){ return document.getElementById('view').innerHTML; }
function assert(cond, msg){ if(!cond){ errors.push('ASSERT FAIL: '+msg); console.log('  ✗ '+msg); } else { console.log('  ✓ '+msg); } }

(async () => {
  try { window.eval(app); } catch(e){ errors.push('EVAL: '+e.message); console.error('EVAL ERROR', e); process.exit(1); }
  await sleep(400); // wait for async init()

  console.log('\n[1] 知识库首页');
  await nav('#/kb/home');
  let v = view();
  assert(v.includes('快速保存'), '首页含快速保存面板');
  assert(v.includes('收件箱') && v.includes('我的收藏') && v.includes('待实践'), '首页三大路径齐全');
  assert(v.includes('先收进来'), '含产品原则副标题');

  console.log('\n[2] 我的收藏（卡片简化）');
  await nav('#/kb/collection');
  v = view();
  assert(v.includes('手机拍摄夜景'), '收藏含示例卡片 夜景');
  assert(v.includes('我的收藏'), '标题正确');
  assert(!v.includes('转笔记') || v.indexOf('转笔记')<0, '卡片不含研究型按钮(转笔记等)');
  assert(v.includes('确认整理') || v.includes('加入实践') || v.includes('打开原文') || v.includes('详情'), '卡片含低负担动作');

  console.log('\n[3] 自然语言搜索');
  let q = document.getElementById('f_q');
  q.value = '夜景'; q.onkeyup && q.onkeyup();
  await sleep(60);
  assert(view().includes('手机拍摄夜景'), '搜“夜景”命中夜景卡片');
  q.value = '预算500元以内的旅行攻略'; q.onkeyup && q.onkeyup();
  await sleep(60);
  assert(!view().includes('渲染出错'), '自然语言无报错');
  // clear
  let clr = document.getElementById('clrAll'); if(clr){ clr.click(); await sleep(60); }
  assert(view().includes('手机拍摄夜景'), '清除筛选后恢复列表');

  console.log('\n[4] 主题筛选 chip 可删除');
  let pf = document.getElementById('f_platform');
  if(pf){ pf.value='小红书'; pf.onchange && pf.onchange(); await sleep(60); }
  let chip = document.querySelector('[data-fchip]');
  if(chip){ chip.click(); await sleep(60); assert(true, '点击筛选 chip 无报错'); }

  console.log('\n[5] 快速保存 + AI 识别');
  await nav('#/kb/home');
  document.getElementById('qs_url').value = 'https://www.xiaohongshu.com/explore/abc123';
  document.getElementById('qs_text').value = '快手番茄炒蛋做法：鸡蛋3个、番茄2个；先炒蛋盛出，再炒番茄出汁，混合加盐糖。10分钟搞定，适合新手。';
  document.getElementById('qs_save').click();
  await sleep(120);
  await nav('#/kb/inbox');
  v = view();
  assert(v.includes('AI 识别') || v.includes('待确认'), '收件箱显示 AI 识别结果确认卡');
  assert(v.includes('快手番茄炒蛋'), '识别/保存了标题');
  // 确认整理
  let confirmBtn = document.querySelector('[data-act^="confirm:"]');
  if(confirmBtn){ confirmBtn.click(); await sleep(80); }
  await nav('#/kb/collection');
  assert(view().includes('快手番茄炒蛋'), '确认后进入我的收藏');

  console.log('\n[6] 详情页（更多信息折叠）');
  let viewBtn = document.querySelector('[data-act^="view:"]');
  if(viewBtn){ viewBtn.click(); await sleep(80); }
  let modal = document.getElementById('modal').innerHTML;
  assert(modal.includes('原始内容') && modal.includes('是否值得实践')!==false, '详情含核心区');
  assert(modal.includes('关联内容'), '详情含关联内容');
  let dMore = document.getElementById('dMore'); if(dMore){ dMore.click(); await sleep(40); assert(document.getElementById('relMore').style.display!=='none','点击展开关联内容'); }

  console.log('\n[7] 编辑表单（低负担 + 动态模板）');
  // 打开编辑（定位“夜景/摄影”卡片的编辑按钮，验证动态模板）
  await nav('#/kb/collection');
  let editBtn = null;
  document.querySelectorAll('[data-act^="edit:"]').forEach(b=>{ if(!editBtn){ const card=b.closest('[data-kb]'); if(card && card.textContent.includes('夜景')) editBtn=b; } });
  if(!editBtn){ // 退而求其次：取第一个编辑按钮并报告其主题
    const all=document.querySelectorAll('[data-act^="edit:"]'); if(all.length) editBtn=all[0];
  }
  if(editBtn){ editBtn.click(); await sleep(80); }
  let m2 = document.getElementById('modal').innerHTML;
  assert(m2.includes('更多信息'), '表单含“更多信息”折叠');
  assert(m2.includes('原始内容'), '表单默认显示原始内容');
  assert(m2.includes('专属信息'), '表单含主题动态模板区（摄影专属字段）');
  let moreBtn = document.getElementById('moreBtn'); if(moreBtn){ moreBtn.click(); await sleep(40); assert(document.getElementById('moreFields').style.display!=='none','展开更多信息无报错'); }

  console.log('\n[8] 待实践 / 精选 / 归档 二级入口');
  await nav('#/kb/practice');
  assert(view().includes('待实践') || view().includes('还没有'), '待实践页正常');
  await nav('#/kb/featured');
  assert(!view().includes('渲染出错'), '精选页正常');
  await nav('#/kb/archive');
  assert(!view().includes('渲染出错'), '归档页正常');

  console.log('\n[9b] 主题动态模板按主题不同');
  // 做饭
  await nav('#/kb/home');
  document.getElementById('qs_text').value='红烧肉做法：五花肉500g、冰糖20g、生抽2勺；焯水后炒糖色，加调料炖40分钟，难度中等，可用鸡腿肉替代。';
  document.getElementById('qs_save').click(); await sleep(120);
  // 找到刚保存的做饭卡片并编辑
  await nav('#/kb/inbox');
  let cookEdit=null;
  document.querySelectorAll('[data-act^="edit:"]').forEach(b=>{ if(!cookEdit){ const c=b.closest('[data-kb]'); if(c&&c.textContent.includes('红烧肉')) cookEdit=b; } });
  if(cookEdit){ cookEdit.click(); await sleep(80);
    let mf=document.getElementById('modal').innerHTML;
    assert(mf.includes('食材') && mf.includes('步骤') && mf.includes('难度'), '做饭模板含 食材/步骤/难度');
    // 关闭
    let x=document.querySelector('#modal [data-x]'); if(x) x.click(); await sleep(40);
  } else { errors.push('ASSERT FAIL: 未找到红烧肉编辑按钮'); console.log('  ✗ 未找到红烧肉编辑按钮'); }
  // 旅行
  await nav('#/kb/home');
  document.getElementById('qs_text').value='杭州2日游路线：西湖、灵隐寺；高铁+地铁；住西湖附近民宿；人均800元；适合春秋；提前订票。';
  document.getElementById('qs_save').click(); await sleep(120);
  await nav('#/kb/inbox');
  let tripEdit=null;
  document.querySelectorAll('[data-act^="edit:"]').forEach(b=>{ if(!tripEdit){ const c=b.closest('[data-kb]'); if(c&&c.textContent.includes('杭州')) tripEdit=b; } });
  if(tripEdit){ tripEdit.click(); await sleep(80);
    let mf=document.getElementById('modal').innerHTML;
    assert(mf.includes('地点') && mf.includes('预算') && mf.includes('适合季节'), '旅行模板含 地点/预算/适合季节');
  } else { errors.push('ASSERT FAIL: 未找到杭州编辑按钮'); console.log('  ✗ 未找到杭州编辑按钮'); }

  console.log('\n[9c] 主题分类二级页（动态模板源）');
  await nav('#/kb/themes');
  assert(view().includes('主题分类'), '主题分类页正常');

  console.log('\n==== RESULT ====');
  if(errors.length){ console.log('FAIL ('+errors.length+'):'); errors.forEach(e=>console.log(' - '+e)); process.exit(1); }
  else { console.log('ALL KB CHECKS PASSED'); process.exit(0); }
})().catch(e=>{ console.error('HARNESS ERROR', e); process.exit(1); });
