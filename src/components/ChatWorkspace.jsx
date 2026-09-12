import React, { useRef, useEffect } from "react";
import UserMessage from "./UserMessage";
import AssistantMessage from "./AssistantMessage";
import ProcessingTimeline from "./ProcessingTimeline";
import ChatComposer from "./ChatComposer";

export default function ChatWorkspace({
  messages = [],
  activeProcessing = null, // { stages: [], message: "", isComplete: false }
  isStreaming = false,
  streamingContent = "",
  onSendMessage,
  onStopGeneration,
  onNewChat,
  onClearHistory,
  onOpenSettings,
  configuredModel = "gemini-2.5-flash",
}) {
  const scrollContainerRef = useRef(null);
  const isUserScrolledUp = useRef(false);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    // If distance from bottom > 80px, user scrolled up
    isUserScrolledUp.current = scrollHeight - scrollTop - clientHeight > 80;
  };

  useEffect(() => {
    if (!isUserScrolledUp.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, streamingContent, activeProcessing]);

  return (
    <div
      style={{
        flex: 1,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#13141f",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Workspace Header */}
      <header
        style={{
          height: "64px",
          minHeight: "64px",
          padding: "0 1.5rem",
          background: "#181926",
          borderBottom: "1px solid #232537",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          userSelect: "none",
          zIndex: 10,
        }}
      >
        {/* Title & Status */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #3d5afe 0%, #304ffe 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "1.1rem",
              boxShadow: "0 2px 8px rgba(48, 79, 254, 0.3)",
            }}
          >
            ⚡
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#f8fafc" }}>
                Agentic Placement RAG
              </span>
              <span
                style={{
                  fontSize: "0.68rem",
                  color: "#10b981",
                  background: "rgba(16, 185, 129, 0.12)",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#10b981" }} />
                Online
              </span>
            </div>
            <div style={{ fontSize: "0.7rem", color: "#64748b" }}>
              30 AI Companies + 29 Enterprise Handbooks • {configuredModel}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={onNewChat}
            title="Start New Chat Session"
            style={{
              background: "#202234",
              border: "1px solid #2d3047",
              color: "#cbd5e1",
              padding: "0.4rem 0.8rem",
              borderRadius: "8px",
              fontSize: "0.78rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontWeight: 500,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#38bdf8"; e.currentTarget.style.borderColor = "#38bdf8"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#cbd5e1"; e.currentTarget.style.borderColor = "#2d3047"; }}
          >
            <span>+</span> New Chat
          </button>

          <button
            onClick={onClearHistory}
            title="Clear Chat Messages"
            style={{
              background: "transparent",
              border: "1px solid #2d3047",
              color: "#94a3b8",
              padding: "0.4rem 0.7rem",
              borderRadius: "8px",
              fontSize: "0.78rem",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.borderColor = "#f87171"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.borderColor = "#2d3047"; }}
          >
            Clear
          </button>

          <button
            onClick={onOpenSettings}
            title="Feature Toggles & Guardrails"
            style={{
              background: "#202234",
              border: "1px solid #2d3047",
              color: "#94a3b8",
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              fontSize: "0.9rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ⚙
          </button>
        </div>
      </header>

      {/* Message List Scroll Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1.5rem 2rem",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Empty State Banner */}
        {messages.length === 0 && !activeProcessing && !isStreaming && (
          <div
            style={{
              margin: "auto",
              maxWidth: "600px",
              textAlign: "center",
              padding: "2rem",
              color: "#94a3b8",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, #3d5afe 0%, #304ffe 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontSize: "1.8rem",
                margin: "0 auto 1rem auto",
                boxShadow: "0 4px 16px rgba(48, 79, 254, 0.4)",
              }}
            >
              ⚡
            </div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#f8fafc", marginBottom: "0.5rem" }}>
              Interview Intelligence & RAG Agent
            </h2>
            <p style={{ fontSize: "0.85rem", lineHeight: 1.6, color: "#94a3b8", marginBottom: "1.5rem" }}>
              Explore comprehensive placement handbooks and company-specific AI interview intelligence for 59 tech companies including OpenAI, Anthropic, Databricks, Cohere, NVIDIA, and Google.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", textAlign: "left" }}>
              {[
                { title: "OpenAI LLM Agents", query: "Give me OpenAI LLM agent interview questions." },
                { title: "Anthropic RAG Systems", query: "What RAG interview questions should I expect at Anthropic?" },
                { title: "Databricks Reliability", query: "Give me agent reliability interview questions for Databricks." },
                { title: "Multi-Company Comparison", query: "Compare the interview focus of OpenAI, Anthropic and Databricks." },
              ].map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => onSendMessage(item.query)}
                  style={{
                    background: "#1a1c2b",
                    border: "1px solid #282a3d",
                    borderRadius: "10px",
                    padding: "0.75rem",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#38bdf8";
                    e.currentTarget.style.background = "#202234";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#282a3d";
                    e.currentTarget.style.background = "#1a1c2b";
                  }}
                >
                  <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#38bdf8", marginBottom: "2px" }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                    {item.query}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Existing Messages */}
        {messages.map((msg, idx) => {
          if (msg.role === "user") {
            return <UserMessage key={idx} content={msg.content} timestamp={msg.timestamp} />;
          } else {
            return (
              <AssistantMessage
                key={idx}
                content={msg.content}
                sources={msg.sources}
                timestamp={msg.timestamp}
                pipelineData={msg.pipelineData}
              />
            );
          }
        })}

        {/* Active Real-Time Processing Timeline */}
        {activeProcessing && (
          <ProcessingTimeline
            stages={activeProcessing.stages}
            isComplete={activeProcessing.isComplete}
            currentMessage={activeProcessing.message}
          />
        )}

        {/* Live Streaming Assistant Message */}
        {isStreaming && (
          <AssistantMessage
            content={streamingContent}
            isStreaming={true}
            timestamp="Streaming live..."
          />
        )}
      </div>

      {/* Chat Composer */}
      <ChatComposer
        onSendMessage={onSendMessage}
        onStopGeneration={onStopGeneration}
        isLoading={Boolean(activeProcessing && !activeProcessing.isComplete)}
        isStreaming={isStreaming}
      />
    </div>
  );
}
