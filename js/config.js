/* ============================================================
   تقرير نافس — ملف الإعدادات
   ------------------------------------------------------------
   TABS: تبويبات التنقل بين صفحات التقرير.
   REPORT_SECTIONS: كل قسم معرّف كبيانات، مع tab يحدد التبويب.
   أنواع الأقسام (js/components.js):
     - "fields"  : شبكة حقول إدخال
     - "stats"   : بطاقات إحصاءات محسوبة
     - "compare" : مقارنة سنتين مع شريط مقدار التغيير
     - "matrix"  : جدول صفوف × أعمدة إدخال
   ============================================================ */

const TABS = Object.freeze([
  { id: "basic",           label: "البيانات الأساسية" },
  { id: "distribution",    label: "توزيع مستويات الأداء" },
  { id: "subdomains",      label: "المجالات الفرعية" },
  { id: "recommendations", label: "الملاحظات والتوصيات" },
]);

const REPORT_SECTIONS = Object.freeze([
  {
    id: "basic",
    tab: "basic",
    title: "البيانات الأساسية",
    type: "fields",
    fields: [
      { id: "day",       label: "اليوم",              type: "text", placeholder: "مثال: الأحد", tooltip: "يوم إدخال وتوثيق التقرير" },
      { id: "date",      label: "التاريخ",            type: "date", tooltip: "تاريخ توثيق متابعة اختبارات نافس" },
      { id: "school",    label: "اسم المدرسة",        type: "text", placeholder: "مثال: الابتدائية الثانية والستون بعد الثلاثمائة ٣٦٢", tooltip: "اسم المدرسة المنفذة للاختبار" },
      { id: "grade",     label: "الصف الدراسي",       type: "text", placeholder: "مثال: السادس الابتدائي", tooltip: "الصف المطبق عليه الاختبار بالمدرسة" },
      { id: "principal", label: "مديرة المدرسة",      type: "text", placeholder: "اسم مديرة المدرسة", tooltip: "اسم مديرة المدرسة" },
      { id: "year",      label: "العام الدراسي",      type: "text", placeholder: "مثال: ١٤٤٦هـ أو 1447هـ", tooltip: "العام الدراسي المطبق فيه الاختبار" },
      { id: "total",     label: "عدد الطالبات الكلي", type: "number", min: 0, tooltip: "إجمالي عدد طالبات الصف المستهدف في المدرسة" },
      { id: "tested",    label: "عدد المختبرات",      type: "number", min: 0, tooltip: "عدد الطالبات اللاتي حضرن وأدين الاختبار بالفعل" },
    ],
  },
  {
    id: "results",
    tab: "basic",
    title: "النتائج العامة",
    type: "stats",
    validation: "tested-vs-total",
    stats: [
      { id: "absent", label: "عدد الغياب", calc: "absent", tooltip: "عدد الطالبات الغائبات عن الاختبار (يحسب تلقائياً: الكلي − المختبرات)" },
      { id: "rate",   label: "نسبة المختبرات من العدد الكلي", calc: "rate", tooltip: "نسبة حضور الطالبات وتأديتهن للاختبار (تحسب تلقائياً)" },
    ],
  },
  {
    id: "overall-compare",
    tab: "basic",
    title: "نسبة المجتازات للحد الأدنى للإتقان في المجالات معًا",
    type: "compare",
    inputs: [
      { id: "y2025", label: "عام 2025", tooltip: "نسبة المجتازات للحد الأدنى للإتقان في جميع المجالات لعام 2025" },
      { id: "y2026", label: "عام 2026", tooltip: "نسبة المجتازات للحد الأدنى للإتقان في جميع المجالات لعام 2026" },
    ],
    banner: "مقدار التغيير في النتيجة العامة مقارنة بالعام الماضي",
  },

  /* ---------- التبويب الثاني: توزيع مستويات الأداء ---------- */
  {
    id: "levels",
    tab: "distribution",
    title: "توزيع نسب أداء الطالبات على مستويات الأداء في المواد الرئيسية",
    type: "subject-cards",
    subjects: [
      { id: "math", label: "رياضيات" },
      { id: "sci",  label: "علوم" },
      { id: "read", label: "قراءة" },
    ],
    levelColumns: [
      { id: "high", label: "مرتفع", tooltip: "نسبة الطالبات المتميزات اللاتي حققن أعلى درجة إتقان في المادة" },
      { id: "mid",  label: "متوسط", tooltip: "نسبة الطالبات اللاتي حققن مستوى الإتقان المقبول للمهارات الأساسية" },
      { id: "low",  label: "منخفض", tooltip: "نسبة الطالبات اللاتي أدائهن أقل من المتوقع ويحتجن إلى دعم وتطوير" },
      { id: "vlow", label: "منخفض جدًا", tooltip: "نسبة الطالبات في أدنى مستويات الأداء ويحتجن لخطط علاجية مكثفة" },
    ],
    percentColumns: [
      { id: "y2026",       label: "المجتازات 2026", tooltip: "نسبة الطالبات اللاتي اجتزن مستوى الحد الأدنى للإتقان في العام الحالي 2026" },
      { id: "y2025",       label: "المجتازات 2025", tooltip: "نسبة اجتياز الحد الأدنى للإتقان في العام الماضي 2025" },
      { id: "admin2026",   label: "اكتب نسبة الإدارة عام 2026", tooltip: "متوسط نسبة الاجتياز في المادة على مستوى إدارة التعليم/المحافظة لعام 2026" },
      { id: "kingdom2026", label: "اكتب نسبة المملكة عام 2026", tooltip: "المتوسط الوطني العام لنسبة الاجتياز في المادة على مستوى مدارس المملكة لعام 2026" },
      { id: "target2026",  label: "اكتب المستهدف عام 2026", tooltip: "النسبة المستهدفة المخطط تحقيقها للمدرسة لعام 2026" },
    ],
    calcColumns: [
      { id: "diff-change",  label: "التغيير عن 2025", tooltip: "مقدار الزيادة أو النقصان مقارنة بنتيجة العام الماضي 2025 (يحسب تلقائياً)" },
      { id: "diff-admin",   label: "مقارنة بالإدارة", tooltip: "الفرق بين نتيجة المدرسة ومتوسط أداء المحافظة/الإدارة (يحسب تلقائياً)" },
      { id: "diff-kingdom", label: "مقارنة بالمملكة", tooltip: "الفرق بين نتيجة المدرسة ومتوسط أداء جميع مدارس المملكة (يحسب تلقائياً)" },
      { id: "diff-target",  label: "مقارنة بالمستهدف", tooltip: "الفرق بين نتيجة المدرسة والهدف المستهدف لعام 2026 (يحسب تلقائياً)" },
    ],
    charts: [
      {
        id: "chart-levels",
        type: "levels-stacked",
        title: "توزيع مستويات الأداء في المواد الرئيسية",
        description: "توزيع الطالبات على المستويات الأربعة لكل مادة كما دُخلت في البطاقات أعلاه (تُعرض النسب كما هي دون تقييد الجمع على 100%).",
        emptyText: "أدخلي نسب مستويات الأداء في بطاقات المواد أعلاه لعرض المخطط",
        height: 340,
      },
      {
        id: "chart-benchmarks",
        type: "benchmarks",
        title: "مقارنة المجتازات 2026 بالمؤشرات المعيارية",
        description: "مقارنة نتيجة المدرسة لعام 2026 مع نتيجة 2025 ومتوسط الإدارة والمتوسط الوطني والمستهدف.",
        emptyText: "أدخلي نسب المجتازات في بطاقات المواد أعلاه لعرض المخطط",
        height: 360,
      },
    ],
  },

  /* ---------- التبويب الثالث: المجالات الفرعية ---------- */
  {
    id: "subdomains-section",
    tab: "subdomains",
    title: "نسبة الطالبات اللاتي اجتزن مستوى الحد الأدنى للإتقان في المجالات الفرعية",
    type: "subdomains-cards",
    subjectSubdomains: [
      {
        id: "math",
        label: "مجال: الرياضيات",
        items: [
          { id: "numbers",  label: "الأعداد والعمليات" },
          { id: "geometry", label: "الهندسة والقياس" },
          { id: "data",     label: "البيانات والاحتمالات" },
          { id: "algebra",  label: "الجبر" },
        ]
      },
      {
        id: "sci",
        label: "مجال: العلوم",
        items: [
          { id: "earth",    label: "علم الأرض والفلك" },
          { id: "physical", label: "العلوم الفيزيائية" },
          { id: "life",     label: "علوم الحياة" },
        ]
      },
      {
        id: "read",
        label: "مجال: القراءة",
        items: [
          { id: "comprehension", label: "استيعاب المقروء" },
          { id: "vocabulary",    label: "دلالات الألفاظ" },
        ]
      }
    ],
    charts: [
      {
        idPrefix: "chart-sub-",
        type: "subdomains",
        title: "مقارنة المجتازات في المجالات الفرعية: 2026 مقابل 2025",
        description: "نتيجة كل مجال فرعي لعام 2026 مقارنة بعام 2025 — المجالات التي تفتقد نتيجة 2025 تظهر بقيمة واحدة فقط.",
        emptyText: "أدخلي نسب المجتازات في الجدول أعلاه لعرض المخطط",
      }
    ]
  },

  /* ---------- التبويب الرابع: الملاحظات والتوصيات وفريق العمل ---------- */
  {
    id: "recommendations-section",
    tab: "recommendations",
    title: "الملاحظات والتوصيات وفريق التحسين والتطوير",
    type: "recommendations-team",
    defaultRecommendations: [
      "1. تحليل البيانات: استخدام نتائج الاختبارات السابقة لتحديد نقاط الضعف.",
      "2. تطوير المعلمين: توفير تدريبات للمعلمين لتحسين طرق التدريس.",
      "3. خطط مخصصة: تصميم خطط تعليمية تستهدف تحسين نقاط الضعف.",
      "4. إشراك أولياء الأمور: المحافظة على تواصل مستمر مع أولياء الأمور لدعم الطلاب.",
      "5. تحفيز الطلاب: تنظيم أنشطة تحفيزية ومسابقات تعليمية.",
      "6. تقييم مستمر: استخدام اختبارات دورية لمتابعة تقدم الطلاب.",
      "7. بيئة إيجابية: تعزيز بيئة تعليمية مشجعة وداعمة."
    ]
  }
]);

