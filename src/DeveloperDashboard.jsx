import { useState, useEffect, useCallback } from "react";
import FeatureToggles from "./FeatureToggles";

// ─── Collapsible Section ────────────────────────────────────────────────────
function Section({ title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        marginBottom: "0.5rem",
        borderRadius: 6,
        border: "1px solid rgba(30,144,255,0.08)",
        background: "rgba(10,18,35,0.4)",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.5rem 0.65rem",
          background: "none",
          border: "none",
          cursor: "pointer",
          borderBottom: open ? "1px solid rgba(30,144,255,0.06)" : "none",
        }}
      >
        <span style={{ color: "#1E90FF", fontSize: "0.7rem", fontFamily: "'Space Mono', monospace" }}>{icon}</span>
        <span
          style={{
            color: "#1E90FF",
            fontSize: "0.65rem",
            fontFamily: "'Orbitron', 'Space Mono', monospace",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            flex: 1,
            textAlign: "left",
          }}
        >
          {title}
        </span>
        <span
          style={{
            color: "#4A6A8A",
            fontSize: "0.65rem",
            transform: open ? "rotate(90deg)" : "none",
            transition: "transform 0.2s",
          }}
        >
          ▶
        </span>
      </button>
      {open && <div style={{ padding: "0.5rem 0.65rem" }}>{children}</div>}
    </div>
  );
}

