import React, { useState } from "react";

export default function DeveloperSidebar({
  systemHealth = { backend: "Healthy", llm: "Connected", vectorDb: "Connected", retrieval: "Ready", overall: "Healthy" },
  agentState = "Idle", // Idle | Processing | Generating | Complete | Failed
  currentOperation = "Awaiting user query",
  targetCompany = null,
  detectedTopics = [],
  routingMode = "Hybrid RRF",
  isMultiHop = false,
  retrievalStatus = {
    retriever: "Hybrid",
    dense: "Ready",
    bm25: "Ready",
    reranker: "Ready",
    candidates: 0,
    safeChunks: 0,
    topScore: 0.0,
  },
  evalStatus = {
    grounding: "WAITING",
    evidence: "WAITING",
    security: "WAITING",
    outputValidation: "WAITING",
    reportedInferred: "WAITING",
  },
  performance = {
    totalLatencyMs: 0,
    retrievalLatencyMs: 0,
    generationLatencyMs: 0,
    tokenCount: 0,
    status: "Ready",
  },
  onSelectPrompt,
}) {
  const [searchFilter, setSearchFilter] = useState("");
  const [activeSection, setActiveSection] = useState("all");

  const AI_COMPANIES = [
    { name: "OpenAI", tag: "AI/LLM", focus: "Agents, Inference Kernels", sample: "Give me OpenAI LLM agent interview questions." },
    { name: "Anthropic", tag: "AI/Safety", focus: "Claude Safety, RAG Systems", sample: "What RAG interview questions should I expect at Anthropic?" },
    { name: "Databricks", tag: "AI/Data", focus: "Mosaic AI, Agent Reliability", sample: "Give me agent reliability interview questions for Databricks." },
    { name: "Cohere", tag: "AI/NLP", focus: "Command Models, Embeddings", sample: "What interview questions are relevant for an AI engineer at Cohere?" },
    { name: "Harvey", tag: "Legal AI", focus: "Domain Prompts, RAG Evals", sample: "What interview topics does Harvey test for AI Engineers?" },
    { name: "Perplexity", tag: "Search AI", focus: "Live RAG, Web Indexing", sample: "What questions does Perplexity ask on live RAG pipelines?" },
    { name: "xAI", tag: "AI/Compute", focus: "Cluster Training, Grok", sample: "What distributed systems questions are asked at xAI?" },
    { name: "Scale AI", tag: "AI/Data", focus: "RLHF, Data Annotation", sample: "What technical topics are tested at Scale AI?" },
    { name: "LangChain", tag: "Agent Tools", focus: "LangGraph, Agent Loops", sample: "What interview questions focus on LangGraph agent workflows?" },
    { name: "Replit", tag: "Code AI", focus: "Agent Code Repair", sample: "What coding agent questions are asked at Replit?" },
    { name: "Snowflake", tag: "AI/Data", focus: "Cortex AI, Vector Search", sample: "What technical interview questions does Snowflake ask?" },
    { name: "Groq", tag: "AI Hardware", focus: "LPU Tensor Processor", sample: "What hardware and compiler questions are tested at Groq?" },
    { name: "Together AI", tag: "Cloud AI", focus: "Custom Inference Kernels", sample: "What inference optimization questions are asked at Together AI?" },
    { name: "Weights & Biases", tag: "MLOps", focus: "ML Observability, Tracking", sample: "What MLOps questions are asked at Weights & Biases?" },
    { name: "NVIDIA", tag: "GPU/AI", focus: "CUDA, System Design", sample: "What LLM system design questions could I face at NVIDIA?" },
    { name: "Google", tag: "Tech Giant", focus: "Algorithms, Distributed", sample: "What system design and DSA questions are asked at Google?" },
    { name: "Amazon", tag: "Tech Giant", focus: "Leadership Principles, DSA", sample: "What coding and behavioral questions are asked at Amazon?" },
    { name: "Meta", tag: "Tech Giant", focus: "System Architecture, Graphs", sample: "What interview questions does Meta ask for software engineers?" },
    { name: "Microsoft", tag: "Tech Giant", focus: "Data Structures, Cloud", sample: "What technical topics does Microsoft focus on in interviews?" },
  ];

  const filteredCompanies = AI_COMPANIES.filter(
    (c) =>
      c.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.focus.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.tag.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const getAgentColor = () => {
    switch (agentState) {
      case "Processing":
        return "#3b82f6";
      case "Generating":
        return "#8b5cf6";
      case "Complete":
        return "#10b981";
      case "Failed":
        return "#ef4444";
      default:
        return "#64748b";
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "PASS":
      case "Completed":
      case "Healthy":
      case "Connected":
      case "Ready":
        return { text: status, color: "#10b981", bg: "rgba(16, 185, 129, 0.15)" };
      case "RUNNING":
      case "Processing":
      case "Generating":
        return { text: status, color: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)" };
      case "FAIL":
      case "Failed":
        return { text: status, color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)" };
      default:
        return { text: status || "WAITING", color: "#94a3b8", bg: "rgba(148, 163, 184, 0.1)" };
    }
  };

  return (
    <div
      style={{
        width: "320px",
        minWidth: "300px",
        maxWidth: "340px",
        height: "100%",
        background: "#181926",
        borderRight: "1px solid #232537",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        overflowX: "hidden",
        userSelect: "none",
      }}
    >
      {/* Search Bar Header */}
      <div style={{ padding: "1rem 1rem 0.5rem 1rem", borderBottom: "1px solid #232537" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "#202234",
            borderRadius: "10px",
            padding: "0.5rem 0.75rem",
            border: "1px solid #2d3047",
            gap: "0.5rem",
          }}
        >
          <span style={{ color: "#64748b", fontSize: "0.9rem" }}>🔍</span>
          <input
            type="text"
            placeholder="Search companies & topics..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#f1f5f9",
              fontSize: "0.8rem",
              width: "100%",
              fontFamily: "inherit",
            }}
          />
          {searchFilter && (
            <button
              onClick={() => setSearchFilter("")}
              style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 0 }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Dashboard Cards Container */}
      <div style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem", flex: 1 }}>
        {/* CARD A: SYSTEM STATUS */}
        <div
          style={{
            background: "#1e2030",
            borderRadius: "12px",
            padding: "0.85rem",
            border: "1px solid #2a2c42",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", color: "#94a3b8", textTransform: "uppercase" }}>
              System Status
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.7rem",
                color: "#10b981",
                fontWeight: 600,
              }}
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
              {systemHealth.overall}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            {[
              { label: "Backend", status: systemHealth.backend },
              { label: "LLM Model", status: systemHealth.llm },
              { label: "Vector DB", status: systemHealth.vectorDb },
              { label: "Retrieval", status: systemHealth.retrieval },
            ].map((s, idx) => {
              const badge = getStatusBadge(s.status);
              return (
                <div
                  key={idx}
                  style={{
                    background: "#161724",
                    padding: "0.4rem 0.5rem",
                    borderRadius: "6px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}
                >
                  <span style={{ fontSize: "0.65rem", color: "#64748b" }}>{s.label}</span>
                  <span style={{ fontSize: "0.7rem", fontWeight: 600, color: badge.color }}>
                    ● {badge.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* CARD B: CURRENT AGENT */}
        <div
          style={{
            background: "#1e2030",
            borderRadius: "12px",
            padding: "0.85rem",
            border: "1px solid #2a2c42",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", color: "#94a3b8", textTransform: "uppercase" }}>
              Current Agent
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.7rem",
                padding: "2px 8px",
                borderRadius: "12px",
                background: `${getAgentColor()}22`,
                color: getAgentColor(),
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: getAgentColor(),
                  boxShadow: agentState === "Processing" || agentState === "Generating" ? `0 0 6px ${getAgentColor()}` : "none",
                }}
              />
              {agentState}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <div style={{ fontSize: "0.72rem", color: "#cbd5e1" }}>
              <span style={{ color: "#64748b" }}>Operation: </span>
              <span style={{ fontWeight: 500 }}>{currentOperation}</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.7rem", color: "#64748b" }}>Target:</span>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: targetCompany ? "#38bdf8" : "#94a3b8",
                  background: targetCompany ? "rgba(56, 189, 248, 0.1)" : "transparent",
                  padding: targetCompany ? "1px 6px" : "0",
                  borderRadius: "4px",
                }}
              >
                {targetCompany || "General Corpus"}
              </span>
            </div>

            {detectedTopics && detectedTopics.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "2px" }}>
                {detectedTopics.map((t, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: "0.65rem",
                      background: "rgba(139, 92, 246, 0.15)",
                      color: "#c084fc",
                      padding: "1px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "#64748b", marginTop: "2px" }}>
              <span>Mode: <strong style={{ color: "#cbd5e1" }}>{routingMode}</strong></span>
              <span>Multi-hop: <strong style={{ color: isMultiHop ? "#38bdf8" : "#94a3b8" }}>{isMultiHop ? "Enabled" : "Off"}</strong></span>
            </div>
          </div>
        </div>

        {/* CARD C: RETRIEVAL STATUS */}
        <div
          style={{
            background: "#1e2030",
            borderRadius: "12px",
            padding: "0.85rem",
            border: "1px solid #2a2c42",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", color: "#94a3b8", textTransform: "uppercase" }}>
              Retrieval Status
            </span>
            <span style={{ fontSize: "0.7rem", color: "#38bdf8", fontWeight: 600 }}>
              {retrievalStatus.retriever}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.4rem", textAlign: "center" }}>
            <div style={{ background: "#161724", padding: "0.4rem", borderRadius: "6px" }}>
              <div style={{ fontSize: "0.62rem", color: "#64748b" }}>Candidates</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f1f5f9" }}>{retrievalStatus.candidates}</div>
            </div>
            <div style={{ background: "#161724", padding: "0.4rem", borderRadius: "6px" }}>
              <div style={{ fontSize: "0.62rem", color: "#64748b" }}>Safe Chunks</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#10b981" }}>{retrievalStatus.safeChunks}</div>
            </div>
            <div style={{ background: "#161724", padding: "0.4rem", borderRadius: "6px" }}>
              <div style={{ fontSize: "0.62rem", color: "#64748b" }}>Top Score</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#38bdf8" }}>
                {typeof retrievalStatus.topScore === "number" ? retrievalStatus.topScore.toFixed(2) : retrievalStatus.topScore}
              </div>
            </div>
          </div>
        </div>

        {/* CARD D: EVALUATION & RELIABILITY */}
        <div
          style={{
            background: "#1e2030",
            borderRadius: "12px",
            padding: "0.85rem",
            border: "1px solid #2a2c42",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", color: "#94a3b8", textTransform: "uppercase" }}>
              Reliability & Eval
            </span>
            <span style={{ fontSize: "0.65rem", color: "#10b981" }}>Active</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            {[
              { label: "Grounding Verification", status: evalStatus.grounding },
              { label: "Evidence Safety", status: evalStatus.evidence },
              { label: "Prompt Security", status: evalStatus.security },
              { label: "Output Validation", status: evalStatus.outputValidation },
              { label: "Reported vs Inferred", status: evalStatus.reportedInferred },
            ].map((e, idx) => {
              const badge = getStatusBadge(e.status);
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.68rem",
                    padding: "2px 0",
                  }}
                >
                  <span style={{ color: "#cbd5e1" }}>{e.label}</span>
                  <span
                    style={{
                      fontSize: "0.62rem",
                      fontWeight: 700,
                      color: badge.color,
                      background: badge.bg,
                      padding: "1px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    {badge.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* CARD E: PERFORMANCE METRICS */}
        <div
          style={{
            background: "#1e2030",
            borderRadius: "12px",
            padding: "0.85rem",
            border: "1px solid #2a2c42",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", color: "#94a3b8", textTransform: "uppercase" }}>
              Telemetry
            </span>
            <span style={{ fontSize: "0.7rem", color: "#a855f7", fontWeight: 600 }}>
              {performance.totalLatencyMs > 0 ? `${performance.totalLatencyMs.toFixed(0)} ms` : "Idle"}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.3rem", fontSize: "0.66rem", color: "#64748b" }}>
            <div>Retrieval: <strong style={{ color: "#f1f5f9" }}>{performance.retrievalLatencyMs.toFixed(0)} ms</strong></div>
            <div>Generation: <strong style={{ color: "#f1f5f9" }}>{performance.generationLatencyMs.toFixed(0)} ms</strong></div>
            <div>Tokens: <strong style={{ color: "#f1f5f9" }}>{performance.tokenCount || "—"}</strong></div>
            <div>Status: <strong style={{ color: "#10b981" }}>{performance.status}</strong></div>
          </div>
        </div>

        {/* CARD F: 59-COMPANY INTELLIGENCE VAULT */}
        <div
          style={{
            background: "#1e2030",
            borderRadius: "12px",
            padding: "0.85rem",
            border: "1px solid #2a2c42",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", color: "#94a3b8", textTransform: "uppercase" }}>
              Company Vault (59)
            </span>
            <span style={{ fontSize: "0.65rem", color: "#38bdf8" }}>30 New AI</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: "180px", overflowY: "auto" }}>
            {filteredCompanies.map((c, idx) => (
              <div
                key={idx}
                onClick={() => onSelectPrompt && onSelectPrompt(c.sample)}
                style={{
                  background: "#161724",
                  padding: "0.4rem 0.5rem",
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  border: "1px solid transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#38bdf8";
                  e.currentTarget.style.background = "#202234";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "transparent";
                  e.currentTarget.style.background = "#161724";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#f8fafc" }}>{c.name}</span>
                  <span style={{ fontSize: "0.6rem", color: "#94a3b8", background: "#202234", padding: "1px 4px", borderRadius: "3px" }}>
                    {c.tag}
                  </span>
                </div>
                <div style={{ fontSize: "0.63rem", color: "#64748b", marginTop: "1px" }}>{c.focus}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
