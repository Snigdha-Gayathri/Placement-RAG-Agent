import React, { useState, useRef, useEffect } from "react";

export default function ChatComposer({
  onSendMessage,
  onStopGeneration,
  isLoading = false,
  isStreaming = false,
  placeholder = "Message Agentic Placement RAG (e.g., 'Give me OpenAI LLM agent interview questions')...",
}) {
  const [input, setInput] = useState("");
  const textareaRef = useRef(null);

  const quickPrompts = [
    "Give me OpenAI LLM agent interview questions.",
    "What RAG interview questions should I expect at Anthropic?",
    "Give me agent reliability interview questions for Databricks.",
    "Compare the interview focus of OpenAI, Anthropic and Databricks.",
    "What LLM system design questions could I face at NVIDIA?",
  ];

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading || isStreaming) return;
    onSendMessage(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    // Auto expand
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
  };

  return (
    <div
      style={{
        padding: "0.75rem 1.25rem 1.25rem 1.25rem",
        background: "#181926",
        borderTop: "1px solid #232537",
        display: "flex",
        flexDirection: "column",
        gap: "0.6rem",
      }}
    >
      {/* Quick Prompts Chips Bar */}
      <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "2px" }}>
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => {
              setInput(p);
              if (textareaRef.current) textareaRef.current.focus();
            }}
            disabled={isLoading || isStreaming}
            style={{
              background: "#202234",
              border: "1px solid #2d3047",
              borderRadius: "14px",
              padding: "0.3rem 0.65rem",
              fontSize: "0.72rem",
              color: "#94a3b8",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#38bdf8";
              e.currentTarget.style.borderColor = "#38bdf8";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#94a3b8";
              e.currentTarget.style.borderColor = "#2d3047";
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Field and Action Button Container */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          background: "#222436",
          border: "1px solid #2d3047",
          borderRadius: "16px",
          padding: "0.5rem 0.75rem",
          gap: "0.5rem",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
        }}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading || isStreaming}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#f8fafc",
            fontSize: "0.9rem",
            fontFamily: "inherit",
            resize: "none",
            maxHeight: "140px",
            lineHeight: 1.5,
            padding: "4px 0",
          }}
        />

        {/* Send / Stop Button */}
        {isStreaming ? (
          <button
            onClick={onStopGeneration}
            title="Stop Generation"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "#ef4444",
              color: "#ffffff",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.9rem",
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(239, 68, 68, 0.4)",
            }}
          >
            ■
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            title="Send Message"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: input.trim() && !isLoading ? "linear-gradient(135deg, #3d5afe 0%, #304ffe 100%)" : "#2d3047",
              color: input.trim() && !isLoading ? "#ffffff" : "#64748b",
              border: "none",
              cursor: input.trim() && !isLoading ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.1rem",
              flexShrink: 0,
              transition: "all 0.2s ease",
              boxShadow: input.trim() && !isLoading ? "0 2px 10px rgba(48, 79, 254, 0.4)" : "none",
            }}
          >
            ↑
          </button>
        )}
      </div>
    </div>
  );
}
