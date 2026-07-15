import { useState } from "react";

// ─── Helper: Format timestamp ───────────────────────────────────────────────
function formatTimestamp(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "Last 7 days";
  if (diffDays < 30) return "Last 30 days";
  return "Older";
}

// ─── Helper: Group conversations by time ────────────────────────────────────
function groupConversations(conversations) {
  const groups = {
    Today: [],
    Yesterday: [],
    "Last 7 days": [],
    "Last 30 days": [],
    Older: [],
  };

  conversations.forEach((conv) => {
    const group = formatTimestamp(conv.timestamp);
    if (groups[group]) {
      groups[group].push(conv);
    }
  });

  return groups;
}

// ─── ConversationItem ───────────────────────────────────────────────────────
function ConversationItem({ conversation, isActive, onSelect, onRename, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);
  const [showActions, setShowActions] = useState(false);

  const handleRename = () => {
    if (editTitle.trim() && editTitle !== conversation.title) {
      onRename(conversation.id, editTitle.trim());
    }
    setIsEditing(false);
  };

  return (
    <div
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      style={{
        position: "relative",
        marginBottom: "0.25rem",
      }}
    >
      {isEditing ? (
        <div style={{ padding: "0.5rem 0.75rem" }}>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") setIsEditing(false);
            }}
            onBlur={handleRename}
            autoFocus
            style={{
              width: "100%",
              background: "rgba(30,144,255,0.08)",
              border: "1px solid rgba(30,144,255,0.3)",
              borderRadius: "6px",
              padding: "0.35rem 0.5rem",
              color: "#C8D8EA",
              fontSize: "0.75rem",
              fontFamily: "'Sora', sans-serif",
              outline: "none",
            }}
          />
        </div>
      ) : (
        <div
          onClick={() => !isActive && onSelect(conversation.id)}
          style={{
            padding: "0.5rem 0.75rem",
            borderRadius: "6px",
            background: isActive ? "rgba(30,144,255,0.12)" : "transparent",
            border: `1px solid ${isActive ? "rgba(30,144,255,0.2)" : "transparent"}`,
            cursor: isActive ? "default" : "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span style={{ fontSize: "0.7rem", flexShrink: 0 }}>💬</span>
          <span
            style={{
              flex: 1,
              color: isActive ? "#1E90FF" : "#8AA8C8",
              fontSize: "0.72rem",
              fontFamily: "'Sora', sans-serif",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              lineHeight: 1.4,
            }}
          >
            {conversation.title}
          </span>
          {showActions && !isActive && (
            <div style={{ display: "flex", gap: "0.25rem", flexShrink: 0 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                style={{
                  background: "rgba(30,144,255,0.08)",
                  border: "none",
                  borderRadius: "4px",
                  padding: "0.2rem 0.3rem",
                  color: "#6B9FD4",
                  fontSize: "0.65rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                title="Rename"
              >
                ✏️
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete "${conversation.title}"?`)) {
                    onDelete(conversation.id);
                  }
                }}
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "none",
                  borderRadius: "4px",
                  padding: "0.2rem 0.3rem",
                  color: "#EF4444",
                  fontSize: "0.65rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                title="Delete"
              >
                🗑️
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main ConversationSidebar ───────────────────────────────────────────────
export default function ConversationSidebar({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
}) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter conversations by search
  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by timestamp
  const groupedConversations = groupConversations(filteredConversations);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
          zIndex: 90,
          animation: "fadeIn 0.2s ease",
        }}
      />

      {/* Sidebar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: "280px",
          background: "#050A15",
          borderRight: "1px solid rgba(30,144,255,0.12)",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          boxShadow: "4px 0 30px rgba(0,0,0,0.5), 1px 0 1px rgba(30,144,255,0.1)",
          animation: "slideInLeft 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1rem 1rem 0.75rem",
            borderBottom: "1px solid rgba(30,144,255,0.08)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ color: "#1E90FF", fontSize: "0.85rem" }}>💬</span>
              <span
                style={{
                  color: "#1E90FF",
                  fontSize: "0.68rem",
                  fontFamily: "'Orbitron', 'Space Mono', monospace",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Conversations
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "rgba(30,144,255,0.06)",
                border: "1px solid rgba(30,144,255,0.12)",
                borderRadius: "4px",
                color: "#6B9FD4",
                fontSize: "0.7rem",
                cursor: "pointer",
                width: 24,
                height: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                transition: "all 0.2s",
              }}
            >
              ✕
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={onNewChat}
            style={{
              width: "100%",
              background: "linear-gradient(135deg, #1E90FF, #3AA8FF)",
              border: "none",
              borderRadius: "8px",
              padding: "0.6rem 0.75rem",
              color: "#001830",
              fontSize: "0.75rem",
              fontFamily: "'Sora', sans-serif",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "all 0.2s",
              boxShadow: "0 0 20px rgba(30,144,255,0.3)",
            }}
          >
            <span style={{ fontSize: "1rem", fontWeight: "bold" }}>+</span>
            <span>New Chat</span>
          </button>

          {/* Search */}
          <div style={{ marginTop: "0.75rem", position: "relative" }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              style={{
                width: "100%",
                background: "rgba(10,20,40,0.6)",
                border: "1px solid rgba(30,144,255,0.12)",
                borderRadius: "6px",
                padding: "0.4rem 0.6rem 0.4rem 2rem",
                color: "#C8D8EA",
                fontSize: "0.7rem",
                fontFamily: "'Sora', sans-serif",
                outline: "none",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: "0.6rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#4A6A8A",
                fontSize: "0.75rem",
              }}
            >
              🔍
            </span>
          </div>
        </div>

        {/* Conversation List */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0.5rem 0.75rem",
          }}
        >
          {filteredConversations.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "2rem 1rem",
                color: "#4A6A8A",
                fontSize: "0.7rem",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              {searchQuery ? "No conversations found" : "No conversations yet.\nClick New Chat to start!"}
            </div>
          ) : (
            Object.entries(groupedConversations).map(([group, convs]) =>
              convs.length > 0 ? (
                <div key={group} style={{ marginBottom: "1rem" }}>
                  <div
                    style={{
                      color: "#3A5A7A",
                      fontSize: "0.62rem",
                      fontFamily: "'Space Mono', monospace",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: "0.4rem",
                      padding: "0 0.25rem",
                    }}
                  >
                    {group}
                  </div>
                  {convs.map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={conv.id === activeConversationId}
                      onSelect={onSelectConversation}
                      onRename={onRenameConversation}
                      onDelete={onDeleteConversation}
                    />
                  ))}
                </div>
              ) : null
            )
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "0.75rem",
            borderTop: "1px solid rgba(30,144,255,0.08)",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              color: "#3A5A7A",
              fontSize: "0.62rem",
              fontFamily: "'Space Mono', monospace",
              textAlign: "center",
              lineHeight: 1.4,
            }}
          >
            {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0.8; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}
