import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'zh-CN';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, defaultText?: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  'en': {
    // Top Bar & Navbar
    'nav.research_audit': 'RESEARCH AUDIT',
    'nav.updated': 'Updated',
    'nav.at': 'at',
    'nav.timezone': 'Timezone',
    'nav.daily_cron_badge': 'Daily 8:00 AM (UTC+8 HKT) Auto-Refresh',
    'nav.skus_audited': 'SKUs Audited',
    'nav.title': 'ECC RDIMM',
    'nav.subtitle_highlight': 'Market Intelligence Index',
    'nav.subtitle_desc': 'Used Server Memory Valuation • Floor & Ceiling Arbitrage • Automated 8:00 AM Backend Engine',
    'nav.daily_engine': 'Daily Engine',
    'nav.specs_guide': 'Specs Guide',
    'nav.lang_toggle': '中文 (简体)',
    'nav.tab_matrix': 'Market Matrix Overview',
    'nav.tab_curated': 'Curated Benchmark Catalog',
    'nav.tab_listings': 'Exact eBay Active Listings & Market Spread',
    'nav.tab_trends': 'eBay 3-Month Market Trends',

    // Matrix Tab
    'matrix.title': 'ECC Server Memory Valuation Matrix',
    'matrix.desc': 'Consolidated pricing intelligence across enterprise ECC RDIMM modules (DDR3, DDR4, DDR5 Monolithic & 3DS Stacked).',
    'matrix.all_gens': 'All Generations',
    'matrix.ddr3_title': 'DDR3 ECC Registered (Legacy / Decommissioning)',
    'matrix.ddr4_title': 'DDR4 ECC Registered (Enterprise Mainstream Workhorse)',
    'matrix.ddr5_mono_title': 'DDR5 Monolithic RDIMM (Next-Gen Standard)',
    'matrix.ddr5_3ds_title': 'DDR5 3DS High-Density RDIMM (AI & Hyperscale)',
    'matrix.floor_price': 'Floor Price',
    'matrix.avg_price': 'Weighted Avg',
    'matrix.ceiling_price': 'Ceiling Price',
    'matrix.price_per_gb': 'Avg $/GB',
    'matrix.spread': 'Market Spread',
    'matrix.listings_count': 'Listings',
    'matrix.no_data': 'No matching specifications',
    'matrix.view_listings': 'View active listings',
    'matrix.view_trend': 'Inspect 90-day trajectory',

    // Listings & Curated Catalog
    'table.search_placeholder': 'Search listings by title, vendor, capacity, speed, or part number...',
    'table.filter_gen': 'Generation',
    'table.filter_vendor': 'Vendor',
    'table.filter_module_type': 'Module Type',
    'table.filter_rank': 'Memory Rank',
    'table.filter_sort': 'Sort By',
    'table.all': 'All',
    'table.all_vendors': 'All Vendors',
    'table.all_types': 'All Types',
    'table.all_ranks': 'All Ranks',
    'table.sort_price_asc': 'Price: Low to High',
    'table.sort_price_desc': 'Price: High to Low',
    'table.sort_gb_asc': '$/GB: Low to High',
    'table.sort_gb_desc': '$/GB: High to Low',
    'table.sort_cap_desc': 'Capacity: High to Low',
    'table.sort_speed_desc': 'Speed: High to Low',
    'table.col_spec': 'Specification / Gen',
    'table.col_type_rank': 'Type & Rank',
    'table.col_vendor_model': 'Vendor & Model',
    'table.col_condition': 'Condition',
    'table.col_unit_price': 'Unit Price ($)',
    'table.col_price_gb': 'Price / GB',
    'table.col_1w_trend': '1-Week Trend',
    'table.col_90d_trend': '90-Day Trend',
    'table.col_title_link': 'Listing Title & eBay Link',
    'table.showing': 'Showing',
    'table.of': 'of',
    'table.items': 'listings',
    'table.page': 'Page',
    'table.prev': 'Previous',
    'table.next': 'Next',
    'table.curated_banner_title': 'Enterprise ITAD Curated Benchmark Catalog',
    'table.curated_banner_desc': 'Verified, standardized wholesale & distributor pricing baseline for enterprise ITAD asset recovery.',
    'table.ebay_banner_title': 'Exact eBay Active Listings & Market Spread',
    'table.ebay_banner_desc': 'Real-time eBay active market spread and seller listings with direct listing links.',

    // Trends Tab
    'trends.banner_badge': '90-Day Graphical Market Trajectory',
    'trends.banner_title': '90-Day Valuation Trajectories & Price Shifts',
    'trends.banner_desc': 'Interactive historical price curves tracking momentum across DDR3, DDR4, and DDR5 server ECC memory modules.',
    'trends.formulas_guide': 'Formulas Guide',
    'trends.all_gens': 'All Gens',
    'trends.ddr5_mono': 'DDR5 Monolithic',
    'trends.ddr5_3ds': 'DDR5 3DS',
    'trends.daily_snapshots': 'Daily Snapshots',
    'trends.90d_milestones': '90-Day Milestones',
    'trends.unit_price': 'Unit Price ($)',
    'trends.avg_price_gb': 'Avg $/GB',
    'trends.stat_avg_shift': 'Filtered Category Avg 90d Shift',
    'trends.stat_discounting': 'Downward Trajectory (Discounting)',
    'trends.stat_premiums': 'Upward Trajectory (Premiums)',
    'trends.stat_stable': 'Stable Pricing Baseline',
    'trends.skus_unit': 'SKUs',
    'trends.trajectory_header': 'Historical Trajectory',
    'trends.90d_momentum': '90-Day Momentum',
    'trends.current_ebay_avg': 'Current eBay Avg',
    'trends.90d_ago_start': '90d Ago Starting Price',
    'trends.floor': 'Floor',
    'trends.ceiling': 'Ceiling',
    'trends.click_to_focus': 'Click any card below to focus its interactive chart',
    'trends.all_sku_cards': 'All SKU Graphical Trajectory Cards',
    'trends.sparkline_synced': 'Sparklines synchronized with actual daily research records',
    'trends.sparkline_desc': 'Sparklines represent 90d Ago → 60d Ago → 30d Ago → 7d Ago → Today',
    'trends.view_in_matrix': 'View in Matrix',
    'trends.currently_selected': '★ Currently Selected',
    'trends.click_to_inspect': 'Click to inspect in chart',
    'trends.today_ebay_avg': "Today's eBay Avg:",
    'trends.90d_ago_base': '90d Ago Baseline:',
    'trends.active_floor_ceiling': 'Active Floor / Ceiling:',

    // Footer
    'footer.brand': 'ECC RDIMM Market Intelligence',
    'footer.tagline': 'Comprehensive ITAD Valuation Benchmarks & Automated Research Engine',

    // Modals
    'modal.close': 'Close',
    'modal.formulas_title': 'Valuation & Pricing Calculation Formulas',
    'modal.specs_title': 'Server RAM Specifications Reference Guide',
    'modal.scheduler_title': 'Automated Daily Research Scheduler & Audit Logs',
  },
  'zh-CN': {
    // Top Bar & Navbar
    'nav.research_audit': '调研核查',
    'nav.updated': '更新于',
    'nav.at': '时间',
    'nav.timezone': '时区',
    'nav.daily_cron_badge': '每日 8:00 AM (UTC+8 香港/北京) 自动刷新',
    'nav.skus_audited': '款已审计SKU',
    'nav.title': 'ECC RDIMM',
    'nav.subtitle_highlight': '服务器内存市场情报指数',
    'nav.subtitle_desc': '二手服务器内存估值 • 底价与高价套利分析 • 每日8:00 AM后端自动化引擎',
    'nav.daily_engine': '每日引擎',
    'nav.specs_guide': '规格指南',
    'nav.lang_toggle': 'English',
    'nav.tab_matrix': '市场矩阵全景',
    'nav.tab_curated': '精选基准目录',
    'nav.tab_listings': 'eBay实时在售商品与价差',
    'nav.tab_trends': 'eBay 3个月市场趋势',

    // Matrix Tab
    'matrix.title': 'ECC 服务器内存估值矩阵',
    'matrix.desc': '整合企业级 ECC RDIMM 内存模块（涵盖 DDR3、DDR4、DDR5 单芯片及 3DS 堆叠）的全面市场定价情报。',
    'matrix.all_gens': '全部代际',
    'matrix.ddr3_title': 'DDR3 ECC Registered (淘汰/退役期架构)',
    'matrix.ddr4_title': 'DDR4 ECC Registered (企业级主流主力机型)',
    'matrix.ddr5_mono_title': 'DDR5 单芯片 RDIMM (次世代标准)',
    'matrix.ddr5_3ds_title': 'DDR5 3DS 高密度堆叠 RDIMM (AI与超大规模集群)',
    'matrix.floor_price': '在售底价',
    'matrix.avg_price': '加权均价',
    'matrix.ceiling_price': '在售高价',
    'matrix.price_per_gb': '平均 $/GB',
    'matrix.spread': '市场价差',
    'matrix.listings_count': '在售记录',
    'matrix.no_data': '无匹配规格数据',
    'matrix.view_listings': '查看在售商品',
    'matrix.view_trend': '查看90天走势',

    // Listings & Curated Catalog
    'table.search_placeholder': '按标题、厂商、容量、频率或料号搜索商品...',
    'table.filter_gen': '内存代际',
    'table.filter_vendor': '厂商品牌',
    'table.filter_module_type': '模块类型',
    'table.filter_rank': '内存Rank',
    'table.filter_sort': '排序方式',
    'table.all': '全部',
    'table.all_vendors': '全部厂商',
    'table.all_types': '全部类型',
    'table.all_ranks': '全部Rank',
    'table.sort_price_asc': '单价: 从低到高',
    'table.sort_price_desc': '单价: 从高到低',
    'table.sort_gb_asc': '$/GB: 从低到高',
    'table.sort_gb_desc': '$/GB: 从高到低',
    'table.sort_cap_desc': '容量: 从大到小',
    'table.sort_speed_desc': '频率: 从高到低',
    'table.col_spec': '规格 / 代际',
    'table.col_type_rank': '类型与Rank',
    'table.col_vendor_model': '厂商与型号',
    'table.col_condition': '成色',
    'table.col_unit_price': '单价 ($)',
    'table.col_price_gb': '每GB单价',
    'table.col_1w_trend': '1周趋势',
    'table.col_90d_trend': '90天趋势',
    'table.col_title_link': '商品标题与 eBay 链接',
    'table.showing': '显示',
    'table.of': '共',
    'table.items': '条记录',
    'table.page': '页码',
    'table.prev': '上一页',
    'table.next': '下一页',
    'table.curated_banner_title': '企业级 ITAD 精选基准目录',
    'table.curated_banner_desc': '经过验证与标准化的批发及分销商定价基准，服务于企业 IT 资产处置估值。',
    'table.ebay_banner_title': 'eBay 实时在售商品与市场价差',
    'table.ebay_banner_desc': '实时抓取的 eBay 在售卖家商品分布、成色与直达购买链接。',

    // Trends Tab
    'trends.banner_badge': '90天可视化市场走势',
    'trends.banner_title': '90天估值走势与价格变动',
    'trends.banner_desc': '交互式历史价格曲线，追踪 DDR3、DDR4 与 DDR5 服务器 ECC 内存模块的价格动能变动。',
    'trends.formulas_guide': '计算公式指南',
    'trends.all_gens': '全部代际',
    'trends.ddr5_mono': 'DDR5 单芯片(Mono)',
    'trends.ddr5_3ds': 'DDR5 3DS 堆叠',
    'trends.daily_snapshots': '每日快照数据',
    'trends.90d_milestones': '90天里程碑',
    'trends.unit_price': '单价 ($)',
    'trends.avg_price_gb': '平均 $/GB',
    'trends.stat_avg_shift': '当前分类 90天平均涨跌',
    'trends.stat_discounting': '下行趋势 (降价/打折)',
    'trends.stat_premiums': '上行趋势 (溢价/坚挺)',
    'trends.stat_stable': '价格基准平稳',
    'trends.skus_unit': '款SKU',
    'trends.trajectory_header': '历史估值走势',
    'trends.90d_momentum': '90天动能变动',
    'trends.current_ebay_avg': '当前 eBay 均价',
    'trends.90d_ago_start': '90天前起始价格',
    'trends.floor': '在售底价',
    'trends.ceiling': '在售高价',
    'trends.click_to_focus': '点击下方任意卡片可在图表中详细聚焦查看',
    'trends.all_sku_cards': '全部 SKU 可视化走势卡片',
    'trends.sparkline_synced': '迷你曲线图已与实际每日调研快照记录完全同步',
    'trends.sparkline_desc': '折线代表 90天前 → 60天前 → 30天前 → 7天前 → 今日',
    'trends.view_in_matrix': '在矩阵中查看',
    'trends.currently_selected': '★ 当前选定',
    'trends.click_to_inspect': '点击在图表中查看',
    'trends.today_ebay_avg': '今日 eBay 均价:',
    'trends.90d_ago_base': '90天前基准价:',
    'trends.active_floor_ceiling': '在售底价 / 高价:',

    // Footer
    'footer.brand': 'ECC RDIMM 市场智能指数',
    'footer.tagline': '企业级 ITAD 资产处置估值基准与自动化研究引擎',

    // Modals
    'modal.close': '关闭',
    'modal.formulas_title': '估值与定价计算公式',
    'modal.specs_title': '服务器内存规格与分类速查指南',
    'modal.scheduler_title': '每日自动调研调度程序与审计日志',
  }
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key: string, defaultText?: string) => defaultText || key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('itad_memory_language');
      if (saved === 'zh-CN' || saved === 'en') {
        return saved;
      }
    } catch {}
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('itad_memory_language', lang);
    } catch {}
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'zh-CN' : 'en');
  };

  const t = (key: string, defaultText?: string): string => {
    const langDict = translations[language];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    const fallbackDict = translations['en'];
    if (fallbackDict && fallbackDict[key]) {
      return fallbackDict[key];
    }
    return defaultText || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
