import { useState } from "react";

const FORMSPREE_ENDPOINT = "https://formspree.io/f/mykaoqqr";

const C = {
  parchment: "#FAF7F0",
  warm:      "#FDF9F3",
  gold:      "#C9A84C",
  goldFaint: "#F5EDD4",
  deep:      "#2A1F0E",
  mid:       "#6B5535",
  soft:      "#A08860",
  border:    "#E4D8C0",
  terra:     "#B8704A",
  white:     "#FFFFFF",
};

const font = {
  display: "'Georgia', 'Times New Roman', serif",
  body:    "'Helvetica Neue', Arial, sans-serif",
};

const PHASES = ["●", "◐", "○", "◑"];

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const STEPS = [
  {
    id: "name",
    section: "Who you are",
    title: "What's your name?",
    hint: "We'll personalize your protocol just for you.",
    type: "text",
    placeholder: "Your first name",
    key: "name",
  },
  {
    id: "age",
    section: "Who you are",
    title: "How old are you?",
    hint: "Age shapes hormone recovery and nutrient needs.",
    type: "text",
    placeholder: "Your age",
    key: "age",
    inputMode: "numeric",
  },
  {
    id: "birthDate",
    section: "Your birth",
    title: "When did you give birth?",
    hint: "This determines your exact week of recovery.",
    type: "date_dropdowns",
    key: "birthDate",
  },
  {
    id: "delivery",
    section: "Your birth",
    title: "How did you deliver?",
    hint: "Recovery timelines differ significantly between delivery types.",
    type: "pills_single",
    key: "delivery",
    options: [
      "Vaginal",
      "Vaginal — with tearing or episiotomy",
      "Planned C-section",
      "Emergency C-section",
    ],
  },
  {
    id: "labor",
    section: "Your birth",
    title: "How long were you in labor?",
    hint: "Labor duration significantly impacts physical recovery — even when it ends in a C-section.",
    type: "pills_single",
    key: "labor",
    options: [
      "No labor — went straight to surgery",
      "Under 6 hours",
      "6–12 hours",
      "12–24 hours",
      "Over 24 hours",
    ],
    conditional: (answers) => answers.delivery && answers.delivery !== "Planned C-section",
  },
  {
    id: "breastfeeding",
    section: "Your body now",
    title: "Are you breastfeeding?",
    hint: "This affects nutrition, hormones, and which treatments are safe.",
    type: "pills_single",
    key: "breastfeeding",
    options: [
      "Yes — exclusively",
      "Yes — mixed (breast + formula)",
      "No — formula only",
      "I've stopped recently",
    ],
  },
  {
    id: "conditions",
    section: "Your body now",
    title: "Any of these apply to you?",
    hint: "Select all that apply — this shapes your protocol's clinical layer.",
    type: "pills_multi_other",
    key: "conditions",
    otherKey: "conditionsOther",
    options: [
      "Diastasis recti",
      "Pelvic floor dysfunction",
      "Postpartum depression or anxiety",
      "Thyroid imbalance",
      "Gestational diabetes",
      "Anemia",
      "Surgical complications",
      "None of the above",
    ],
  },
  {
    id: "activity",
    section: "Your baseline",
    title: "What was your activity level before pregnancy?",
    hint: "Your starting point shapes how we ramp movement back.",
    type: "pills_single",
    key: "activity",
    options: [
      "Sedentary",
      "Light (walks, casual movement)",
      "Moderate (regular workouts)",
      "Active (athlete or trainer)",
    ],
  },
  {
    id: "goals",
    section: "Your intentions",
    title: "What matters most to you right now?",
    hint: "Choose everything that feels true.",
    type: "pills_multi",
    key: "goals",
    options: [
      "Energy & vitality",
      "Body composition",
      "Skin & aesthetic recovery",
      "Hormonal balance",
      "Mental clarity & mood",
      "Pelvic floor strength",
      "Nutritional rebuilding",
      "Overall wellness",
    ],
  },
];

function getVisibleSteps(answers) {
  return STEPS.filter(s => !s.conditional || s.conditional(answers));
}

function weeksPostpartum(dateObj) {
  if (!dateObj || !dateObj.day || !dateObj.month || !dateObj.year) return null;
  const birth = new Date(`${dateObj.year}-${String(dateObj.month).padStart(2,"0")}-${String(dateObj.day).padStart(2,"0")}`);
  if (isNaN(birth)) return null;
  return Math.floor((Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 7));
}

function formatDate(dateObj) {
  if (!dateObj || !dateObj.day || !dateObj.month || !dateObj.year) return "Not provided";
  return `${MONTHS[dateObj.month - 1]} ${dateObj.day}, ${dateObj.year}`;
}

