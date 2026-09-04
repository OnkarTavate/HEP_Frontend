"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_API || "http://localhost:5001/api";

const STARTER_QUESTIONS = [
  "How do I register my company?",
  "What documents are required for a vehicle pass?",
  "How do I apply for a vendor pass?",
  "What is the auction vendor pass fee?",
  "How do I top up my wallet?",
  "What happens if my registration is reverted?",
  "What if my vehicle insurance expires during an active pass?",
  "How do I cancel an active pass?",
];

const BotIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

const UserIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" stroke="#fff" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

const ChatIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    stroke="#fff"
    fill="none"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" stroke="#fff" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [sessionId, setSessionId] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("apacs_chatbot_session_id") || null;
    }
    return null;
  });
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hello! I'm the support assistant for Chennai Port Authority.\n\nWhat would you like help with?",
      chips: STARTER_QUESTIONS,
    },
  ]);
  const [loading, setLoading] = useState(false);

  const msgsRef = useRef(null);
  const lastMsgRef = useRef(null);
  const dotsRef = useRef(null);
  const textareaRef = useRef(null);

  const updateSessionId = (newId) => {
    setSessionId(newId);
    if (typeof window !== "undefined") {
      if (newId) {
        sessionStorage.setItem("apacs_chatbot_session_id", newId);
      } else {
        sessionStorage.removeItem("apacs_chatbot_session_id");
      }
    }
  };

  const canSend = useMemo(
    () => question.trim().length > 0 && !loading,
    [question, loading]
    );
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        lastMsgRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [messages]);

  useEffect(() => {
    if (loading) {
      requestAnimationFrame(() => {
        dotsRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      });
    }
  }, [loading]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 110) + "px";
  };

  const sendText = async (rawText) => {
    const text = rawText.trim();
    if (!text || loading) return;

    setQuestion("");
    requestAnimationFrame(autoResize);
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", text }]);

    const msgId = "asst_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

    setMessages((prev) => [
      ...prev,
      {
        id: msgId,
        role: "assistant",
        text: "",
        sources: [],
        chips: [],
        isStreaming: true,
      },
    ]);

    try {
      const response = await fetch(`${AGENT_API}/chatbot/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          session_id: sessionId || undefined,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      let fullText = "";
      let sources = [];
      let followUps = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            try {
              const event = JSON.parse(trimmed.slice(6));
              if (event.session_id) {
                updateSessionId(event.session_id);
              }

              if (event.type === "start") {
                sources = event.sources || [];
                followUps = Array.isArray(event.follow_up_questions)
                  ? event.follow_up_questions.filter((q) => typeof q === "string" && q.trim())
                  : [];
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === msgId ? { ...m, sources } : m
                  )
                );
              } else if (event.type === "token") {
                fullText += event.content || "";
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === msgId ? { ...m, text: fullText } : m
                  )
                );
              } else if (event.type === "replace") {
                fullText = event.content || "";
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === msgId ? { ...m, text: fullText } : m
                  )
                );
              } else if (event.type === "done") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === msgId ? { ...m, isStreaming: false, chips: followUps } : m
                  )
                );
              }
            } catch (e) {
              console.warn("SSE parse error", e);
            }
          }
        }
      }
    } catch (error) {
      console.warn("Stream error, falling back to standard POST", error);
      try {
        const res = await axios.post(`${AGENT_API}/chatbot/chat`, {
          question: text,
          session_id: sessionId || undefined,
        });
        const d = res?.data || {};

        if (d.session_id) {
          updateSessionId(d.session_id);
        }

        const botReply = {
          id: msgId,
          role: "assistant",
          text: d.answer || "I could not find a response right now.",
          sources: d.sources || [],
          chips: Array.isArray(d.follow_up_questions)
            ? d.follow_up_questions.filter((q) => typeof q === "string" && q.trim())
            : [],
        };

        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? botReply : m))
        );
      } catch (fallbackErr) {
        const message = fallbackErr?.response?.data?.error || fallbackErr?.response?.data?.message || "Could not reach the server. Please try again.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { id: msgId, role: "assistant", text: message }
              : m
          )
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = () => sendText(question);
  const sendQuickQuestion = (text) => sendText(text);

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 50, fontFamily: "var(--font)" }}>
      <style jsx>{`
        .apacs-root {
          --orange: #e8500a;
          --orange-d: #c43f06;
          --orange-light: #fdf0ea;
          --orange-mid: #f9d4c0;
          --navy: #0d1b2e;
          --bg: #ffffff;
          --bg2: #f8f8f7;
          --bg3: #f1f1ef;
          --text: #0d1b2e;
          --text2: #4a5568;
          --text3: #9aa3ae;
          --border: rgba(13, 27, 46, 0.1);
          --border2: rgba(13, 27, 46, 0.18);
          --red-bg: #fceaeb;
          --red-t: #a32d2d;
          --amber-bg: #fef3da;
          --amber-t: #7a4100;
          --r: 12px;
          --rs: 7px;
          --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        }
        .shell {
          width: 380px;
          max-width: calc(100vw - 32px);
          height: 560px;
          max-height: calc(100vh - 100px);
          display: flex;
          flex-direction: column;
          background: var(--bg);
          border-radius: var(--r);
          overflow: hidden;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.35);
          border: 1px solid var(--border);
        }
        .hdr {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--navy);
          padding: 13px 14px;
          flex-shrink: 0;
        }
        .hav {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--orange);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .htxt {
          flex: 1;
          min-width: 0;
        }
        .ht {
          font-size: 13.5px;
          font-weight: 600;
          color: #fff;
        }
        .hs {
          font-size: 10.5px;
          color: rgba(255, 255, 255, 0.55);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .spill {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 3px 9px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.08);
          border: 0.5px solid rgba(255, 255, 255, 0.15);
          font-size: 10.5px;
          color: rgba(255, 255, 255, 0.6);
          white-space: nowrap;
          flex-shrink: 0;
        }
        .sdot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #888;
          flex-shrink: 0;
        }
        .sdot.ok {
          background: #3dd68c;
        }
        .sdot.err {
          background: #f47171;
        }
        .closebtn {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          font-size: 12px;
          padding: 4px 6px;
          flex-shrink: 0;
        }
        .closebtn:hover {
          color: #fff;
        }
        .alertbar {
          padding: 8px 14px;
          font-size: 11.5px;
          border-bottom: 0.5px solid var(--border);
        }
        .alertbar.warn {
          background: var(--amber-bg);
          color: var(--amber-t);
        }
        .alertbar.err {
          background: var(--red-bg);
          color: var(--red-t);
        }
        .msgs {
          flex: 1;
          overflow-y: auto;
          padding: 16px 14px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          background: var(--bg);
        }
        .row {
          display: flex;
          gap: 8px;
          align-items: flex-start;
        }
        .row.user {
          flex-direction: row-reverse;
        }
        .av {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .av.bot {
          background: var(--orange-light);
          border: 1px solid var(--orange-mid);
          color: var(--orange);
        }
        .av.usr {
          background: var(--orange);
        }
        .bub p {
          margin: 0 0 8px;
          font-size: 1rem;
          line-height: 1.6;
        }
        .bub p:last-child {
          margin-bottom: 0;
        }
        .bub :global(ol) {
          list-style: decimal;
          padding-left: 1.4rem;
          margin: 0 0 8px;
          font-size: 1rem;
          line-height: 1.6;
        }
        .bub :global(ul) {
          list-style: disc;
          padding-left: 1.4rem;
          margin: 0 0 8px;
          font-size: 1rem;
          line-height: 1.6;
        }
        .bub :global(ol:last-child),
        .bub :global(ul:last-child) {
          margin-bottom: 0;
        }
        .bub :global(li) {
          display: list-item;
          font-size: 1rem;
          line-height: 1.6;
          margin-bottom: 4px;
        }
        .bub :global(li:last-child) {
          margin-bottom: 0;
        }
        .bub :global(li p) {
          margin: 0;
          font-size: 1rem;
          line-height: 1.6;
        }
        .bub :global(strong),
        .bub strong {
          font-weight: 600;
        }
        .bub :global(h1) {
          font-size: 1.25rem;
          margin: 0 0 8px;
          font-weight: 600;
        }
        .bub :global(h2) {
          font-size: 1.15rem;
          margin: 0 0 8px;
          font-weight: 600;
        }
        .bub :global(h3) {
          font-size: 1.05rem;
          margin: 0 0 6px;
          font-weight: 600;
        }
        .bub :global(h4) {
          font-size: 1rem;
          font-weight: 600;
          margin: 0 0 4px;
        }
        .bub {
          max-width: 82%;
          padding: 10px 14px;
          font-size: 1rem;
          line-height: 1.6;
          border-radius: var(--r);
        }
        .row.bot .bub {
          background: var(--bg2);
          color: var(--text);
          border: 0.5px solid var(--border);
          border-radius: 3px var(--r) var(--r) var(--r);
        }
        .row.user .bub {
          background: var(--orange);
          color: #fff;
          border-radius: var(--r) var(--r) 3px var(--r);
        }
        .srcs {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 8px;
          padding-top: 7px;
          border-top: 0.5px solid var(--border);
        }
        .src {
          font-size: 10.5px;
          padding: 2px 8px;
          border-radius: 20px;
          background: var(--orange-light);
          color: var(--orange-d);
          font-weight: 500;
        }
        .lat {
          font-size: 10.5px;
          color: var(--text3);
          margin-top: 5px;
        }
        .dbg {
          margin-top: 7px;
          padding: 7px 10px;
          background: var(--bg3);
          border-radius: var(--rs);
          font-size: 11px;
          color: var(--text2);
        }
        .dbg summary {
          cursor: pointer;
          user-select: none;
          color: var(--text3);
        }
        .dbg table {
          border-collapse: collapse;
          width: 100%;
          margin-top: 5px;
        }
        .dbg td {
          padding: 2px 6px;
          border-bottom: 0.5px solid var(--border);
          vertical-align: top;
        }
        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 10px;
        }
        .chip {
          padding: 5px 11px;
          border: 1px solid var(--orange-mid);
          border-radius: 20px;
          font-size: 11.5px;
          color: var(--orange-d);
          cursor: pointer;
          background: var(--orange-light);
          font-family: var(--font);
          font-weight: 500;
        }
        .chip:hover {
          background: var(--orange-mid);
          border-color: var(--orange);
        }
        .dots {
          display: flex;
          gap: 4px;
          padding: 3px 0;
        }
        .dots span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--orange);
          opacity: 0.4;
          animation: blink 1.2s infinite;
        }
        .dots span:nth-child(2) {
          animation-delay: 0.2s;
        }
        .dots span:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes blink {
          0%,
          80%,
          100% {
            opacity: 0.2;
          }
          40% {
            opacity: 1;
          }
        }
        .inp {
          padding: 11px 12px;
          border-top: 1px solid var(--border);
          display: flex;
          gap: 8px;
          align-items: flex-end;
          background: var(--bg);
          flex-shrink: 0;
        }
        .txt {
          flex: 1;
          padding: 8px 13px;
          border: 1px solid var(--border2);
          border-radius: 22px;
          font-size: 13px;
          font-family: var(--font);
          outline: none;
          background: var(--bg2);
          color: var(--text);
          resize: none;
          max-height: 110px;
          line-height: 1.5;
        }
        .txt:focus {
          border-color: var(--orange);
          background: var(--bg);
          box-shadow: 0 0 0 3px rgba(232, 80, 10, 0.1);
        }
        .sendbtn {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--orange);
          border: none;
          cursor: pointer;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sendbtn:hover {
          background: var(--orange-d);
        }
        .sendbtn:disabled {
          opacity: 0.35;
          cursor: default;
        }
        .foot {
          text-align: center;
          font-size: 10.5px;
          color: var(--text3);
          padding: 5px 0 8px;
          flex-shrink: 0;
          background: var(--bg);
        }
        .launcher {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--orange);
          border: none;
          cursor: pointer;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .launcher:hover {
          background: var(--orange-d);
        }
      `}</style>

      <div className="apacs-root">
        {open ? (
          <div className="shell">
            <div className="hdr">
              <div className="hav">
                <ChatIcon />
              </div>
              <div className="htxt">
                <div className="ht">Support Assistant</div>
                <div className="hs">Chennai Port Authority · Automated Port Access &amp; Control System</div>
              </div>
              <button
                className="closebtn"
                style={{ fontSize: "11px", padding: "2px 8px", marginRight: "4px", width: "auto" }}
                onClick={() => {
                  updateSessionId(null);
                  setMessages([
                    {
                      role: "assistant",
                      text: "Hello! I'm the support assistant for Chennai Port Authority.\n\nWhat would you like help with?",
                      chips: STARTER_QUESTIONS,
                    },
                  ]);
                }}
                title="Start New Conversation"
              >
                New Chat
              </button>
              <button className="closebtn" onClick={() => setOpen(false)} aria-label="Close chat">
                ✕
              </button>
            </div>

            <div className="msgs" ref={msgsRef} role="log" aria-live="polite">
              {messages.map((msg, idx) => {
                  const isLast = idx === messages.length - 1;
                  return (
                    <div
                      key={idx}
                      ref={isLast ? lastMsgRef : null}
                      className={`row ${msg.role === "user" ? "user" : "bot"}`}
                    >
                  <div className={`av ${msg.role === "user" ? "usr" : "bot"}`}>{msg.role === "user" ? <UserIcon /> : <BotIcon />}</div>
                  <div className="bub">
                    {msg.role === "user" ? (
                      <p>{msg.text}</p>
                    ) : (
                      <>
                        {msg.text ? (
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        ) : (
                          <div className="dots">
                            <span />
                            <span />
                            <span />
                          </div>
                        )}

                        {!msg.isStreaming && msg.chips && msg.chips.length ? (
                          <div className="chips">
                            {msg.chips.map((c, i) => (
                              <button className="chip" key={i} onClick={() => sendQuickQuestion(c)}>
                                {c}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              );
              })}

              {loading && (!messages.length || messages[messages.length - 1]?.role !== "assistant") ? (
                <div className="row bot" ref={dotsRef}>
                  <div className="av bot">
                    <BotIcon />
                  </div>
                  <div className="bub">
                    <div className="dots">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="inp">
              <textarea
                ref={textareaRef}
                className="txt"
                rows={1}
                placeholder="Ask about registration, passes, documents, fees…"
                aria-label="Your question"
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value);
                  autoResize();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <button className="sendbtn" onClick={sendMessage} disabled={!canSend} aria-label="Send">
                <SendIcon />
              </button>
            </div>
            <div className="foot">Chatbot V1</div>
          </div>
        ) : (
          <button className="launcher" onClick={() => setOpen(true)} aria-label="Open chat">
            <ChatIcon />
          </button>
        )}
      </div>
    </div>
  );
}