import { useState, useRef, useEffect } from "react";
import "./AIChat.css";

const MODELS = [
  { value: "deepseek-ai/deepseek-v3.1", label: "DeepSeek V3.1", badge: "Smart", color: "sonnet" },
  { value: "meta/llama-3.1-70b-instruct", label: "Llama 3.1 70B", badge: "Fast", color: "haiku" },
];

const SYSTEM_PROMPT = `You are CampusKart AI — a friendly, knowledgeable study assistant for Pakistani university students.
Help students with:
- Academic concepts, explanations, and exam prep
- Book and resource recommendations (mention if items might be available on CampusKart marketplace)
- Study strategies and tips
- General knowledge questions
Keep answers clear, concise, and student-friendly. Use simple English.`;

export default function AIChat() {
  const [open, setOpen]         = useState(false);
  const [model, setModel]       = useState("deepseek-ai/deepseek-v3.1");
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I'm your campus study assistant powered by DeepSeek AI. Ask me anything — concepts, exam prep, book recommendations, or how to use CampusKart." },
  ]);
  const [input, setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [hasNew, setHasNew]   = useState(true);
  const msgsEndRef = useRef(null);
  const inputRef   = useRef(null);

  const apiKey = import.meta.env.VITE_NVIDIA_API_KEY;

  useEffect(() => {
    if (open) {
      msgsEndRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [messages, open]);

  const handleOpen = () => {
    setOpen(v => !v);
    setHasNew(false);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    if (!apiKey) {
      setMessages(prev => [...prev,
        { role: "user", content: text },
        { role: "assistant", content: "AI chat is not configured yet. Please add VITE_NVIDIA_API_KEY to your environment variables." },
      ]);
      setInput("");
      return;
    }

    const userMsg     = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          top_p: 0.7,
          max_tokens: 8192,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...newMessages.map(m => ({
              role: m.role === "assistant" ? "assistant" : "user",
              content: m.content,
            })),
          ],
          extra_body: { chat_template_kwargs: { thinking: true } },
          stream: false,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `API error ${res.status}`);
      }

      const data  = await res.json();
      const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't get a response.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error("NVIDIA API error:", err);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
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

  const clearChat = () => {
    setMessages([{ role: "assistant", content: "Chat cleared! Ask me anything." }]);
  };

  const selectedModel = MODELS.find(m => m.value === model);

  return (
    <div className="aichat-root">
      {open && (
        <div className="aichat-panel">
          <div className="aichat-header">
            <div className="aichat-header-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 3L2 9l10 6 10-6-10-6z" fill="#fff" />
                <path d="M2 9v6c0 3.31 4.48 6 10 6s10-2.69 10-6V9" stroke="#fff" strokeWidth="1.5" fill="none" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div className="aichat-header-title">CampusKart AI</div>
              <div className="aichat-header-sub">Powered by DeepSeek · always here</div>
            </div>
            <button className="aichat-icon-btn" onClick={clearChat} title="Clear chat">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
              </svg>
            </button>
            <button className="aichat-icon-btn" onClick={handleOpen} title="Close">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="aichat-modelbar">
            <span className="aichat-model-label">Model:</span>
            <select
              className="aichat-model-select"
              value={model}
              onChange={e => setModel(e.target.value)}
            >
              {MODELS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <span className={`aichat-badge aichat-badge-${selectedModel?.color}`}>
              {selectedModel?.badge}
            </span>
          </div>

          <div className="aichat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`aichat-msg-wrap ${msg.role === "user" ? "user" : "ai"}`}>
                {msg.role === "assistant" && (
                  <div className="aichat-msg-name">CampusKart AI</div>
                )}
                <div className={`aichat-msg ${msg.role === "user" ? "aichat-msg-user" : "aichat-msg-ai"}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="aichat-msg-wrap ai">
                <div className="aichat-msg-name">CampusKart AI</div>
                <div className="aichat-msg aichat-msg-ai">
                  <div className="aichat-typing">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}
            <div ref={msgsEndRef} />
          </div>

          <div className="aichat-input-area">
            <textarea
              ref={inputRef}
              className="aichat-input"
              placeholder="Ask anything..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              disabled={loading}
            />
            <button
              className="aichat-send-btn"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="#fff" strokeWidth="2" />
                <path d="M22 2L15 22l-4-9-9-4 20-7z" stroke="#fff" strokeWidth="2" fill="none" />
              </svg>
            </button>
          </div>
          <div className="aichat-powered">Powered by NVIDIA DeepSeek AI</div>
        </div>
      )}

      <button className="aichat-bubble" onClick={handleOpen}>
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" fill="#fff" />
          </svg>
        )}
        {hasNew && !open && <span className="aichat-notif">1</span>}
      </button>
    </div>
  );
}