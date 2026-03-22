import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import "./CampusAI.css";

const MODELS = [
  { value: "nvidia/nemotron-3-super-120b-a12b", label: "Nemotron 3 Super 120B", badge: "Smart", color: "sonnet" },
  { value: "deepseek-ai/deepseek-v3.1", label: "DeepSeek V3.1", badge: "Fast", color: "haiku" },
  { value: "meta/llama-3.1-70b-instruct", label: "Llama 3.1 70B", badge: "Fast", color: "haiku" },
];

const SYSTEM_PROMPT = `You are CampusKart AI — a friendly, knowledgeable study assistant for Pakistani university students.
Help students with:
- Academic concepts, explanations, and exam prep
- Book and resource recommendations (mention if items might be available on CampusKart marketplace)
- Study strategies and tips
- General knowledge questions
Keep answers clear, concise, and student-friendly. Use simple English.`;

export default function CampusAI() {
  const [model, setModel] = useState("nvidia/nemotron-3-super-120b-a12b");
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I'm your campus study assistant powered by NVIDIA Nemotron AI. Ask me anything — concepts, exam prep, book recommendations, or how to use CampusKart." },
  ]);
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

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...newMessages.map(m => ({
              role: m.role === "assistant" ? "assistant" : "user",
              content: m.content,
            })),
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

  const clearChat = () => {
    setMessages([{ role: "assistant", content: "Chat cleared! Ask me anything." }]);
  };

  const selectedModel = MODELS.find(m => m.value === model);

  return (
    <div className="campus-ai-page">
      <div className="campus-ai-header">
        <Link to="/map" className="campus-ai-back">← Back to Map</Link>
        <div className="campus-ai-title">
          <span className="campus-ai-icon">🤖</span>
          <div>
            <h1>CampusKart AI</h1>
            <p>Powered by NVIDIA Nemotron</p>
          </div>
        </div>
        <button className="campus-ai-clear" onClick={clearChat} title="Clear chat">
          🗑️ Clear
        </button>
      </div>

      <div className="campus-ai-modelbar">
        <span className="campus-ai-model-label">Model:</span>
        <select
          className="campus-ai-model-select"
          value={model}
          onChange={e => setModel(e.target.value)}
        >
          {MODELS.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <span className={`campus-ai-badge campus-ai-badge-${selectedModel?.color}`}>
          {selectedModel?.badge}
        </span>
      </div>

      <div className="campus-ai-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`campus-ai-msg-wrap ${msg.role === "user" ? "user" : "ai"}`}>
            {msg.role === "assistant" && (
              <div className="campus-ai-msg-avatar">🤖</div>
            )}
            <div className={`campus-ai-msg ${msg.role === "user" ? "campus-ai-msg-user" : "campus-ai-msg-ai"}`}>
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div className="campus-ai-msg-avatar user">👤</div>
            )}
          </div>
        ))}
        {loading && (
          <div className="campus-ai-msg-wrap ai">
            <div className="campus-ai-msg-avatar">🤖</div>
            <div className="campus-ai-msg campus-ai-msg-ai">
              <div className="campus-ai-typing">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}
        <div ref={msgsEndRef} />
      </div>

      <div className="campus-ai-input-area">
        <textarea
          ref={inputRef}
          className="campus-ai-input"
          placeholder="Ask anything about studies, exams, or campus life..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          disabled={loading}
        />
        <button
          className="campus-ai-send-btn"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
        >
          Send ➤
        </button>
      </div>
    </div>
  );
}
