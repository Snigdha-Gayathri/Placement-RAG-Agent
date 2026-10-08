import { useState, useEffect, useCallback } from "react";
import FeatureToggles from "./FeatureToggles";
import JevDecisionPanel from "./components/JevDecisionPanel";

// ─── Collapsible Section ────────────────────────────────────────────────────
function Section({ title, icon, badge, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        marginBottom: "0.75rem",
        borderRadius: 12,
        background: "linear-gradient(145deg, #0d0d0d, #080808)",
        boxShadow: "var(--shadow-raised)",
        border: "1px solid rgba(0, 0, 0, 0.6)",
        borderTop: "1px solid rgba(255, 255, 255, 0.07)",
        borderLeft: "1px solid rgba(255, 255, 255, 0.07)",
        overflow: "hidden",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          padding: "0.65rem 0.9rem",
          background: open ? "#030303" : "transparent",
          border: "none",
          cursor: "pointer",
          borderBottom: open ? "1px solid rgba(0, 0, 0, 0.75)" : "none",
          boxShadow: open ? "var(--shadow-pressed)" : "none",
          transition: "all 0.2s ease",
          textAlign: "left",
          outline: "none",
        }}
      >
        <span style={{ color: "#1E90FF", fontSize: "0.75rem", fontFamily: "'Space Mono', monospace", filter: open ? "drop-shadow(0 0 4px rgba(30, 144, 255, 0.5))" : "none" }}>{icon}</span>
        <span
          style={{
            color: "#F5F5F5",
            fontSize: "0.68rem",
            fontFamily: "'Orbitron', 'Space Mono', monospace",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            flex: 1,
            fontWeight: "bold",
          }}
        >
          {title}
        </span>
        {badge && (
          <span
            style={{
              fontSize: "0.58rem",
              fontFamily: "'Space Mono', monospace",
              padding: "2px 7px",
              borderRadius: 999,
              background: "rgba(30, 144, 255, 0.12)",
              color: "#57B6FF",
              border: "1px solid rgba(30, 144, 255, 0.3)",
              marginRight: "0.4rem",
            }}
          >
            {badge}
          </span>
        )}
        <span
          style={{
            color: open ? "#57B6FF" : "#8A8A8A",
            fontSize: "0.65rem",
            transform: open ? "rotate(90deg)" : "none",
            transition: "transform 0.2s",
            filter: open ? "drop-shadow(0 0 4px rgba(30, 144, 255, 0.5))" : "none",
          }}
        >
          ▶
        </span>
      </button>
      {open && (
        <div style={{ padding: "0.75rem 0.85rem", background: "#050505", boxShadow: "inset 2px 2px 6px rgba(0, 0, 0, 0.55)" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Label/Value pair ───────────────────────────────────────────────────────
function DataRow({ label, value, mono = true, highlight = false }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.35rem" }}>
      <span style={{ color: "#8A8A8A", fontSize: "0.68rem", fontFamily: "'Space Mono', monospace", flexShrink: 0, minWidth: 110 }}>
        {label}
      </span>
      <span
        style={{
          color: highlight ? "#57B6FF" : "#F5F5F5",
          fontSize: "0.72rem",
          fontFamily: mono ? "'Space Mono', monospace" : "'Sora', sans-serif",
          wordBreak: "break-word",
          lineHeight: 1.45,
          fontWeight: highlight ? "bold" : "normal",
        }}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

// ─── Metric Card ────────────────────────────────────────────────────────────
function MetricCard({ name, value, subtitle, isNA = false, highlight = false }) {
  const isStringNA = value === "N/A" || isNA;
  const numVal = typeof value === "number" ? value : parseFloat(value);
  const isValid = !isNaN(numVal) && !isStringNA;
  const isLatency = name.toLowerCase().includes("latency") || name.toLowerCase().includes("time");
  const isPercentage = isValid && !isLatency && numVal <= 1.0;

  let displayVal = "—";
  if (isStringNA) {
    displayVal = "N/A";
  } else if (isValid) {
    if (isLatency) {
      displayVal = numVal < 1000 ? `${numVal.toFixed(0)}ms` : `${(numVal / 1000).toFixed(2)}s`;
    } else {
      displayVal = numVal <= 1.0 ? numVal.toFixed(3) : numVal.toFixed(1);
    }
  } else if (value != null) {
    displayVal = String(value);
  }

  const barWidth = isValid && isPercentage ? Math.min(Math.max(numVal * 100, 0), 100) : 0;
  const barColor = numVal < 0.3 ? "#EF4444" : numVal < 0.7 ? "#F59E0B" : "#10B981";

  return (
    <div
      style={{
        background: highlight
          ? "linear-gradient(145deg, #121824, #0b0f17)"
          : "linear-gradient(145deg, #0e0e0e, #090909)",
        boxShadow: "var(--shadow-raised-sm)",
        border: highlight
          ? "1px solid rgba(30, 144, 255, 0.45)"
          : "1px solid rgba(0, 0, 0, 0.6)",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: 10,
        padding: "0.55rem 0.7rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div style={{ color: "#8A8A8A", fontSize: "0.6rem", fontFamily: "'Space Mono', monospace", marginBottom: "0.25rem", lineHeight: 1.2 }}>
        {name}
      </div>
      <div
        style={{
          color: isStringNA ? "#8A8A8A" : highlight ? "#57B6FF" : "#F5F5F5",
          fontSize: isStringNA ? "0.78rem" : "0.86rem",
          fontFamily: "'Space Mono', monospace",
          fontWeight: "bold",
          letterSpacing: isStringNA ? "0.05em" : "normal",
          textShadow: isValid ? "0 0 6px rgba(30, 144, 255, 0.25)" : "none",
        }}
      >
        {displayVal}
      </div>
      {subtitle && (
        <div style={{ color: "#666666", fontSize: "0.56rem", fontFamily: "'Space Mono', monospace", marginTop: "0.2rem" }}>
          {subtitle}
        </div>
      )}
      {isPercentage && isValid && (
        <div style={{ height: 4, background: "#010101", boxShadow: "var(--shadow-pressed)", borderRadius: 2, marginTop: "0.35rem", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${barWidth}%`, background: barColor, borderRadius: 2, transition: "width 0.3s" }} />
        </div>
      )}
    </div>
  );
}

// ─── Code Block ─────────────────────────────────────────────────────────────
function CodeBlock({ content, maxHeight = 200 }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <pre
        style={{
          background: "#030303",
          border: "1px solid rgba(0, 0, 0, 0.85)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.02)",
          borderRight: "1px solid rgba(255, 255, 255, 0.02)",
          boxShadow: "inset 4px 4px 10px rgba(0, 0, 0, 0.92)",
          borderRadius: 10,
          padding: "0.6rem",
          color: "#9FB6D4",
          fontSize: "0.65rem",
          fontFamily: "'Space Mono', monospace",
          lineHeight: 1.5,
          overflowX: "auto",
          overflowY: expanded ? "auto" : "hidden",
          maxHeight: expanded ? "none" : maxHeight,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          margin: 0,
        }}
      >
        {content || "No data available"}
      </pre>
      {content && content.length > 300 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="neo-button"
          style={{
            position: expanded ? "relative" : "absolute",
            bottom: expanded ? "auto" : 0,
            left: 0,
            right: 0,
            width: "100%",
            background: expanded ? "#0a0a0a" : "linear-gradient(to bottom, rgba(4,4,4,0.6), rgba(3,3,3,0.97))",
            border: "none",
            color: "#57B6FF",
            fontSize: "0.62rem",
            fontFamily: "'Space Mono', monospace",
            padding: "0.35rem",
            cursor: "pointer",
            borderRadius: expanded ? 8 : "0 0 10px 10px",
            textAlign: "center",
          }}
        >
          {expanded ? "▲ Collapse" : "▼ Expand"}
        </button>
      )}
    </div>
  );
}

// ─── Visual Dynamic Decision Flow Component ─────────────────────────────────
function VisualDecisionFlow({ decisionFlow = [], executedOps = [], skippedOps = [], routeType, isBlocked }) {
  // Canonical sequence of agentic retrieval steps
  const nodes = [
    {
      id: "PROFILE",
      name: "Profile & Plan",
      icon: "◎",
      desc: "Categorize query & determine operations",
      executed: true,
      reason: routeType ? `Route: ${routeType}` : "Query analyzed",
    },
    {
      id: "REWRITE",
      name: "Query Rewrite",
      icon: "↺",
      desc: "Resolve conversational context",
      executed: executedOps.some((op) => op.includes("REWRITE") || op.includes("QUERY_REWRITING")),
      skippedReason: skippedOps.find((s) => s.operation?.includes("REWRITE"))?.reason || "Standalone query — no history needed",
    },
    {
      id: "METADATA_FILTER",
      name: "Metadata Filter",
      icon: "⊞",
      desc: "Canonical company / tag scoping",
      executed: executedOps.some((op) => op.includes("METADATA")),
      skippedReason: skippedOps.find((s) => s.operation?.includes("METADATA"))?.reason || "Multi-company or general query",
    },
    {
      id: "RETRIEVAL",
      name: "Retrieval Strategy",
      icon: "⬡",
      desc: isBlocked
        ? "Bypassed by security gateway"
        : executedOps.some((op) => op.includes("HYBRID"))
        ? "Hybrid RRF (BM25 + Dense)"
        : executedOps.some((op) => op.includes("BM25"))
        ? "BM25 Lexical (Exact matches)"
        : executedOps.some((op) => op.includes("DENSE"))
        ? "Dense Semantic (Cosine sim)"
        : "Standard Retrieval",
      executed: !isBlocked && executedOps.some((op) => op.includes("RETRIEVAL") || op.includes("BM25") || op.includes("DENSE") || op.includes("HYBRID")),
      skippedReason: isBlocked ? "Pre-retrieval security block" : null,
      highlight: true,
    },
    {
      id: "CHUNK_ENHANCE",
      name: "Chunk Enhance",
      icon: "◫",
      desc: "Parent document context expansion",
      executed: executedOps.some((op) => op.includes("ENHANCE")),
      skippedReason: skippedOps.find((s) => s.operation?.includes("ENHANCE"))?.reason || "Standard chunks sufficient",
    },
    {
      id: "RERANK",
      name: "Cross-Encoder",
      icon: "⇅",
      desc: "Deep relevance cross-attention scoring",
      executed: executedOps.some((op) => op.includes("RERANK")),
      skippedReason: skippedOps.find((s) => s.operation?.includes("RERANK"))?.reason || "Disabled or not required for exact keyword search",
    },
    {
      id: "EVIDENCE_EVAL",
      name: "Evidence Check",
      icon: "⚖",
      desc: "Sufficiency check & escalation decision",
      executed: executedOps.some((op) => op.includes("EVALUATE") || op.includes("EVIDENCE")),
      skippedReason: isBlocked ? "Bypassed by security" : null,
    },
    {
      id: "SYNTHESIS",
      name: "Synthesize Answer",
      icon: "✧",
      desc: isBlocked ? "Security Notice Returned" : "LLM generation with disclosure",
      executed: true,
      reason: isBlocked ? "Returned user-safe security notice" : "Grounding-verified response",
    },
  ];

  return (
    <div style={{ marginBottom: "0.85rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <span style={{ color: "#8A8A8A", fontSize: "0.62rem", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Dynamic Retrieval Execution Chain
        </span>
        <span style={{ color: "#555555", fontSize: "0.58rem", fontFamily: "'Space Mono', monospace" }}>
          {executedOps.length} Executed • {skippedOps.length} Skipped
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.35rem",
          background: "#030303",
          borderRadius: 10,
          padding: "0.6rem",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          boxShadow: "inset 0 2px 6px rgba(0, 0, 0, 0.8)",
        }}
      >
        {nodes.map((node) => {
          const isExec = node.executed;
          const statusBadgeColor = isBlocked && node.id === "RETRIEVAL"
            ? "#EF4444"
            : isExec
            ? "#10B981"
            : "#6B7280";
          const statusBg = isBlocked && node.id === "RETRIEVAL"
            ? "rgba(239, 68, 68, 0.12)"
            : isExec
            ? "rgba(16, 185, 129, 0.12)"
            : "rgba(107, 114, 128, 0.08)";
          const statusBorder = isBlocked && node.id === "RETRIEVAL"
            ? "rgba(239, 68, 68, 0.35)"
            : isExec
            ? "rgba(16, 185, 129, 0.35)"
            : "rgba(107, 114, 128, 0.2)";

          return (
            <div
              key={node.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                padding: "0.45rem 0.6rem",
                borderRadius: 8,
                background: isExec
                  ? "linear-gradient(145deg, #0a0e14, #06090d)"
                  : "#050505",
                border: isExec ? "1px solid rgba(30, 144, 255, 0.22)" : "1px solid rgba(255, 255, 255, 0.03)",
                boxShadow: isExec ? "var(--shadow-raised-sm)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              {/* Step Icon */}
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isExec ? "rgba(30, 144, 255, 0.18)" : "#0c0c0c",
                  color: isExec ? "#57B6FF" : "#555555",
                  fontSize: "0.72rem",
                  fontFamily: "'Space Mono', monospace",
                  flexShrink: 0,
                  border: isExec ? "1px solid rgba(30, 144, 255, 0.4)" : "1px solid #1a1a1a",
                }}
              >
                {node.icon}
              </div>

              {/* Node Title & Description */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span
                    style={{
                      color: isExec ? "#F5F5F5" : "#777777",
                      fontSize: "0.68rem",
                      fontFamily: "'Orbitron', 'Space Mono', monospace",
                      fontWeight: "bold",
                    }}
                  >
                    {node.name}
                  </span>
                  <span
                    style={{
                      fontSize: "0.55rem",
                      fontFamily: "'Space Mono', monospace",
                      padding: "1px 6px",
                      borderRadius: 999,
                      background: statusBg,
                      color: statusBadgeColor,
                      border: `1px solid ${statusBorder}`,
                      fontWeight: "bold",
                    }}
                  >
                    {isBlocked && node.id === "RETRIEVAL" ? "🛡️ BLOCKED" : isExec ? "✓ EXECUTED" : "✗ SKIPPED"}
                  </span>
                </div>
                <div
                  style={{
                    color: isExec ? "#8A8A8A" : "#555555",
                    fontSize: "0.6rem",
                    fontFamily: "'Space Mono', monospace",
                    marginTop: "0.15rem",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={!isExec && node.skippedReason ? `Reason: ${node.skippedReason}` : node.desc}
                >
                  {!isExec && node.skippedReason ? `Reason: ${node.skippedReason}` : node.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Before vs After Reranking Comparison Table Component ───────────────────
function RerankingTable({ rankMovements = [], candidateBefore = 0, candidateAfter = 0 }) {
  if (!rankMovements || rankMovements.length === 0) {
    return (
      <div style={{ color: "#555555", fontSize: "0.65rem", fontFamily: "'Space Mono', monospace", padding: "0.5rem 0" }}>
        Cross-Encoder reranking was skipped for this query (lexical or direct route).
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.45rem" }}>
        <span style={{ color: "#8A8A8A", fontSize: "0.62rem", fontFamily: "'Space Mono', monospace" }}>
          Candidate Pool: {candidateBefore} → Top {candidateAfter} Reranked
        </span>
        <span style={{ color: "#57B6FF", fontSize: "0.6rem", fontFamily: "'Space Mono', monospace" }}>
          Cross-Attention Scored
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="dash-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.65rem", fontFamily: "'Space Mono', monospace" }}>
          <thead>
            <tr style={{ background: "linear-gradient(180deg, #101010, #0a0a0a)" }}>
              {["#", "Company", "Orig", "New", "Movement", "CE Score", "Snippet"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    color: "#8A8A8A",
                    padding: "0.35rem 0.5rem",
                    fontWeight: "bold",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    fontSize: "0.6rem",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rankMovements.map((item, i) => {
              const origRank = item.original_rank ?? (i + 1);
              const newRank = item.new_rank ?? (i + 1);
              const shift = origRank - newRank; // positive = moved up
              const ceScore = item.cross_encoder_score ?? item.score;
              const company = item.company || (typeof item.metadata === "object" ? item.metadata?.company : "General") || "General";
              const snippet = item.text_snippet || item.text || "—";

              return (
                <tr
                  key={item.chunk_id || i}
                  style={{
                    background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                  }}
                >
                  <td style={{ color: "#1E90FF", padding: "0.35rem 0.5rem" }}>{i + 1}</td>
                  <td style={{ color: "#F5F5F5", padding: "0.35rem 0.5rem" }}>
                    <span
                      style={{
                        padding: "1px 6px",
                        borderRadius: 999,
                        background: "rgba(30, 144, 255, 0.12)",
                        color: "#57B6FF",
                        fontSize: "0.58rem",
                      }}
                    >
                      {company}
                    </span>
                  </td>
                  <td style={{ color: "#8A8A8A", padding: "0.35rem 0.5rem" }}>{origRank}</td>
                  <td style={{ color: "#F5F5F5", padding: "0.35rem 0.5rem", fontWeight: "bold" }}>{newRank}</td>
                  <td style={{ padding: "0.35rem 0.5rem" }}>
                    {shift > 0 ? (
                      <span style={{ color: "#10B981", fontWeight: "bold" }}>
                        {origRank} → {newRank} (↑{shift})
                      </span>
                    ) : shift < 0 ? (
                      <span style={{ color: "#EF4444", fontWeight: "bold" }}>
                        {origRank} → {newRank} (↓{Math.abs(shift)})
                      </span>
                    ) : (
                      <span style={{ color: "#6B7280" }}>= Unchanged</span>
                    )}
                  </td>
                  <td style={{ color: "#57B6FF", padding: "0.35rem 0.5rem", fontWeight: "bold" }}>
                    {typeof ceScore === "number" ? ceScore.toFixed(3) : "—"}
                  </td>
                  <td
                    style={{
                      color: "#8A8A8A",
                      padding: "0.35rem 0.5rem",
                      maxWidth: 160,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={snippet}
                  >
                    {snippet}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Step-by-Step Execution Trace Component ─────────────────────────────────
function ExecutionTraceSection({ trace = [], decisionFlow = [] }) {
  const steps = trace && trace.length > 0 ? trace : decisionFlow;

  if (!steps || steps.length === 0) {
    return (
      <div style={{ color: "#555555", fontSize: "0.65rem", fontFamily: "'Space Mono', monospace" }}>
        No execution trace recorded.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
      {steps.map((step, idx) => {
        const isStr = typeof step === "string";
        const toolName = !isStr ? step.tool_name || step.tool || step.node || `Step ${idx + 1}` : "Agent Step";
        const latency = !isStr ? step.latency_ms ?? step.latency : null;
        const status = !isStr ? step.status || "SUCCESS" : "SUCCESS";
        const summary = !isStr
          ? step.output_summary
            ? (step.reasoning ? `${step.reasoning} — ${step.output_summary}` : step.output_summary)
            : (step.reasoning || step.summary || step.reason || step.output)
          : step;
        const isSkipped = status === "SKIPPED";
        const isBlocked = status === "BLOCKED";

        const badgeColor = isBlocked ? "#EF4444" : isSkipped ? "#6B7280" : "#10B981";

        return (
          <div
            key={idx}
            style={{
              borderRadius: 8,
              background: "#030303",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              padding: "0.5rem 0.7rem",
              boxShadow: "var(--shadow-raised-sm)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                <span style={{ color: "#1E90FF", fontSize: "0.62rem", fontFamily: "'Space Mono', monospace" }}>
                  #{idx + 1}
                </span>
                <span style={{ color: "#F5F5F5", fontSize: "0.68rem", fontFamily: "'Space Mono', monospace", fontWeight: "bold" }}>
                  {toolName}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                {latency != null && (
                  <span style={{ color: "#8A8A8A", fontSize: "0.58rem", fontFamily: "'Space Mono', monospace" }}>
                    {latency}ms
                  </span>
                )}
                <span
                  style={{
                    fontSize: "0.54rem",
                    fontFamily: "'Space Mono', monospace",
                    padding: "1px 6px",
                    borderRadius: 999,
                    color: badgeColor,
                    background: `${badgeColor}18`,
                    border: `1px solid ${badgeColor}40`,
                    fontWeight: "bold",
                  }}
                >
                  {status}
                </span>
              </div>
            </div>
            {summary && (
              <div style={{ color: "#9FB6D4", fontSize: "0.62rem", fontFamily: "'Space Mono', monospace", lineHeight: 1.4 }}>
                {String(summary)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Current vs Cumulative Metrics Section ──────────────────────────────────
function MetricsComparisonSection({ computedMetrics = {}, cumulativeMetrics = {} }) {
  const curMrr = computedMetrics.mrr ?? "N/A";
  const curNdcg = computedMetrics.ndcg ?? "N/A";
  const curPrec = computedMetrics.precision_at_k ?? "N/A";
  const curRec = computedMetrics.recall_at_k ?? "N/A";

  const cumMrr = cumulativeMetrics.cumulative_mrr ?? "N/A";
  const cumNdcg = cumulativeMetrics.cumulative_ndcg ?? "N/A";
  const validQueriesCount = cumulativeMetrics.valid_ground_truth_queries ?? 0;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem", marginBottom: "0.6rem" }}>
        <MetricCard
          name="Current Query MRR"
          value={curMrr}
          subtitle={curMrr === "N/A" ? "No ground truth label" : "Mean Reciprocal Rank"}
          isNA={curMrr === "N/A"}
          highlight={curMrr !== "N/A"}
        />
        <MetricCard
          name="Session Cumulative MRR"
          value={cumMrr}
          subtitle={`${validQueriesCount} benchmark queries`}
          isNA={cumMrr === "N/A"}
          highlight={cumMrr !== "N/A"}
        />
        <MetricCard
          name="Current Query NDCG"
          value={curNdcg}
          subtitle={curNdcg === "N/A" ? "No ground truth label" : "Normalized Discounted Gain"}
          isNA={curNdcg === "N/A"}
        />
        <MetricCard
          name="Session Cumulative NDCG"
          value={cumNdcg}
          subtitle={`Running benchmark average`}
          isNA={cumNdcg === "N/A"}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
        <MetricCard
          name="Precision@K"
          value={curPrec}
          isNA={curPrec === "N/A"}
        />
        <MetricCard
          name="Recall@K"
          value={curRec}
          isNA={curRec === "N/A"}
        />
      </div>

      <div
        style={{
          marginTop: "0.5rem",
          padding: "0.4rem 0.6rem",
          background: "#020202",
          borderRadius: 6,
          border: "1px solid rgba(255, 255, 255, 0.04)",
          fontSize: "0.58rem",
          color: "#777777",
          fontFamily: "'Space Mono', monospace",
          lineHeight: 1.4,
        }}
      >
        ℹ <strong>Honest Disclosure:</strong> Queries without ground-truth relevance labels or blocked by security display <code>N/A</code> and are strictly excluded from session cumulative averages so benchmarks remain unpolluted.
      </div>
    </div>
  );
}

// ─── Main DeveloperDashboard Component ──────────────────────────────────────
export default function DeveloperDashboard({ isOpen, onClose, requestId, apiBase, isChatLoading, isMobile }) {
  const [data, setData] = useState(null);
  const [vectorStats, setVectorStats] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [activeRequestId, setActiveRequestId] = useState(requestId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync activeRequestId when parent passes a new requestId
  useEffect(() => {
    if (requestId) {
      setActiveRequestId(requestId);
    }
  }, [requestId]);

  // Fetch session history for the query selector tabs
  const fetchHistory = useCallback(async () => {
    if (!isOpen || !apiBase) return;
    try {
      const apiKey = import.meta.env.VITE_API_KEY || "rag-client-key-2026";
      const res = await fetch(`${apiBase}/api/dashboard/history`, {
        headers: { "X-API-Key": apiKey },
      });
      if (res.ok) {
        const historyJson = await res.json();
        setSessionHistory(Array.isArray(historyJson) ? historyJson : (historyJson.history || []));
      }
    } catch (e) {
      console.warn("[DeveloperDashboard] History fetch warning:", e);
    }
  }, [isOpen, apiBase]);

  // Fetch dashboard data for the active request ID
  useEffect(() => {
    if (!isOpen || !activeRequestId || !apiBase) return;

    setData(null);
    setError(null);
    setLoading(true);

    let isMounted = true;
    let timerId = null;

    const fetchData = async (attempt = 1) => {
      if (!isMounted) return;
      try {
        const apiKey = import.meta.env.VITE_API_KEY || "rag-client-key-2026";
        const res = await fetch(`${apiBase}/api/dashboard/${activeRequestId}`, {
          headers: { "X-API-Key": apiKey },
        });

        if (!res.ok) {
          if (res.status === 404 && (isChatLoading || attempt < 12)) {
            if (isMounted) {
              timerId = setTimeout(() => fetchData(attempt + 1), 800);
            }
            return;
          }
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const json = await res.json();
        if (isMounted) {
          setData(json);
          setError(null);
          setLoading(false);
          fetchHistory();
        }
      } catch (err) {
        if (isMounted) {
          setError(`Dashboard data unavailable — ${err.message}`);
          setData(null);
          setLoading(false);
        }
      }
    };

    timerId = setTimeout(() => fetchData(1), 250);
    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [isOpen, activeRequestId, apiBase, isChatLoading, fetchHistory]);

  // Fetch vector DB stats on open
  useEffect(() => {
    if (!isOpen || !apiBase) return;
    const fetchStats = async () => {
      try {
        const res = await fetch(`${apiBase}/api/vector-db/stats`, {
          headers: { "X-API-Key": import.meta.env.VITE_API_KEY || "rag-client-key-2026" },
        });
        if (res.ok) setVectorStats(await res.json());
      } catch (err) {
        setVectorStats(null);
      }
    };
    fetchStats();
    fetchHistory();
  }, [isOpen, apiBase, fetchHistory]);

  const d = data || {};
  const query = d.query_info || {};
  const retrieval = d.retrieval_info || {};
  const reranking = d.reranking_info || {};
  const agent = d.agent_info || {};
  const generation = d.generation_info || {};
  const security = d.security_info || {};
  const vs = vectorStats || {};

  const isBlocked = d.is_blocked === true || security.injection_action === "block" || query.route_type === "SECURITY_BLOCKED";
  const retrievedChunks = retrieval.retrieved_chunks || [];
  const rankMovements = d.rank_movements || reranking.rank_changes || [];
  const traceSteps = agent.reasoning_trace && agent.reasoning_trace.length > 0 ? agent.reasoning_trace : (agent.trace || d.decision_flow || []);
  const executedOps = d.executed_operations || [];
  const skippedOps = d.skipped_operations || [];
  const computedMetrics = d.computed_metrics || {};
  const cumulativeMetrics = d.cumulative_metrics || {};

  return (
    <div
      className="dashboard-panel"
      style={
        !isOpen
          ? {
              position: "relative",
              height: "100%",
              flex: "0 0 0%",
              width: "0%",
              flexShrink: 0,
              background: "#050505",
              borderLeft: "none",
              zIndex: 100,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              opacity: 0,
              pointerEvents: "none",
              transition: "flex 0.35s cubic-bezier(0.4, 0, 0.2, 1), width 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease",
            }
          : isMobile
          ? {
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "85%",
              maxWidth: "440px",
              height: "100vh",
              background: "#050505",
              borderLeft: "1px solid rgba(255, 255, 255, 0.05)",
              boxShadow: "-18px 0 44px rgba(0, 0, 0, 0.9)",
              zIndex: 1000,
              display: "flex",
              flexDirection: "column",
              animation: "slideInRight 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards",
              overflowY: "auto",
            }
          : {
              position: "relative",
              height: "100%",
              flex: "0 0 35%",
              width: "35%",
              flexShrink: 0,
              background: "#050505",
              borderLeft: "1px solid rgba(255, 255, 255, 0.05)",
              boxShadow: "-14px 0 36px rgba(0, 0, 0, 0.8)",
              zIndex: 100,
              display: "flex",
              flexDirection: "column",
              animation: "slideInRight 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards",
              overflowY: "auto",
              transition: "flex 0.35s cubic-bezier(0.4, 0, 0.2, 1), width 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
            }
      }
    >
      {/* Header */}
      <div
        style={{
          padding: "0.85rem 1.1rem",
          borderBottom: "1px solid rgba(0, 0, 0, 0.75)",
          boxShadow: "0 6px 14px rgba(0, 0, 0, 0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(180deg, #0c0c0c, #080808)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
          <span style={{ fontSize: "0.95rem", color: "#1E90FF" }}>🛠</span>
          <span
            style={{
              fontFamily: "'Orbitron', monospace",
              fontSize: "0.78rem",
              fontWeight: "bold",
              color: "#1E90FF",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              textShadow: "0 0 8px rgba(30, 144, 255, 0.4)",
            }}
          >
            Developer Dashboard
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <button
            onClick={() => fetchHistory()}
            className="neo-button"
            title="Refresh query history"
            style={{
              color: "#8A8A8A",
              fontSize: "0.72rem",
              width: "28px",
              height: "28px",
              borderRadius: "50%",
            }}
          >
            ↻
          </button>
          <button
            onClick={onClose}
            className="neo-button"
            style={{
              color: "#8A8A8A",
              fontSize: "0.8rem",
              cursor: "pointer",
              width: "28px",
              height: "28px",
              borderRadius: "50%",
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Query Selector Tabs (Session History) */}
      {sessionHistory.length > 0 && (
        <div
          style={{
            background: "#030303",
            borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
            padding: "0.45rem 0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            overflowX: "auto",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          <span style={{ color: "#666666", fontSize: "0.58rem", fontFamily: "'Space Mono', monospace", marginRight: "0.2rem" }}>
            QUERIES:
          </span>
          {sessionHistory.slice(0, 8).map((histItem, idx) => {
            const isSelected = histItem.request_id === activeRequestId;
            const isHistBlocked = histItem.security_status === "BLOCKED" || histItem.route === "SECURITY_BLOCKED";
            return (
              <button
                key={histItem.request_id || idx}
                onClick={() => setActiveRequestId(histItem.request_id)}
                style={{
                  background: isSelected
                    ? "linear-gradient(145deg, #101826, #0b111c)"
                    : "#080808",
                  border: isSelected
                    ? "1px solid rgba(30, 144, 255, 0.45)"
                    : "1px solid rgba(255, 255, 255, 0.04)",
                  borderRadius: 999,
                  padding: "2px 8px",
                  cursor: "pointer",
                  fontSize: "0.6rem",
                  fontFamily: "'Space Mono', monospace",
                  color: isHistBlocked ? "#EF4444" : isSelected ? "#57B6FF" : "#8A8A8A",
                  fontWeight: isSelected ? "bold" : "normal",
                  boxShadow: isSelected ? "0 0 8px rgba(30, 144, 255, 0.2)" : "none",
                  transition: "all 0.15s ease",
                  flexShrink: 0,
                }}
                title={histItem.query}
              >
                {isHistBlocked ? "🛡️ " : ""}Q{idx + 1}: {histItem.query ? histItem.query.substring(0, 18) + (histItem.query.length > 18 ? "…" : "") : "Query"}
              </button>
            );
          })}
        </div>
      )}

      {/* Security Gateway Block Alert (when blocked) */}
      {isBlocked && (
        <div
          style={{
            background: "linear-gradient(145deg, #1a0505, #0d0202)",
            border: "1px solid rgba(239, 68, 68, 0.45)",
            borderRadius: 10,
            margin: "0.6rem 0.85rem 0.2rem",
            padding: "0.65rem 0.8rem",
            boxShadow: "0 0 14px rgba(239, 68, 68, 0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.3rem" }}>
            <span style={{ fontSize: "0.95rem" }}>🛡️</span>
            <span style={{ fontFamily: "'Orbitron', monospace", fontSize: "0.72rem", color: "#EF4444", fontWeight: "bold", letterSpacing: "0.08em" }}>
              SECURITY GATEWAY INTERCEPT
            </span>
          </div>
          <div style={{ color: "#FCA5A5", fontSize: "0.62rem", fontFamily: "'Space Mono', monospace", lineHeight: 1.4 }}>
            Query was intercepted before retrieval. BM25, Dense, Embeddings, and LLM calls were completely bypassed.
          </div>
          {d.security_event?.category && (
            <div style={{ marginTop: "0.4rem", display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              <span style={{ background: "rgba(239, 68, 68, 0.2)", color: "#EF4444", padding: "1px 6px", borderRadius: 4, fontSize: "0.58rem", fontFamily: "'Space Mono', monospace" }}>
                {d.security_event.category}
              </span>
              <span style={{ background: "rgba(239, 68, 68, 0.2)", color: "#EF4444", padding: "1px 6px", borderRadius: 4, fontSize: "0.58rem", fontFamily: "'Space Mono', monospace" }}>
                Severity: {d.security_event.severity || "HIGH"}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Content Scroll Container */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem 0.85rem" }}>
        {loading && (
          <div style={{ textAlign: "center", padding: "2rem 1rem", color: "#8A8A8A", fontSize: "0.72rem", fontFamily: "'Space Mono', monospace" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>⏳</div>
            Loading agentic telemetry...
          </div>
        )}

        {error && !loading && (
          <div style={{ padding: "1rem", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 8, color: "#FCA5A5", fontSize: "0.68rem", fontFamily: "'Space Mono', monospace" }}>
            {error}
          </div>
        )}

        {/* ───── 0. Jev System One Calibrated Decision Layer ───── */}
        <Section title="Jev Decision Model (System One)" icon="⚡" badge="Phase B" defaultOpen={true}>
          <JevDecisionPanel
            decisionMetadata={d.decision_metadata || d.agent_info?.decision_metadata}
            computedMetrics={computedMetrics}
            isLive={Boolean(
              (d.decision_metadata?.backend === "jev" || d.agent_info?.decision_metadata?.backend === "jev") &&
              !(d.decision_metadata?.fallback_occurred ?? d.agent_info?.decision_metadata?.fallback_occurred)
            )}
          />
        </Section>

        {/* ───── 1. Visual Agentic Decision Flow ───── */}
        <Section title="Agentic Decision Flow" icon="◈" defaultOpen={true}>
          <VisualDecisionFlow
            decisionFlow={d.decision_flow || []}
            executedOps={executedOps}
            skippedOps={skippedOps}
            routeType={query.route_type}
            isBlocked={isBlocked}
          />
        </Section>

        {/* ───── 2. Before vs After Reranking Comparison ───── */}
        <Section
          title="Reranking Movement"
          icon="⇅"
          badge={rankMovements.length > 0 ? `${rankMovements.length} Chunks` : "Skipped"}
          defaultOpen={rankMovements.length > 0}
        >
          <RerankingTable
            rankMovements={rankMovements}
            candidateBefore={d.candidate_count_before_reranking || (retrievedChunks.length)}
            candidateAfter={d.candidate_count_after_reranking || (rankMovements.length)}
          />
        </Section>

        {/* ───── 3. Step-by-Step Execution Trace ───── */}
        <Section title="Execution Trace" icon="⟐" badge={`${traceSteps.length} Steps`} defaultOpen={true}>
          <ExecutionTraceSection trace={traceSteps} decisionFlow={d.decision_flow || []} />
        </Section>

        {/* ───── 4. Current vs Cumulative Evaluation ───── */}
        <Section title="Retrieval Metrics & Cumulative" icon="◆" defaultOpen={true}>
          <MetricsComparisonSection
            computedMetrics={computedMetrics}
            cumulativeMetrics={cumulativeMetrics}
          />
        </Section>

        {/* ───── 5. Query & Routing Details ───── */}
        <Section title="Query & Routing Analysis" icon="◎">
          <DataRow label="Original Query" value={query.original_query} />
          <DataRow label="Standalone Query" value={query.standalone_query} />
          <DataRow label="Route Type" value={query.route_type} highlight={true} />
          <DataRow label="Routing Logic" value={query.routing_decision} />
          {query.detected_companies && query.detected_companies.length > 0 && (
            <DataRow label="Target Companies" value={query.detected_companies.join(", ")} />
          )}
          {query.metadata_filters && Object.keys(query.metadata_filters).length > 0 && (
            <div style={{ marginTop: "0.4rem" }}>
              <span style={{ color: "#8A8A8A", fontSize: "0.62rem", fontFamily: "'Space Mono', monospace" }}>Applied Filters:</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginTop: "0.2rem" }}>
                {Object.entries(query.metadata_filters).map(([k, v]) => (
                  <span
                    key={k}
                    style={{
                      background: "rgba(30, 144, 255, 0.12)",
                      border: "1px solid rgba(30, 144, 255, 0.35)",
                      borderRadius: 4,
                      padding: "1px 6px",
                      fontSize: "0.6rem",
                      color: "#57B6FF",
                      fontFamily: "'Space Mono', monospace",
                    }}
                  >
                    {k}: {String(v)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* ───── 6. Retrieved Document Chunks ───── */}
        <Section title="Retrieved Chunks" icon="⬡" badge={`${retrievedChunks.length} Chunks`}>
          <DataRow label="Retriever" value={retrieval.retriever_used || "none"} />
          <DataRow label="Retrieval Latency" value={retrieval.retrieval_latency_ms != null ? `${retrieval.retrieval_latency_ms}ms` : "0ms"} />
          <DataRow label="Candidate Pool" value={retrieval.total_candidates ?? retrievedChunks.length} />

          {retrievedChunks.length > 0 && (
            <div style={{ overflowX: "auto", marginTop: "0.5rem" }}>
              <table className="dash-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.62rem", fontFamily: "'Space Mono', monospace" }}>
                <thead>
                  <tr style={{ background: "linear-gradient(180deg, #101010, #0a0a0a)" }}>
                    {["#", "Company", "Score", "Preview"].map((h) => (
                      <th key={h} style={{ textAlign: "left", color: "#8A8A8A", padding: "0.35rem 0.5rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {retrievedChunks.map((chunk, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <td style={{ color: "#1E90FF", padding: "0.35rem 0.5rem" }}>{i + 1}</td>
                      <td style={{ color: "#F5F5F5", padding: "0.35rem 0.5rem" }}>{chunk.company || chunk.metadata?.company || "General"}</td>
                      <td style={{ color: "#57B6FF", padding: "0.35rem 0.5rem" }}>
                        {(chunk.score ?? chunk.similarity_score)?.toFixed(3) ?? "—"}
                      </td>
                      <td style={{ color: "#8A8A8A", padding: "0.35rem 0.5rem", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={chunk.text}>
                        {chunk.text ? chunk.text.substring(0, 100) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* ───── 7. Generation Details & Token Usage ───── */}
        <Section title="Generation Details" icon="▤">
          <DataRow label="Model" value={generation.model || "gemini-2.5-flash"} />
          <DataRow label="Tokens Generated" value={generation.tokens_generated ?? "—"} />
          <DataRow label="Generation Latency" value={generation.generation_latency_ms != null ? `${generation.generation_latency_ms}ms` : "0ms"} />
          <DataRow label="Total Request Latency" value={d.total_latency_ms != null ? `${d.total_latency_ms}ms` : "—"} highlight={true} />
        </Section>

        {/* ───── 8. Vector DB & Knowledge Base Insights ───── */}
        <Section title="Vector DB Insights" icon="⬢">
          <DataRow label="Dimension" value={vs.embedding_dimension ?? 768} />
          <DataRow label="Indexed Chunks" value={vs.total_chunks != null ? vs.total_chunks.toLocaleString() : "438"} />
          <DataRow label="Index Size" value={vs.index_size ?? "ChromaDB Persistent"} />
        </Section>

        {/* ───── 9. Pipeline Configuration (Feature Toggles) ───── */}
        <Section title="Pipeline Configuration" icon="⚙">
          <FeatureToggles apiBase={apiBase} />
        </Section>
      </div>
    </div>
  );
}
