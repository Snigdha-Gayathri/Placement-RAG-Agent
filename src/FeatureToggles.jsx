import { useState, useEffect, useCallback } from "react";

// ─── Feature Definitions ────────────────────────────────────────────────────
const FEATURE_GROUPS = [
  {
    category: "Retrieval",
    features: [
      {
        key: "dense_retrieval",
        label: "Dense Retrieval",
        description: "Vector similarity search using embeddings",
      },
      {
        key: "bm25_retrieval",
        label: "BM25 Retrieval",
        description: "Keyword-based sparse retrieval using BM25 scoring",
      },
      {
        key: "hybrid_retrieval",
        label: "Hybrid Retrieval",
        description: "Combines dense and BM25 retrieval with reciprocal rank fusion",
      },
      {
        key: "cross_encoder_reranking",
        label: "Cross-Encoder Reranking",
        description: "Reranks retrieved chunks using a cross-encoder model for precision",
      },
      {
        key: "metadata_filtering",
        label: "Metadata Filtering",
        description: "Pre-filters chunks based on extracted metadata (company, topic, etc.)",
      },
    ],
  },
  {
    category: "Enhancement",
    features: [
      {
        key: "hyde",
        label: "HyDE",
        description: "Hypothetical Document Embeddings — generates a hypothetical answer to improve retrieval",
      },
      {
        key: "chunk_enhancement",
        label: "Chunk Enhancement",
        description: "Enriches retrieved chunks with surrounding context and metadata",
      },
      {
        key: "multi_hop_retrieval",
        label: "Multi-Hop Retrieval",
        description: "Performs iterative retrieval for complex queries requiring multiple evidence pieces",
      },
    ],
  },
  {
    category: "Agent",
    features: [
      {
        key: "agent_planning",
        label: "Agent Planning Loop",
        description: "Enables the agentic reasoning loop for tool selection and multi-step planning",
      },
      {
        key: "query_rewriting",
        label: "Query Rewriting",
        description: "Rewrites user queries for better retrieval performance",
      },
    ],
  },
  {
    category: "Memory",
    features: [
      {
        key: "conversation_memory",
        label: "Conversation Memory",
        description: "Maintains conversation context across turns for follow-up queries",
      },
    ],
  },
];

// ─── Toggle Switch ──────────────────────────────────────────────────────────
function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        position: "relative",
        width: 38,
        height: 22,
        borderRadius: 11,
        border: "1px solid rgba(0, 0, 0, 0.8)",
        borderTopColor: checked ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.8)",
        background: checked
          ? "linear-gradient(135deg, rgba(30, 144, 255, 0.55), rgba(15, 106, 196, 0.45))"
          : "#010101",
        boxShadow: checked
          ? "inset 2px 2px 5px rgba(0, 0, 0, 0.85), inset -1px -1px 4px rgba(30, 144, 255, 0.35), 0 0 10px rgba(30, 144, 255, 0.35)"
          : "inset 2px 2px 5px rgba(0, 0, 0, 0.9), inset -1px -1px 3px rgba(255, 255, 255, 0.03)",
        cursor: disabled ? "not-allowed" : "pointer",
        padding: 0,
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
      }}
      aria-pressed={checked}
    >
      <div
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: checked
            ? "linear-gradient(145deg, #ffffff, #c9dff7)"
            : "linear-gradient(145deg, #2a2a2a, #141414)",
          transition: "left 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: checked
            ? "2px 2px 5px rgba(0, 0, 0, 0.6), inset 1px 1px 1px rgba(255, 255, 255, 0.9)"
            : "2px 2px 5px rgba(0, 0, 0, 0.75), inset 1px 1px 1px rgba(255, 255, 255, 0.08)",
        }}
      />
    </button>
  );
}

