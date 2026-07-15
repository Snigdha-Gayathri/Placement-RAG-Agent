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
        width: 36,
        height: 20,
        borderRadius: 10,
        border: "none",
        background: checked
          ? "linear-gradient(135deg, #1E90FF, #3AA8FF)"
          : "rgba(74,106,138,0.3)",
        cursor: disabled ? "not-allowed" : "pointer",
        padding: 0,
        transition: "background 0.25s ease",
        flexShrink: 0,
        boxShadow: checked ? "0 0 10px #1E90FF44" : "none",
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
          background: checked ? "#fff" : "#8AA0B8",
          transition: "left 0.2s ease, background 0.2s ease",
          boxShadow: checked ? "0 0 4px rgba(255,255,255,0.4)" : "none",
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
        const res = await fetch(`${apiBase}/api/config`);
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
          headers: { "Content-Type": "application/json" },
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
      <div style={{ padding: "1rem", color: "#4A6A8A", fontSize: "0.75rem", fontFamily: "'Space Mono', monospace" }}>
        Loading configuration...
      </div>
    );
  }

  return (
    <div style={{ padding: "0.5rem 0" }}>
      {error && (
        <div
          style={{
            background: "rgba(234,179,8,0.08)",
            border: "1px solid rgba(234,179,8,0.2)",
            borderRadius: 6,
            padding: "0.4rem 0.6rem",
            marginBottom: "0.6rem",
            color: "#EAB308",
            fontSize: "0.68rem",
            fontFamily: "'Space Mono', monospace",
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
              color: "#3A5A7A",
              fontSize: "0.6rem",
              fontFamily: "'Orbitron', 'Space Mono', monospace",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              marginBottom: "0.35rem",
              paddingBottom: "0.2rem",
              borderBottom: "1px solid rgba(30,144,255,0.06)",
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
                padding: "0.35rem 0.4rem",
                borderRadius: 4,
                background:
                  hoveredFeature === feature.key
                    ? "rgba(30,144,255,0.04)"
                    : "transparent",
                transition: "background 0.15s",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    color: toggles[feature.key] ? "#C8D8EA" : "#4A6A8A",
                    fontSize: "0.75rem",
                    fontFamily: "'Space Mono', monospace",
                    transition: "color 0.2s",
                  }}
                >
                  {feature.label}
                </span>
                {/* Show description on hover */}
                {hoveredFeature === feature.key && (
                  <div
                    style={{
                      color: "#4A6A8A",
                      fontSize: "0.62rem",
                      fontFamily: "'Space Mono', monospace",
                      marginTop: "0.1rem",
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
