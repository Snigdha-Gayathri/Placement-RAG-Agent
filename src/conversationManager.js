// ─── Conversation Management Utilities ──────────────────────────────────────

const STORAGE_KEY = "rag_conversations";
const ACTIVE_CONVERSATION_KEY = "rag_active_conversation";

// Generate a short title from first message
export function generateConversationTitle(firstMessage) {
  if (!firstMessage) return "New Conversation";
  const text = firstMessage.trim();
  if (text.length <= 50) return text;
  return text.substring(0, 47) + "...";
}

// Load all conversations from localStorage
export function loadConversations() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error("[ConversationManager] Failed to load conversations:", err);
    return [];
  }
}

// Save conversations to localStorage
export function saveConversations(conversations) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch (err) {
    console.error("[ConversationManager] Failed to save conversations:", err);
  }
}

// Get active conversation ID
export function getActiveConversationId() {
  return localStorage.getItem(ACTIVE_CONVERSATION_KEY);
}

// Set active conversation ID
export function setActiveConversationId(id) {
  if (id) {
    localStorage.setItem(ACTIVE_CONVERSATION_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_CONVERSATION_KEY);
  }
}

// Create a new conversation
export function createNewConversation(sessionId) {
  const conversation = {
    id: generateUUID(),
    title: "New Conversation",
    timestamp: Date.now(),
    sessionId: sessionId,
    messages: [],
    lastRequestId: null,
  };

  const conversations = loadConversations();
  conversations.unshift(conversation); // Add to beginning
  saveConversations(conversations);
  setActiveConversationId(conversation.id);

  return conversation;
}

// Update conversation (messages, title, etc.)
export function updateConversation(conversationId, updates) {
  const conversations = loadConversations();
  const index = conversations.findIndex((c) => c.id === conversationId);

  if (index !== -1) {
    conversations[index] = {
      ...conversations[index],
      ...updates,
      timestamp: Date.now(), // Update timestamp
    };
    saveConversations(conversations);
    return conversations[index];
  }

  return null;
}

// Delete conversation
export function deleteConversation(conversationId) {
  let conversations = loadConversations();
  conversations = conversations.filter((c) => c.id !== conversationId);
  saveConversations(conversations);

  // If deleted conversation was active, clear active ID
  if (getActiveConversationId() === conversationId) {
    setActiveConversationId(null);
  }
}

// Rename conversation
export function renameConversation(conversationId, newTitle) {
  return updateConversation(conversationId, { title: newTitle });
}

// Get conversation by ID
export function getConversation(conversationId) {
  const conversations = loadConversations();
  return conversations.find((c) => c.id === conversationId);
}

// Helper: Generate UUID
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
