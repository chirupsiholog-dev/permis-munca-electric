import React, { useState, useRef, useEffect } from 'react';

const MANPOWER = [
  { id: "total_manpower", label: "Total Manpower", cm: "num", ud: "na" },
  { id: "total_manhours", label: "Total Man-hours", cm: "num", ud: "num", note: "(Time (h) x Persons)" },
  { id: "first_aiders", label: "Number of First Aiders on Site", cm: "wnum", ud: "wna" },
  { id: "first_aider_always", label: "Is there always at least one First Aider on site?", cm: "wsel", ud: "wna" }
];

const TRAINING = [
  { id: "induction_hours", label: "HSE INDUCTION Training Hours", cm: "num", ud: "num", note: "(Time (h) x Persons)" },
  { id: "induction_participants", label: "Number of Participants", cm: "num", ud: "na", note: "NUMBER of Persons inducted" },
  { id: "env_induction_hours", label: "Environmental Induction Training Hours", cm: "auto", ud: "num", note: "10 % of HSE Induction" },
  { id: "hs_training_hours", label: "HS TRAINING in Training Hours", cm: "num", ud: "num", note: "Special Health & Safety Trainings (Time (h) x Persons)", doc: "lista subiectelor HS și numele participanților" },
  { id: "hs_participants", label: "Number of Participants", cm: "num", ud: "na", note: "NUMBER of Persons Trained" },
  { id: "env_training_hours", label: "Environmental Training in Training Hours", cm: "num", ud: "num", note: "Special Environmental Trainings (Time (h) x Persons)", doc: "lista subiectelor E și numele participanților" },
  { id: "env_participants", label: "Number of Participants", cm: "num", ud: "na", note: "NUMBER of Persons Trained" },
  { id: "tbt_hours", label: "HSE Toolbox Talks Training Hours", cm: "num", ud: "num", note: "(Time (h) x Persons)" },
  { id: "tbt_participants", label: "Number of Participants in TBT", cm: "num", ud: "na", note: "Number of Persons had TBT Training" },
  { id: "hs_total", label: "Health & Safety Training in Training Hours", cm: "auto", ud: "auto" },
  { id: "env_total", label: "Environmental Training Hours", cm: "auto", ud: "auto" },
  { id: "total_training", label: "Total Training Hours", cm: "auto", ud: "auto" }
];

const INCIDENTS = [
  { id: "lti", label: "LTI", sub: "(Lost Time Incidents)", cm: "num", ud: "num", note: "Accidente care duc la absență de la lucru mai mult de 3 zile, excluzând ziua accidentului", doc: "Investigation Report & Supportive Documents" },
  { id: "mti", label: "MTI", sub: "(Medical Treatment Incidents)", cm: "num", ud: "num", note: "Accidente care duc la absență de la lucru până la 3 zile, excluzând ziua accidentului" },
  { id: "fai", label: "FAI", sub: "(First Aid Incidents)", cm: "num", ud: "num", note: "Incidente după care persoana revine la lucru în aceeași zi sau în ziua următoare" },
  { id: "rci", label: "RCI", sub: "(Restricted Case Incidents)", cm: "num", ud: "num" },
  { id: "near_misses", label: "Near Misses", cm: "wnum", ud: "wnum" },
  { id: "fat", label: "FAT", sub: "(Fatalities)", cm: "num", ud: "num" },
  { id: "lwd", label: "LWD", sub: "(Lost Work Days)", cm: "num", ud: "num", note: "Zile de lucru pierdute din cauza LTI" },
  { id: "occupational_diseases", label: "Occupational Diseases", cm: "num", ud: "num" },
  { id: "property_damages", label: "Property Damages", cm: "wnum", ud: "wnum" },
  { id: "covid_cases", label: "Covid Cases", cm: "num", ud: "num" },
  { id: "environmental_incidents", label: "Environmental Incidents", cm: "wnum", ud: "wnum", note: "Accidente majore care duc la daune serioase sau necesită asistență externă / raportare către autorități", doc: "Investigation Report & Supportive Documents" }
];

