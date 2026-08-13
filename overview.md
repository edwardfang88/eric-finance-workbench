# 第十二/十三轮：今日复盘增加「隔夜外盘 / 盘前热点」+ 热点板块接真实行情

## 问题
1. 用户反馈「市场情绪」涨跌家数失真（查到上涨 4128 / 下跌 1280，页面显示 2103 / 2897）。
2. 用户要求「今日复盘」在每天开盘前自动生成昨夜美股/外盘重要热点板块消息。
3. 用户同时希望热点追踪、行业板块等数据也是真实最新数据。

## 修复

### 市场情绪/涨跌家数改真实实时
- 新增 `API._jsonp`（JSONP 脚本注入）和 `API.breadth()`：东方财富 `push2.eastmoney.com/api/qt/clist/get`，覆盖沪深A股+北交所全量（≈5548只）。
- 东方财富单页上限 100 条，必须分页（≈55页）；实现每批并发 8 页、失败页自动重试、覆盖≥90% 才采用。
- 本地逐条统计上涨/下跌/平盘/涨停/跌停，缓存 60s（`wb_eric_breadth`），失败回退 `SEED_BREADTH`。
- `Dash.render` / `Sent.render` 改为读取 `getBreadth()`，并标注「实时/示例」。

### 热点/板块接真实行情
- 新增 `API.sectors()`：东方财富板块接口（`fs=m:90+t:2` 行业 + `m:90+t:3` 概念，并发 2 个 JSONP）。
- 字段核实：`f3` 涨跌幅、`f62` 主力净流入（元，÷1e8 得亿）、`f104/f105` 涨跌家数、`f128` 领涨股名、`f136` 领涨股涨幅、`f140` 领涨股代码。
- 热点追踪、行业与板块、今日复盘强势/弱势板块、综合评分板块强度全部改接真实数据；失败回退 `SEED_SECTORS`/`SEED_HOT` 并标注。

### 今日复盘新增「隔夜外盘 / 盘前热点」
- 新增卡片位于「今日重要公告 / 财报 / 事件」上方，含：
  - 外盘指数：道指、纳指、标普500、中概金龙指数、黄金、原油涨跌幅。
  - 热点板块映射：存储芯片、光通信、半导体设备、科技巨头、中概科技等。
  - 一句话盘前摘要及对A股开盘影响判断。
- 数据源优先级：`public/premarket.json`（同域）> `wb_eric_premarket`（localStorage）> `SEED_PREMARKET`。
- 刷新机制：点击「刷新隔夜热点」先 fetch `./premarket.json`；失败则 fallback 新浪外盘行情 `hq.sinajs.cn/list=int_nasdaq,int_dji,int_sp500,gb_$dxy,hf_GC,hf_CL`。
- 支持手动编辑摘要/指数/热点 JSON。
- 创建每日 08:00（北京时间）自动化 `Eric复盘台-每日盘前隔夜外盘更新`（automation-1786586574391），自动 WebSearch 隔夜美股/板块/商品数据并更新 `public/premarket.json`。

## 验证
- `node --check` 语法通过。
- 已重新部署 CloudStudio：`public/` 目录含 `eric-review.html`、`index.html`、`premarket.json`。
- 沙箱因 TLS 代理无法直连东方财富/新浪，真实拉取效果需在用户浏览器/公网环境验证。

## 已知限制
- 公网下 K 线仍为模拟（东方财富 K 线接口跨域受限回退），属预期。
- 公告事件、基本面财报仍为示例/用户自维护数据，暂未接实时源。

## 成果物
- `eric-review.html`（已更新）、`public/eric-review.html`（已重新部署）
- `public/premarket.json`（盘前摘要数据文件）
- 公网链接：`https://a813980bd83c4445846fb20df36000b7.bj2.agentos-app.net`
