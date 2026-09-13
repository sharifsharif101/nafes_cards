/* ============================================================
   تقرير نافس — مولّدات الواجهة (Components)
   ------------------------------------------------------------
   دوال تُنشئ عناصر HTML للأقسام حسب نوعها من config.js.
   لإضافة نوع قسم جديد: أضف دالة buildXxx وسجّلها في SECTION_BUILDERS.
   ============================================================ */

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// بطاقة رسم بياني مطوية: زر يعرض الرسم في مودال كبير يديره ChartEngine
function makeChartCard(section, spec, ctx) {
  const card = el("div", "chart-card collapsed");
  card.dataset.sectionId = section.id;

  const header = el("div", "chart-card-header");
  const headText = el("div", "chart-card-head-text");
  headText.append(el("h3", "chart-title", spec.title));
  if (spec.description) headText.append(el("p", "chart-description", spec.description));

  const openBtn = el("button", "btn chart-open-btn no-print", "📊 عرض الرسم البياني");
  openBtn.type = "button";
  header.append(headText, openBtn);
  card.append(header);

  const box = el("div", "chart-box");
  const rows = ctx && ctx.items ? ctx.items.length : 3;
  box.style.height = (spec.height || (rows * 48 + 110)) + "px";

  const canvas = document.createElement("canvas");
  canvas.id = spec.idPrefix ? spec.idPrefix + ctx.id : spec.id;
  canvas.dataset.chartType = spec.type;
  canvas.dataset.sectionId = section.id;
  if (ctx && ctx.id) canvas.dataset.subId = ctx.id;
  canvas._homeBox = box; // الموضع الأساس الذي يعود إليه بعد إغلاق المودال

  const msg = el("div", "chart-empty-msg", spec.emptyText || "أدخل البيانات لعرض الرسم البياني");
  box.append(canvas, msg);
  card.append(box);

  openBtn.addEventListener("click", () => window.ChartEngine.openModal(card, spec));
  return card;
}

