import { useState, useRef, useEffect } from "react";

// ─── Knowledge Bases ────────────────────────────────────────────────────────
const KNOWLEDGE_BASES = {
  Google: {
    color: "#4285F4",
    icon: "G",
    questions: [
      { q: "How would you design a URL shortening service like bit.ly?", tags: ["system design", "backend"] },
      { q: "Given an integer array, find two numbers that add up to a target sum.", tags: ["algorithms", "arrays"] },
      { q: "Explain the difference between process and thread.", tags: ["OS", "fundamentals"] },
      { q: "How does Google Search index the web?", tags: ["system design", "distributed"] },
      { q: "Design a key-value store with TTL support.", tags: ["system design", "data structures"] },
      { q: "What is the CAP theorem and how does it apply to distributed systems?", tags: ["distributed systems"] },
      { q: "How would you detect a cycle in a linked list?", tags: ["algorithms", "linked list"] },
      { q: "Describe how PageRank algorithm works.", tags: ["algorithms", "graphs"] },
      { q: "How would you implement autocomplete for Google Search?", tags: ["system design", "tries"] },
      { q: "Tell me about a time you had a technical disagreement with a teammate.", tags: ["behavioral"] },
    ],
  },
  Amazon: {
    color: "#FF9900",
    icon: "A",
    questions: [
      { q: "Design Amazon's product recommendation engine.", tags: ["system design", "ML"] },
      { q: "Tell me about a time you had to make a decision with incomplete data.", tags: ["behavioral", "leadership principles"] },
      { q: "How would you design the Amazon warehouse fulfillment system?", tags: ["system design", "logistics"] },
      { q: "Implement LRU Cache from scratch.", tags: ["data structures", "algorithms"] },
      { q: "Describe a situation where you disagreed with your manager.", tags: ["behavioral"] },
      { q: "How would you design a distributed job scheduler?", tags: ["system design", "distributed"] },
      { q: "Find the longest palindromic substring in a string.", tags: ["algorithms", "dynamic programming"] },
      { q: "How does Amazon handle Black Friday traffic spikes?", tags: ["system design", "scalability"] },
      { q: "Tell me about a time you took ownership of a failing project.", tags: ["behavioral", "leadership"] },
      { q: "Design a notification system for 1 billion users.", tags: ["system design", "scale"] },
    ],
  },
  Microsoft: {
    color: "#00A4EF",
    icon: "M",
    questions: [
      { q: "How would you design Microsoft Teams?", tags: ["system design", "real-time"] },
      { q: "Reverse a linked list iteratively and recursively.", tags: ["algorithms", "linked list"] },
      { q: "What is the difference between abstract class and interface in C#?", tags: ["OOP", "C#"] },
      { q: "Design a real-time collaborative document editor.", tags: ["system design", "CRDT"] },
      { q: "How would you implement Ctrl+Z (undo) functionality?", tags: ["data structures", "design patterns"] },
      { q: "Explain SOLID principles with examples.", tags: ["OOP", "design patterns"] },
      { q: "How does Azure handle multi-region failover?", tags: ["cloud", "distributed systems"] },
      { q: "Find all permutations of a string.", tags: ["algorithms", "recursion"] },
      { q: "How would you design a scalable email system?", tags: ["system design"] },
      { q: "Describe a time you improved a process significantly.", tags: ["behavioral"] },
    ],
  },
  Meta: {
    color: "#0866FF",
    icon: "fb",
    questions: [
      { q: "Design Facebook's News Feed ranking algorithm.", tags: ["system design", "ML", "ranking"] },
      { q: "How would you detect fake accounts at scale?", tags: ["ML", "trust & safety"] },
      { q: "Find if two binary trees are identical.", tags: ["algorithms", "trees"] },
      { q: "Design Instagram's photo storage and CDN.", tags: ["system design", "storage"] },
      { q: "How does WhatsApp ensure message delivery?", tags: ["system design", "messaging"] },
      { q: "Clone a graph with arbitrary connections.", tags: ["algorithms", "graphs"] },
      { q: "Design a system to count billions of likes in real time.", tags: ["system design", "distributed counters"] },
      { q: "Tell me about a product decision that required data analysis.", tags: ["behavioral", "product"] },
      { q: "How would you A/B test a new feature for 3 billion users?", tags: ["experimentation", "statistics"] },
      { q: "Flatten a nested dictionary.", tags: ["coding", "Python"] },
    ],
  },
  Netflix: {
    color: "#E50914",
    icon: "N",
    questions: [
      { q: "Design Netflix's video streaming architecture.", tags: ["system design", "streaming", "CDN"] },
      { q: "How does Netflix implement its recommendation system?", tags: ["ML", "recommendations"] },
      { q: "How would you handle 200 million concurrent streams?", tags: ["system design", "scalability"] },
      { q: "Design a chaos engineering framework like Netflix's Chaos Monkey.", tags: ["resilience", "distributed"] },
      { q: "How does Netflix decide what content to produce?", tags: ["data science", "product"] },
      { q: "Implement a rate limiter for API requests.", tags: ["system design", "algorithms"] },
      { q: "How would you design adaptive bitrate streaming?", tags: ["system design", "video"] },
      { q: "Find the most frequently watched category per user.", tags: ["SQL", "data analysis"] },
      { q: "How does Netflix handle multi-region data replication?", tags: ["distributed systems", "Cassandra"] },
      { q: "Tell me about a time you made a high-stakes technical decision.", tags: ["behavioral"] },
    ],
  },
  Apple: {
    color: "#555555",
    icon: "",
    questions: [
      { q: "How would you design iCloud's syncing architecture?", tags: ["system design", "sync"] },
      { q: "What makes SwiftUI different from UIKit?", tags: ["iOS", "Swift"] },
      { q: "How does Face ID work under the hood?", tags: ["security", "ML", "hardware"] },
      { q: "Design a battery optimization system for iOS.", tags: ["system design", "mobile", "OS"] },
      { q: "How would you implement end-to-end encryption for iMessage?", tags: ["security", "cryptography"] },
      { q: "Describe the memory management model in Swift (ARC).", tags: ["Swift", "memory management"] },
      { q: "How would you build a privacy-preserving analytics system?", tags: ["privacy", "system design"] },
      { q: "Find duplicates in an array using O(1) space.", tags: ["algorithms", "arrays"] },
      { q: "How does the App Store review process work at scale?", tags: ["system design", "operations"] },
      { q: "Tell me about a time you had to balance user experience vs. performance.", tags: ["behavioral", "product"] },
    ],
  },
};

