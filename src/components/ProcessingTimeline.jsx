import React, { useState } from "react";

export default function ProcessingTimeline({ stages = [], isComplete = false, currentMessage = "Agent Processing..." }) {
  const [expanded, setExpanded] = useState(true);

  if (!stages || stages.length === 0) return null;

  return (
    <div
      style={{
        background: "#1c1e2e",
        border: "1px solid #2d3047",
        borderRadius: "12px",
        padding: "0.75rem 1rem",
        marginBottom: "0.75rem",
        maxWidth: "680px",
        fontSize: "0.8rem",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
      }}
    >
      {/* Header Banner */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: isComplete ? "#10b981" : "#3b82f6",
              boxShadow: isComplete ? "0 0 6px #10b981" : "0 0 8px #3b82f6",
              display: "inline-block",
            }}
          />
          <span style={{ fontWeight: 600, color: isComplete ? "#10b981" : "#f1f5f9" }}>
            {isComplete ? "Autonomous RAG Pipeline Execution Complete" : currentMessage}
          </span>
        </div>
        <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 500 }}>
          {expanded ? "▲ Hide Stages" : "▼ Show Execution Steps"}
        </span>
      </div>

      {/* Expandable Execution Steps */}
      {expanded && (
        <div
          style={{
            marginTop: "0.75rem",
            paddingTop: "0.6rem",
            borderTop: "1px solid #26283b",
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
          }}
        >
          {stages.map((st, idx) => {
            const isRunning = st.status === "running";
            const isDone = st.status === "completed";
            const isFailed = st.status === "failed";

            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "0.74rem",
                  color: isDone ? "#cbd5e1" : (isRunning ? "#38bdf8" : "#64748b"),
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span
                    style={{
                      width: "14px",
                      height: "14px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.65rem",
                      background: isDone
                        ? "rgba(16, 185, 129, 0.2)"
                        : isRunning
                        ? "rgba(56, 189, 248, 0.2)"
                        : isFailed
                        ? "rgba(239, 68, 68, 0.2)"
                        : "rgba(100, 116, 139, 0.2)",
                      color: isDone ? "#10b981" : (isRunning ? "#38bdf8" : (isFailed ? "#ef4444" : "#94a3b8")),
                    }}
                  >
                    {isDone ? "✓" : (isRunning ? "●" : (isFailed ? "✗" : "○"))}
                  </span>
                  <span style={{ fontWeight: isRunning ? 600 : 400 }}>{st.message || st.stage}</span>
                </div>

                {st.latency_ms !== undefined && st.latency_ms > 0 && (
                  <span style={{ fontSize: "0.65rem", color: "#64748b", fontFamily: "monospace" }}>
                    {st.latency_ms.toFixed(0)} ms
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
