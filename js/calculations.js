/* ============================================================
   تقرير نافس — منطق الحسابات
   ------------------------------------------------------------
   كل دالة حسابية تستقبل كائن القيم (values) وتعيد النتيجة،
   أو PLACEHOLDER إذا لم تتوفر البيانات الكافية.
   لإضافة حساب جديد: أضف دالة هنا وسجّلها في CALCULATIONS.
   ============================================================ */

// القيمة المعروضة عند نقص البيانات (بديل #DIV/0! في الإكسل)
const PLACEHOLDER = "—";

function readNumber(value) {
  const n = parseFloat(value);
  return isNaN(n) ? null : n;
}

const CALCULATIONS = {

  // الغياب = العدد الكلي − المختبرات
  absent(values) {
    const total = readNumber(values.total);
    const tested = readNumber(values.tested);
    if (total === null || tested === null) return PLACEHOLDER;
    return Math.max(total - tested, 0);
  },

  // نسبة المختبرات = المختبرات ÷ الكلي × 100
  rate(values) {
    const total = readNumber(values.total);
    if (total === null || total === 0) {
      return { text: "انتظر البيانات", placeholder: true };
    }
    const tested = readNumber(values.tested);
    const pct = ((tested ?? 0) / total) * 100;
    return { text: pct.toFixed(1) + "%", placeholder: false };
  },

  // مقدار التغيير = نتيجة 2026 − نتيجة 2025
  change(values) {
    const a = readNumber(values.y2025);
    const b = readNumber(values.y2026);
    if (a === null || b === null) {
      return { text: PLACEHOLDER, direction: "none" };
    }
    const diff = b - a;
    if (diff === 0) return { text: "0.0% بدون تغيير", direction: "flat" };
    return {
      text: (diff > 0 ? "+" : "") + diff.toFixed(1) + "%" + (diff > 0 ? " ↑" : " ↓"),
      direction: diff > 0 ? "up" : "down",
    };
  },

  // فرق إحصائي فرعي = قيمة أ − قيمة ب
  diff(valA, valB, targetLabel = null) {
    const a = readNumber(valA);
    const b = readNumber(valB);
    if (a === null && b === null) {
      return { text: PLACEHOLDER, direction: "none" };
    }
    if (a !== null && b === null) {
      return {
        text: targetLabel ? "⚠️ يلزم إدخال " + targetLabel : PLACEHOLDER,
        direction: "missing-target",
        placeholder: true
      };
    }
    if (a === null && b !== null) {
      return { text: PLACEHOLDER, direction: "none" };
    }
    const d = a - b;
    if (d === 0) return { text: "0.0%", direction: "flat" };
    return {
      text: (d > 0 ? "+" : "") + d.toFixed(1) + "%",
      direction: d > 0 ? "up" : "down",
    };
  },
};

// ---------- فحوصات التحقق المنطقي ----------
// كل فحص يعيد رسالة خطأ عند وجود تعارض، أو null إذا كانت البيانات سليمة
const VALIDATIONS = {

  // عدد المختبرات يجب ألا يتجاوز العدد الكلي
  "tested-vs-total"(values) {
    const total = readNumber(values.total);
    const tested = readNumber(values.tested);
    if (total !== null && tested !== null && tested > total) {
      return "تنبيه: عدد المختبرات أكبر من العدد الكلي — رجاءً راجعي الأرقام.";
    }
    return null;
  },
};
