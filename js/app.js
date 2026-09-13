/* ============================================================
   تقرير نافس — المحرك الرئيسي للتطبيق (App Controller)
   ============================================================ */

(function () {
  "use strict";

  const SAVE_HIDE_DELAY = 2000;
  let saveTimer = null;
  let isInitialized = false;

  const App = {
    // 1) بناء واجهة المستخدم والتبويبات
    init() {
      if (isInitialized) return;
      isInitialized = true;
      this.buildTabs();
      this.buildReport();
      this.bindEvents();
      this.restore();
      this.refresh(true);
    },

    buildTabs() {
      const nav = document.getElementById("tabs");
      if (!nav) return;
      TABS.forEach((t, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "tab-btn" + (i === 0 ? " active" : "");
        btn.textContent = t.label;
        btn.dataset.tab = t.id;
        btn.addEventListener("click", () => this.switchTab(t.id));
        nav.append(btn);
      });
    },

    switchTab(tabId, save = true) {
      document.querySelectorAll(".tab-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.tab === tabId);
      });
      document.querySelectorAll(".tab-pane").forEach(p => {
        p.classList.toggle("active", p.dataset.tab === tabId);
      });
      // إعادة رسم الرسوم البيانية في التبويب المفتوح (كانت عرضها صفر وهو مخفي)
      if (window.ChartEngine) ChartEngine.onTabSwitch();
      if (save) {
        StorageManager.saveActiveTab(tabId);
      }
    },

    buildReport() {
      const main = document.getElementById("report");
      if (!main) return;
      REPORT_SECTIONS.forEach(section => {
        const builder = SECTION_BUILDERS[section.type];
        if (!builder) {
          console.warn("نوع قسم غير معروف:", section.type);
          return;
        }
        let pane = main.querySelector('.tab-pane[data-tab="' + section.tab + '"]');
        if (!pane) {
          pane = document.createElement("div");
          pane.className = "tab-pane";
          pane.dataset.tab = section.tab;
          main.append(pane);
        }
        const card = document.createElement("section");
        card.className = "card";
        card.dataset.sectionId = section.id;
        card.append(Object.assign(document.createElement("h2"), { textContent: section.title }));
        card.append(builder(section));
        pane.append(card);
      });
    },

    // 2) ربط الأحداث والأزرار
    bindEvents() {
      const printBtn = document.getElementById("btn-print");
      const exportPdfBtn = document.getElementById("btn-export-pdf");
      const clearBtn = document.getElementById("btn-clear");
      const toggleCoverBtn = document.getElementById("btn-toggle-cover");
      const coverWrapper = document.getElementById("cover-page-wrapper");

      if (printBtn) printBtn.addEventListener("click", () => this.exportPDF());
      if (exportPdfBtn) exportPdfBtn.addEventListener("click", () => this.exportPDF());
      if (clearBtn) clearBtn.addEventListener("click", () => this.clearAll());

      if (toggleCoverBtn && coverWrapper) {
        toggleCoverBtn.addEventListener("click", () => {
          const isCollapsed = coverWrapper.classList.toggle("collapsed");
          toggleCoverBtn.textContent = isCollapsed ? "عرض المعاينة" : "إخفاء المعاينة";
        });
      }

      document.addEventListener("input", () => this.refresh(false));

      // حفظ موضع التمرير تلقائياً عبر StorageManager
      window.addEventListener("scroll", () => {
        StorageManager.saveScrollY(window.scrollY);
      }, { passive: true });

      window.addEventListener("beforeunload", () => {
        StorageManager.saveScrollY(window.scrollY);
      });
    },

    // 3) جمع البيانات وحساب النتائج
    collectValues() {
      const values = {};
      document.querySelectorAll("input[id], textarea[id]").forEach(input => {
        values[input.id] = input.value;
      });
      return values;
    },

    refresh(silent = false) {
      const values = this.collectValues();
      this.updateCoverPage(values);
      this.updateStats(values);
      this.updateCompare(values);
      this.updateSubjectCalcs(values);
      this.updateSubdomainCalcs(values);
      this.updateProgress();
      // تحديث الرسوم البيانية بنفس البيانات المحصّلة
      if (window.ChartEngine) ChartEngine.update(values);
      this.save(values, silent);
    },

    updateCoverPage(values) {
      const schoolNode = document.getElementById("cover-school-display");
      const gradeNode = document.getElementById("cover-grade-display");
      const principalNode = document.getElementById("cover-principal-display");
      const yearNode = document.getElementById("cover-year-display");

      // مزامنة ثنائية بين خانة مدير المدرسة في البيانات الأساسية وفريق العمل
      const pBasic = document.getElementById("principal");
      const pTeam = document.getElementById("team-principal");
      if (pBasic && pTeam) {
        if (document.activeElement === pBasic) {
          pTeam.value = pBasic.value;
        } else if (document.activeElement === pTeam) {
          pBasic.value = pTeam.value;
        } else {
          if (pBasic.value === "" && pTeam.value !== "") pBasic.value = pTeam.value;
          else if (pTeam.value === "" && pBasic.value !== "") pTeam.value = pBasic.value;
        }
      }

      // 1) اسم المدرسة
      if (schoolNode) {
        const val = (values["school"] || "").trim();
        schoolNode.textContent = val || "الابتدائية الثانية والستون بعد الثلاثمائة ٣٦٢";
      }

      // 2) الصف الدراسي
      if (gradeNode) {
        const val = (values["grade"] || "").trim();
        if (val) {
          gradeNode.textContent = val.startsWith("للصف") ? val : ("للصف " + val);
        } else {
          gradeNode.textContent = "للصف السادس الابتدائي";
        }
      }

      // 3) مدير المدرسة
      if (principalNode) {
        const val = (values["principal"] || values["team-principal"] || "").trim();
        if (val) {
          principalNode.textContent = val.startsWith("مدير المدرسة") ? val : ("مدير المدرسة / " + val);
        } else {
          principalNode.textContent = "";
        }
      }

      // 4) العام الدراسي
      if (yearNode) {
        const val = (values["year"] || "").trim();
        if (val) {
          yearNode.textContent = val.endsWith("هـ") ? val : (val + "هـ");
        } else {
          yearNode.textContent = "١٤٤٦هـ";
        }
      }
    },

    updateStats(values) {
      REPORT_SECTIONS
        .filter(s => s.type === "stats")
        .forEach(s => {
          s.stats.forEach(st => {
            const result = CALCULATIONS[st.calc](values);
            const node = document.getElementById(st.id);
            if (node) {
              node.textContent = typeof result === "object" ? result.text : result;
              if (typeof result === "object") {
                node.classList.toggle("placeholder", !!result.placeholder);
              }
            }
          });

          const warn = document.getElementById(s.id + "-warn");
          if (warn && s.validation) {
            const message = VALIDATIONS[s.validation](values);
            warn.textContent = message || "";
            warn.classList.toggle("show", !!message);
          }
        });
    },

    updateCompare(values) {
      REPORT_SECTIONS
        .filter(s => s.type === "compare")
        .forEach(() => {
          const result = CALCULATIONS.change(values);
          const node = document.getElementById("change-value");
          if (node) node.textContent = result.text;
          const banner = document.getElementById("change-banner");
          if (banner) {
            banner.classList.remove("up", "down");
            if (result.direction === "up" || result.direction === "down") {
              banner.classList.add(result.direction);
            }
          }
        });
    },

    updateSubjectCalcs(values) {
      REPORT_SECTIONS
        .filter(s => s.type === "subject-cards")
        .forEach(sec => {
          sec.subjects.forEach(sub => {
            const y2026 = values[sub.id + "-y2026"];
            const y2025 = values[sub.id + "-y2025"];
            const admin = values[sub.id + "-admin2026"];
            const kingdom = values[sub.id + "-kingdom2026"];
            const target = values[sub.id + "-target2026"];

            const diffs = [
              { id: sub.id + "-diff-change",  result: CALCULATIONS.diff(y2026, y2025) },
              { id: sub.id + "-diff-admin",   result: CALCULATIONS.diff(y2026, admin) },
              { id: sub.id + "-diff-kingdom", result: CALCULATIONS.diff(y2026, kingdom) },
              { id: sub.id + "-diff-target",  result: CALCULATIONS.diff(y2026, target) },
            ];

            diffs.forEach(d => {
              const node = document.getElementById(d.id);
              if (node) {
                node.textContent = d.result.text;
                node.className = "calc-val " + (d.result.direction || "none");
              }
            });
          });
        });
    },

    updateSubdomainCalcs(values) {
      REPORT_SECTIONS
        .filter(s => s.type === "subdomains-cards")
        .forEach(sec => {
          sec.subjectSubdomains.forEach(sub => {
            sub.items.forEach(item => {
              const itemSchool = values[`sub-${sub.id}-${item.id}-y2026`];
              const itemAdmin = values[`sub-${sub.id}-${item.id}-admin`];
              const itemKingdom = values[`sub-${sub.id}-${item.id}-kingdom`];

              const diffAdmin = CALCULATIONS.diff(itemSchool, itemAdmin, "نسبة الإدارة");
              const diffKingdom = CALCULATIONS.diff(itemSchool, itemKingdom, "نسبة المملكة");

              const adminNode = document.getElementById(`sub-${sub.id}-${item.id}-diff-admin`);
              if (adminNode) {
                adminNode.textContent = diffAdmin.text;
                adminNode.className = "calc-val " + (diffAdmin.direction || "none");
              }

              const kingdomNode = document.getElementById(`sub-${sub.id}-${item.id}-diff-kingdom`);
              if (kingdomNode) {
                kingdomNode.textContent = diffKingdom.text;
                kingdomNode.className = "calc-val " + (diffKingdom.direction || "none");
              }
            });
          });
        });
    },

    updateProgress() {
      const fields = [...document.querySelectorAll("#report input[id], #report textarea[id]")];
      const filled = fields.filter(i => i.value.trim() !== "").length;
      const pct = fields.length ? Math.round((filled / fields.length) * 100) : 0;

      const fillNode = document.getElementById("progress-fill");
      const textNode = document.getElementById("progress-text");
      if (fillNode) fillNode.style.width = pct + "%";
      if (textNode) {
        textNode.textContent =
          pct === 0 ? "لم تبدأ التعبئة بعد"
        : pct === 100 ? "اكتمل التقرير ✓"
        : "أكملت " + filled + " من " + fields.length + " خانة";
      }
    },

    // 4) إدارة الحفظ في التخزين المحلي عبر StorageManager
    save(values, silent) {
      StorageManager.saveReportData(values);
      if (!silent) this.flashSaved();
    },

    flashSaved() {
      const note = document.getElementById("save-note");
      if (!note) return;
      note.textContent = "✓ تم الحفظ";
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => { note.textContent = ""; }, SAVE_HIDE_DELAY);
    },

    restore() {
      // 1) استرجاع القيم المدخلة
      const saved = StorageManager.getReportData();
      Object.entries(saved).forEach(([id, value]) => {
        const input = document.getElementById(id);
        if (input) input.value = value;
      });

      // 2) استرجاع التبويب النشط
      const savedTab = StorageManager.getActiveTab();
      const tabExists = TABS.some(t => t.id === savedTab);
      this.switchTab(tabExists ? savedTab : TABS[0].id, false);

      // 3) استرجاع موضع التمرير في الصفحة (Scroll Position)
      const savedY = StorageManager.getScrollY();
      if (savedY !== null && !isNaN(savedY) && savedY > 0) {
        requestAnimationFrame(() => {
          window.scrollTo({ top: savedY, behavior: "instant" });
        });
      }
    },

    exportPDF() {
      // إظهار جميع البطاقات والأقسام والأجسام المطوية أثناء التصدير للـ PDF
      document.querySelectorAll(".subject-card.collapsed").forEach(card => {
        card.classList.remove("collapsed");
      });
      window.print();
    },

    clearAll() {
      if (!confirm("هل أنت متأكد من مسح جميع البيانات؟ لا يمكن التراجع.")) return;
      document.querySelectorAll("#report input, #report textarea").forEach(i => { i.value = ""; });
      StorageManager.clearAll();
      this.switchTab(TABS[0].id, false);
      this.refresh(true);
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => App.init());
  } else {
    App.init();
  }
})();
