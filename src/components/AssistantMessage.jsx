import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function AssistantMessage({
  content = "",
  isStreaming = false,
  sources = [],
  timestamp = "",
  pipelineData = null,
}) {
  const [sourcesOpen, setSourcesOpen] = useState(false);

  // Extract sources from pipelineData if not passed directly
  const retrievedChunks =
    sources.length > 0
      ? sources
      : pipelineData?.retrieval_info?.retrieved_chunks || [];

  return (
    <div
      style={{
        display: "flex",
        gap: "0.85rem",
        alignItems: "flex-start",
        marginBottom: "1.25rem",
        maxWidth: "92%",
      }}
    >
      {/* Assistant Avatar */}
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "12px",
          background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1rem",
          fontWeight: "bold",
          flexShrink: 0,
          boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
        }}
      >
        ✦
      </div>

      {/* Message Bubble Container */}
      <div
        style={{
          background: "#222436",
          borderRadius: "18px",
          borderTopLeftRadius: "4px",
          padding: "1rem 1.25rem",
          color: "#f1f5f9",
          fontSize: "0.9rem",
          lineHeight: 1.6,
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
          border: "1px solid #2d3047",
          flex: 1,
        }}
      >
        {/* Markdown Rendered Content */}
        <div className="rag-markdown-content" style={{ wordBreak: "break-word" }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ node, ...props }) => (
                <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#38bdf8", marginTop: "0.2rem", marginBottom: "0.6rem" }} {...props} />
              ),
              h2: ({ node, ...props }) => {
                const text = String(props.children);
                if (text.includes("Candidate-Reported") || text.includes("Reported Question")) {
                  return (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        marginTop: "1rem",
                        marginBottom: "0.5rem",
                        padding: "0.4rem 0.6rem",
                        background: "rgba(16, 185, 129, 0.12)",
                        borderLeft: "4px solid #10b981",
                        borderRadius: "4px",
                      }}
                    >
                      <span style={{ fontSize: "0.8rem", color: "#10b981", fontWeight: 700 }}>● REPORTED INTERVIEW QUESTION</span>
                    </div>
                  );
                }
                if (text.includes("Inferred") || text.includes("Practice Question")) {
                  return (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        marginTop: "1rem",
                        marginBottom: "0.5rem",
                        padding: "0.4rem 0.6rem",
                        background: "rgba(168, 85, 247, 0.12)",
                        borderLeft: "4px solid #a855f7",
                        borderRadius: "4px",
                      }}
                    >
                      <span style={{ fontSize: "0.8rem", color: "#c084fc", fontWeight: 700 }}>✦ INFERRED PRACTICE QUESTION</span>
                    </div>
                  );
                }
                if (text.includes("Technical Focus") || text.includes("Role Requirements")) {
                  return (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        marginTop: "1rem",
                        marginBottom: "0.5rem",
                        padding: "0.4rem 0.6rem",
                        background: "rgba(245, 158, 11, 0.12)",
                        borderLeft: "4px solid #f59e0b",
                        borderRadius: "4px",
                      }}
                    >
                      <span style={{ fontSize: "0.8rem", color: "#fbbf24", fontWeight: 700 }}>■ COMPANY TECHNICAL FOCUS</span>
                    </div>
                  );
                }
                return (
                  <h2 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#93c5fd", marginTop: "1rem", marginBottom: "0.4rem", borderBottom: "1px solid #2d3047", paddingBottom: "0.2rem" }} {...props} />
                );
              },
              h3: ({ node, ...props }) => (
                <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "#e2e8f0", marginTop: "0.6rem", marginBottom: "0.3rem" }} {...props} />
              ),
              blockquote: ({ node, ...props }) => (
                <blockquote
                  style={{
                    borderLeft: "3px solid #64748b",
                    paddingLeft: "0.75rem",
                    margin: "0.5rem 0",
                    color: "#94a3b8",
                    fontSize: "0.82rem",
                    fontStyle: "italic",
                    background: "rgba(100, 116, 139, 0.08)",
                    padding: "0.4rem 0.75rem",
                    borderRadius: "4px",
                  }}
                  {...props}
                />
              ),
              code: ({ node, inline, ...props }) =>
                inline ? (
                  <code style={{ background: "rgba(15, 23, 42, 0.6)", color: "#38bdf8", padding: "2px 6px", borderRadius: "4px", fontSize: "0.82rem", fontFamily: "monospace" }} {...props} />
                ) : (
                  <pre style={{ background: "#161724", border: "1px solid #2d3047", borderRadius: "8px", padding: "0.75rem", overflowX: "auto", margin: "0.6rem 0" }}>
                    <code style={{ color: "#f8fafc", fontSize: "0.82rem", fontFamily: "monospace" }} {...props} />
                  </pre>
                ),
              table: ({ node, ...props }) => (
                <div style={{ overflowX: "auto", margin: "0.75rem 0" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }} {...props} />
                </div>
              ),
              th: ({ node, ...props }) => (
                <th style={{ background: "#1a1c2b", border: "1px solid #2d3047", padding: "0.4rem 0.6rem", color: "#93c5fd", textAlign: "left" }} {...props} />
              ),
              td: ({ node, ...props }) => (
                <td style={{ border: "1px solid #2d3047", padding: "0.4rem 0.6rem", color: "#cbd5e1" }} {...props} />
              ),
              a: ({ node, ...props }) => (
                <a style={{ color: "#38bdf8", textDecoration: "none", borderBottom: "1px dotted #38bdf8" }} target="_blank" rel="noopener noreferrer" {...props} />
              ),
            }}
          >
            {content}
          </ReactMarkdown>

          {/* Blinking Cursor during live progressive generation */}
          {isStreaming && (
            <span
              style={{
                display: "inline-block",
                width: "8px",
                height: "15px",
                background: "#38bdf8",
                marginLeft: "4px",
                verticalAlign: "middle",
                animation: "cursorBlink 0.8s infinite",
              }}
            />
          )}
        </div>

        {/* Collapsible Sources & Evidence Card */}
        {retrievedChunks && retrievedChunks.length > 0 && (
          <div
            style={{
              marginTop: "0.85rem",
              paddingTop: "0.6rem",
              borderTop: "1px solid #2d3047",
              fontSize: "0.75rem",
            }}
          >
            <div
              onClick={() => setSourcesOpen(!sourcesOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                color: "#94a3b8",
                fontWeight: 600,
                userSelect: "none",
              }}
            >
              <span>📚 Sources & Evidence Grounding ({retrievedChunks.length} chunks)</span>
              <span>{sourcesOpen ? "▲ Hide" : "▼ Inspect Evidence"}</span>
            </div>

            {sourcesOpen && (
              <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {retrievedChunks.map((chunk, idx) => {
                  const meta = chunk.metadata || {};
                  const comp = meta.company || chunk.company || "General";
                  const srcFile = chunk.source || meta.source_file || "Corpus";
                  const score = chunk.similarity_score || chunk.score || 0.0;

                  return (
                    <div
                      key={idx}
                      style={{
                        background: "#181a28",
                        border: "1px solid #292b3d",
                        borderRadius: "6px",
                        padding: "0.45rem 0.6rem",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "#38bdf8", fontWeight: 600 }}>
                          [{idx + 1}] {comp} — <span style={{ color: "#cbd5e1" }}>{srcFile}</span>
                        </span>
                        {score > 0 && (
                          <span style={{ color: "#10b981", fontFamily: "monospace", fontSize: "0.7rem" }}>
                            Score: {typeof score === "number" ? score.toFixed(2) : score}
                          </span>
                        )}
                      </div>
                      {chunk.text && (
                        <div
                          style={{
                            color: "#94a3b8",
                            fontSize: "0.7rem",
                            marginTop: "3px",
                            fontStyle: "italic",
                          }}
                        >
                          "{chunk.text.replace(/\n/g, " ").slice(0, 140)}..."
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        {timestamp && (
          <div style={{ fontSize: "0.65rem", color: "#64748b", marginTop: "0.4rem", textAlign: "right" }}>
            {timestamp}
          </div>
        )}
      </div>
    </div>
  );
}
