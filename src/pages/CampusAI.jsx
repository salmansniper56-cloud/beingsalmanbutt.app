import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import "./CampusAI.css";

const MODELS = [
  { value: "nvidia/nemotron-3-super-120b-a12b", label: "Nemotron 3 Super", badge: "Smart" },
  { value: "qwen/qwen3.5-122b-a10b", label: "Qwen 3.5 122B", badge: "Thinking" },
  { value: "deepseek-ai/deepseek-v3.1", label: "DeepSeek V3.1", badge: "Fast" },
  { value: "meta/llama-3.1-70b-instruct", label: "Llama 3.1 70B", badge: "Fast" },
];

const SYSTEM_PROMPT = `You are CampusKart AI — a friendly, knowledgeable study assistant for Pakistani university students.
Help students with:
- Academic concepts, explanations, and exam prep
- Book and resource recommendations (mention if items might be available on CampusKart marketplace)
- Study strategies and tips
- General knowledge questions
Keep answers clear, concise, and student-friendly. Use simple English.`;

const SUGGESTIONS = [
  "Explain photosynthesis simply",
  "Help me prepare for CSS exams",
  "Best books for FAST entry test",
  "Tips for effective study habits",
];

export default function CampusAI() {
  const [model, setModel] = useState("nvidia/nemotron-3-super-120b-a12b");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const msgsEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async (text) => {
    const msgText = text || input.trim();
    if (!msgText || loading) return;

    const userMsg = { role: "user", content: msgText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...newMessages.map(m => ({ role: m.role, content: m.content })),
          ],
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || `API error ${res.status}`);
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't get a response.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error("AI chat error:", err);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: err.message || "Sorry, something went wrong. Please try again.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => setMessages([]);

  const selectedModel = MODELS.find(m => m.value === model);

  return (
    <div className="ai-page">
      {/* Sidebar */}
      <aside className="ai-sidebar">
        <Link to="/feed" className="ai-sidebar-back">
          ← Back to Feed
        </Link>
        
        <button className="ai-new-chat" onClick={clearChat}>
          + New chat
        </button>

        <div className="ai-sidebar-section">
          <label className="ai-sidebar-label">Model</label>
          <select
            className="ai-model-select"
            value={model}
            onChange={e => setModel(e.target.value)}
          >
            {MODELS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          {selectedModel && (
            <span className="ai-model-badge">{selectedModel.badge}</span>
          )}
        </div>

        <div className="ai-sidebar-footer">
          <div className="ai-brand">
            <span className="ai-brand-icon">🎓</span>
            <span>CampusKart AI</span>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="ai-main">
        {messages.length === 0 ? (
          <div className="ai-welcome">
            <div className="ai-welcome-icon">🤖</div>
            <h1>CampusKart AI</h1>
            <p>Your personal study assistant for Pakistani university students</p>
            
            <div className="ai-suggestions">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  className="ai-suggestion"
                  onClick={() => sendMessage(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="ai-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`ai-message ${msg.role}`}>
                <div className="ai-message-avatar">
                  {msg.role === "assistant" ? "🤖" : "👤"}
                </div>
                <div className="ai-message-content">
                  <div className="ai-message-role">
                    {msg.role === "assistant" ? "CampusKart AI" : "You"}
                  </div>
                  <div className="ai-message-text">{msg.content}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="ai-message assistant">
                <div className="ai-message-avatar">🤖</div>
                <div className="ai-message-content">
                  <div className="ai-message-role">CampusKart AI</div>
                  <div className="ai-typing">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={msgsEndRef} />
          </div>
        )}

        {/* Input Area */}
        <div className="ai-input-container">
          <div className="ai-input-wrapper">
            <textarea
              ref={inputRef}
              className="ai-input"
              placeholder="Message CampusKart AI..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              disabled={loading}
            />
            <button
              className="ai-send"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <p className="ai-disclaimer">AI can make mistakes. Verify important information.</p>
        </div>
      </main>
    </div>
  );
}
