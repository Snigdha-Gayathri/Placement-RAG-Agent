import React from "react";

export default function UserMessage({ content = "", timestamp = "" }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        marginBottom: "1.25rem",
        paddingLeft: "20%",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #3d5afe 0%, #304ffe 100%)",
          color: "#ffffff",
          borderRadius: "18px",
          borderTopRightRadius: "4px",
          padding: "0.85rem 1.25rem",
          fontSize: "0.92rem",
          lineHeight: 1.5,
          boxShadow: "0 4px 14px rgba(48, 79, 254, 0.25)",
          maxWidth: "100%",
          wordBreak: "break-word",
        }}
      >
        <div>{content}</div>
        {timestamp && (
          <div
            style={{
              fontSize: "0.65rem",
              color: "rgba(255, 255, 255, 0.7)",
              marginTop: "0.3rem",
              textAlign: "right",
            }}
          >
            {timestamp}
          </div>
        )}
      </div>
    </div>
  );
}
