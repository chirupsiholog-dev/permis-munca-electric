import React, { useState, useRef, useEffect } from "react";

const FIELDS = [
  "parc", 
  "data", 
  "data", 
  "oreLucrate", 
  "inductieOre", 
  "mediuOre", 
  "nearMiss",
  "mentenantaCorectiva",
  "mentenantaPreventiva"
];

export default function DailyReportForm({
  title = "Raport zilnic de lucru",
  submitLabel = "Trimite raportul",
  showHelp = true,
  markRequired = true,
  minWorkers = 2,
  twoColumn = true,
  dense = false,
  accent = "oklch(0.50 0.15 253)",
}) {
  const [vals, setVals] = useState({});
  const [workers, setWorkers] = useState(() => Array(minWorkers).fill(""));
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

  const handleFieldChange = (key, value) => {
    setVals((prev) => ({ ...prev, [key]: value }));
  };

  const maskDate = (raw) => {
    const d = raw.replace(/\D/g, "").slice(0, 8);
    if (d.length <= 2) return d;
    if (d.length <= 4) return d.slice(0, 2) + "/" + d.slice(2);
    return d.slice(0, 2) + "/" + d.slice(2, 4) + "/" + d.slice(4);
  };

  const handleDataChange = (e) => {
    const masked = maskDate(e.target.value);
    handleFieldChange("data", masked);
  };

  const handleWorkerChange = (index, value) => {
    setWorkers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const addWorker = () => {
    setWorkers((prev) => [...prev, ""]);
  };

  const removeWorker = (index) => {
    setWorkers((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setVals({});
    setWorkers(Array(minWorkers).fill(""));
    flash("Formular golit.");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (missing) {
      flash("Completează toate câmpurile și cel puțin un lucrător.");
      return;
    }
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(vals.data || "")) {
      flash("Data trebuie în format zz/ll/aaaa.");
      return;
    }
    flash(`Raport trimis pentru ${vals.data} — ${namedWorkers} lucrători.`);
  };

  const namedWorkers = workers.filter((w) => w.trim() !== "").length;
  const missing =
    FIELDS.filter((k) => String(vals[k] ?? "").trim() === "").length +
    (namedWorkers ? 0 : 1);

  const req = markRequired ? "*" : "";
  const h = dense ? "38px" : "44px";
  const gap = dense ? "14px" : "20px";
  const pad = dense ? "20px" : "28px";
  const cols = twoColumn ? "repeat(2, minmax(0, 1fr))" : "minmax(0, 1fr)";
  const statusMessage =
    toast ||
    (missing ? `${missing} câmpuri rămase` : "Toate câmpurile sunt completate");

  return (
    <div
      style={{
        minHeight: "100vh",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "48px 24px 80px",
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        color: "#1b1e21",
        background: "#f2f4f5",
      }}
    >
      <style>{`
        input, textarea, select { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
        input::placeholder, textarea::placeholder { color: #a6adb5; }
        input[type=number]::-webkit-outer-spin-button, 
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        
        .esg-input:focus {
          background: #e4ecfa !important;
          border-color: ${accent} !important;
        }
        .esg-btn-remove:hover {
          border-color: #d9b3a6 !important;
          color: oklch(0.55 0.15 40) !important;
        }
        .esg-btn-add:hover {
          border-color: ${accent} !important;
          color: ${accent} !important;
        }
        .esg-btn-reset:hover {
          border-color: #b7bfc7 !important;
          color: #23282d !important;
        }
        .esg-btn-submit:hover {
          filter: brightness(0.88);
        }
      `}</style>

      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: "720px",
          background: "#ffffff",
          border: "1px solid #dfe2e5",
          boxShadow: "0 1px 2px rgba(20,26,33,0.05)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "26px 32px 22px",
            borderBottom: "1px solid #e6e9ec",
            display: "flex",
            flexDirection: "column",
            gap: "7px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{ width: "4px", height: "18px", background: accent }}
            />
            <span
              style={{
                fontSize: "10.5px",
                fontWeight: 700,
                letterSpacing: "0.13em",
                textTransform: "uppercase",
                color: "#6b7480",
              }}
            >
              Raportare zilnică
            </span>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: "23px",
              fontWeight: 500,
              color: "#23282d",
            }}
          >
            {title}
          </h1>
          {showHelp && (
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                lineHeight: 1.45,
                color: "#5c656f",
                textWrap: "pretty",
              }}
            >
              Orele se raportează ca ore-om (durată × persoane), la fel ca în
              raportul ESG HSE lunar.
            </p>
          )}
        </div>

        {/* Form Body */}
        <div
          style={{
            padding: `${pad} 32px`,
            display: "flex",
            flexDirection: "column",
            gap,
          }}
        >
          {/* Parc */}
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "7px",
              minWidth: 0,
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "5px",
                fontSize: "10.5px",
                fontWeight: 700,
                letterSpacing: "0.13em",
                textTransform: "uppercase",
                color: "#6b7480",
              }}
            >
              Parc<span style={{ color: accent }}>{req}</span>
            </span>
            <input
              type="text"
              className="esg-input"
              placeholder="ex. Parc fotovoltaic Ianca"
              value={vals.parc ?? ""}
              onChange={(e) => handleFieldChange("parc", e.target.value)}
              style={{
                boxSizing: "border-box",
                width: "100%",
                border: "1px solid #d2d7dd",
                background: "#eef3fb",
                height: h,
                padding: "0 12px",
                fontSize: "14px",
                color: "#1b1e21",
                outline: 0,
              }}
            />
          </label>

          {/* Echipă */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "9px",
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "5px",
                  fontSize: "10.5px",
                  fontWeight: 700,
                  letterSpacing: "0.13em",
                  textTransform: "uppercase",
                  color: "#6b7480",
                }}
              >
                Echipă<span style={{ color: accent }}>{req}</span>
              </span>
              <span style={{ fontSize: "11.5px", color: "#9aa3ac" }}>
                {`${namedWorkers} / ${workers.length} completați`}
              </span>
            </div>

            {workers.map((w, index) => (
              <div
                key={index}
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <div
                  style={{
                    width: h,
                    height: h,
                    flex: "none",
                    boxSizing: "border-box",
                    border: "1px solid #e6e9ec",
                    background: "#f7f8f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#9aa3ac",
                  }}
                >
                  {index + 1}
                </div>
                <input
                  type="text"
                  className="esg-input"
                  placeholder={`Nume și prenume lucrător ${index + 1}`}
                  value={w}
                  onChange={(e) => handleWorkerChange(index, e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    boxSizing: "border-box",
                    border: "1px solid #d2d7dd",
                    background: "#eef3fb",
                    height: h,
                    padding: "0 12px",
                    fontSize: "14px",
                    color: "#1b1e21",
                    outline: 0,
                  }}
                />
                {workers.length > minWorkers && (
                  <button
                    type="button"
                    title="Șterge lucrătorul"
                    onClick={() => removeWorker(index)}
                    className="esg-btn-remove"
                    style={{
                      width: h,
                      height: h,
                      flex: "none",
                      boxSizing: "border-box",
                      border: "1px solid #e6e9ec",
                      background: "#ffffff",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: "17px",
                      lineHeight: 1,
                      color: "#9aa3ac",
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addWorker}
              className="esg-btn-add"
              style={{
                alignSelf: "flex-start",
                height: "36px",
                boxSizing: "border-box",
                border: "1px dashed #cfd5db",
                background: "#ffffff",
                cursor: "pointer",
                padding: "0 14px",
                fontFamily: "inherit",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.11em",
                textTransform: "uppercase",
                color: "#6b7480",
              }}
            >
              + Adaugă lucrător
            </button>
          </div>

          {/* Grid Fields */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: cols,
              gap: `${gap} 20px`,
            }}
          >
            {/* Data */}
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "7px",
                minWidth: 0,
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "5px",
                  fontSize: "10.5px",
                  fontWeight: 700,
                  letterSpacing: "0.13em",
                  textTransform: "uppercase",
                  color: "#6b7480",
                }}
              >
                Data<span style={{ color: accent }}>{req}</span>
              </span>
              <input
                type="text"
                className="esg-input"
                inputMode="numeric"
                maxLength={10}
                placeholder="zz/ll/aaaa"
                value={vals.data ?? ""}
                onChange={handleDataChange}
                style={{
                  boxSizing: "border-box",
                  width: "100%",
                  border: "1px solid #d2d7dd",
                  background: "#eef3fb",
                  height: h,
                  padding: "0 12px",
                  fontSize: "14px",
                  color: "#1b1e21",
                  outline: 0,
                }}
              />
            </label>

            {/* Ore lucrate */}
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "7px",
                minWidth: 0,
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "5px",
                  fontSize: "10.5px",
                  fontWeight: 700,
                  letterSpacing: "0.13em",
                  textTransform: "uppercase",
                  color: "#6b7480",
                }}
              >
                Ore lucrate<span style={{ color: accent }}>{req}</span>
              </span>
              <input
                type="text"
                className="esg-input"
                inputMode="decimal"
                placeholder="ore-om, ex. 24"
                value={vals.ore ?? ""}
                onChange={(e) => handleFieldChange("ore", e.target.value)}
                style={{
                  boxSizing: "border-box",
                  width: "100%",
                  border: "1px solid #d2d7dd",
                  background: "#eef3fb",
                  height: h,
                  padding: "0 12px",
                  fontSize: "14px",
                  color: "#1b1e21",
                  outline: 0,
                }}
              />
            </label>

            {/* Induction */}
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "7px",
                minWidth: 0,
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "5px",
                  fontSize: "10.5px",
                  fontWeight: 700,
                  letterSpacing: "0.13em",
                  textTransform: "uppercase",
                  color: "#6b7480",
                }}
              >
                Induction<span style={{ color: accent }}>{req}</span>
              </span>
              <input
                type="text"
                className="esg-input"
                inputMode="decimal"
                placeholder="ore, ex. 2"
                value={vals.induction ?? ""}
                onChange={(e) => handleFieldChange("induction", e.target.value)}
                style={{
                  boxSizing: "border-box",
                  width: "100%",
                  border: "1px solid #d2d7dd",
                  background: "#eef3fb",
                  height: h,
                  padding: "0 12px",
                  fontSize: "14px",
                  color: "#1b1e21",
                  outline: 0,
                }}
              />
            </label>

            {/* Mediu */}
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "7px",
                minWidth: 0,
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "5px",
                  fontSize: "10.5px",
                  fontWeight: 700,
                  letterSpacing: "0.13em",
                  textTransform: "uppercase",
                  color: "#6b7480",
                }}
              >
                Mediu<span style={{ color: accent }}>{req}</span>
              </span>
              <input
                type="text"
                className="esg-input"
                inputMode="decimal"
                placeholder="ore, ex. 1"
                value={vals.mediu ?? ""}
                onChange={(e) => handleFieldChange("mediu", e.target.value)}
                style={{
                  boxSizing: "border-box",
                  width: "100%",
                  border: "1px solid #d2d7dd",
                  background: "#eef3fb",
                  height: h,
                  padding: "0 12px",
                  fontSize: "14px",
                  color: "#1b1e21",
                  outline: 0,
                }}
              />
            </label>

            {/* Cele două mentenanțe stau una lângă alta: sunt aceeași unitate
                (ore-om) și se completează împreună. Near Miss — un număr de
                evenimente, nu ore — vine după ele, ca să nu rupă perechea. */}
            {/* Mentenanță corectivă */}
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "7px",
                minWidth: 0,
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "5px",
                  fontSize: "10.5px",
                  fontWeight: 700,
                  letterSpacing: "0.13em",
                  textTransform: "uppercase",
                  color: "#6b7480",
                }}
              >
                Mentenanță corectivă<span style={{ color: accent }}>{req}</span>
              </span>
              <input
                type="text"
                className="esg-input"
                inputMode="decimal"
                placeholder="ore, ex. 6"
                value={vals.mentenantaCorectiva ?? ""}
                onChange={(e) =>
                  handleFieldChange("mentenantaCorectiva", e.target.value)
                }
                style={{
                  boxSizing: "border-box",
                  width: "100%",
                  border: "1px solid #d2d7dd",
                  background: "#eef3fb",
                  height: h,
                  padding: "0 12px",
                  fontSize: "14px",
                  color: "#1b1e21",
                  outline: 0,
                }}
              />
            </label>

            {/* Mentenanță preventivă */}
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "7px",
                minWidth: 0,
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "5px",
                  fontSize: "10.5px",
                  fontWeight: 700,
                  letterSpacing: "0.13em",
                  textTransform: "uppercase",
                  color: "#6b7480",
                }}
              >
                Mentenanță preventivă<span style={{ color: accent }}>{req}</span>
              </span>
              <input
                type="text"
                className="esg-input"
                inputMode="decimal"
                placeholder="ore, ex. 4"
                value={vals.mentenantaPreventiva ?? ""}
                onChange={(e) =>
                  handleFieldChange("mentenantaPreventiva", e.target.value)
                }
                style={{
                  boxSizing: "border-box",
                  width: "100%",
                  border: "1px solid #d2d7dd",
                  background: "#eef3fb",
                  height: h,
                  padding: "0 12px",
                  fontSize: "14px",
                  color: "#1b1e21",
                  outline: 0,
                }}
              />
            </label>

            {/* Near Miss */}
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "7px",
                minWidth: 0,
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "5px",
                  fontSize: "10.5px",
                  fontWeight: 700,
                  letterSpacing: "0.13em",
                  textTransform: "uppercase",
                  color: "#6b7480",
                }}
              >
                Near Miss<span style={{ color: accent }}>{req}</span>
              </span>
              <input
                type="text"
                className="esg-input"
                inputMode="numeric"
                placeholder="număr, ex. 0"
                value={vals.nearMiss ?? ""}
                onChange={(e) => handleFieldChange("nearMiss", e.target.value)}
                style={{
                  boxSizing: "border-box",
                  width: "100%",
                  border: "1px solid #d2d7dd",
                  background: "#eef3fb",
                  height: h,
                  padding: "0 12px",
                  fontSize: "14px",
                  color: "#1b1e21",
                  outline: 0,
                }}
              />
            </label>
          </div>
        </div>

        
        {/* Footer Actions */}
        <div
          style={{
            padding: "18px 32px 24px",
            borderTop: "1px solid #e6e9ec",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "12.5px", color: "#6b7480" }}>
            {statusMessage}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={resetForm}
              className="esg-btn-reset"
              style={{
                height: "44px",
                border: "1px solid #cfd5db",
                background: "#ffffff",
                cursor: "pointer",
                padding: "0 18px",
                fontFamily: "inherit",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.13em",
                textTransform: "uppercase",
                color: "#6b7480",
              }}
            >
              Golește
            </button>
            <button
              type="submit"
              className="esg-btn-submit"
              style={{
                height: "44px",
                border: 0,
                cursor: "pointer",
                padding: "0 26px",
                background: accent,
                color: "#ffffff",
                fontFamily: "inherit",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.13em",
                textTransform: "uppercase",
              }}
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}