/* ============================================================
   إدارة التخزين المحلي وحالة التطبيق (Storage Manager)
   ============================================================ */

const STORAGE_KEYS = Object.freeze({
  REPORT_DATA: "nafas-report-1447",
  ACTIVE_TAB:  "nafas-active-tab",
  CARD_STATES: "nafas-card-states",
  SCROLL_Y:    "nafas-scroll-y",
});

const StorageManager = Object.freeze({
  get(key, defaultValue = null, storage = localStorage) {
    try {
      const item = storage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  },

  set(key, value, storage = localStorage) {
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  },

  remove(key, storage = localStorage) {
    try {
      storage.removeItem(key);
    } catch (e) {}
  },

  getReportData() {
    return this.get(STORAGE_KEYS.REPORT_DATA, {});
  },

  saveReportData(data) {
    this.set(STORAGE_KEYS.REPORT_DATA, data);
  },

  getActiveTab() {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB);
    } catch (e) {
      return null;
    }
  },

  saveActiveTab(tabId) {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, tabId);
    } catch (e) {}
  },

  getCardStates() {
    return this.get(STORAGE_KEYS.CARD_STATES, {});
  },

  isCardCollapsed(cardId, defaultCollapsed = true) {
    const states = this.getCardStates();
    return cardId in states ? !!states[cardId] : defaultCollapsed;
  },

  saveCardState(cardId, isCollapsed) {
    const states = this.getCardStates();
    states[cardId] = isCollapsed;
    this.set(STORAGE_KEYS.CARD_STATES, states);
  },

  getScrollY() {
    try {
      const val = sessionStorage.getItem(STORAGE_KEYS.SCROLL_Y);
      return val !== null ? parseFloat(val) : null;
    } catch (e) {
      return null;
    }
  },

  saveScrollY(y) {
    try {
      sessionStorage.setItem(STORAGE_KEYS.SCROLL_Y, y.toString());
    } catch (e) {}
  },

  clearAll() {
    this.remove(STORAGE_KEYS.REPORT_DATA);
    this.remove(STORAGE_KEYS.ACTIVE_TAB);
    this.remove(STORAGE_KEYS.CARD_STATES);
    this.remove(STORAGE_KEYS.SCROLL_Y, sessionStorage);
  }
});

