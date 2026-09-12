import React from "react";

export default function SidebarRail({
  activeTab = "chat",
  onSelectTab,
  onOpenSettings,
  user = { name: "Candidate SDE", role: "AI / SDE Prep", avatar: "👤" }
}) {
  const navItems = [
    { id: "overview", label: "Overview", icon: "⌂", tooltip: "System Overview" },
    { id: "chat", label: "Chat Workspace", icon: "💬", tooltip: "Interview Intelligence Chat" },
    { id: "agent", label: "Agent Execution", icon: "✦", tooltip: "Agent Planning & Reasoning" },
    { id: "corpus", label: "Knowledge Corpus", icon: "🗄", tooltip: "59 Indexed Companies" },
    { id: "eval", label: "Eval & Guardrails", icon: "🛡", tooltip: "Security & Grounding" },
    { id: "metrics", label: "Observability", icon: "📊", badge: true, tooltip: "Real-time Metrics" },
  ];

  return (
    <aside
      style={{
        width: "68px",
        minWidth: "68px",
        background: "linear-gradient(180deg, #3d5afe 0%, #304ffe 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "1.25rem 0",
        boxShadow: "inset -1px 0 0 rgba(255, 255, 255, 0.1)",
        userSelect: "none",
        zIndex: 20,
        position: "relative",
      }}
    >
      {/* Top Brand & Nav Icons */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", gap: "1rem" }}>
        {/* App Logo Mark */}
        <div
          title="Agentic Placement RAG"
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "14px",
            background: "rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            fontSize: "1.2rem",
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            marginBottom: "0.5rem",
          }}
          onClick={() => onSelectTab("chat")}
        >
          ⚡
        </div>

        {/* Navigation Buttons */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "0.6rem", width: "100%", alignItems: "center" }}>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                title={item.tooltip}
                onClick={() => onSelectTab(item.id)}
                style={{
                  width: "46px",
                  height: "46px",
                  borderRadius: "14px",
                  border: "none",
                  background: isActive ? "#ffffff" : "transparent",
                  color: isActive ? "#304ffe" : "rgba(255, 255, 255, 0.8)",
                  fontSize: "1.25rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  position: "relative",
                  boxShadow: isActive ? "0 4px 16px rgba(0, 0, 0, 0.2)" : "none",
                  transform: isActive ? "scale(1.05)" : "scale(1)",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
                    e.currentTarget.style.color = "#ffffff";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)";
                  }
                }}
              >
                <span>{item.icon}</span>
                {item.badge && (
                  <span
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#ff5252",
                      boxShadow: "0 0 6px #ff5252",
                    }}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Settings & User Avatar */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.8rem", width: "100%" }}>
        <button
          title="Feature Toggles & Guardrail Settings"
          onClick={onOpenSettings}
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "12px",
            border: "none",
            background: "rgba(255, 255, 255, 0.12)",
            color: "rgba(255, 255, 255, 0.9)",
            fontSize: "1.1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
          }}
        >
          ⚙
        </button>

        {/* User Profile */}
        <div
          title={`${user.name} (${user.role})`}
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.25)",
            border: "2px solid rgba(255, 255, 255, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.1rem",
            cursor: "pointer",
            position: "relative",
          }}
        >
          <span>{user.avatar}</span>
          <span
            style={{
              position: "absolute",
              bottom: "0px",
              right: "0px",
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "#00e676",
              border: "2px solid #304ffe",
            }}
          />
        </div>
      </div>
    </aside>
  );
}
