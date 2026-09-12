/* ============================================================
   تقرير نافس — محرك الرسوم البيانية (Charts Engine)
   ------------------------------------------------------------
   يعتمد على Chart.js المضمّن محلياً (js/chart.umd.min.js) ليعمل
   بلا إنترنت. يقرأ البيانات من نفس حقول الإدخال التي يستخدمها
   app.js ويعيد الرسم عند: تعديل حقل، تبديل تبويب، فتح بطاقة، طباعة.
   لإضافة رسم جديد: أضف نوعاً في CHART_BUILDERS وسجّل الرسم
   في مصفوفة charts داخل القسم المعني في config.js.
   ============================================================ */

(function () {
  "use strict";

  const hasChartLib = typeof Chart !== "undefined";
  if (!hasChartLib) {
    console.warn("تقرير نافس: مكتبة Chart.js غير محمّلة — الرسوم البيانية معطلة.");
    window.ChartEngine = { update() {}, onTabSwitch() {}, onCardToggle() {} };
    return;
  }

  /* ---------- الألوان الدلالية الثابتة ----------
     الأخضر=مرتفع، الأزرق=متوسط، البرتقالي=منخفض، الأحمر=منخفض جدًا.
     سلسلة المقارنة: المدرسة الحالية تركواز، السابقة رمادي،
     المرجعية الخارجية ذهبي/بنفسجي، المستهدف أحمر. */
  const LEVELS = [
    { key: "high", label: "مرتفع",      color: "#2e9e5b" },
    { key: "mid",  label: "متوسط",      color: "#3d7dd8" },
    { key: "low",  label: "منخفض",      color: "#f2a33c" },
    { key: "vlow", label: "منخفض جدًا", color: "#d9534f" },
  ];

  const BENCHMARKS = [
    { key: "y2025",       label: "المدرسة 2025",  color: "#048680" },
    { key: "y2024",       label: "المدرسة 2024",  color: "#9fb3c8" },
    { key: "admin2025",   label: "متوسط الإدارة", color: "#f2b234" },
    { key: "kingdom2025", label: "المتوسط الوطني", color: "#7a5cc4" },
    { key: "target2025",  label: "المستهدف",      color: "#e05252" },
  ];

  const YEAR_SERIES = [
    { key: "y2025", label: "2025", color: "#048680" },
    { key: "y2024", label: "2024", color: "#9fb3c8" },
  ];

  const FONT = "'IBM Plex Sans Arabic', 'Segoe UI', sans-serif";

  function num(v) {
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  }
  function round1(n) {
    return Math.round(n * 10) / 10;
  }

  /* ============================================================
     بنّاعو البيانات — تستقبل القيم وسياق الرسم وتعيد {labels, datasets}
     أو null عند غياب أي بيانات (فيُعرض نص إرشادي بدل الرسم).
     ============================================================ */
  const CHART_BUILDERS = {

    // مخطط أعمدة مكدسة: مستويات الأداء الأربعة لكل مادة
    "levels-stacked"(values, subjects) {
      const labels = subjects.map(s => s.label);
      const datasets = LEVELS.map(l => ({
        label: l.label,
        backgroundColor: l.color,
        borderRadius: 4,
        maxBarThickness: 80,
        data: subjects.map(s => num(values[s.id + "-" + l.key])),
      }));
      const hasData = datasets.some(d => d.data.some(v => v !== null));
      return hasData ? { labels, datasets } : null;
    },

    // مخطط أعمدة مقارنة: نتيجة المدرسة مقابل المرجعيات المعيارية
    "benchmarks"(values, subjects) {
      const labels = subjects.map(s => s.label);
      const datasets = BENCHMARKS.map(b => ({
        label: b.label,
        backgroundColor: b.color,
        borderRadius: 4,
        maxBarThickness: 26,
        data: subjects.map(s => num(values[s.id + "-" + b.key])),
      }));
      // يظهر الرسم إذا توفرت نتيجة المدرسة (أي سنة) على الأقل
      const hasData = datasets.slice(0, 2).some(d => d.data.some(v => v !== null));
      return hasData ? { labels, datasets } : null;
    },

    // مخطط أفق تجمعي: المجالات الفرعية — 2025 مقابل 2024
    "subdomains"(values, sub) {
      const labels = sub.items.map(i => i.label);
      const datasets = YEAR_SERIES.map(y => ({
        label: y.label,
        backgroundColor: y.color,
        borderRadius: 4,
        maxBarThickness: 22,
        data: sub.items.map(i => num(values["sub-" + sub.id + "-" + i.id + "-" + y.key])),
      }));
      const hasData = datasets.some(d => d.data.some(v => v !== null));
      return hasData ? { labels, datasets } : null;
    },
  };

  /* ============================================================
     إضافة قيم النسب فوق الأعمدة — ضرورية للطباعة/PDF حيث لا
     توجد تلميحات تفاعلية. في المكدس: قيمة داخل الشريحة، وإلا
     فوق نهاية العمود.
     ============================================================ */
  const valueLabelPlugin = {
    id: "nafasValueLabels",
    afterDatasetsDraw(chart) {
      const stacked = chart.options.indexAxis === "y"
        ? false
        : !!chart.options.scales.y.stacked;
      const ctx = chart.ctx;
      ctx.save();
      ctx.font = "bold 11px " + FONT;
      chart.data.datasets.forEach((ds, di) => {
        const meta = chart.getDatasetMeta(di);
        if (meta.hidden) return;
        meta.data.forEach((bar, i) => {
          const v = ds.data[i];
          if (v === null || v === undefined) return;
          const txt = round1(v) + "%";
          if (stacked) {
            // حساب قمة وقاعدة الشريحة لتوسيط الرقم في منتصف الشريحة تماماً
            const topY = Math.min(bar.y, bar.base);
            const botY = Math.max(bar.y, bar.base);
            const segHeight = botY - topY;
            const centerY = (topY + botY) / 2;

            ctx.fillStyle = "#000000";
            ctx.textAlign = "center";
            if (segHeight >= 14 && v > 0) {
              ctx.textBaseline = "middle";
              ctx.fillText(txt, bar.x, centerY);
            } else if (v > 0) {
              ctx.textBaseline = "bottom";
              ctx.fillText(txt, bar.x, topY - 2);
            }
          } else {
            const horizontal = chart.options.indexAxis === "y";
            ctx.fillStyle = "#000000";
            if (horizontal) {
              ctx.textAlign = "left";
              ctx.textBaseline = "middle";
              ctx.fillText(txt, bar.x + 5, bar.y);
            } else {
              ctx.textAlign = "center";
              ctx.textBaseline = "bottom";
              ctx.fillText(txt, bar.x, bar.y - 4);
            }
          }
        });
      });
      ctx.restore();
    },
  };

  /* ============================================================
     المحرك — يدير إنشاء وتحديث الرسوم وأحوال الظهور والطباعة
     ============================================================ */
  const ChartEngine = {
    charts: {},      // canvasId -> { chart, canvas }
    stale: new Set(),// رسوم لم تُرسم لكون حاويتها مخفية (عرضها صفر)
    lastWidths: {},  // آخر عرض حقيقي لكل رسم — يُستخدم عطفًا عند الطباعة
    printing: false,

    init() {
      Chart.defaults.font.family = FONT;
      Chart.defaults.font.size = 13;
      Chart.defaults.color = "#33475b";
      Chart.defaults.borderColor = "rgba(51, 71, 91, 0.12)";
      Chart.register(valueLabelPlugin);

      // عند الطباعة تظهر كل التبويبات في CSS؛ نُبرزها هنا كي يكون
      // للرسوم المخفية عرض حقيقي قبل الرسم، ثم نعيد الوضع بعدها.
      window.addEventListener("beforeprint", () => {
        this.printing = true;
        this.closeModal(); // إعادة الكانفس لموضعه قبل الطباعة
        // إظهار صناديق الرسوم المطوية في مسار الطباعة
        document.querySelectorAll(".chart-card.collapsed").forEach(c => c.classList.add("print-force-open"));
        // إبراز كل التبويبات كي يكون للرسوم المخفية عرض حقيقي قبل الرسم
        document.querySelectorAll(".tab-pane").forEach(p => {
          p.classList.add("print-force-visible");
          if (p.clientWidth === 0) p.style.display = "block"; // إن لم تُطبَّق وسائط الطباعة بعد
        });
        // إن بقي رسم ما بعرض صفر فنثبّت عرضاً بديلاً (آخر عرض معروف)
        document.querySelectorAll("canvas[data-chart-type]").forEach(c => {
          if (c.clientWidth === 0) c.parentElement.style.width = (this.lastWidths[c.id] || 780) + "px";
        });
        this.update();
      });
      window.addEventListener("afterprint", () => {
        this.printing = false;
        document.querySelectorAll(".print-force-open").forEach(c => c.classList.remove("print-force-open"));
        document.querySelectorAll(".print-force-visible").forEach(p => p.classList.remove("print-force-visible"));
        document.querySelectorAll(".tab-pane").forEach(p => { p.style.display = ""; });
        document.querySelectorAll("canvas[data-chart-type]").forEach(c => {
          c.parentElement.style.width = "";
        });
        this.update();
      });
    },

    // استدعاء متزامن: في التبويبات غير الظاهرة قد لا يُنفَّذ rAF أبداً
    onTabSwitch() { this.update(); },
    onCardToggle() { this.update(); },

    /* ---------- المودال الكبير لعرض الرسوم ----------
       البطاقة مطوية افتراضياً؛ الزر ينقل الكانفس إلى جسم المودال
       لعرضه بحجم كبير، وعند الإغلاق يعود الكانفس إلى موضعه الأصلي. */
    ensureModal() {
      if (this.modal) return this.modal;
      const overlay = el("div", "chart-modal-overlay");
      const dialog = el("div", "chart-modal");
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");

      const header = el("div", "chart-modal-header");
      const title = el("h3", "chart-modal-title");
      const closeBtn = el("button", "chart-modal-close no-print", "✕ إغلاق");
      closeBtn.type = "button";
      header.append(title, closeBtn);

      const desc = el("p", "chart-modal-desc");
      const body = el("div", "chart-modal-body");
      dialog.append(header, desc, body);
      overlay.append(dialog);
      document.body.append(overlay);

      closeBtn.addEventListener("click", () => this.closeModal());
      overlay.addEventListener("click", (e) => { if (e.target === overlay) this.closeModal(); });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && overlay.classList.contains("open")) this.closeModal();
      });

      this.modal = { overlay, title, desc, body };
      return this.modal;
    },

    openModal(card, spec) {
      const modal = this.ensureModal();
      this.closeModal(); // إعادة أي كانفس مفتوح سابقاً إلى موضع أساسه
      const canvas = card.querySelector("canvas[data-chart-type]");
      if (!canvas) return;
      modal.title.textContent = spec.title;
      modal.desc.textContent = spec.description || "";
      modal.desc.style.display = spec.description ? "" : "none";
      // نقل الكانفس ورسالة نقص البيانات معاً إلى جسم المودال
      modal.body.appendChild(canvas);
      const msg = canvas._homeBox.querySelector(".chart-empty-msg");
      if (msg) modal.body.appendChild(msg);
      modal.overlay.classList.add("open");
      // الرسم بحجم المودال الجديد (أو إنشاؤه أول مرة)
      const existing = this.charts[canvas.id];
      if (existing) requestAnimationFrame(() => existing.chart.resize());
      this.update();
    },

    closeModal() {
      if (!this.modal || !this.modal.overlay.classList.contains("open")) return;
      const canvas = this.modal.body.querySelector("canvas[data-chart-type]");
      if (canvas && canvas._homeBox) {
        canvas._homeBox.appendChild(canvas);
        const msg = this.modal.body.querySelector(".chart-empty-msg");
        if (msg) canvas._homeBox.appendChild(msg);
      }
      this.modal.overlay.classList.remove("open");
    },

    update(values) {
      if (!hasChartLib) return;
      const v = values || this.collectValues();
      document.querySelectorAll("canvas[data-chart-type]").forEach(canvas => {
        this.renderCanvas(canvas, v);
      });
    },

    collectValues() {
      const values = {};
      document.querySelectorAll("input[id], textarea[id]").forEach(i => { values[i.id] = i.value; });
      return values;
    },

    renderCanvas(canvas, values) {
      const def = this.resolveDef(canvas);
      if (!def) return;

      const container = canvas.parentElement;
      const msg = container.querySelector(".chart-empty-msg");
      const built = CHART_BUILDERS[def.type](values, def.ctx);

      if (!built) {
        canvas.style.display = "none";
        if (msg) msg.style.display = "flex";
        this.dispose(canvas.id);
        return;
      }
      if (msg) msg.style.display = "none";
      canvas.style.display = "block";

      // التبويب غير النشط عرضه صفر — نؤجل الرسم حتى يُفتح التبويب
      if (canvas.clientWidth === 0 && !this.printing) {
        this.stale.add(canvas.id);
        return;
      }
      this.stale.delete(canvas.id);

      const existing = this.charts[canvas.id];
      if (existing) {
        // أثناء الطباعة بعرض صفر: نحافظ على الرسم السابق بدل مسحه
        if (this.printing && canvas.clientWidth === 0) return;
        existing.chart.data.labels = built.labels;
        existing.chart.data.datasets = built.datasets;
        existing.chart.update(this.printing ? "none" : undefined);
        if (!this.printing) this.lastWidths[canvas.id] = canvas.clientWidth;
      } else {
        this.dispose(canvas.id);
        this.charts[canvas.id] = {
          chart: new Chart(canvas, this.buildConfig(def, built)),
          canvas,
        };
        if (!this.printing) this.lastWidths[canvas.id] = canvas.clientWidth;
      }
    },

    // يقرأ نوع الرسم وسياقه (المادة/المجال الفرعي) من سمات الكانفس
    resolveDef(canvas) {
      const type = canvas.dataset.chartType;
      const section = REPORT_SECTIONS.find(s => s.id === canvas.dataset.sectionId);
      if (!section || !CHART_BUILDERS[type]) return null;
      if (type === "subdomains") {
        const sub = section.subjectSubdomains.find(x => x.id === canvas.dataset.subId);
        return sub ? { type, ctx: sub } : null;
      }
      return { type, ctx: section.subjects };
    },

    buildConfig(def, built) {
      const horizontal = def.type === "subdomains";
      const common = {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 12, bottom: 4, left: 4, right: 4 },
        },
        animation: { duration: this.printing ? 0 : 450 },
        plugins: {
          legend: {
            position: "bottom",
            rtl: true,
            labels: { boxWidth: 14, boxHeight: 14, padding: 14, font: { size: 13 } },
          },
          tooltip: {
            rtl: true,
            callbacks: {
              label: (item) => (item.dataset.label + ": " + round1(item.parsed[
                horizontal ? "x" : "y"
              ]) + "%"),
            },
          },
        },
      };

      const axisPercent = (axis) => Object.assign(axis, {
        min: 0,
        suggestedMax: 100,
        ticks: { callback: (v) => v + "%", font: { size: 12 } },
      });

      let config;
      if (horizontal) {
        config = {
          type: "bar",
          data: built,
          options: Object.assign(common, {
            indexAxis: "y",
            scales: {
              x: axisPercent({ grid: { color: "rgba(51,71,91,0.08)" } }),
              y: { position: "right", ticks: { font: { size: 13 } }, grid: { display: false } },
            },
          }),
        };
      } else {
        const stacked = def.type === "levels-stacked";
        config = {
          type: "bar",
          data: built,
          options: Object.assign(common, {
            scales: {
              y: axisPercent({
                stacked,
                grid: { color: "rgba(51,71,91,0.08)" },
                title: { display: true, text: "النسبة", font: { size: 12 } },
              }),
              x: { stacked, grid: { display: false }, ticks: { font: { size: 14, weight: "600" } } },
            },
          }),
        };
      }
      return config;
    },

    dispose(id) {
      if (this.charts[id]) {
        this.charts[id].chart.destroy();
        delete this.charts[id];
      }
    },
  };

  window.ChartEngine = ChartEngine;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => ChartEngine.init());
  } else {
    ChartEngine.init();
  }
})();