function buildSummary(answers) {
  const weeks = weeksPostpartum(answers.birthDate);
  const conditions = (answers.conditions || []).filter(c => c !== "Other");
  if (answers.conditionsOther) conditions.push(`Other: ${answers.conditionsOther}`);
  const lines = [
    `NAME: ${answers.name || "Not provided"}`,
    `AGE: ${answers.age || "Not provided"}`,
    `BIRTH DATE: ${formatDate(answers.birthDate)}${weeks !== null ? ` (${weeks} weeks postpartum)` : ""}`,
    `DELIVERY TYPE: ${answers.delivery || "Not provided"}`,
    answers.labor ? `LABOR DURATION: ${answers.labor}` : null,
    `BREASTFEEDING: ${answers.breastfeeding || "Not provided"}`,
    `CONDITIONS: ${conditions.length ? conditions.join(", ") : "None"}`,
    `PRE-PREGNANCY ACTIVITY: ${answers.activity || "Not provided"}`,
    `GOALS: ${(answers.goals || []).join(", ") || "Not specified"}`,
  ].filter(Boolean);
  return lines.join("\n");
}

function daysInMonth(month, year) {
  if (!month || !year) return 31;
  return new Date(year, month, 0).getDate();
}

export default function MatrescenQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [textVal, setTextVal] = useState("");
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);

  const visibleSteps = getVisibleSteps(answers);
  const current = visibleSteps[step];
  const totalSteps = visibleSteps.length;
  const progress = (step / totalSteps) * 100;
  const phaseIndex = Math.min(3, Math.floor((step / totalSteps) * 4));

  function getValue() {
    if (!current) return "";
    const v = answers[current.key];
    if (current.type === "pills_multi" || current.type === "pills_multi_other") return v || [];
    if (current.type === "date_dropdowns") return v || {};
    return v || "";
  }

  function handlePillSingle(val) {
    setAnswers(prev => ({ ...prev, [current.key]: val }));
  }

  function handlePillMulti(val) {
    setAnswers(prev => {
      const arr = prev[current.key] || [];
      if (val === "None of the above") return { ...prev, [current.key]: ["None of the above"] };
      const filtered = arr.filter(v => v !== "None of the above");
      return {
        ...prev,
        [current.key]: filtered.includes(val) ? filtered.filter(v => v !== val) : [...filtered, val],
      };
    });
  }

  function handlePillMultiOther(val) {
    setAnswers(prev => {
      const arr = prev[current.key] || [];
      if (val === "None of the above") return { ...prev, [current.key]: ["None of the above"], [current.otherKey]: "" };
      const filtered = arr.filter(v => v !== "None of the above");
      if (val === "Other") {
        return { ...prev, [current.key]: filtered.includes("Other") ? filtered.filter(v => v !== "Other") : [...filtered, "Other"] };
      }
      return { ...prev, [current.key]: filtered.includes(val) ? filtered.filter(v => v !== val) : [...filtered, val] };
    });
  }

  function handleDateDropdown(field, val) {
    setAnswers(prev => ({ ...prev, birthDate: { ...(prev.birthDate || {}), [field]: parseInt(val) } }));
  }

  function canAdvance() {
    if (!current) return false;
    const v = getValue();
    if (current.type === "text") return textVal.trim().length > 0;
    if (current.type === "date_dropdowns") return v.day && v.month && v.year;
    if (current.type === "pills_single") return !!v;
    if (current.type === "pills_multi") return v.length > 0;
    if (current.type === "pills_multi_other") {
      if (v.length === 0) return false;
      if (v.includes("Other") && !(answers[current.otherKey] || "").trim()) return false;
      return true;
    }
    return false;
  }

  function advance() {
    let nextAnswers = answers;
    if (current.type === "text") {
      nextAnswers = { ...answers, [current.key]: textVal.trim() };
      setAnswers(nextAnswers);
      setTextVal("");
    }
    const nextVisible = getVisibleSteps(nextAnswers);
    if (step < nextVisible.length - 1) setStep(s => s + 1);
    else submitToFormspree(nextAnswers);
  }

  function goBack() {
    if (step > 0) {
      const prev = visibleSteps[step - 1];
      if (prev.type === "text") setTextVal(answers[prev.key] || "");
      setStep(s => s - 1);
    }
  }

  async function submitToFormspree(finalAnswers) {
    setSending(true);
    setDone(true);
    const summary = buildSummary(finalAnswers);
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          name: finalAnswers.name,
          profile: summary,
        }),
      });
      if (res.ok) setSent(true);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setSending(false);
    }
  }

  const st = {
    page: { background: C.parchment, minHeight: "100vh", fontFamily: font.body, padding: "0 0 80px" },
    header: { padding: "28px 24px 0", textAlign: "center" },
    wordmark: { fontFamily: font.display, fontSize: 22, letterSpacing: "0.15em", color: C.gold, marginBottom: 4 },
    phases: { display: "flex", justifyContent: "center", gap: 14, marginTop: 6, marginBottom: 4 },
    phaseSymbol: (active) => ({ fontSize: 10, color: active ? C.gold : C.border, transition: "color 0.3s" }),
    progressWrap: { padding: "20px 24px 0", maxWidth: 560, margin: "0 auto" },
    progressMeta: { display: "flex", justifyContent: "space-between", fontSize: 11, color: C.soft, marginBottom: 8, letterSpacing: "0.05em" },
    track: { height: 2, background: C.border, borderRadius: 2 },
    fill: { height: "100%", background: `linear-gradient(90deg, ${C.gold}, ${C.terra})`, borderRadius: 2, width: `${progress}%`, transition: "width 0.4s ease" },
    container: { maxWidth: 560, margin: "0 auto", padding: "0 20px" },
    card: { background: C.warm, border: `1px solid ${C.border}`, borderRadius: 24, padding: "36px 28px 32px", marginTop: 24, boxShadow: "0 8px 40px rgba(42,31,14,0.07)" },
    eyebrow: { fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: C.terra, marginBottom: 10 },
    question: { fontFamily: font.display, fontSize: 26, color: C.deep, lineHeight: 1.25, marginBottom: 8 },
    hint: { fontSize: 13, color: C.soft, lineHeight: 1.6, marginBottom: 28 },
    pillGrid: { display: "flex", flexWrap: "wrap", gap: 10 },
    pill: (sel) => ({
      padding: "10px 20px", borderRadius: 100,
      border: `1.5px solid ${sel ? C.gold : C.border}`,
      background: sel ? C.goldFaint : C.white,
      color: sel ? C.mid : C.soft,
      fontFamily: font.body, fontSize: 13, cursor: "pointer",
      transition: "all 0.18s ease", fontWeight: sel ? "600" : "400",
    }),
    input: { width: "100%", padding: "14px 18px", border: `1.5px solid ${C.border}`, borderRadius: 14, fontFamily: font.display, fontSize: 17, color: C.deep, background: C.white, outline: "none", boxSizing: "border-box" },
    select: { flex: 1, padding: "13px 14px", border: `1.5px solid ${C.border}`, borderRadius: 14, fontFamily: font.body, fontSize: 14, color: C.deep, background: C.white, outline: "none", cursor: "pointer", appearance: "none", WebkitAppearance: "none" },
    selectRow: { display: "flex", gap: 10 },
    selectLabel: { fontSize: 11, color: C.soft, marginBottom: 6, letterSpacing: "0.05em", fontFamily: font.body },
    selectWrap: { flex: 1, display: "flex", flexDirection: "column" },
    otherInput: { width: "100%", marginTop: 14, padding: "12px 16px", border: `1.5px solid ${C.gold}`, borderRadius: 14, fontFamily: font.body, fontSize: 13, color: C.deep, background: C.goldFaint, outline: "none", boxSizing: "border-box" },
    navRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32 },
    backBtn: { background: "transparent", border: "none", color: C.soft, fontSize: 13, cursor: "pointer", padding: "10px 0", fontFamily: font.body, letterSpacing: "0.05em" },
    nextBtn: (active) => ({ background: active ? `linear-gradient(135deg, ${C.gold}, ${C.terra})` : C.border, color: active ? C.white : C.soft, border: "none", borderRadius: 100, padding: "14px 36px", fontFamily: font.display, fontSize: 14, cursor: active ? "pointer" : "default", letterSpacing: "0.08em", transition: "all 0.2s ease" }),
    doneCard: { background: C.warm, border: `1px solid ${C.border}`, borderRadius: 24, padding: "44px 28px 40px", marginTop: 28, textAlign: "center", boxShadow: "0 8px 40px rgba(42,31,14,0.08)" },
    doneGlyph: { fontSize: 44, color: C.gold, marginBottom: 16, display: "block" },
    doneTitle: { fontFamily: font.display, fontSize: 28, color: C.deep, marginBottom: 10 },
    doneSubtitle: { fontSize: 14, color: C.mid, lineHeight: 1.65 },
  };

  if (done) {
    return (
      <div style={st.page}>
        <div style={st.header}>
          <div style={st.wordmark}>MATRESCEN</div>
          <div style={st.phases}>
            {PHASES.map((p, i) => <span key={i} style={st.phaseSymbol(true)}>{p}</span>)}
          </div>
        </div>
        <div style={st.container}>
          <div style={st.doneCard}>
            <span style={st.doneGlyph}>
              {sending ? "◌" : sent ? "◈" : error ? "◎" : "◈"}
            </span>
            <div style={st.doneTitle}>
              {sending ? "Sending your profile..." : sent ? "You're on your way" : error ? "Something went wrong" : "Done"}
            </div>
            <div style={st.doneSubtitle}>
              {sending && "Just a moment while we send your information."}
              {sent && "Your profile has been received. Your Matrescen protocol is on its way."}
              {error && "We couldn't send your profile. Please try again or contact us directly."}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const value = getValue();
  const dateVal = answers.birthDate || {};
  const maxDay = daysInMonth(dateVal.month, dateVal.year);
  const yearNow = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => yearNow - i);

  return (
    <div style={st.page}>
      <div style={st.header}>
        <div style={st.wordmark}>MATRESCEN</div>
        <div style={st.phases}>
          {PHASES.map((p, i) => <span key={i} style={st.phaseSymbol(i <= phaseIndex)}>{p}</span>)}
        </div>
      </div>

      <div style={st.progressWrap}>
        <div style={st.progressMeta}>
          <span>{current.section}</span>
          <span>{step + 1} of {totalSteps}</span>
        </div>
        <div style={st.track}><div style={st.fill} /></div>
      </div>

      <div style={st.container}>
        <div style={st.card}>
          <div style={st.eyebrow}>{current.section}</div>
          <div style={st.question}>{current.title}</div>
          <div style={st.hint}>{current.hint}</div>

          {current.type === "text" && (
            <input
              style={st.input}
              value={textVal}
              onChange={e => setTextVal(e.target.value)}
              placeholder={current.placeholder}
              inputMode={current.inputMode || "text"}
              onKeyDown={e => e.key === "Enter" && canAdvance() && advance()}
              autoFocus
            />
          )}

          {current.type === "date_dropdowns" && (
            <div style={st.selectRow}>
              <div style={st.selectWrap}>
                <div style={st.selectLabel}>DAY</div>
                <select style={st.select} value={dateVal.day || ""} onChange={e => handleDateDropdown("day", e.target.value)}>
                  <option value="">—</option>
                  {Array.from({ length: maxDay }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div style={st.selectWrap}>
                <div style={st.selectLabel}>MONTH</div>
                <select style={st.select} value={dateVal.month || ""} onChange={e => handleDateDropdown("month", e.target.value)}>
                  <option value="">—</option>
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div style={st.selectWrap}>
                <div style={st.selectLabel}>YEAR</div>
                <select style={st.select} value={dateVal.year || ""} onChange={e => handleDateDropdown("year", e.target.value)}>
                  <option value="">—</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          )}

          {current.type === "pills_single" && (
            <div style={st.pillGrid}>
              {current.options.map(opt => (
                <button key={opt} style={st.pill(value === opt)} onClick={() => handlePillSingle(opt)}>{opt}</button>
              ))}
            </div>
          )}

          {current.type === "pills_multi" && (
            <>
              <div style={st.pillGrid}>
                {current.options.map(opt => (
                  <button key={opt} style={st.pill(value.includes(opt))} onClick={() => handlePillMulti(opt)}>{opt}</button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: C.soft, marginTop: 14, fontFamily: font.body }}>Select all that apply</div>
            </>
          )}

          {current.type === "pills_multi_other" && (
            <>
              <div style={st.pillGrid}>
                {current.options.map(opt => (
                  <button key={opt} style={st.pill(value.includes(opt))} onClick={() => handlePillMultiOther(opt)}>{opt}</button>
                ))}
                <button style={st.pill(value.includes("Other"))} onClick={() => handlePillMultiOther("Other")}>Other</button>
              </div>
              {value.includes("Other") && (
                <input
                  style={st.otherInput}
                  placeholder="Please specify..."
                  value={answers[current.otherKey] || ""}
                  onChange={e => setAnswers(prev => ({ ...prev, [current.otherKey]: e.target.value }))}
                  autoFocus
                />
              )}
              <div style={{ fontSize: 11, color: C.soft, marginTop: 14, fontFamily: font.body }}>Select all that apply</div>
            </>
          )}

          <div style={st.navRow}>
            <button style={st.backBtn} onClick={goBack} disabled={step === 0}>
              {step > 0 ? "← Back" : ""}
            </button>
            <button style={st.nextBtn(canAdvance())} onClick={canAdvance() ? advance : undefined}>
              {step === totalSteps - 1 ? "Send my profile" : "Continue →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
