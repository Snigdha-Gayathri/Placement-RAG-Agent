import { useState, useEffect, useRef } from "react";

// ─── Pipeline Stages Definition ─────────────────────────────────────────────
const PIPELINE_STAGES = [
  { id: "query_received", label: "Query Received" },
  { id: "query_analysis", label: "Query Analysis" },
  { id: "conversation_memory", label: "Conversation Memory Lookup" },
  { id: "query_rewriting", label: "Query Rewriting" },
  { id: "metadata_filtering", label: "Metadata Filtering" },
  { id: "embedding_generation", label: "Embedding Generation" },
  { id: "dense_retrieval", label: "Dense Retrieval" },
  { id: "bm25_retrieval", label: "BM25 Retrieval" },
  { id: "hybrid_fusion", label: "Hybrid Fusion" },
  { id: "cross_encoder_reranking", label: "Cross Encoder Reranking" },
  { id: "context_construction", label: "Context Construction" },
  { id: "agent_evaluation", label: "Agent Evaluation" },
  { id: "llm_generation", label: "LLM Generation" },
  { id: "response_complete", label: "Response Complete" },
];

const STATUS_COLORS = {
  pending: "#4A6A8A",
  running: "#1E90FF",
  completed: "#10B981",
  failed: "#EF4444",
  skipped: "#6B7280",
};

// ─── Stage Row Component ────────────────────────────────────────────────────
function StageRow({ stage, status, latency, isLast }) {
  const isPending = status === "pending";
  const isRunning = status === "running";
  const isCompleted = status === "completed";
  const isFailed = status === "failed";
  const isSkipped = status === "skipped";

  const color = STATUS_COLORS[status] || STATUS_COLORS.pending;

  const icon = isPending
    ? "○"
    : isRunning
    ? "◉"
    : isCompleted
    ? "✓"
    : isFailed
    ? "✗"
    : isSkipped
    ? "⊘"
    : "○";

  return (
    <div style={{ display: "flex", alignItems: "stretch", minHeight: 26 }}>
      {/* Left column: icon + connecting line */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: 20,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color: color,
            fontSize: isRunning ? "0.75rem" : "0.7rem",
            fontFamily: "'Space Mono', monospace",
            lineHeight: 1,
            textShadow: isRunning ? `0 0 8px ${color}88` : "none",
            animation: isRunning ? "pulse 1.5s ease-in-out infinite" : "none",
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
        {!isLast && (
          <div
            style={{
              flex: 1,
              width: 1,
              minHeight: 8,
              background: isCompleted
                ? `linear-gradient(to bottom, ${STATUS_COLORS.completed}66, ${STATUS_COLORS.completed}22)`
                : `${STATUS_COLORS.pending}33`,
            }}
          />
        )}
      </div>

      {/* Right column: label + latency */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "0.5rem",
          flex: 1,
          paddingLeft: "0.4rem",
          paddingBottom: isLast ? 0 : "0.15rem",
        }}
      >
        <span
          style={{
            color: isPending
              ? "#4A6A8A"
              : isRunning
              ? "#E0F0FF"
              : isCompleted
              ? "#C8D8EA"
              : isFailed
              ? "#FCA5A5"
              : "#6B7280",
            fontSize: "0.75rem",
            fontFamily: "'Space Mono', monospace",
            letterSpacing: "0.02em",
            textShadow: isRunning ? "0 0 6px #1E90FF44" : "none",
          }}
        >
          {stage.label}
        </span>
        {latency != null && (isCompleted || isFailed) && (
          <span
            style={{
              color: "#4A6A8A",
              fontSize: "0.65rem",
              fontFamily: "'Space Mono', monospace",
            }}
          >
            {latency < 1000 ? `${latency}ms` : `${(latency / 1000).toFixed(1)}s`}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Fallback Dots ──────────────────────────────────────────────────────────
function FallbackDots() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.4rem 0",
      }}
    >
      <span
        style={{
          color: "#4A6A8A",
          fontSize: "0.75rem",
          fontFamily: "'Space Mono', monospace",
        }}
      >
        Processing
      </span>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "#1E90FF",
            animation: "pulse 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.2}s`,
            opacity: 0.7,
          }}
        />
      ))}
    </div>
  );
}