const SECTION_BUILDERS = {

  // قسم حقول إدخال (شبكة حقول)
  fields(section) {
    const grid = el("div", "basic-grid");
    section.fields.forEach(f => {
      const wrap = el("div", "field");
      const label = el("label", null, f.label);
      label.htmlFor = f.id;
      // if (f.tooltip) label.setAttribute("data-tooltip", f.tooltip);
      const input = document.createElement("input");
      input.type = f.type;
      input.id = f.id;
      if (f.placeholder) input.placeholder = f.placeholder;
      if (f.min !== undefined) input.min = f.min;
      wrap.append(label, input);
      grid.append(wrap);
    });
    return grid;
  },

  // قسم بطاقات إحصاءات محسوبة (مع خانة تنبيه اختيارية)
  stats(section) {
    const grid = el("div", "stats");
    section.stats.forEach(s => {
      const box = el("div", "stat");
      const value = el("div", "value placeholder", "—");
      value.id = s.id;
      const labelNode = el("div", "label", s.label);
      // if (s.tooltip) labelNode.setAttribute("data-tooltip", s.tooltip);
      box.append(labelNode, value);
      grid.append(box);
    });

    const frag = document.createDocumentFragment();
    frag.append(grid);

    if (section.validation) {
      const warn = el("div", "warn-box");
      warn.id = section.id + "-warn";
      frag.append(warn);
    }
    return frag;
  },

  // قسم مقارنة سنتين + شريط مقدار التغيير
  compare(section) {
    const grid = el("div", "compare-grid");
    section.inputs.forEach(inp => {
      const box = el("div", "compare-box");
      const titleNode = el("h3", null, inp.label);
      // if (inp.tooltip) titleNode.setAttribute("data-tooltip", inp.tooltip);
      const input = document.createElement("input");
      input.type = "number";
      input.id = inp.id;
      input.min = 0; input.max = 100; input.step = 0.1;
      input.placeholder = "0";
      box.append(titleNode, input);
      grid.append(box);
    });

    const banner = el("div", "change-banner");
    banner.id = "change-banner";
    banner.append(el("span", null, section.banner), el("span", "num"));
    banner.querySelector(".num").id = "change-value";

    const frag = document.createDocumentFragment();
    frag.append(grid, banner);
    return frag;
  },

  // بطاقة لكل مادة: صف مستويات + صف نسب يدوي + صف حسابات أوتوماتيكية
  "subject-cards"(section) {
    const wrap = el("div", "subject-cards");

    function makeInput(id) {
      const input = document.createElement("input");
      input.type = "number";
      input.id = id;
      input.min = 0; input.max = 100; input.step = 0.1;
      input.placeholder = "0";
      return input;
    }

    function makeField(subjectId, col, isLevel = false) {
      const field = el("div", "field");
      const label = el("label", null, col.label);
      label.htmlFor = subjectId + "-" + col.id;
      // if (col.tooltip) label.setAttribute("data-tooltip", col.tooltip);
      field.append(label, makeInput(subjectId + "-" + col.id));

      if (isLevel) {
        const countBox = el("div", "level-count", "عدد الطلاب: —");
        countBox.id = subjectId + "-" + col.id + "-count";
        field.append(countBox);
      }

      return field;
    }

    function makeCalcDisplay(subjectId, col) {
      const box = el("div", "calc-box");
      const label = el("span", "calc-label", col.label);
      // if (col.tooltip) label.setAttribute("data-tooltip", col.tooltip);
      const valNode = el("span", "calc-val placeholder", "—");
      valNode.id = subjectId + "-" + col.id;
      box.append(label, valNode);
      return box;
    }

    section.subjects.forEach(s => {
      // قراءة حالة البطاقة عبر StorageManager
      const isCollapsed = StorageManager.isCardCollapsed(s.id, true);

      const card = el("div", "subject-card" + (isCollapsed ? " collapsed" : ""));
      card.dataset.cardId = s.id;

      const header = el("div", "subject-header");
      const title = el("h3", "subject-title", s.label);
      const toggleIcon = el("span", "toggle-icon", "▼");
      header.append(title, toggleIcon);

      const body = el("div", "subject-body");

      const levelsRow = el("div", "levels-row");
      section.levelColumns.forEach(c => levelsRow.append(makeField(s.id, c, true)));

      const percentsRow = el("div", "percents-row");
      section.percentColumns.forEach(c => percentsRow.append(makeField(s.id, c)));

      // صف الحسابات التلقائية
      const calcsRow = el("div", "calcs-row");
      if (section.calcColumns) {
        section.calcColumns.forEach(c => calcsRow.append(makeCalcDisplay(s.id, c)));
      }

      body.append(levelsRow, percentsRow, calcsRow);
      card.append(header, body);

      header.addEventListener("click", () => {
        card.classList.toggle("collapsed");
        StorageManager.saveCardState(s.id, card.classList.contains("collapsed"));
      });

      wrap.append(card);
    });

    // بطاقة الرسوم البيانية أسفل بطاقات المواد (تقرأ من نفس حقول الإدخال)
    if (section.charts) {
      section.charts.forEach(spec => wrap.append(makeChartCard(section, spec)));
    }
    return wrap;
  },

  // بطاقات وجداول المجالات الفرعية المطابقة تماماً لتصميم وهيكل الإكسل
  "subdomains-cards"(section) {
    const wrap = el("div", "subdomains-wrap");

    section.subjectSubdomains.forEach(sub => {
      const card = el("div", "subdomain-card");
      
      const cardHeader = el("div", "subdomain-card-header");
      const title = el("h3", "subdomain-title", "نسبة الطلاب الذين اجتازوا مستوى الحد الأدنى للإتقان في المجالات الفرعية لمجال: " + sub.label.replace("مجال: ", ""));
      cardHeader.append(title);
      card.append(cardHeader);

      const table = el("table", "subdomain-table");
      const thead = document.createElement("thead");
      thead.innerHTML = `
        <tr>
          <th class="domain-name">المجال الفرعي</th>
          <th class="col-school">نسبة اجتياز المدرسة</th>
          <th class="col-admin">نسبة اجتياز الإدارة</th>
          <th class="col-kingdom">نسبة اجتياز المملكة</th>
          <th class="col-spacer"></th>
          <th class="col-diff-admin">مقارنة المدرسة بـ إدارة التعليم</th>
          <th class="col-diff-kingdom">مقارنة المدرسة بـ المملكة</th>
        </tr>
      `;
      table.append(thead);

      const tbody = document.createElement("tbody");

      sub.items.forEach(item => {
        const tr = document.createElement("tr");

        const tdLabel = el("td", "domain-name", item.label);

        // 1) نسبة المدرسة (إدخال)
        const tdSchool = el("td", "col-school");
        const inSchool = document.createElement("input");
        inSchool.type = "number";
        inSchool.id = `sub-${sub.id}-${item.id}-y2026`;
        inSchool.min = "0"; inSchool.max = "100"; inSchool.step = "0.1";
        inSchool.placeholder = "0.0%";
        tdSchool.append(inSchool);

        // 2) نسبة إدارة التعليم (إدخال مباشر)
        const tdAdmin = el("td", "col-admin");
        const inAdmin = document.createElement("input");
        inAdmin.type = "number";
        inAdmin.id = `sub-${sub.id}-${item.id}-admin`;
        inAdmin.min = "0"; inAdmin.max = "100"; inAdmin.step = "0.1";
        inAdmin.placeholder = "0.0%";
        tdAdmin.append(inAdmin);

        // 3) نسبة المملكة (إدخال مباشر)
        const tdKingdom = el("td", "col-kingdom");
        const inKingdom = document.createElement("input");
        inKingdom.type = "number";
        inKingdom.id = `sub-${sub.id}-${item.id}-kingdom`;
        inKingdom.min = "0"; inKingdom.max = "100"; inKingdom.step = "0.1";
        inKingdom.placeholder = "0.0%";
        tdKingdom.append(inKingdom);

        // عمود فاصل فارغ ومستقل تماماً
        const tdSpacer = el("td", "col-spacer");

        // 4) مقارنة المدرسة بـ إدارة التعليم (محسوب تلقائياً)
        const tdDiffAdmin = el("td", "col-diff-admin");
        const valDiffAdmin = el("span", "calc-val placeholder", "—");
        valDiffAdmin.id = `sub-${sub.id}-${item.id}-diff-admin`;
        tdDiffAdmin.append(valDiffAdmin);

        // 5) مقارنة المدرسة بـ المملكة (محسوب تلقائياً)
        const tdDiffKingdom = el("td", "col-diff-kingdom");
        const valDiffKingdom = el("span", "calc-val placeholder", "—");
        valDiffKingdom.id = `sub-${sub.id}-${item.id}-diff-kingdom`;
        tdDiffKingdom.append(valDiffKingdom);

        tr.append(tdLabel, tdSchool, tdAdmin, tdKingdom, tdSpacer, tdDiffAdmin, tdDiffKingdom);
        tbody.append(tr);
      });

      table.append(tbody);
      card.append(table);

      // رسم مقارنة المجالات الفرعية داخل بطاقة كل مادة
      if (section.charts) {
        section.charts.forEach(spec => card.append(makeChartCard(section, spec, sub)));
      }
      wrap.append(card);
    });

    return wrap;
  },

  // قسم الملاحظات والتوصيات وفريق التحسين والتطوير
  "recommendations-team"(section) {
    const wrap = el("div", "rec-team-wrap");

    // 1) الترتيب التلقائي للمواد بناءً على الإنجاز
    const notesBox = el("div", "rec-box notes-box");
    notesBox.append(el("h3", "rec-box-title", "ترتيب المواد حسب نسبة المجتازين لعام 2026 (من الأعلى إلى الأدنى):"));

    const rankBox = el("div", "auto-rank-box");
    rankBox.id = "auto-rank-box";

    const weakSubdomainBox = el("div", "weak-subdomains-box");
    weakSubdomainBox.id = "weak-subdomains-box";

    notesBox.append(rankBox, weakSubdomainBox);

    // 2) التوصيات
    const recsBox = el("div", "rec-box recs-box");
    recsBox.append(el("h3", "rec-box-title", "التوصيات التربوية المعتمدة:"));
    
    const recsListUl = el("ul", "recs-list");
    if (section.defaultRecommendations) {
      section.defaultRecommendations.forEach(recText => {
        const li = el("li", "rec-item", recText);
        recsListUl.append(li);
      });
    }
    recsBox.append(recsListUl);

    const extraRecWrap = el("div", "field extra-rec-field");
    extraRecWrap.append(el("label", null, "توصيات إضافية مخصصة للمدرسة:"));
    const txtExtra = document.createElement("textarea");
    txtExtra.id = "recommendations-extra";
    txtExtra.rows = 3;
    txtExtra.placeholder = "أضف أي توصيات أو قرارات إدارية تربوية أخرى هنا...";
    extraRecWrap.append(txtExtra);
    recsBox.append(extraRecWrap);

    // 3) فريق التحسين والتطوير
    const teamBox = el("div", "rec-box team-box");
    const teamHeader = el("div", "team-header");
    teamHeader.append(el("h3", "rec-box-title", "فريق التحسين والتطوير:"));
    teamHeader.append(el("span", "author-badge", "إعداد: الأستاذ بدر عبدالله الصبي"));
    teamBox.append(teamHeader);

    const teamGrid = el("div", "team-grid");

    const roles = [
      { id: "team-supervisors", label: "المشرفون", placeholder: "أسماء المشرفين والصفة" },
      { id: "team-teachers",    label: "المعلمون",   placeholder: "أسماء المعلمين المنفذين" },
      { id: "team-principal",   label: "مدير المدرسة", placeholder: "اسم مدير المدرسة" },
    ];

    roles.forEach(role => {
      const col = el("div", "team-col");
      col.append(el("div", "team-label", role.label));
      const input = document.createElement("input");
      input.type = "text";
      input.id = role.id;
      input.placeholder = role.placeholder;
      const sigLine = el("div", "sig-line", "التوقيع: .....................");
      col.append(input, sigLine);
      teamGrid.append(col);
    });

    // الختم الرسمى
    const stampCol = el("div", "team-col stamp-col");
    stampCol.append(el("div", "team-label", "الختم الرسمي للمدرسة"));
    stampCol.append(el("div", "stamp-box-placeholder", "ختم المدرسة"));
    teamGrid.append(stampCol);

    teamBox.append(teamGrid);

    wrap.append(notesBox, recsBox, teamBox);
    return wrap;
  }
};
