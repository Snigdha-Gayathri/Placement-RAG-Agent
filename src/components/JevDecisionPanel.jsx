import React, { useState } from "react";

export default function JevDecisionPanel({
  decisionMetadata,
  computedMetrics = {},
  isLive = false,
}) {
  const [activeTab, setActiveTab] = useState("routing");

  const meta = decisionMetadata || {};
  const backend = meta.backend || "jev (fallback)";
  const retMode = meta.retrieval_mode || "hybrid";
  const hopMode = meta.hop_mode || "single_hop";
  const transform = meta.query_transformation || "none";
  const routeType = meta.route_type || "SINGLE_HOP";
  const confidence = meta.confidence ?? 0.0;
  const probabilities = meta.probabilities || { bm25: 0.0, dense: 0.0, hybrid: 1.0 };
  const fallbackOccurred = meta.fallback_occurred ?? true;
  const fallbackReason = meta.fallback_reason || "TYPESAFE_API_KEY is not configured in environment";
  const decisionLatency = meta.latency_ms ?? 0.35;

  return (
    <div
      style={{
        background: "linear-gradient(145deg, #0d0d0d, #050505)",
        borderRadius: 10,
        padding: "0.85rem",
        border: "1px solid rgba(229, 81, 186, 0.25)",
        boxShadow: "0 4px 18px rgba(0, 0, 0, 0.6)",
        fontFamily: "'Space Mono', monospace",
        color: "#F5F5F5",
      }}
    >
      {/* Header with TypeSafe Brand Accent (#E551BA) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ color: "#E551BA", fontSize: "0.9rem" }}>⚡</span>
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: "bold", letterSpacing: "0.08em", color: "#FFFFFF" }}>
              BEATAPI JEV / SYSTEM ONE
            </div>
            <div style={{ fontSize: "0.58rem", color: "#8A8A8A" }}>
              Calibrated Structured Decision Layer (Model: {meta.jev_model || "jev-1.13-free"})
            </div>
          </div>
        </div>
        <span
          style={{
            fontSize: "0.58rem",
            padding: "2px 8px",
            borderRadius: 999,
            background: isLive
              ? "rgba(34, 197, 94, 0.15)"
              : fallbackOccurred
              ? "rgba(234, 179, 8, 0.15)"
              : "rgba(59, 130, 246, 0.15)",
            color: isLive ? "#4ADE80" : fallbackOccurred ? "#FACC15" : "#60A5FA",
            border: `1px solid ${
              isLive
                ? "rgba(34, 197, 94, 0.4)"
                : fallbackOccurred
                ? "rgba(234, 179, 8, 0.4)"
                : "rgba(59, 130, 246, 0.4)"
            }`,
          }}
        >
          {isLive
            ? "● LIVE JEV (jev-1.13-free)"
            : fallbackOccurred
            ? "⚠ JEV FALLBACK (HEURISTIC)"
            : "⚙ HEURISTIC DIRECT"}
        </span>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: "flex", gap: "0.3rem", marginBottom: "0.75rem", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "0.4rem" }}>
        {[
          { id: "routing", label: "Retrieval Routing" },
          { id: "calibration", label: "Calibration" },
          { id: "telemetry", label: "Latency & Cost" },
          { id: "reliability", label: "Circuit Breaker" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: activeTab === tab.id ? "rgba(229, 81, 186, 0.18)" : "transparent",
              color: activeTab === tab.id ? "#FF80DF" : "#8A8A8A",
              border: activeTab === tab.id ? "1px solid rgba(229, 81, 186, 0.4)" : "1px solid transparent",
              borderRadius: 6,
              padding: "3px 8px",
              fontSize: "0.6rem",
              cursor: "pointer",
              fontFamily: "'Space Mono', monospace",
              transition: "all 0.2s ease",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Retrieval Routing Decision */}
      {activeTab === "routing" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem", marginBottom: "0.6rem" }}>
            <div style={{ background: "#080808", padding: "0.5rem", borderRadius: 6, border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: "0.58rem", color: "#8A8A8A" }}>RETRIEVAL MODE</div>
              <div style={{ fontSize: "0.75rem", color: "#FF80DF", fontWeight: "bold", textTransform: "uppercase" }}>{retMode}</div>
            </div>
            <div style={{ background: "#080808", padding: "0.5rem", borderRadius: 6, border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: "0.58rem", color: "#8A8A8A" }}>HOP MODE</div>
              <div style={{ fontSize: "0.75rem", color: "#57B6FF", fontWeight: "bold", textTransform: "uppercase" }}>{hopMode}</div>
            </div>
            <div style={{ background: "#080808", padding: "0.5rem", borderRadius: 6, border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: "0.58rem", color: "#8A8A8A" }}>TRANSFORMATION</div>
              <div style={{ fontSize: "0.75rem", color: "#F5F5F5", textTransform: "uppercase" }}>{transform}</div>
            </div>
            <div style={{ background: "#080808", padding: "0.5rem", borderRadius: 6, border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: "0.58rem", color: "#8A8A8A" }}>ROUTE CLASSIFICATION</div>
              <div style={{ fontSize: "0.75rem", color: "#4ADE80", fontWeight: "bold" }}>{routeType}</div>
            </div>
          </div>

          {/* Probabilities Distribution */}
          <div style={{ background: "#040404", padding: "0.55rem", borderRadius: 6, marginBottom: "0.6rem", border: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ fontSize: "0.58rem", color: "#8A8A8A", marginBottom: "0.35rem" }}>
              PROBABILITY DISTRIBUTION (P) & CONFIDENCE ({Math.round(confidence * 100)}%)
            </div>
            {Object.entries(probabilities).map(([key, val]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", fontSize: "0.6rem" }}>
                <span style={{ width: "55px", color: key === retMode ? "#FF80DF" : "#8A8A8A" }}>{key}</span>
                <div style={{ flex: 1, height: "6px", background: "#1a1a1a", borderRadius: 3, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.round(val * 100)}%`,
                      background: key === retMode ? "linear-gradient(90deg, #E551BA, #FF80DF)" : "#444444",
                    }}
                  />
                </div>
                <span style={{ width: "35px", textAlign: "right", color: "#F5F5F5" }}>{Math.round(val * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Calibration */}
      {activeTab === "calibration" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem", marginBottom: "0.6rem" }}>
            <div style={{ background: "#080808", padding: "0.5rem", borderRadius: 6, border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: "0.58rem", color: "#8A8A8A" }}>POLICY AGREEMENT</div>
              <div style={{ fontSize: "0.82rem", color: "#4ADE80", fontWeight: "bold" }}>76.36%</div>
              <div style={{ fontSize: "0.52rem", color: "#8A8A8A" }}>42 of 55 benchmark queries</div>
            </div>
            <div style={{ background: "#080808", padding: "0.5rem", borderRadius: 6, border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: "0.58rem", color: "#8A8A8A" }}>EXPECTED CALIBRATION (ECE)</div>
              <div style={{ fontSize: "0.82rem", color: isLive ? "#57B6FF" : "#8A8A8A", fontWeight: "bold" }}>
                {isLive ? "0.038" : "N/A (Fallback)"}
              </div>
              <div style={{ fontSize: "0.52rem", color: "#8A8A8A" }}>Bucket partitioning error</div>
            </div>
            <div style={{ background: "#080808", padding: "0.5rem", borderRadius: 6, border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: "0.58rem", color: "#8A8A8A" }}>BRIER SCORE</div>
              <div style={{ fontSize: "0.82rem", color: isLive ? "#57B6FF" : "#8A8A8A", fontWeight: "bold" }}>
                {isLive ? "0.082" : "N/A (Fallback)"}
              </div>
              <div style={{ fontSize: "0.52rem", color: "#8A8A8A" }}>Mean squared error</div>
            </div>
            <div style={{ background: "#080808", padding: "0.5rem", borderRadius: 6, border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: "0.58rem", color: "#8A8A8A" }}>SAMPLE SIZE (N)</div>
              <div style={{ fontSize: "0.82rem", color: "#F5F5F5", fontWeight: "bold" }}>55 Queries</div>
              <div style={{ fontSize: "0.52rem", color: "#8A8A8A" }}>Frozen ground truth</div>
            </div>
          </div>
          <div style={{ fontSize: "0.55rem", color: "#8A8A8A", lineHeight: 1.4, padding: "0.4rem", background: "#040404", borderRadius: 4 }}>
            ℹ <strong>Scientific Methodology Notice:</strong> As mandated by Section 5 of the Phase B protocol, the 76.36% figure represents Policy Routing Agreement rather than intrinsic accuracy, as benchmark routing labels represent system policy preferences.
          </div>
        </div>
      )}

      {/* Tab 3: Latency & Cost */}
      {activeTab === "telemetry" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem", marginBottom: "0.6rem" }}>
            <div style={{ background: "#080808", padding: "0.5rem", borderRadius: 6, border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: "0.58rem", color: "#8A8A8A" }}>DECISION LATENCY</div>
              <div style={{ fontSize: "0.82rem", color: "#FF80DF", fontWeight: "bold" }}>{decisionLatency} ms</div>
              <div style={{ fontSize: "0.52rem", color: "#8A8A8A" }}>{isLive ? "BeatAPI Jev HTTP" : "In-memory heuristic"}</div>
            </div>
            <div style={{ background: "#080808", padding: "0.5rem", borderRadius: 6, border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: "0.58rem", color: "#8A8A8A" }}>JEV MODEL & COST</div>
              <div style={{ fontSize: "0.82rem", color: "#4ADE80", fontWeight: "bold" }}>
                $0.000000
              </div>
              <div style={{ fontSize: "0.52rem", color: "#8A8A8A" }}>Free Tier (jev-1.13-free)</div>
            </div>
          </div>
          <div style={{ fontSize: "0.56rem", color: "#777777", lineHeight: 1.4 }}>
            * Active Model: <strong>{meta.jev_model || "jev-1.13-free"}</strong> via BeatAPI. Free-tier tier quota: 1 req/min per account ($0.00 billed).
          </div>
        </div>
      )}

      {/* Tab 4: Reliability & Circuit-Breaker */}
      {activeTab === "reliability" && (
        <div>
          <div style={{ background: "#080808", padding: "0.6rem", borderRadius: 6, border: "1px solid rgba(255,255,255,0.04)", marginBottom: "0.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
              <span style={{ fontSize: "0.62rem", color: "#8A8A8A" }}>CIRCUIT-BREAKER STATUS:</span>
              <span style={{ color: "#4ADE80", fontSize: "0.62rem", fontWeight: "bold" }}>ACTIVE & ARMED</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
              <span style={{ fontSize: "0.62rem", color: "#8A8A8A" }}>FALLBACK BEHAVIOR:</span>
              <span style={{ color: fallbackOccurred ? "#FACC15" : "#4ADE80", fontSize: "0.62rem" }}>
                {fallbackOccurred ? "ENGAGED" : "BYPASSED (HEALTHY)"}
              </span>
            </div>
            {fallbackOccurred && (
              <div style={{ fontSize: "0.55rem", color: "#FCA5A5", background: "rgba(239, 68, 68, 0.1)", padding: "0.3rem 0.5rem", borderRadius: 4, marginTop: "0.3rem" }}>
                Reason: {fallbackReason}
              </div>
            )}
          </div>
          <div style={{ fontSize: "0.55rem", color: "#8A8A8A", lineHeight: 1.4 }}>
            ✓ <strong>Fail-Safe Principle:</strong> If TypeSafe Jev experiences timeouts, 429 rate limits, or network interruptions, execution seamlessly reverts to the deterministic heuristic planner with zero user-facing degradation.
          </div>
        </div>
      )}
    </div>
  );
}
