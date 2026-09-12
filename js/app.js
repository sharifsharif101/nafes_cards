/* ============================================================
   تقرير نافس — المحرك الرئيسي للتطبيق (App Controller)
   ============================================================ */

(function () {
  "use strict";

  const STORAGE_KEY = "nafas-report-1447";
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

    switchTab(tabId) {
      document.querySelectorAll(".tab-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.tab === tabId);
      });
      document.querySelectorAll(".tab-pane").forEach(p => {
        p.classList.toggle("active", p.dataset.tab === tabId);
      });
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
      this.switchTab(TABS[0].id);
    },

    // 2) ربط الأحداث والأزرار
    bindEvents() {
      const printBtn = document.getElementById("btn-print");
      const clearBtn = document.getElementById("btn-clear");
      if (printBtn) printBtn.addEventListener("click", () => window.print());
      if (clearBtn) clearBtn.addEventListener("click", () => this.clearAll());
      document.addEventListener("input", () => this.refresh(false));
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
      this.updateStats(values);
      this.updateCompare(values);
      this.updateSubjectCalcs(values);
      this.updateSubdomainCalcs(values);
      this.updateProgress();
      this.save(values, silent);
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
            const y2025 = values[sub.id + "-y2025"];
            const y2024 = values[sub.id + "-y2024"];
            const admin = values[sub.id + "-admin2025"];
            const kingdom = values[sub.id + "-kingdom2025"];
            const target = values[sub.id + "-target2025"];

            const diffs = [
              { id: sub.id + "-diff-change",  result: CALCULATIONS.diff(y2025, y2024) },
              { id: sub.id + "-diff-admin",   result: CALCULATIONS.diff(y2025, admin) },
              { id: sub.id + "-diff-kingdom", result: CALCULATIONS.diff(y2025, kingdom) },
              { id: sub.id + "-diff-target",  result: CALCULATIONS.diff(y2025, target) },
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
            const tab2Admin = values[sub.id + "-admin2025"];
            const tab3Admin = values["sub-" + sub.id + "-admin2025"];
            const adminVal = (tab3Admin !== undefined && tab3Admin !== "") ? tab3Admin : tab2Admin;

            const tab2Kingdom = values[sub.id + "-kingdom2025"];
            const tab3Kingdom = values["sub-" + sub.id + "-kingdom2025"];
            const kingdomVal = (tab3Kingdom !== undefined && tab3Kingdom !== "") ? tab3Kingdom : tab2Kingdom;

            // مزامنة تلقائية للقيم بين التبويب الثاني والتبويب الثالث
            const inTab2Admin = document.getElementById(sub.id + "-admin2025");
            const inTab3Admin = document.getElementById("sub-" + sub.id + "-admin2025");
            if (inTab2Admin && inTab3Admin) {
              if (document.activeElement === inTab3Admin && inTab2Admin.value !== inTab3Admin.value) {
                inTab2Admin.value = inTab3Admin.value;
              } else if (document.activeElement === inTab2Admin && inTab3Admin.value !== inTab2Admin.value) {
                inTab3Admin.value = inTab2Admin.value;
              }
            }

            const inTab2Kingdom = document.getElementById(sub.id + "-kingdom2025");
            const inTab3Kingdom = document.getElementById("sub-" + sub.id + "-kingdom2025");
            if (inTab2Kingdom && inTab3Kingdom) {
              if (document.activeElement === inTab3Kingdom && inTab2Kingdom.value !== inTab3Kingdom.value) {
                inTab2Kingdom.value = inTab3Kingdom.value;
              } else if (document.activeElement === inTab2Kingdom && inTab3Kingdom.value !== inTab2Kingdom.value) {
                inTab3Kingdom.value = inTab2Kingdom.value;
              }
            }

            sub.items.forEach(item => {
              const item2025 = values[`sub-${sub.id}-${item.id}-y2025`];
              const item2024 = values[`sub-${sub.id}-${item.id}-y2024`];

              const diffChange = CALCULATIONS.diff(item2025, item2024);
              const diffAdmin = CALCULATIONS.diff(item2025, adminVal);
              const diffKingdom = CALCULATIONS.diff(item2025, kingdomVal);

              const changeNode = document.getElementById(`sub-${sub.id}-${item.id}-diff-change`);
              if (changeNode) {
                changeNode.textContent = diffChange.text;
                changeNode.className = "calc-val " + (diffChange.direction || "none");
              }

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
      const inputs = [...document.querySelectorAll("#report input[id]")];
      const filled = inputs.filter(i => i.value.trim() !== "").length;
      const pct = inputs.length ? Math.round((filled / inputs.length) * 100) : 0;

      const fillNode = document.getElementById("progress-fill");
      const textNode = document.getElementById("progress-text");
      if (fillNode) fillNode.style.width = pct + "%";
      if (textNode) {
        textNode.textContent =
          pct === 0 ? "لم تبدأ التعبئة بعد"
        : pct === 100 ? "اكتمل التقرير ✓"
        : "أكملت " + filled + " من " + inputs.length + " خانة";
      }
    },

    // 4) إدارة الحفظ في التخزين المحلي (LocalStorage)
    save(values, silent) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
        if (!silent) this.flashSaved();
      } catch (e) { /* تجاهل خطأ التخزين في البيئات المقيدة */ }
    },

    flashSaved() {
      const note = document.getElementById("save-note");
      if (!note) return;
      note.textContent = "✓ تم الحفظ";
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => { note.textContent = ""; }, SAVE_HIDE_DELAY);
    },

    restore() {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        Object.entries(saved).forEach(([id, value]) => {
          const input = document.getElementById(id);
          if (input) input.value = value;
        });
      } catch (e) { /* بيانات تالفة */ }
    },

    clearAll() {
      if (!confirm("هل أنت متأكدة من مسح جميع البيانات؟ لا يمكن التراجع.")) return;
      document.querySelectorAll("#report input, #report textarea").forEach(i => { i.value = ""; });
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      this.refresh(true);
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => App.init());
  } else {
    App.init();
  }
})();
