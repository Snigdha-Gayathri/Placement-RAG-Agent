import React, { useState, useEffect } from "react";

export default function FeatureTogglesModal({
  isOpen,
  onClose,
  toggles = {},
  onUpdateToggle,
  onReindex,
  isReindexing = false,
  reindexResult = null,
}) {
  if (!isOpen) return null;

  const toggleItems = [
    { key: "hybrid_retrieval", label: "Hybrid RRF Retrieval", desc: "Combines Dense embeddings & BM25 lexical search with Reciprocal Rank Fusion." },
    { key: "cross_encoder_reranking", label: "Cross-Encoder Reranking", desc: "Applies ms-marco-MiniLM-L-6-v2 cross-attention reranker over candidates." },
    { key: "agent_planning", label: "Agent Planning & Reasoning", desc: "Autonomous multi-step planner evaluating retrieval and tool execution." },
    { key: "metadata_filtering", label: "Company & Topic Metadata Filtering", desc: "Applies canonical company and topic filters to retrieval queries." },
    { key: "conversation_memory", label: "Conversation Memory", desc: "Maintains multi-turn context across chat turns." },
    { key: "query_rewriting", label: "Query Context Rewriter", desc: "Rewrites ambiguous followup questions into standalone queries." },
    { key: "hyde", label: "HyDE (Hypothetical Document Embeddings)", desc: "Generates hypothetical answers before vector search." },
    { key: "multi_hop_retrieval", label: "Multi-Hop Query Decomposition", desc: "Decomposes complex comparative questions across multiple hops." },
  ];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: "#1a1c2b",
          border: "1px solid #2d3047",
          borderRadius: "16px",
          width: "540px",
          maxWidth: "90vw",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #2d3047",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#f8fafc", fontWeight: 700 }}>
              ⚙ Platform Settings & Feature Toggles
            </h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "#94a3b8" }}>
              Configure autonomous agent strategies, security guards, and index sync.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              fontSize: "1.2rem",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "1.25rem 1.5rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          {/* Toggles List */}
          {toggleItems.map((item) => {
            const isChecked = Boolean(toggles[item.key]);
            return (
              <div
                key={item.key}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#13141f",
                  padding: "0.75rem 1rem",
                  borderRadius: "10px",
                  border: "1px solid #242639",
                }}
              >
                <div style={{ paddingRight: "1rem" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#f1f5f9" }}>{item.label}</div>
                  <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "2px" }}>{item.desc}</div>
                </div>

                <button
                  onClick={() => onUpdateToggle(item.key, !isChecked)}
                  style={{
                    width: "44px",
                    height: "24px",
                    borderRadius: "12px",
                    border: "none",
                    background: isChecked ? "linear-gradient(135deg, #3d5afe 0%, #304ffe 100%)" : "#2d3047",
                    cursor: "pointer",
                    position: "relative",
                    transition: "all 0.2s ease",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: "2px",
                      left: isChecked ? "22px" : "2px",
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      background: "#ffffff",
                      transition: "all 0.2s ease",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                    }}
                  />
                </button>
              </div>
            );
          })}

          {/* Reindex Card */}
          <div
            style={{
              background: "#161726",
              border: "1px solid #2d3047",
              borderRadius: "10px",
              padding: "1rem",
              marginTop: "0.5rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#38bdf8" }}>Reindex ChromaDB & BM25 Corpus</div>
                <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                  Scans all 59 company documents and rebuilds vector & BM25 indices.
                </div>
              </div>
              <button
                onClick={onReindex}
                disabled={isReindexing}
                style={{
                  background: isReindexing ? "#2d3047" : "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                  color: "#ffffff",
                  border: "none",
                  padding: "0.45rem 0.9rem",
                  borderRadius: "8px",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: isReindexing ? "default" : "pointer",
                }}
              >
                {isReindexing ? "Reindexing..." : "Rebuild Index"}
              </button>
            </div>
            {reindexResult && (
              <div style={{ marginTop: "0.5rem", fontSize: "0.72rem", color: "#10b981" }}>
                ✓ {reindexResult.status || "Reindexed successfully"} (Total chunks: {reindexResult.chunks_indexed || 357})
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "0.9rem 1.5rem", borderTop: "1px solid #2d3047", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              background: "#222436",
              border: "1px solid #2d3047",
              color: "#f1f5f9",
              padding: "0.4rem 1rem",
              borderRadius: "8px",
              fontSize: "0.82rem",
              cursor: "pointer",
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