export default function EsgReportPage({
  showUpToDate = true,
  showTotals = true,
  zeroDefault = false
}) {
  const [vals, setVals] = useState({});
  const [luna, setLuna] = useState("2026-07");
  const [toast, setToast] = useState("");
  const timerRef = useRef(null);

  const flash = (msg) => {
    setToast(msg);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(""), 3200);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const num = (key) => {
    const v = parseFloat(vals[key]);
    return isNaN(v) ? 0 : v;
  };

  const auto = (rowId, prefix, gender) => {
    const k = (id) => num(id + "." + prefix + "_" + gender);
    const ind = k("induction_hours");
    const hs = k("hs_training_hours");
    const env = k("env_training_hours");
    const tbt = k("tbt_hours");
    const envInd = prefix === "cm" ? ind * 0.1 : k("env_induction_hours");
    if (rowId === "env_induction_hours") return ind * 0.1;
    if (rowId === "hs_total") return (ind - envInd) + hs + tbt * 0.9;
    if (rowId === "env_total") return envInd + env + tbt * 0.1;
    if (rowId === "total_training") return ind + hs + env + tbt;
    return 0;
  };

  const fmt = (n) => String(Math.round(n * 100) / 100);

  const handleInputChange = (key, value) => {
    setVals((prev) => ({ ...prev, [key]: value }));
  };

  const getCellValue = (rowId, prefix, gender) => {
    const key = rowId + "." + prefix + "_" + gender;
    const raw = vals[key];
    return raw === undefined || raw === "" ? (zeroDefault ? "0" : "") : raw;
  };

  const getGroup = (row, prefix) => {
    const kind = prefix === "cm" ? row.cm : row.ud;
    const g = {
      isNum: kind === "num",
      isNa: kind === "na",
      isAuto: kind === "auto",
      isWideNum: kind === "wnum",
      isWideSelect: kind === "wsel",
      isWideNa: kind === "wna"
    };

    if (kind === "auto") {
      g.aDisplay = fmt(auto(row.id, prefix, "m"));
      g.bDisplay = fmt(auto(row.id, prefix, "w"));
    } else if (kind === "num") {
      g.aKey = row.id + "." + prefix + "_m";
      g.aValue = getCellValue(row.id, prefix, "m");
      g.bKey = row.id + "." + prefix + "_w";
      g.bValue = getCellValue(row.id, prefix, "w");
    } else if (kind === "wnum" || kind === "wsel") {
      g.aKey = row.id + "." + prefix + "_v";
      g.aValue = getCellValue(row.id, prefix, "v");
    }
    return g;
  };

  const getRows = (list) => {
    return list.map((row) => {
      const groups = [getGroup(row, "cm")];
      if (showUpToDate) groups.push(getGroup(row, "ud"));
      return {
        id: row.id,
        label: row.label,
        sub: row.sub || "",
        note: row.note || "",
        doc: row.doc || "",
        groups
      };
    });
  };

  const cm = (id, g) => num(id + ".cm_" + g);
  const pair = (id) => cm(id, "m") + cm(id, "w");
  const totalRecordable = pair("lti") + pair("mti") + pair("fai") + pair("rci") + pair("fat");
  const filledCount = Object.keys(vals).filter((k) => String(vals[k]).trim() !== "").length;
  const firstAider = vals["first_aider_always.cm_v"];
  const totalRowsCount = MANPOWER.length + TRAINING.length + INCIDENTS.length;

  const firstAiderWarning = firstAider === "NO" ? "There must always be a certified First Aider on site." : "";
  const statusLine = toast || `${filledCount} celule completate din ${totalRowsCount} rânduri.`;

  const handleReset = () => {
    setVals({});
    flash("Câmpurile au fost golite.");
  };

  const handleSubmit = () => {
    if (!filledCount) {
      flash("Completează cel puțin o valoare înainte de trimitere.");
      return;
    }
    flash(`Raportul pentru ${luna} a fost trimis către Country HSE Manager.`);
  };

  const renderSectionTable = (title, number, rows) => (
    <section style={{ background: "#ffffff", border: "1px solid #dfe2e5", boxShadow: "0 1px 2px rgba(20,26,33,0.05)", padding: "24px 28px 26px", display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingBottom: "14px", borderBottom: "1px solid #e6e9ec" }}>
        <div style={{ width: "26px", height: "26px", flex: "none", background: "#171a1d", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700 }}>{number}</div>
        <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#23282d" }}>{title}</h2>
        <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase", color: "oklch(0.50 0.15 253)", border: "1px solid oklch(0.50 0.15 253)", padding: "3px 8px" }}>Subcontractors</span>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: "20px" }}>
        <div style={{ flex: "1 1 240px", minWidth: 0, fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase", color: "#6b7480" }}>Item</div>
        <div style={{ width: "176px", flex: "none", display: "flex", flexDirection: "column", gap: "7px" }}>
          <div style={{ textAlign: "center", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase", color: "#23282d", borderBottom: "1px solid #d2d7dd", paddingBottom: "6px" }}>Current month</div>
          <div style={{ display: "flex", gap: "8px" }}>
            <div style={{ width: "84px", textAlign: "center", fontSize: "11px", color: "#6b7480" }}>Men</div>
            <div style={{ width: "84px", textAlign: "center", fontSize: "11px", color: "#6b7480" }}>Women</div>
          </div>
        </div>
        {showUpToDate && (
          <div style={{ width: "176px", flex: "none", display: "flex", flexDirection: "column", gap: "7px" }}>
            <div style={{ textAlign: "center", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase", color: "#23282d", borderBottom: "1px solid #d2d7dd", paddingBottom: "6px" }}>Up to date</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{ width: "84px", textAlign: "center", fontSize: "11px", color: "#6b7480" }}>Men</div>
              <div style={{ width: "84px", textAlign: "center", fontSize: "11px", color: "#6b7480" }}>Women</div>
            </div>
          </div>
        )}
        <div style={{ flex: "0 1 250px", minWidth: 0, fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase", color: "#6b7480" }}>Comments</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {rows.map((r, rIdx) => (
          <div key={r.id || rIdx} style={{ display: "flex", alignItems: "center", gap: "20px", padding: "9px 0", borderTop: "1px solid #eef0f2" }}>
            <div style={{ flex: "1 1 240px", minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
              <span style={{ fontSize: "13.5px", fontWeight: 500, color: "#23282d", textWrap: "pretty" }}>{r.label}</span>
              {r.sub && <span style={{ fontSize: "11.5px", color: "#7b848e" }}>{r.sub}</span>}
            </div>

            {r.groups.map((g, gIdx) => (
              <div key={gIdx} style={{ width: "176px", flex: "none", display: "flex", gap: "8px" }}>
                {g.isNum && (
                  <>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={g.aValue}
                      onChange={(e) => handleInputChange(g.aKey, e.target.value)}
                      className="esg-input"
                      style={{ width: "84px", boxSizing: "border-box", border: "1px solid #d2d7dd", background: "#eef3fb", height: "38px", padding: "0 8px", fontSize: "13.5px", textAlign: "center", color: "#1b1e21", outline: 0 }}
                    />
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={g.bValue}
                      onChange={(e) => handleInputChange(g.bKey, e.target.value)}
                      className="esg-input"
                      style={{ width: "84px", boxSizing: "border-box", border: "1px solid #d2d7dd", background: "#eef3fb", height: "38px", padding: "0 8px", fontSize: "13.5px", textAlign: "center", color: "#1b1e21", outline: 0 }}
                    />
                  </>
                )}
                {g.isNa && (
                  <>
                    <div style={{ width: "84px", height: "38px", boxSizing: "border-box", border: "1px solid #dfe2e5", background: "#eceef0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#9aa3ac" }}>ΝΑ</div>
                    <div style={{ width: "84px", height: "38px", boxSizing: "border-box", border: "1px solid #dfe2e5", background: "#eceef0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#9aa3ac" }}>ΝΑ</div>
                  </>
                )}
                {g.isAuto && (
                  <>
                    <div style={{ width: "84px", height: "38px", boxSizing: "border-box", border: "1px solid #dfe2e5", background: "#eceef0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", color: "#5c656f" }}>{g.aDisplay}</div>
                    <div style={{ width: "84px", height: "38px", boxSizing: "border-box", border: "1px solid #dfe2e5", background: "#eceef0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", color: "#5c656f" }}>{g.bDisplay}</div>
                  </>
                )}
                {g.isWideNum && (
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={g.aValue}
                    onChange={(e) => handleInputChange(g.aKey, e.target.value)}
                    className="esg-input"
                    style={{ width: "176px", boxSizing: "border-box", border: "1px solid #d2d7dd", background: "#eef3fb", height: "38px", padding: "0 10px", fontSize: "13.5px", textAlign: "center", color: "#1b1e21", outline: 0 }}
                  />
                )}
                {g.isWideSelect && (
                  <select
                    value={g.aValue}
                    onChange={(e) => handleInputChange(g.aKey, e.target.value)}
                    style={{ width: "176px", boxSizing: "border-box", border: "1px solid #d2d7dd", background: "#eef3fb", height: "38px", padding: "0 8px", fontSize: "13.5px", color: "#1b1e21", outline: 0 }}
                  >
                    <option value="">—</option>
                    <option value="YES">YES</option>
                    <option value="NO">NO</option>
                  </select>
                )}
                {g.isWideNa && (
                  <div style={{ width: "176px", height: "38px", boxSizing: "border-box", border: "1px solid #dfe2e5", background: "#eceef0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#9aa3ac" }}>ΝΑ</div>
                )}
              </div>
            ))}

            <div style={{ flex: "0 1 250px", minWidth: 0, display: "flex", flexDirection: "column", gap: "3px" }}>
              {r.note && <span style={{ fontSize: "11.5px", lineHeight: 1.4, color: "#7b848e", textWrap: "pretty" }}>{r.note}</span>}
              {r.doc && <span style={{ fontSize: "11px", lineHeight: 1.4, color: "oklch(0.50 0.15 253)" }}>Documentație: {r.doc}</span>}
            </div>
          </div>
        ))}
      </div>

      {number === "1" && firstAiderWarning && (
        <div style={{ borderLeft: "3px solid oklch(0.55 0.15 40)", background: "#fdf4f0", padding: "10px 13px", fontSize: "12.5px", lineHeight: 1.5, color: "#6b4230" }}>
          {firstAiderWarning}
        </div>
      )}

      {number === "3" && showTotals && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "28px", background: "#f7f8f9", border: "1px solid #e6e9ec", padding: "14px 18px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase", color: "#9aa3ac" }}>Recordable (LTI+MTI+FAI+RCI+FAT)</span>
            <span style={{ fontSize: "18px", fontWeight: 500, color: "#23282d" }}>{fmt(totalRecordable)}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase", color: "#9aa3ac" }}>Near misses</span>
            <span style={{ fontSize: "18px", fontWeight: 500, color: "#23282d" }}>{fmt(num("near_misses.cm_v"))}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase", color: "#9aa3ac" }}>Lost work days</span>
            <span style={{ fontSize: "18px", fontWeight: 500, color: "#23282d" }}>{fmt(pair("lwd"))}</span>
          </div>
        </div>
      )}
    </section>
  );

  return (
    <div style={{ minHeight: "100vh", boxSizing: "border-box", display: "flex", flexDirection: "column", fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", color: "#1b1e21", background: "#f2f4f5" }}>
      <style>{`
        body { margin: 0; padding: 0; background: #f2f4f5; -webkit-font-smoothing: antialiased; }
        a { color: oklch(0.50 0.15 253); text-decoration: none; }
        a:hover { color: oklch(0.40 0.15 253); text-decoration: underline; }
        input, textarea, select { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
        input::placeholder { color: #a6adb5; }
        input[type=number]::-webkit-outer-spin-button, input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        .esg-input:focus { background: #e4ecfa !important; }
        .btn-reset:hover { border-color: #b7bfc7 !important; color: #23282d !important; }
        .btn-submit:hover { background: oklch(0.43 0.15 253) !important; }
        .btn-submit:active { background: oklch(0.38 0.15 253) !important; }
      `}</style>

      <header style={{ height: "62px", flex: "none", background: "#ffffff", borderBottom: "1px solid #dfe2e5", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.10em", lineHeight: 1, color: "oklch(0.50 0.15 253)" }}>PERMIS MUNCĂ</div>
          <div style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.235em", lineHeight: 1, color: "#171a1d" }}>ELECTRIC</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "22px" }}>
          <nav style={{ display: "flex", alignItems: "center", gap: "22px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase" }}>
            <a href="Home.dc.html" style={{ color: "#6b7480" }}>Acasă</a>
            <a href="Formular Permis.dc.html" style={{ color: "#6b7480" }}>Permise</a>
            <a href="#" style={{ color: "#171a1d", borderBottom: "2px solid oklch(0.50 0.15 253)", paddingBottom: "2px" }}>Raport ESG</a>
            <a href="Arhiva.dc.html" style={{ color: "#6b7480" }}>Arhivă</a>
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingLeft: "22px", borderLeft: "1px solid #e6e9ec" }}>
            <div style={{ width: "30px", height: "30px", background: "#171a1d", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em" }}>RC</div>
            <span style={{ fontSize: "12.5px", color: "#4d555e" }}>Răzvan Chiru</span>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, boxSizing: "border-box", width: "100%", maxWidth: "1320px", margin: "0 auto", padding: "40px 28px 120px", display: "flex", flexDirection: "column", gap: "18px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
            <h1 style={{ margin: 0, fontSize: "25px", fontWeight: 500, color: "#23282d" }}>Raport lunar ESG HSE — date subcontractanți</h1>
            <p style={{ margin: 0, fontSize: "14.5px", lineHeight: 1.45, color: "#5c656f" }}>Se completează doar coloanele „Subcontractors”. Celulele gri sunt blocate în Excel: fie se calculează automat, fie nu se aplică (ΝΑ).</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
            <label htmlFor="f-luna" style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase", color: "#6b7480" }}>Luna raportată</label>
            <input
              id="f-luna"
              type="month"
              value={luna}
              onChange={(e) => setLuna(e.target.value)}
              className="esg-input"
              style={{ boxSizing: "border-box", border: "1px solid #d2d7dd", background: "#eef3fb", height: "42px", padding: "0 12px", fontSize: "14px", color: "#1b1e21", outline: 0 }}
            />
          </div>
        </div>

        <section style={{ background: "#ffffff", border: "1px solid #dfe2e5", boxShadow: "0 1px 2px rgba(20,26,33,0.05)", padding: "18px 24px", display: "flex", flexWrap: "wrap", gap: "10px 40px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase", color: "#9aa3ac" }}>Country</span>
            <span style={{ fontSize: "13.5px", color: "#23282d" }}>ROMANIA</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase", color: "#9aa3ac" }}>Project name</span>
            <span style={{ fontSize: "13.5px", color: "#23282d" }}>Photovoltaic park IANCA</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase", color: "#9aa3ac" }}>City / Location</span>
            <span style={{ fontSize: "13.5px", color: "#23282d" }}>Ianca</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase", color: "#9aa3ac" }}>Client</span>
            <span style={{ fontSize: "13.5px", color: "#23282d" }}>HELPE</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase", color: "#9aa3ac" }}>Category / Type</span>
            <span style={{ fontSize: "13.5px", color: "#23282d" }}>O&amp;M — Solar</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "18px", marginLeft: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <div style={{ width: "22px", height: "16px", border: "1px solid #d2d7dd", background: "#eef3fb" }}></div>
              <span style={{ fontSize: "11.5px", color: "#6b7480" }}>de completat</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <div style={{ width: "22px", height: "16px", border: "1px solid #dfe2e5", background: "#eceef0" }}></div>
              <span style={{ fontSize: "11.5px", color: "#6b7480" }}>blocat / calculat</span>
            </div>
          </div>
        </section>

        {renderSectionTable("Manpower", "1", getRows(MANPOWER))}
        {renderSectionTable("HSE Induction — Training", "2", getRows(TRAINING))}
        {renderSectionTable("Incidents / Accidents", "3", getRows(INCIDENTS))}
      </main>

      <div style={{ position: "sticky", bottom: 0, background: "#ffffff", borderTop: "1px solid #dfe2e5", boxShadow: "0 -1px 3px rgba(20,26,33,0.06)" }}>
        <div style={{ width: "100%", maxWidth: "1320px", margin: "0 auto", boxSizing: "border-box", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "12.5px", color: "#6b7480" }}>{statusLine}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={handleReset}
              className="btn-reset"
              style={{ height: "44px", border: "1px solid #cfd5db", background: "#ffffff", cursor: "pointer", padding: "0 18px", fontFamily: "inherit", fontSize: "11px", fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase", color: "#6b7480" }}
            >
              Golește
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="btn-submit"
              style={{ height: "44px", border: 0, cursor: "pointer", padding: "0 26px", background: "oklch(0.50 0.15 253)", color: "#ffffff", fontFamily: "inherit", fontSize: "12px", fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase" }}
            >
              Trimite raportul
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}