// ─── Feature Toggles Panel ──────────────────────────────────────────────────
export default function FeatureToggles({ apiBase }) {
  const [toggles, setToggles] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [hoveredFeature, setHoveredFeature] = useState(null);

  // Fetch current config
  useEffect(() => {
    if (apiBase == null) {
      // Initialize with all enabled as fallback
      const defaults = {};
      FEATURE_GROUPS.forEach((g) =>
        g.features.forEach((f) => {
          defaults[f.key] = true;
        })
      );
      setToggles(defaults);
      setLoading(false);
      return;
    }

    const fetchConfig = async () => {
      try {
        const apiKey = import.meta.env.VITE_API_KEY || "rag-client-key-2026";
        const res = await fetch(`${apiBase}/api/config`, {
          headers: { "X-API-Key": apiKey },
        });
        if (!res.ok) throw new Error("Failed to fetch config");
        const data = await res.json();
        setToggles(data.features || data.toggles || data);
        setError(null);
      } catch (err) {
        console.warn("[FeatureToggles] Fetch failed, using defaults:", err);
        const defaults = {};
        FEATURE_GROUPS.forEach((g) =>
          g.features.forEach((f) => {
            defaults[f.key] = true;
          })
        );
        setToggles(defaults);
        setError("Using default config — backend unavailable");
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [apiBase]);

  // Save config
  const saveConfig = useCallback(
    async (newToggles) => {
      if (apiBase == null) return;
      setSaving(true);
      try {
        await fetch(`${apiBase}/api/config`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": import.meta.env.VITE_API_KEY || "rag-client-key-2026",
          },
          body: JSON.stringify({ features: newToggles }),
        });
        setError(null);
      } catch (err) {
        console.warn("[FeatureToggles] Save failed:", err);
        setError("Failed to save — changes are local only");
      } finally {
        setSaving(false);
      }
    },
    [apiBase]
  );

  const handleToggle = (key, value) => {
    const newToggles = { ...toggles, [key]: value };
    setToggles(newToggles);
    saveConfig(newToggles);
  };

  if (loading) {
    return (
      <div style={{ padding: "1rem", color: "#8A8A8A", fontSize: "0.75rem", fontFamily: "'Space Mono', monospace" }}>
        Loading configuration...
      </div>
    );
  }

  return (
    <div style={{ padding: "0.5rem 0" }}>
      {error && (
        <div
          style={{
            background: "linear-gradient(145deg, #0d0d0d, #080808)",
            border: "1px solid rgba(255, 165, 0, 0.35)",
            borderLeft: "3px solid #FFA500",
            borderRadius: 10,
            padding: "0.45rem 0.75rem",
            marginBottom: "0.6rem",
            color: "#FFA500",
            fontSize: "0.68rem",
            fontFamily: "'Space Mono', monospace",
            boxShadow: "var(--shadow-raised)",
          }}
        >
          ⚠ {error}
        </div>
      )}

      {FEATURE_GROUPS.map((group) => (
        <div key={group.category} style={{ marginBottom: "0.75rem" }}>
          {/* Category header */}
          <div
            style={{
              color: "#8A8A8A",
              fontSize: "0.6rem",
              fontFamily: "'Orbitron', 'Space Mono', monospace",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              marginBottom: "0.35rem",
              paddingBottom: "0.2rem",
              borderBottom: "1px solid rgba(0, 0, 0, 0.5)",
            }}
          >
            {group.category}
          </div>

          {/* Feature rows */}
          {group.features.map((feature) => (
            <div
              key={feature.key}
              onMouseEnter={() => setHoveredFeature(feature.key)}
              onMouseLeave={() => setHoveredFeature(null)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.45rem 0.6rem",
                borderRadius: 10,
                background:
                  hoveredFeature === feature.key
                    ? "linear-gradient(145deg, #0e0e0e, #090909)"
                    : "transparent",
                boxShadow: hoveredFeature === feature.key
                  ? "var(--shadow-raised-sm)"
                  : "none",
                border: hoveredFeature === feature.key
                  ? "1px solid rgba(0,0,0,0.65)"
                  : "1px solid transparent",
                borderTop: hoveredFeature === feature.key
                  ? "1px solid rgba(255,255,255,0.07)"
                  : "1px solid transparent",
                borderLeft: hoveredFeature === feature.key
                  ? "1px solid rgba(255,255,255,0.07)"
                  : "1px solid transparent",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    color: toggles[feature.key] ? "#F5F5F5" : "#555555",
                    fontSize: "0.75rem",
                    fontFamily: "'Space Mono', monospace",
                    fontWeight: toggles[feature.key] ? "bold" : "normal",
                    transition: "color 0.2s",
                  }}
                >
                  {feature.label}
                </span>
                {/* Show description on hover */}
                {hoveredFeature === feature.key && (
                  <div
                    style={{
                      color: "#8A8A8A",
                      fontSize: "0.62rem",
                      fontFamily: "'Space Mono', monospace",
                      marginTop: "0.15rem",
                      lineHeight: 1.3,
                    }}
                  >
                    {feature.description}
                  </div>
                )}
              </div>
              <ToggleSwitch
                checked={!!toggles[feature.key]}
                onChange={(val) => handleToggle(feature.key, val)}
                disabled={saving}
              />
            </div>
          ))}
        </div>
      ))}

      {saving && (
        <div
          style={{
            color: "#1E90FF",
            fontSize: "0.62rem",
            fontFamily: "'Space Mono', monospace",
            textAlign: "center",
            padding: "0.3rem 0",
          }}
        >
          Saving...
        </div>
      )}
    </div>
  );
}