// ─── Label/Value pair ───────────────────────────────────────────────────────
function DataRow({ label, value, mono = true }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.25rem" }}>
      <span style={{ color: "#4A6A8A", fontSize: "0.68rem", fontFamily: "'Space Mono', monospace", flexShrink: 0, minWidth: 100 }}>
        {label}
      </span>
      <span
        style={{
          color: "#C8D8EA",
          fontSize: "0.72rem",
          fontFamily: mono ? "'Space Mono', monospace" : "'Sora', sans-serif",
          wordBreak: "break-word",
          lineHeight: 1.4,
        }}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

// ─── Metric Card ────────────────────────────────────────────────────────────
function MetricCard({ name, value }) {
  const numVal = typeof value === "number" ? value : parseFloat(value);
  const isValid = !isNaN(numVal);
  const isLatency = name.toLowerCase().includes("latency") || name.toLowerCase().includes("time");
  const isPercentage = isValid && !isLatency;

  let barColor = "#4A6A8A";
  let barWidth = 0;

  if (isValid && isPercentage) {
    const normalized = numVal > 1 ? numVal / 100 : numVal;
    barWidth = Math.min(Math.max(normalized * 100, 0), 100);
    barColor = normalized < 0.3 ? "#EF4444" : normalized < 0.7 ? "#EAB308" : "#10B981";
  }

  const displayVal = isValid
    ? isLatency
      ? numVal < 1000
        ? `${numVal.toFixed(0)}ms`
        : `${(numVal / 1000).toFixed(2)}s`
      : numVal > 1
      ? numVal.toFixed(1)
      : numVal.toFixed(3)
    : String(value ?? "—");

  return (
    <div
      style={{
        background: "rgba(10,18,35,0.5)",
        border: "1px solid rgba(30,144,255,0.06)",
        borderRadius: 5,
        padding: "0.4rem 0.5rem",
      }}
    >
      <div style={{ color: "#4A6A8A", fontSize: "0.6rem", fontFamily: "'Space Mono', monospace", marginBottom: "0.2rem", lineHeight: 1.2 }}>
        {name}
      </div>
      <div style={{ color: "#C8D8EA", fontSize: "0.8rem", fontFamily: "'Space Mono', monospace", fontWeight: "bold" }}>
        {displayVal}
      </div>
      {isPercentage && isValid && (
        <div style={{ height: 3, background: "rgba(30,144,255,0.1)", borderRadius: 2, marginTop: "0.25rem", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${barWidth}%`, background: barColor, borderRadius: 2, transition: "width 0.3s" }} />
        </div>
      )}
    </div>
  );
}

// ─── Bar Chart Row ──────────────────────────────────────────────────────────
function BarChartRow({ label, value, maxValue, color = "#1E90FF" }) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
      <span style={{ color: "#4A6A8A", fontSize: "0.62rem", fontFamily: "'Space Mono', monospace", width: 80, flexShrink: 0, textAlign: "right" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 10, background: "rgba(30,144,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 3, transition: "width 0.3s" }} />
      </div>
      <span style={{ color: "#C8D8EA", fontSize: "0.62rem", fontFamily: "'Space Mono', monospace", width: 40, flexShrink: 0 }}>
        {value}
      </span>
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
          background: "rgba(5,10,21,0.8)",
          border: "1px solid rgba(30,144,255,0.08)",
          borderRadius: 4,
          padding: "0.5rem",
          color: "#8AA8C8",
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
          style={{
            position: expanded ? "relative" : "absolute",
            bottom: expanded ? "auto" : 0,
            left: 0,
            right: 0,
            width: "100%",
            background: expanded ? "rgba(30,144,255,0.05)" : "linear-gradient(transparent, rgba(5,10,21,0.95))",
            border: "none",
            color: "#1E90FF",
            fontSize: "0.62rem",
            fontFamily: "'Space Mono', monospace",
            padding: "0.3rem",
            cursor: "pointer",
            borderRadius: expanded ? 4 : "0 0 4px 4px",
            textAlign: "center",
          }}
        >
          {expanded ? "▲ Collapse" : "▼ Expand"}
        </button>
      )}
    </div>
  );
}

// ─── Main Dashboard Component ───────────────────────────────────────────────
export default function DeveloperDashboard({ isOpen, onClose, requestId, apiBase, isChatLoading, isMobile }) {
  const [data, setData] = useState(null);
  const [vectorStats, setVectorStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch dashboard data when requestId or isChatLoading changes
  useEffect(() => {
    if (!isOpen || !requestId || apiBase == null) {
      return;
    }

    console.log(`[DeveloperDashboard] Checking data for requestId: ${requestId.substring(0, 8)}...`);
    setData(null);
    setError(null);
    setLoading(true);

    let isMounted = true;
    let timerId = null;

    const fetchData = async (attempt = 1) => {
      if (!isMounted) return;
      try {
        console.log(`[DeveloperDashboard] Fetch attempt #${attempt} for ${requestId.substring(0, 8)}...`);
        const res = await fetch(`${apiBase}/api/dashboard/${requestId}`);
        if (!res.ok) {
          if (res.status === 404 && (isChatLoading || attempt < 12)) {
            console.log(`[DeveloperDashboard] Data not ready yet (404), retrying in 800ms...`);
            if (isMounted) {
              timerId = setTimeout(() => fetchData(attempt + 1), 800);
            }
            return;
          }
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        const json = await res.json();
        if (isMounted) {
          console.log(`[DeveloperDashboard] Successfully loaded data for ${requestId.substring(0, 8)}`, json);
          setData(json);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error("[DeveloperDashboard] Fetch error:", err);
          setError(`Dashboard data unavailable — ${err.message}`);
          setData(null);
          setLoading(false);
        }
      }
    };

    timerId = setTimeout(() => fetchData(1), 300);
    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [isOpen, requestId, apiBase, isChatLoading]);

  // Fetch vector DB stats
  useEffect(() => {
    if (!isOpen || apiBase == null) return;
    const fetchStats = async () => {
      try {
        const res = await fetch(`${apiBase}/api/vector-db/stats`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setVectorStats(await res.json());
      } catch (err) {
        console.warn("[DeveloperDashboard] Could not fetch vector DB stats:", err);
        setVectorStats(null);
      }
    };
    fetchStats();
  }, [isOpen, apiBase]);

  const d = data || {};
  const query = d.query_info || d.query_analysis || {};
  const retrieval = d.retrieval_info || d.retrieval || {};
  const reranking = d.reranking_info || d.reranking || {};
  const agent = d.agent_info || d.agent || {};
  const generation = d.generation_info || d.generation || {};
  const security = d.security_info || d.security || {};
  const config = d.feature_toggles || d.config || {};
  const vs = vectorStats || {};

  const metrics = d.metrics || {
    total_latency_ms: d.total_latency_ms,
    retrieval_latency_ms: retrieval.retrieval_latency_ms ?? retrieval.latency,
    reranking_latency_ms: reranking.reranking_latency_ms ?? reranking.latency,
    generation_latency_ms: generation.generation_latency_ms ?? generation.generation_time,
  };

  const retrievedChunks = retrieval.retrieved_chunks || retrieval.chunks || [];
  const rerankResults = reranking.rank_changes || reranking.results || [];
  const agentSteps = agent.trace || agent.reasoning_trace || [];

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
              background: "#050A15",
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
                maxWidth: "420px",
                height: "100vh",
                background: "#050A15",
                borderLeft: "1px solid rgba(30,144,255,0.25)",
                zIndex: 1000,
                display: "flex",
                flexDirection: "column",
                boxShadow: "-12px 0 40px rgba(0,0,0,0.8), -1px 0 1px rgba(30,144,255,0.2)",
                animation: "slideInRight 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards",
                overflowY: "auto",
              }
            : {
                position: "relative",
                height: "100%",
                flex: "0 0 34%",
                width: "34%",
                flexShrink: 0,
                background: "#050A15",
                borderLeft: "1px solid rgba(30,144,255,0.16)",
                zIndex: 100,
                display: "flex",
                flexDirection: "column",
                boxShadow: "-8px 0 30px rgba(0,0,0,0.6), -1px 0 1px rgba(30,144,255,0.15)",
                animation: "slideInRight 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards",
                overflowY: "auto",
                transition: "flex 0.35s cubic-bezier(0.4, 0, 0.2, 1), width 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
              }
      }
    >
        {/* Header */}
        <div
          style={{
            padding: "0.85rem 1rem",
            borderBottom: "1px solid rgba(30,144,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(10,20,40,0.85)",
            backdropFilter: "blur(20px)",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1rem" }}>🛠</span>
            <span
              style={{
                fontFamily: "'Orbitron', monospace",
                fontSize: "0.78rem",
                fontWeight: "bold",
                color: "#1E90FF",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              RAG Pipeline Observability
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#4A6A8A",
              fontSize: "1.1rem",
              cursor: "pointer",
              padding: "2px 6px",
              borderRadius: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Warning banner */}
        <div
          style={{
            background: "rgba(234,179,8,0.06)",
            borderBottom: "1px solid rgba(234,179,8,0.15)",
            padding: "0.4rem 0.7rem",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: "0.75rem" }}>⚠️</span>
          <span
            style={{
              color: "#B8960A",
              fontSize: "0.58rem",
              fontFamily: "'Space Mono', monospace",
              lineHeight: 1.3,
            }}
          >
            Developer Dashboard — This dashboard is intended for developers to inspect and understand the internal RAG pipeline. Data updates after each query.
          </span>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0.5rem 0.6rem",
          }}
        >
          {loading && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "2rem 1rem",
              textAlign: "center",
              gap: "0.75rem",
            }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: "radial-gradient(circle at 35% 35%, #57B6FF, #1E90FF)",
                    animation: "pulse 1.2s ease-in-out infinite",
                    animationDelay: `${i * 0.2}s`,
                    opacity: 0.7,
                    boxShadow: "0 0 12px #1E90FF66",
                  }} />
                ))}
              </div>
              <div style={{ color: "#6B9FD4", fontSize: "0.72rem", fontFamily: "'Space Mono', monospace" }}>
                Waiting for pipeline processing...
              </div>
              {requestId && (
                <div style={{ color: "#4A6A8A", fontSize: "0.62rem", fontFamily: "'Space Mono', monospace" }}>
                  Request: {requestId.substring(0, 8)}...
                </div>
              )}
            </div>
          )}

          {!loading && !requestId && (
            <div style={{
              color: "#4A6A8A",
              fontSize: "0.75rem",
              fontFamily: "'Space Mono', monospace",
              padding: "2rem 1rem",
              textAlign: "center",
              lineHeight: 1.6,
            }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem", opacity: 0.5 }}>📊</div>
              Send a query to populate dashboard data.
            </div>
          )}

          {!loading && error && (
            <div
              style={{
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 6,
                padding: "0.5rem 0.7rem",
                marginBottom: "0.5rem",
                color: "#EF4444",
                fontSize: "0.68rem",
                fontFamily: "'Space Mono', monospace",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.4rem",
              }}
            >
              <span style={{ flexShrink: 0 }}>⚠</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "bold", marginBottom: "0.2rem" }}>Dashboard Data Unavailable</div>
                <div style={{ fontSize: "0.62rem", color: "#DC2626", lineHeight: 1.4 }}>
                  {error}
                </div>
                {requestId && (
                  <div style={{ fontSize: "0.58rem", color: "#991B1B", marginTop: "0.3rem" }}>
                    Request ID: {requestId.substring(0, 12)}...
                  </div>
                )}
                {error.includes("404") && (
                  <div style={{
                    marginTop: "0.5rem",
                    padding: "0.4rem",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: 4,
                    fontSize: "0.6rem",
                    color: "#FCA5A5",
                    lineHeight: 1.5,
                  }}>
                    💡 <strong>Tip:</strong> The backend may have restarted, clearing in-memory data. Send a new query to populate the dashboard.
                  </div>
                )}
              </div>
            </div>
          )}

          {!loading && !error && !data && requestId && (
            <div style={{
              color: "#6B8AAA",
              fontSize: "0.72rem",
              fontFamily: "'Space Mono', monospace",
              padding: "2rem 1rem",
              textAlign: "center",
              lineHeight: 1.6,
            }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem", opacity: 0.5 }}>⏳</div>
              Waiting for pipeline data...
              <div style={{ color: "#4A6A8A", fontSize: "0.62rem", marginTop: "0.5rem" }}>
                Request: {requestId.substring(0, 8)}...
              </div>
            </div>
          )}

          {/* ───── A. Pipeline Configuration ───── */}
          <Section title="Pipeline Configuration" icon="⚙" defaultOpen={true}>
            <FeatureToggles apiBase={apiBase} />
            {config && Object.keys(config).length > 0 && (
              <div style={{ marginTop: "0.5rem", borderTop: "1px solid rgba(30,144,255,0.06)", paddingTop: "0.4rem" }}>
                <div style={{ color: "#3A5A7A", fontSize: "0.6rem", fontFamily: "'Orbitron', monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.3rem" }}>
                  Active This Request
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                  {Object.entries(config).map(([key, enabled]) => (
                    <span
                      key={key}
                      style={{
                        fontSize: "0.62rem",
                        fontFamily: "'Space Mono', monospace",
                        padding: "2px 6px",
                        borderRadius: 3,
                        background: enabled ? "rgba(10,185,129,0.1)" : "rgba(74,106,138,0.08)",
                        color: enabled ? "#10B981" : "#4A6A8A",
                        border: `1px solid ${enabled ? "rgba(10,185,129,0.2)" : "rgba(74,106,138,0.1)"}`,
                      }}
                    >
                      {enabled ? "✓" : "✗"} {key.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* ───── B. Query Analysis ───── */}
          <Section title="Query Analysis" icon="◎" defaultOpen={!!requestId}>
            <DataRow label="Original" value={query.original_query} />
            <DataRow label="Standalone" value={query.standalone_query} />
            <DataRow label="Routing" value={query.routing_decision} />

            {query.metadata_filters && Object.keys(query.metadata_filters).length > 0 && (
              <div style={{ marginTop: "0.3rem" }}>
                <span style={{ color: "#4A6A8A", fontSize: "0.62rem", fontFamily: "'Space Mono', monospace" }}>Metadata Filters:</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginTop: "0.2rem" }}>
                  {Object.entries(query.metadata_filters).map(([k, v]) => (
                    <span
                      key={k}
                      style={{
                        background: "rgba(30,144,255,0.08)",
                        border: "1px solid rgba(30,144,255,0.15)",
                        borderRadius: 3,
                        padding: "1px 6px",
                        fontSize: "0.62rem",
                        fontFamily: "'Space Mono', monospace",
                        color: "#6B9FD4",
                      }}
                    >
                      {k}={String(v)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(query.hyde_document || d.hyde_info?.hypothetical_document) && (
              <div style={{ marginTop: "0.4rem" }}>
                <span style={{ color: "#4A6A8A", fontSize: "0.62rem", fontFamily: "'Space Mono', monospace" }}>HyDE Document:</span>
                <CodeBlock content={query.hyde_document || d.hyde_info?.hypothetical_document} maxHeight={120} />
              </div>
            )}
          </Section>

          {/* ───── C. Retrieval Details ───── */}
          <Section title="Retrieval Details" icon="⬡">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
              {retrieval.retriever_used && (
                <span
                  style={{
                    background: "rgba(30,144,255,0.12)",
                    border: "1px solid rgba(30,144,255,0.2)",
                    borderRadius: 4,
                    padding: "2px 8px",
                    color: "#57B6FF",
                    fontSize: "0.65rem",
                    fontFamily: "'Space Mono', monospace",
                  }}
                >
                  {retrieval.retriever_used}
                </span>
              )}
              {(retrieval.retrieval_latency_ms ?? retrieval.latency) != null && (
                <span style={{ color: "#4A6A8A", fontSize: "0.62rem", fontFamily: "'Space Mono', monospace" }}>
                  {retrieval.retrieval_latency_ms ?? retrieval.latency}ms
                </span>
              )}
            </div>

            {retrievedChunks && retrievedChunks.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.62rem", fontFamily: "'Space Mono', monospace" }}>
                  <thead>
                    <tr>
                      {["#", "Source", "Company", "Score", "Preview"].map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: "left",
                            color: "#4A6A8A",
                            padding: "0.25rem 0.3rem",
                            borderBottom: "1px solid rgba(30,144,255,0.08)",
                            fontWeight: "normal",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {retrievedChunks.map((chunk, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? "rgba(10,18,35,0.3)" : "transparent" }}>
                        <td style={{ color: "#6B9FD4", padding: "0.25rem 0.3rem" }}>{i + 1}</td>
                        <td style={{ color: "#C8D8EA", padding: "0.25rem 0.3rem", maxWidth: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {chunk.source || chunk.metadata?.source_file || "—"}
                        </td>
                        <td style={{ color: "#C8D8EA", padding: "0.25rem 0.3rem" }}>{chunk.company || chunk.metadata?.company || "—"}</td>
                        <td style={{ color: "#10B981", padding: "0.25rem 0.3rem" }}>
                          {chunk.score != null ? chunk.score.toFixed(3) : chunk.similarity_score != null ? chunk.similarity_score.toFixed(3) : "—"}
                        </td>
                        <td style={{ color: "#8AA8C8", padding: "0.25rem 0.3rem", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {chunk.text ? chunk.text.substring(0, 100) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {(retrieval.rejected_count ?? (retrieval.rejected_chunks || []).length) != null && (retrieval.rejected_count ?? (retrieval.rejected_chunks || []).length) > 0 && (
              <div style={{ marginTop: "0.3rem", color: "#4A6A8A", fontSize: "0.62rem", fontFamily: "'Space Mono', monospace" }}>
                Rejected: {retrieval.rejected_count ?? (retrieval.rejected_chunks || []).length} chunks
                {retrieval.rejection_reasons && ` — ${retrieval.rejection_reasons}`}
              </div>
            )}
          </Section>

          {/* ───── D. Reranking ───── */}
          <Section title="Reranking" icon="⇅">
            {(reranking.reranking_latency_ms ?? reranking.latency) != null && (
              <DataRow label="Latency" value={`${reranking.reranking_latency_ms ?? reranking.latency}ms`} />
            )}
            {rerankResults && rerankResults.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.62rem", fontFamily: "'Space Mono', monospace" }}>
                  <thead>
                    <tr>
                      {["#", "Orig Rank", "New Rank", "Orig Score", "CE Score", "Change"].map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: "left",
                            color: "#4A6A8A",
                            padding: "0.25rem 0.3rem",
                            borderBottom: "1px solid rgba(30,144,255,0.08)",
                            fontWeight: "normal",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rerankResults.map((r, i) => {
                      const origRank = r.original_rank != null ? r.original_rank : (i + 1);
                      const newRank = r.new_rank != null ? r.new_rank : (i + 1);
                      const change = r.rank_change != null ? r.rank_change : (origRank - newRank);
                      const ceScore = r.ce_score ?? r.cross_encoder_score;
                      return (
                        <tr key={i} style={{ background: i % 2 === 0 ? "rgba(10,18,35,0.3)" : "transparent" }}>
                          <td style={{ color: "#6B9FD4", padding: "0.25rem 0.3rem" }}>{i + 1}</td>
                          <td style={{ color: "#C8D8EA", padding: "0.25rem 0.3rem" }}>{origRank}</td>
                          <td style={{ color: "#C8D8EA", padding: "0.25rem 0.3rem" }}>{newRank}</td>
                          <td style={{ color: "#8AA8C8", padding: "0.25rem 0.3rem" }}>{r.original_score != null ? r.original_score.toFixed(3) : "—"}</td>
                          <td style={{ color: "#10B981", padding: "0.25rem 0.3rem" }}>{ceScore != null ? ceScore.toFixed(3) : "—"}</td>
                          <td
                            style={{
                              color: change > 0 ? "#10B981" : change < 0 ? "#EF4444" : "#4A6A8A",
                              padding: "0.25rem 0.3rem",
                              fontWeight: "bold",
                            }}
                          >
                            {change > 0 ? `↑${change}` : change < 0 ? `↓${Math.abs(change)}` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* ───── E. Agent Reasoning ───── */}
          <Section title="Agent Reasoning" icon="⟐">
            {agentSteps && agentSteps.length > 0 ? (
              <div>
                {agentSteps.map((step, i) => {
                  const isStr = typeof step === "string";
                  const stepType = !isStr ? (step.type || "tool") : "tool";
                  const toolName = !isStr ? step.tool : (agent.tool_selections?.[i] || "Plan/Tool");
                  const reasonText = !isStr ? step.reason : step;

                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "stretch",
                        marginBottom: 0,
                      }}
                    >
                      {/* Left: connector */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 16, flexShrink: 0 }}>
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: stepType === "decision" ? "#1E90FF" : "#10B981",
                            flexShrink: 0,
                            marginTop: 3,
                            boxShadow: `0 0 4px ${stepType === "decision" ? "#1E90FF" : "#10B981"}44`,
                          }}
                        />
                        {i < agentSteps.length - 1 && (
                          <div style={{ flex: 1, width: 1, background: "rgba(30,144,255,0.15)", minHeight: 8 }} />
                        )}
                      </div>

                      {/* Right: content */}
                      <div style={{ flex: 1, paddingLeft: "0.4rem", paddingBottom: "0.35rem" }}>
                        {stepType === "decision" ? (
                          <div style={{ display: "flex", alignItems: "baseline", gap: "0.3rem", flexWrap: "wrap" }}>
                            <span style={{ color: "#4A6A8A", fontSize: "0.62rem", fontFamily: "'Space Mono', monospace" }}>Decision:</span>
                            <span style={{ color: "#C8D8EA", fontSize: "0.68rem", fontFamily: "'Space Mono', monospace" }}>
                              &quot;{step.question}&quot;
                            </span>
                            <span style={{ color: "#1E90FF", fontSize: "0.65rem", fontFamily: "'Space Mono', monospace" }}>→</span>
                            <span
                              style={{
                                color: step.answer === "YES" ? "#10B981" : "#EF4444",
                                fontSize: "0.68rem",
                                fontFamily: "'Space Mono', monospace",
                                fontWeight: "bold",
                              }}
                            >
                              {step.answer}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <div style={{ display: "flex", alignItems: "baseline", gap: "0.3rem", flexWrap: "wrap" }}>
                              <span style={{ color: "#10B981", fontSize: "0.62rem", fontFamily: "'Space Mono', monospace" }}>Tool:</span>
                              <span
                                style={{
                                  background: "rgba(16,185,129,0.1)",
                                  border: "1px solid rgba(16,185,129,0.2)",
                                  borderRadius: 3,
                                  padding: "0 5px",
                                  color: "#10B981",
                                  fontSize: "0.62rem",
                                  fontFamily: "'Space Mono', monospace",
                                }}
                              >
                                {toolName}
                              </span>
                              {!isStr && step.latency != null && (
                                <span style={{ color: "#4A6A8A", fontSize: "0.58rem", fontFamily: "'Space Mono', monospace" }}>
                                  {step.latency}ms
                                </span>
                              )}
                            </div>
                            {reasonText && (
                              <div style={{ color: "#6B8AAA", fontSize: "0.6rem", fontFamily: "'Space Mono', monospace", marginTop: "0.1rem" }}>
                                Reason: {reasonText}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: "#4A6A8A", fontSize: "0.68rem", fontFamily: "'Space Mono', monospace" }}>
                No agent trace available
              </div>
            )}
          </Section>

          {/* ───── F. RAG Metrics ───── */}
          <Section title="RAG Metrics" icon="◆">
            {metrics && Object.values(metrics).some((v) => v != null) ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.35rem",
                }}
              >
                {Object.entries(metrics)
                  .filter(([_, value]) => value != null)
                  .map(([key, value]) => (
                    <MetricCard
                      key={key}
                      name={key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      value={value}
                    />
                  ))}
              </div>
            ) : (
              <div style={{ color: "#4A6A8A", fontSize: "0.68rem", fontFamily: "'Space Mono', monospace" }}>
                Metrics will appear after a completed query
              </div>
            )}
          </Section>

          {/* ───── G. Generation Details ───── */}
          <Section title="Generation Details" icon="▤">
            <DataRow label="Model" value={generation.model || "gemini-2.5-flash"} />
            <DataRow label="Gen Time" value={(generation.generation_latency_ms ?? generation.generation_time) != null ? `${generation.generation_latency_ms ?? generation.generation_time}ms` : null} />

            {generation.token_usage && (
              <div style={{ marginTop: "0.3rem" }}>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {[
                    { label: "Input", value: generation.token_usage.input_tokens },
                    { label: "Output", value: generation.token_usage.output_tokens },
                    { label: "Total", value: generation.token_usage.total_tokens },
                  ].map((t) => (
                    <span
                      key={t.label}
                      style={{
                        background: "rgba(10,18,35,0.5)",
                        border: "1px solid rgba(30,144,255,0.08)",
                        borderRadius: 4,
                        padding: "0.2rem 0.4rem",
                        fontSize: "0.62rem",
                        fontFamily: "'Space Mono', monospace",
                      }}
                    >
                      <span style={{ color: "#4A6A8A" }}>{t.label}: </span>
                      <span style={{ color: "#C8D8EA" }}>{t.value ?? "—"}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(generation.context_window_usage ?? (generation.context_window_chars ? generation.context_window_chars / 1000000 : null)) != null && (
              <div style={{ marginTop: "0.4rem" }}>
                <DataRow label="Context %" value={`${((generation.context_window_usage ?? (generation.context_window_chars / 1000000)) * 100).toFixed(2)}%`} />
                <div style={{ height: 6, background: "rgba(30,144,255,0.08)", borderRadius: 3, overflow: "hidden", marginTop: "0.15rem" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min((generation.context_window_usage ?? (generation.context_window_chars / 1000000)) * 100, 100)}%`,
                      background: (generation.context_window_usage ?? (generation.context_window_chars / 1000000)) > 0.9 ? "#EF4444" : (generation.context_window_usage ?? (generation.context_window_chars / 1000000)) > 0.7 ? "#EAB308" : "#1E90FF",
                      borderRadius: 3,
                      transition: "width 0.3s",
                    }}
                  />
                </div>
              </div>
            )}

            {(generation.prompt || generation.user_prompt) && (
              <div style={{ marginTop: "0.4rem" }}>
                <span style={{ color: "#4A6A8A", fontSize: "0.62rem", fontFamily: "'Space Mono', monospace" }}>Prompt:</span>
                <CodeBlock content={generation.prompt || generation.user_prompt} />
              </div>
            )}
          </Section>

          {/* ───── H. Vector DB Insights ───── */}
          <Section title="Vector DB Insights" icon="⬢">
            <DataRow label="Dimension" value={vs.embedding_dimension} />
            <DataRow label="Chunks" value={vs.total_chunks != null ? vs.total_chunks.toLocaleString() : null} />
            <DataRow label="Avg Length" value={vs.avg_chunk_length != null ? `${vs.avg_chunk_length} chars` : null} />
            <DataRow label="Index Size" value={vs.index_size} />
            <DataRow label="Search Lat." value={vs.search_latency != null ? `${vs.search_latency}ms` : null} />

            {vs.chunk_distribution && Object.keys(vs.chunk_distribution).length > 0 && (
              <div style={{ marginTop: "0.4rem" }}>
                <span style={{ color: "#4A6A8A", fontSize: "0.62rem", fontFamily: "'Space Mono', monospace", marginBottom: "0.2rem", display: "block" }}>
                  Chunk Distribution:
                </span>
                {(() => {
                  const maxVal = Math.max(...Object.values(vs.chunk_distribution));
                  const colors = ["#1E90FF", "#10B981", "#EAB308", "#EF4444", "#A855F7", "#57B6FF", "#F97316"];
                  return Object.entries(vs.chunk_distribution).map(([company, count], i) => (
                    <BarChartRow
                      key={company}
                      label={company}
                      value={count}
                      maxValue={maxVal}
                      color={colors[i % colors.length]}
                    />
                  ));
                })()}
              </div>
            )}
          </Section>

          {/* ───── I. Security & Observability ───── */}
          <Section title="Security & Observability" icon="⛊">
            <DataRow label="Request ID" value={requestId} />
            {security.injection_score != null && (
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <span style={{ color: "#4A6A8A", fontSize: "0.68rem", fontFamily: "'Space Mono', monospace", minWidth: 100 }}>
                  Injection Score
                </span>
                <span
                  style={{
                    color: security.injection_score > 0.7 ? "#EF4444" : security.injection_score > 0.3 ? "#EAB308" : "#10B981",
                    fontSize: "0.72rem",
                    fontFamily: "'Space Mono', monospace",
                    fontWeight: "bold",
                  }}
                >
                  {security.injection_score.toFixed(3)}
                </span>
              </div>
            )}
            <DataRow label="Discarded" value={security.discarded_chunks != null ? `${security.discarded_chunks} chunks` : null} />
            <DataRow label="Guard" value={security.guard_decisions || security.injection_action} />
            {security.timestamps && (
              <>
                <DataRow label="Started" value={security.timestamps.started} />
                <DataRow label="Completed" value={security.timestamps.completed} />
              </>
            )}
          </Section>
        </div>
      </div>
  );
}

