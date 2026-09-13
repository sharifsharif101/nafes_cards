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
      this.updateAutoRanking(values);
      this.updateWeakestSubdomains(values);
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
        schoolNode.textContent = val;
      }

      // 2) الصف الدراسي
      if (gradeNode) {
        const val = (values["grade"] || "").trim();
        if (val) {
          gradeNode.textContent = val.startsWith("للصف") ? val : ("للصف " + val);
        } else {
          gradeNode.textContent = "";
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
          yearNode.textContent = "";
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
      const testedNum = parseFloat(values["tested"]);
      REPORT_SECTIONS
        .filter(s => s.type === "subject-cards")
        .forEach(sec => {
          sec.subjects.forEach(sub => {
            // تحديث الأعداد الفعلية لمستويات الأداء باستخدام خوارزمية المتبقي الأكبر (Largest Remainder Method)
            const levelCols = sec.levelColumns || [];
            const levelData = [];
            let totalPct = 0;

            levelCols.forEach(lvl => {
              const pctNum = parseFloat(values[sub.id + "-" + lvl.id]);
              if (!isNaN(pctNum)) {
                levelData.push({ lvl, pctNum });
                totalPct += pctNum;
              }
            });

            if (!isNaN(testedNum) && testedNum > 0 && levelData.length > 0) {
              // حساب العدد الدقيق والعدد الصحيح والمتبقي لكل مستوى
              const calcItems = levelData.map(item => {
                const exact = (item.pctNum / 100) * testedNum;
                const floor = Math.floor(exact);
                const remainder = exact - floor;
                return { id: item.lvl.id, floor, remainder, finalCount: floor };
              });

              const sumFloor = calcItems.reduce((acc, curr) => acc + curr.floor, 0);
              let diff = testedNum - sumFloor;

              // إذا كان هناك فرق في المجموع بسبب التقريب وكان مجموع النسب قريباً من 100%
              if (diff > 0 && diff < levelData.length) {
                // ترتيب المستويات حسب أعلى متبقي (Remainder) لتوزيع الطلاب المتبقين
                const sorted = [...calcItems].sort((a, b) => b.remainder - a.remainder);
                for (let i = 0; i < diff; i++) {
                  sorted[i].finalCount += 1;
                }
              }

              // عرض النتيجة النهائية لكل مستوى
              levelCols.forEach(lvl => {
                const countNode = document.getElementById(sub.id + "-" + lvl.id + "-count");
                if (countNode) {
                  const found = calcItems.find(c => c.id === lvl.id);
                  if (found) {
                    countNode.textContent = "عدد الطلاب: " + found.finalCount;
                  } else {
                    countNode.textContent = "عدد الطلاب: —";
                  }
                }
              });
            } else {
              levelCols.forEach(lvl => {
                const countNode = document.getElementById(sub.id + "-" + lvl.id + "-count");
                if (countNode) {
                  countNode.textContent = "عدد الطلاب: —";
                }
              });
            }

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

    updateAutoRanking(values) {
      const box = document.getElementById("auto-rank-box");
      if (!box) return;

      const items = [
        { id: "math", name: "مادة الرياضيات", val: parseFloat(values["math-y2026"]) },
        { id: "sci",  name: "مادة العلوم",     val: parseFloat(values["sci-y2026"]) },
        { id: "read", name: "مادة القراءة",    val: parseFloat(values["read-y2026"]) },
      ];

      const validItems = items.filter(i => !isNaN(i.val));

      if (validItems.length === 0) {
        box.innerHTML = `<div class="rank-empty-msg">أدخل نسبة المجتازين لعام 2026 في بطاقات المواد أعلاه لعرض الترتيب التلقائي للمواد من الأعلى إلى الأدنى.</div>`;
        return;
      }

      // فرز المواد من الأعلى نسبة إلى الأدنى
      validItems.sort((a, b) => b.val - a.val);

      // حساب المراكز مع مراعاة حالة التساوي والتعادل (Ties)
      let currentRank = 1;
      const computedItems = validItems.map((item, index, arr) => {
        if (index > 0 && item.val === arr[index - 1].val) {
          return { ...item, rankNum: arr[index - 1].rankNum, isTie: true };
        }
        return { ...item, rankNum: index + 1, isTie: false };
      });

      const finalItems = computedItems.map(item => {
        const tieCount = computedItems.filter(x => x.val === item.val).length;
        return { ...item, hasTie: tieCount > 1 };
      });

      const allEqual = finalItems.length === 3 && finalItems.every(x => x.val === finalItems[0].val);

      let html = `<div class="auto-rank-grid">`;
      finalItems.forEach((item, idx) => {
        let badgeText = "";
        let subText = "";
        let colorClass = `rank-${item.rankNum}`;

        if (allEqual) {
          badgeText = "مركز متساوي";
          subText = "جميع المواد بنفس النسبة";
          colorClass = "rank-tie";
        } else if (item.rankNum === 1) {
          badgeText = item.hasTie ? "المركز الأول (مكرر)" : "المركز الأول";
          subText = "أعلى نسبة اجتياز";
          colorClass = "rank-1";
        } else if (item.rankNum === 2) {
          badgeText = item.hasTie ? "المركز الثاني (مكرر)" : "المركز الثاني";
          subText = "أداء متوسط";
          colorClass = "rank-2";
        } else if (item.rankNum === 3) {
          badgeText = item.hasTie ? "المركز الثالث (مكرر)" : "المركز الثالث";
          subText = "أدنى نسبة اجتياز";
          colorClass = "rank-3";
        }

        html += `
          <div class="auto-rank-card ${colorClass}">
            <div class="auto-rank-header">
              <span class="auto-rank-badge">${badgeText}</span>
              <span class="auto-rank-sub">${subText}</span>
            </div>
            <div class="auto-rank-body">
              <h4 class="auto-rank-subject">${item.name}</h4>
              <div class="auto-rank-pct">${item.val}%</div>
            </div>
          </div>
        `;
      });
      html += `</div>`;
      box.innerHTML = html;
    },

    updateWeakestSubdomains(values) {
      const box = document.getElementById("weak-subdomains-box");
      if (!box) return;

      const subSection = REPORT_SECTIONS.find(s => s.type === "subdomains-cards");
      if (!subSection || !subSection.subjectSubdomains) return;

      const results = [];

      subSection.subjectSubdomains.forEach(sub => {
        let minVal = Infinity;
        let weakItems = [];

        sub.items.forEach(item => {
          const valStr = values[`sub-${sub.id}-${item.id}-y2026`];
          const num = parseFloat(valStr);
          if (!isNaN(num)) {
            if (num < minVal) {
              minVal = num;
              weakItems = [{ label: item.label, val: num }];
            } else if (num === minVal) {
              weakItems.push({ label: item.label, val: num });
            }
          }
        });

        if (weakItems.length > 0) {
          results.push({
            subjectId: sub.id,
            subjectLabel: sub.label.replace("مجال: ", "مادة "),
            weakItems,
            minVal
          });
        }
      });

      if (results.length === 0) {
        box.innerHTML = `
          <div class="weak-subdomain-empty">
            أدخل نسب اجتياز المدرسة لعام 2026 في <strong>تبويب المجالات الفرعية</strong> لتحديد وعرض المجال الفرعي الأضعف في كل مادة هنا تلقائياً.
          </div>
        `;
        return;
      }

      let html = `
        <div class="weak-priority-banner">
          <h3 class="priority-banner-title">المجالات الفرعية الأكثر احتياجاً للتطوير (أدنى نسبة اجتياز للمدرسة):</h3>
          <ul class="priority-list">
      `;

      results.forEach(res => {
        const itemNames = res.weakItems.map(i => i.label).join(" و ");
        html += `
          <li class="priority-item">
            <span class="subject-badge-pill">${res.subjectLabel}</span>
            <span class="priority-text">المجال الفرعي الأضعف: <strong>${itemNames}</strong> بنسبة اجتياز <strong>${res.minVal}%</strong></span>
          </li>
        `;
      });

      html += `
          </ul>
        </div>
      `;

      box.innerHTML = html;
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