const COMPANIES = Object.keys(KNOWLEDGE_BASES);

// ─── RAG Search ──────────────────────────────────────────────────────────────
function searchKnowledgeBases(query) {
  const q = query.toLowerCase();
  const results = [];

  for (const [company, kb] of Object.entries(KNOWLEDGE_BASES)) {
    const matched = kb.questions.filter((item) => {
      const text = (item.q + " " + item.tags.join(" ")).toLowerCase();
      // Score by keyword overlap
      const words = q.split(/\s+/).filter((w) => w.length > 3);
      return words.some((w) => text.includes(w));
    });
    if (matched.length > 0) {
      results.push({ company, color: kb.color, icon: kb.icon, matches: matched.slice(0, 5) });
    }
  }
  return results;
}

// ─── Claude API Call ─────────────────────────────────────────────────────────
async function callClaudeWithRAG(userMessage, ragContext) {
  const contextText = ragContext
    .map(
      (r) =>
        `[${r.company}]:\n` +
        r.matches.map((m) => `• ${m.q} (tags: ${m.tags.join(", ")})`).join("\n")
    )
    .join("\n\n");

  const systemPrompt = `You are an expert IT Interview Intelligence Agent. You have access to curated interview question databases from top tech companies: Google, Amazon, Microsoft, Meta, Netflix, and Apple.

When a user asks about interview questions for a company or topic, you MUST:
1. Analyze the retrieved knowledge base context provided to you
2. Synthesize a comprehensive, well-structured answer
3. Always cite which company each question or insight comes from using [Company] notation
4. Group questions by category/theme when possible
5. Add brief expert tips for each category
6. Keep responses focused, useful, and actionable

Format your response with clear sections using markdown. Be concise but thorough. Always end with a "Pro Tips" section.`;

  const userContent = ragContext.length > 0
    ? `User Query: ${userMessage}\n\n--- RETRIEVED CONTEXT FROM KNOWLEDGE BASES ---\n${contextText}\n--- END CONTEXT ---\n\nPlease synthesize the above knowledge base results into a helpful, well-cited answer.`
    : `User Query: ${userMessage}\n\nNote: No specific matches were found in the knowledge bases for this query. Please provide a helpful general response about IT interview preparation.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  const data = await response.json();
  return data.content?.[0]?.text || "I encountered an issue processing your request.";
}

// ─── Markdown Renderer ────────────────────────────────────────────────────────
function renderMarkdown(text) {
  const lines = text.split("\n");
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("### ")) {
      elements.push(<h3 key={i} style={{ color: "#00ffc8", fontSize: "0.85rem", fontFamily: "'Space Mono', monospace", marginTop: "1rem", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>{line.slice(4)}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} style={{ color: "#00ffc8", fontSize: "0.95rem", fontFamily: "'Space Mono', monospace", marginTop: "1.2rem", marginBottom: "0.4rem", borderBottom: "1px solid #00ffc822", paddingBottom: "0.3rem" }}>{line.slice(3)}</h2>);
    } else if (line.startsWith("**") && line.endsWith("**")) {
      elements.push(<p key={i} style={{ color: "#e0e0e0", fontWeight: "bold", margin: "0.5rem 0 0.2rem" }}>{line.slice(2, -2)}</p>);
    } else if (line.startsWith("• ") || line.startsWith("- ") || line.startsWith("* ")) {
      const content = line.slice(2);
      // Handle inline bold and citations
      const parts = content.split(/(\*\*[^*]+\*\*|\[[^\]]+\])/g);
      elements.push(
        <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem", paddingLeft: "0.5rem" }}>
          <span style={{ color: "#00ffc8", flexShrink: 0 }}>▸</span>
          <span style={{ color: "#c8c8c8", fontSize: "0.88rem", lineHeight: 1.6 }}>
            {parts.map((p, j) => {
              if (p.startsWith("**") && p.endsWith("**")) return <strong key={j} style={{ color: "#fff" }}>{p.slice(2, -2)}</strong>;
              if (p.startsWith("[") && p.endsWith("]")) return <span key={j} style={{ color: "#00ffc8", fontFamily: "'Space Mono', monospace", fontSize: "0.8em", backgroundColor: "#00ffc811", padding: "0 4px", borderRadius: "3px" }}>{p}</span>;
              return p;
            })}
          </span>
        </div>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} style={{ height: "0.4rem" }} />);
    } else {
      const parts = line.split(/(\*\*[^*]+\*\*|\[[^\]]+\])/g);
      elements.push(
        <p key={i} style={{ color: "#c8c8c8", fontSize: "0.88rem", lineHeight: 1.7, margin: "0.15rem 0" }}>
          {parts.map((p, j) => {
            if (p.startsWith("**") && p.endsWith("**")) return <strong key={j} style={{ color: "#fff" }}>{p.slice(2, -2)}</strong>;
            if (p.startsWith("[") && p.endsWith("]")) return <span key={j} style={{ color: "#00ffc8", fontFamily: "'Space Mono', monospace", fontSize: "0.85em", backgroundColor: "#00ffc811", padding: "0 4px", borderRadius: "3px" }}>{p}</span>;
            return p;
          })}
        </p>
      );
    }
    i++;
  }
  return elements;
}

// ─── Typing Animation ─────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: "flex", gap: "5px", alignItems: "center", padding: "0.5rem 0" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%", background: "#00ffc8",
          animation: "pulse 1.2s ease-in-out infinite",
          animationDelay: `${i * 0.2}s`,
          opacity: 0.7
        }} />
      ))}
    </div>
  );
}

// ─── Citation Card ─────────────────────────────────────────────────────────────
function CitationCard({ result, index }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{
      border: `1px solid ${result.color}44`,
      borderLeft: `3px solid ${result.color}`,
      borderRadius: "6px",
      marginBottom: "0.5rem",
      background: `${result.color}08`,
      overflow: "hidden",
      transition: "all 0.2s ease",
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.5rem 0.75rem", cursor: "pointer" }}
      >
        <span style={{
          background: result.color, color: "#fff", borderRadius: "4px",
          padding: "1px 7px", fontSize: "0.7rem", fontFamily: "'Space Mono', monospace", fontWeight: "bold"
        }}>
          {result.icon || result.company[0]}
        </span>
        <span style={{ color: "#e0e0e0", fontSize: "0.82rem", fontFamily: "'Space Mono', monospace", flex: 1 }}>
          {result.company}
        </span>
        <span style={{ color: "#888", fontSize: "0.75rem" }}>{result.matches.length} matches</span>
        <span style={{ color: result.color, fontSize: "0.8rem", transform: expanded ? "rotate(90deg)" : "none", transition: "0.2s" }}>▶</span>
      </div>
      {expanded && (
        <div style={{ padding: "0 0.75rem 0.6rem", borderTop: `1px solid ${result.color}22` }}>
          {result.matches.map((m, i) => (
            <div key={i} style={{ padding: "0.4rem 0", borderBottom: i < result.matches.length - 1 ? "1px solid #ffffff0a" : "none" }}>
              <p style={{ color: "#d0d0d0", fontSize: "0.82rem", margin: "0 0 0.2rem", lineHeight: 1.5 }}>{m.q}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                {m.tags.map((t) => (
                  <span key={t} style={{
                    background: `${result.color}22`, color: result.color,
                    fontSize: "0.68rem", padding: "1px 6px", borderRadius: "3px",
                    fontFamily: "'Space Mono', monospace"
                  }}>{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Message ──────────────────────────────────────────────────────────────────
function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ marginBottom: "1.5rem", display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
        {!isUser && (
          <div style={{
            width: 26, height: 26, borderRadius: "50%",
            background: "linear-gradient(135deg, #00ffc8, #0066ff)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.65rem", fontWeight: "bold", color: "#000", fontFamily: "'Space Mono', monospace"
          }}>AI</div>
        )}
        <span style={{ color: "#555", fontSize: "0.7rem", fontFamily: "'Space Mono', monospace" }}>
          {isUser ? "you" : "rag_agent"}
        </span>
        {isUser && (
          <div style={{
            width: 26, height: 26, borderRadius: "50%", background: "#2a2a3a",
            border: "1px solid #444", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "0.7rem", color: "#888"
          }}>U</div>
        )}
      </div>

      {isUser ? (
        <div style={{
          background: "linear-gradient(135deg, #1a1a2e, #16213e)",
          border: "1px solid #333", borderRadius: "12px 12px 2px 12px",
          padding: "0.7rem 1rem", maxWidth: "70%", color: "#e0e0e0", fontSize: "0.88rem", lineHeight: 1.6
        }}>
          {msg.content}
        </div>
      ) : (
        <div style={{ width: "100%", maxWidth: "100%" }}>
          {msg.loading ? (
            <div style={{
              background: "#0d1117", border: "1px solid #1e3a2e",
              borderRadius: "2px 12px 12px 12px", padding: "0.7rem 1rem"
            }}>
              <TypingDots />
            </div>
          ) : (
            <>
              <div style={{
                background: "#0d1117", border: "1px solid #1e3a2e",
                borderRadius: "2px 12px 12px 12px", padding: "0.8rem 1.1rem", marginBottom: "0.75rem"
              }}>
                {renderMarkdown(msg.content)}
              </div>
              {msg.citations && msg.citations.length > 0 && (
                <div>
                  <p style={{ color: "#444", fontSize: "0.7rem", fontFamily: "'Space Mono', monospace", marginBottom: "0.4rem" }}>
                    ◈ SOURCES ({msg.citations.length} knowledge bases)
                  </p>
                  {msg.citations.map((c, i) => <CitationCard key={i} result={c} index={i} />)}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Suggested Queries ────────────────────────────────────────────────────────
const SUGGESTIONS = [
  "What system design questions does Google ask?",
  "What behavioral questions does Amazon focus on?",
  "What are Netflix's streaming architecture questions?",
  "Compare algorithm questions across all companies",
  "What security questions does Apple ask?",
  "What ML questions does Meta ask?",
];

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `## Welcome to Interview RAG Agent\n\nI have access to **${COMPANIES.length} curated knowledge bases** from top IT companies:\n\n• **Google** — System design, algorithms, distributed systems\n• **Amazon** — Leadership principles, system design, DSA\n• **Microsoft** — OOP, cloud, real-time systems\n• **Meta** — ML systems, scale, product decisions\n• **Netflix** — Streaming architecture, resilience, data science\n• **Apple** — iOS, privacy, security, hardware-software\n\nAsk me about interview questions for any company or topic, and I'll search across all knowledge bases and provide cited answers.`,
      citations: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeCompanies] = useState(new Set(COMPANIES));
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text) => {
    const query = text || input.trim();
    if (!query || loading) return;
    setInput("");

    const userMsg = { role: "user", content: query };
    const loadingMsg = { role: "assistant", content: "", loading: true };
    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setLoading(true);

    try {
      // RAG: search knowledge bases
      const ragResults = searchKnowledgeBases(query);

      // Call Claude with RAG context
      const aiResponse = await callClaudeWithRAG(query, ragResults);

      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: aiResponse, citations: ragResults },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: "An error occurred while processing your query. Please try again.", citations: [] },
      ]);
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080b10",
      fontFamily: "'Sora', 'Segoe UI', sans-serif",
      display: "flex",
      flexDirection: "column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Sora:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0d1117; }
        ::-webkit-scrollbar-thumb { background: #1e3a2e; border-radius: 2px; }
        @keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100vh); } }
        @keyframes glow { 0%, 100% { box-shadow: 0 0 10px #00ffc822; } 50% { box-shadow: 0 0 25px #00ffc844; } }
        .msg-enter { animation: fadeIn 0.3s ease forwards; }
        textarea:focus { outline: none; }
        textarea { resize: none; }
        .send-btn:hover { background: linear-gradient(135deg, #00ffc8, #00b38a) !important; transform: scale(1.05); }
        .send-btn:active { transform: scale(0.97); }
        .suggestion-btn:hover { background: #00ffc811 !important; border-color: #00ffc844 !important; color: #00ffc8 !important; }
      `}</style>

      {/* Header */}
      <div style={{
        borderBottom: "1px solid #1a2a1a",
        padding: "0.9rem 1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        background: "#0a0f0a",
        position: "sticky",
        top: 0,
        zIndex: 10,
        backdropFilter: "blur(10px)",
      }}>
        {/* Logo */}
        <div style={{
          width: 36, height: 36, borderRadius: "8px",
          background: "linear-gradient(135deg, #00ffc8, #0066ff)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "glow 3s ease-in-out infinite"
        }}>
          <span style={{ fontSize: "1rem" }}>⬡</span>
        </div>
        <div>
          <h1 style={{
            fontFamily: "'Space Mono', monospace", color: "#00ffc8",
            fontSize: "0.95rem", fontWeight: "700", letterSpacing: "0.05em"
          }}>
            INTERVIEW RAG AGENT
          </h1>
          <p style={{ color: "#3a6a4a", fontSize: "0.68rem", fontFamily: "'Space Mono', monospace" }}>
            {COMPANIES.length} knowledge bases • {Object.values(KNOWLEDGE_BASES).reduce((s, kb) => s + kb.questions.length, 0)} questions indexed
          </p>
        </div>

        {/* Company badges */}
        <div style={{ display: "flex", gap: "0.4rem", marginLeft: "auto", flexWrap: "wrap" }}>
          {COMPANIES.map((c) => (
            <div key={c} style={{
              padding: "2px 8px", borderRadius: "4px", fontSize: "0.65rem",
              fontFamily: "'Space Mono', monospace", fontWeight: "bold",
              background: `${KNOWLEDGE_BASES[c].color}18`,
              border: `1px solid ${KNOWLEDGE_BASES[c].color}44`,
              color: KNOWLEDGE_BASES[c].color,
            }}>{c}</div>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "1.5rem 1.5rem",
        maxWidth: "900px",
        width: "100%",
        margin: "0 auto",
      }}>
        {messages.map((msg, i) => (
          <div key={i} className="msg-enter">
            <Message msg={msg} />
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div style={{
          padding: "0 1.5rem 1rem",
          maxWidth: "900px",
          width: "100%",
          margin: "0 auto",
        }}>
          <p style={{ color: "#2a4a3a", fontSize: "0.7rem", fontFamily: "'Space Mono', monospace", marginBottom: "0.6rem" }}>
            ◈ TRY ASKING
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                className="suggestion-btn"
                onClick={() => handleSend(s)}
                style={{
                  background: "transparent",
                  border: "1px solid #1e2e1e",
                  color: "#4a6a5a",
                  borderRadius: "6px",
                  padding: "0.4rem 0.8rem",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  fontFamily: "'Sora', sans-serif",
                  transition: "all 0.2s ease",
                }}
              >{s}</button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{
        borderTop: "1px solid #1a2a1a",
        padding: "1rem 1.5rem",
        background: "#0a0f0a",
        maxWidth: "900px",
        width: "100%",
        margin: "0 auto",
      }}>
        <div style={{
          display: "flex",
          gap: "0.75rem",
          alignItems: "flex-end",
          background: "#0d1117",
          border: "1px solid #1e3a2e",
          borderRadius: "12px",
          padding: "0.6rem 0.7rem",
        }}>
          <span style={{ color: "#00ffc8", fontFamily: "'Space Mono', monospace", fontSize: "0.8rem", marginBottom: "0.3rem", flexShrink: 0 }}>›</span>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Ask about interview questions... (e.g. 'What does Google ask about system design?')"
            rows={1}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: "#e0e0e0",
              fontSize: "0.88rem",
              fontFamily: "'Sora', sans-serif",
              lineHeight: 1.6,
              maxHeight: "120px",
              overflowY: "auto",
            }}
            onInput={(e) => {
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
          />
          <button
            className="send-btn"
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            style={{
              background: input.trim() && !loading ? "linear-gradient(135deg, #00ffc8, #00cc9a)" : "#1a2a1a",
              border: "none",
              borderRadius: "8px",
              width: 36, height: 36,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              flexShrink: 0,
              transition: "all 0.2s ease",
              color: input.trim() && !loading ? "#000" : "#333",
              fontSize: "1rem",
            }}
          >
            {loading ? "⏳" : "⬆"}
          </button>
        </div>
        <p style={{ textAlign: "center", color: "#222", fontSize: "0.65rem", fontFamily: "'Space Mono', monospace", marginTop: "0.5rem" }}>
          Shift+Enter for new line • Enter to send
        </p>
      </div>
    </div>
  );
}