// ─── Pipeline Progress Component ────────────────────────────────────────────
export default function PipelineProgress({ requestId, apiBase, onComplete }) {
  const [stages, setStages] = useState(() =>
    PIPELINE_STAGES.map((s) => ({
      ...s,
      status: "pending",
      latency: null,
    }))
  );
  const [sseFailed, setSseFailed] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const eventSourceRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef(null);

  // Elapsed timer
  useEffect(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current);
    }, 100);
    return () => clearInterval(timerRef.current);
  }, []);

  // SSE connection
  useEffect(() => {
    if (!requestId || apiBase == null) {
      setSseFailed(true);
      return;
    }

    const url = `${apiBase}/api/pipeline-status/${requestId}`;
    let es;

    try {
      es = new EventSource(url);
      eventSourceRef.current = es;
    } catch (err) {
      console.warn("[PipelineProgress] EventSource creation failed:", err);
      setSseFailed(true);
      return;
    }

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // data can be: { stage_id, status, latency_ms } or { stages: [...] }

        if (data.stages && Array.isArray(data.stages)) {
          // Bulk update
          setStages((prev) =>
            prev.map((s) => {
              const update = data.stages.find((u) => u.stage_id === s.id);
              if (update) {
                return {
                  ...s,
                  status: update.status || s.status,
                  latency: update.latency_ms ?? s.latency,
                };
              }
              return s;
            })
          );
        } else if (data.stage_id) {
          // Single stage update
          setStages((prev) =>
            prev.map((s) =>
              s.id === data.stage_id
                ? {
                    ...s,
                    status: data.status || s.status,
                    latency: data.latency_ms ?? s.latency,
                  }
                : s
            )
          );
        }

        // Check for completion
        if (
          data.stage_id === "response_complete" &&
          (data.status === "completed" || data.status === "failed")
        ) {
          clearInterval(timerRef.current);
          es.close();
          if (onComplete) setTimeout(onComplete, 300);
        }
      } catch (parseErr) {
        console.warn("[PipelineProgress] Parse error:", parseErr);
      }
    };

    es.onerror = () => {
      console.warn("[PipelineProgress] SSE connection error, falling back");
      setSseFailed(true);
      es.close();
    };

    return () => {
      if (es) es.close();
      clearInterval(timerRef.current);
    };
  }, [requestId, apiBase, onComplete]);

  if (sseFailed) {
    return <FallbackDots />;
  }

  const completedCount = stages.filter(
    (s) => s.status === "completed" || s.status === "skipped"
  ).length;
  const totalStages = stages.length;

  return (
    <div
      style={{
        padding: "0.3rem 0",
        fontFamily: "'Space Mono', monospace",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.5rem",
          paddingBottom: "0.35rem",
          borderBottom: "1px solid rgba(30,144,255,0.1)",
        }}
      >
        <span
          style={{
            color: "#1E90FF",
            fontSize: "0.65rem",
            fontFamily: "'Orbitron', 'Space Mono', monospace",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            textShadow: "0 0 6px #1E90FF44",
          }}
        >
          ▸ RAG Pipeline
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span
            style={{
              color: "#4A6A8A",
              fontSize: "0.6rem",
              fontFamily: "'Space Mono', monospace",
            }}
          >
            {completedCount}/{totalStages}
          </span>
          <span
            style={{
              color: "#3A5A7A",
              fontSize: "0.6rem",
              fontFamily: "'Space Mono', monospace",
            }}
          >
            {(elapsed / 1000).toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 2,
          background: "rgba(30,144,255,0.1)",
          borderRadius: 1,
          marginBottom: "0.5rem",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${(completedCount / totalStages) * 100}%`,
            background: "linear-gradient(90deg, #1E90FF, #10B981)",
            borderRadius: 1,
            transition: "width 0.3s ease",
            boxShadow: "0 0 6px #1E90FF44",
          }}
        />
      </div>

      {/* Stages list */}
      <div>
        {stages.map((stage, i) => (
          <StageRow
            key={stage.id}
            stage={stage}
            status={stage.status}
            latency={stage.latency}
            isLast={i === stages.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
