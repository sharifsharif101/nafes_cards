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

const SECTION_BUILDERS = {

  // قسم حقول إدخال (شبكة حقول)
  fields(section) {
    const grid = el("div", "basic-grid");
    section.fields.forEach(f => {
      const wrap = el("div", "field");
      const label = el("label", null, f.label);
      label.htmlFor = f.id;
      if (f.tooltip) label.setAttribute("data-tooltip", f.tooltip);
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
      if (s.tooltip) labelNode.setAttribute("data-tooltip", s.tooltip);
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
      if (inp.tooltip) titleNode.setAttribute("data-tooltip", inp.tooltip);
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

    function makeField(subjectId, col) {
      const field = el("div", "field");
      const label = el("label", null, col.label);
      label.htmlFor = subjectId + "-" + col.id;
      if (col.tooltip) label.setAttribute("data-tooltip", col.tooltip);
      field.append(label, makeInput(subjectId + "-" + col.id));
      return field;
    }

    function makeCalcDisplay(subjectId, col) {
      const box = el("div", "calc-box");
      const label = el("span", "calc-label", col.label);
      if (col.tooltip) label.setAttribute("data-tooltip", col.tooltip);
      const valNode = el("span", "calc-val placeholder", "—");
      valNode.id = subjectId + "-" + col.id;
      box.append(label, valNode);
      return box;
    }

    section.subjects.forEach(s => {
      // تبدأ البطاقة مغلقة (collapsed)
      const card = el("div", "subject-card collapsed");

      const header = el("div", "subject-header");
      const title = el("h3", "subject-title", s.label);
      const toggleIcon = el("span", "toggle-icon", "▼");
      header.append(title, toggleIcon);

      const body = el("div", "subject-body");

      const levelsRow = el("div", "levels-row");
      section.levelColumns.forEach(c => levelsRow.append(makeField(s.id, c)));

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
      });

      wrap.append(card);
    });
    return wrap;
  },

  // بطاقات وجداول المجالات الفرعية المطابقة تماماً لتصميم وهيكل الإكسل
  "subdomains-cards"(section) {
    const wrap = el("div", "subdomains-wrap");

    section.subjectSubdomains.forEach(sub => {
      const card = el("div", "subdomain-card");
      
      const cardHeader = el("div", "subdomain-card-header");
      const title = el("h3", "subdomain-title", "نسبة الطالبات اللاتي اجتزن مستوى الحد الأدنى للإتقان في المجالات الفرعية لمجال: " + sub.label.replace("مجال: ", ""));
      cardHeader.append(title);

      // كتلة "معلومات المقارنة" (اكتب نسبة الإدارة عام 2025 - اكتب نسبة المملكة عام 2025)
      const infoBox = el("div", "compare-info-card");
      infoBox.innerHTML = `
        <div class="compare-info-header">معلومات المقارنة (عام 2025)</div>
        <div class="compare-info-body">
          <div class="compare-info-field admin-field">
            <label for="sub-${sub.id}-admin2025">اكتب نسبة الإدارة عام 2025</label>
            <input type="number" id="sub-${sub.id}-admin2025" min="0" max="100" step="0.1" placeholder="مثال: 75">
          </div>
          <div class="compare-info-field kingdom-field">
            <label for="sub-${sub.id}-kingdom2025">اكتب نسبة المملكة عام 2025</label>
            <input type="number" id="sub-${sub.id}-kingdom2025" min="0" max="100" step="0.1" placeholder="مثال: 70">
          </div>
        </div>
      `;
      cardHeader.append(infoBox);
      card.append(cardHeader);

      const table = el("table", "subdomain-table");
      const thead = document.createElement("thead");
      thead.innerHTML = `
        <tr>
          <th>المجال الفرعي</th>
          <th>نسبة المجتازات 2025</th>
          <th>نسبة المجتازات 2024</th>
          <th>مقدار التغير عن 2024</th>
          <th>مقارنة بمتوسط الإدارة</th>
          <th>مقارنة بمتوسط المملكة</th>
        </tr>
      `;
      table.append(thead);

      const tbody = document.createElement("tbody");

      sub.items.forEach(item => {
        const tr = document.createElement("tr");

        const tdLabel = el("td", "domain-name", item.label);

        // نسبة 2025 (إدخال)
        const td2025 = document.createElement("td");
        const in2025 = document.createElement("input");
        in2025.type = "number";
        in2025.id = `sub-${sub.id}-${item.id}-y2025`;
        in2025.min = "0"; in2025.max = "100"; in2025.step = "0.1";
        in2025.placeholder = "0.0%";
        td2025.append(in2025);

        // نسبة 2024 (إدخال إن توفرت)
        const td2024 = document.createElement("td");
        const in2024 = document.createElement("input");
        in2024.type = "number";
        in2024.id = `sub-${sub.id}-${item.id}-y2024`;
        in2024.min = "0"; in2024.max = "100"; in2024.step = "0.1";
        in2024.placeholder = "غير متوفرة";
        td2024.append(in2024);

        // مقدار التغير عن 2024 (محسوب تلقائياً)
        const tdChange = document.createElement("td");
        const valChange = el("span", "calc-val placeholder", "—");
        valChange.id = `sub-${sub.id}-${item.id}-diff-change`;
        tdChange.append(valChange);

        // مقارنة بمتوسط الإدارة (محسوب تلقائياً)
        const tdAdmin = document.createElement("td");
        const valAdmin = el("span", "calc-val placeholder", "—");
        valAdmin.id = `sub-${sub.id}-${item.id}-diff-admin`;
        tdAdmin.append(valAdmin);

        // مقارنة بمتوسط المملكة (محسوب تلقائياً)
        const tdKingdom = document.createElement("td");
        const valKingdom = el("span", "calc-val placeholder", "—");
        valKingdom.id = `sub-${sub.id}-${item.id}-diff-kingdom`;
        tdKingdom.append(valKingdom);

        tr.append(tdLabel, td2025, td2024, tdChange, tdAdmin, tdKingdom);
        tbody.append(tr);
      });

      table.append(tbody);
      card.append(table);
      wrap.append(card);
    });

    return wrap;
  },

  // قسم الملاحظات والتوصيات وفريق التحسين والتطوير
  "recommendations-team"(section) {
    const wrap = el("div", "rec-team-wrap");

    // 1) الملاحظات
    const notesBox = el("div", "rec-box notes-box");
    notesBox.append(el("h3", "rec-box-title", "الملاحظات والتوصيات:"));

    const notesList = el("div", "notes-inputs-grid");
    
    const note1Wrap = el("div", "field note-field");
    note1Wrap.append(el("label", null, "1- مقدار التغير في نسبة الطلبة المتقنين لمهارات الحد الأدنى للإتقان مقارنة بالعام الماضي:"));
    const inNote1 = document.createElement("input");
    inNote1.type = "text";
    inNote1.id = "note-change-summary";
    inNote1.placeholder = "اكتب مقدار التغير أو التحليل العام...";
    note1Wrap.append(inNote1);

    const note2Wrap = el("div", "field note-field");
    note2Wrap.append(el("label", null, "2- ملاحظات مجال العلوم:"));
    const inNote2 = document.createElement("input");
    inNote2.type = "text";
    inNote2.id = "note-sci-summary";
    inNote2.placeholder = "مثال: وجود انخفاض في مجال (علوم الحياة) في مادة العلوم...";
    note2Wrap.append(inNote2);

    const note3Wrap = el("div", "field note-field");
    note3Wrap.append(el("label", null, "3- ملاحظات مجال القراءة والرياضيات:"));
    const inNote3 = document.createElement("input");
    inNote3.type = "text";
    inNote3.id = "note-read-summary";
    inNote3.placeholder = "مثال: وجود انخفاض طفيف في مجال (دلالات الألفاظ) في مادة القراءة...";
    note3Wrap.append(inNote3);

    notesList.append(note1Wrap, note2Wrap, note3Wrap);
    notesBox.append(notesList);

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
      { id: "team-supervisors", label: "المشرفات", placeholder: "أسماء المشرفات والصفة" },
      { id: "team-teachers",    label: "المعلمات",   placeholder: "أسماء المعلمات المنفذات" },
      { id: "team-principal",   label: "مديرة المدرسة", placeholder: "اسم مديرة المدرسة" },
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
