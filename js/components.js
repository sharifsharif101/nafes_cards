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
};
