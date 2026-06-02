"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const [topic, setTopic] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const examples = [
    "efectividad de intervenciones de mindfulness en el rendimiento académico de estudiantes universitarios",
    "impacto del teletrabajo en la productividad de los empleados",
    "sistemas de tutoría con IA y resultados de aprendizaje en educación STEM",
  ];

  async function runReview(userTopic: string, history: Message[] = []) {
    setLoading(true);

    const userMessage: Message = {
      role: "user",
      content:
        history.length === 0
          ? `Realiza una revisión sistemática PRISMA 2020 completa sobre: ${userTopic}`
          : userTopic,
    };

    const newMessages = [...history, userMessage];
    setMessages(newMessages);

    const assistantMessage: Message = { role: "assistant", content: "" };
    setMessages([...newMessages, assistantMessage]);

    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: userTopic,
          messages: newMessages,
        }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setMessages([
          ...newMessages,
          { role: "assistant", content: full },
        ]);
      }
    } catch (e) {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Error al conectar con el servidor. Verifica tu API key.",
        },
      ]);
    }

    setLoading(false);
  }

  function handleStart() {
    if (!topic.trim()) return;
    setStarted(true);
    runReview(topic.trim(), []);
  }

  function handleFollowUp(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim() || loading) return;
    const current = topic.trim();
    setTopic("");
    runReview(current, messages);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!started) handleStart();
      else handleFollowUp(e as any);
    }
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          <div className="mb-2 text-sm text-gray-400 font-mono">/mi-review</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">MI-REVIEW</h1>
          <p className="text-xl font-semibold text-gray-800 mb-2">
            Revisión Sistemática PRISMA — Pipeline Automatizado en Un Solo Comando
          </p>
          <p className="text-gray-600 mb-1">
            Eres un metodólogo experto en revisiones sistemáticas. Cuando proporcionas una pregunta o
            tema de investigación, se ejecuta una revisión sistemática completa conforme a PRISMA 2020
            en 2 fases.
          </p>
          <p className="text-gray-600 mb-8">
            <strong>Importante:</strong> Esta es una herramienta de investigación REAL, no un juguete.
            Cada afirmación debe tener una cita. Cada fuente debe ser verificada. Sé honesto sobre las
            limitaciones. Si no encuentras suficiente evidencia, dilo.
          </p>

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">ENTRADA</h2>
            <p className="text-gray-600 mb-3">
              Escribe el tema o pregunta de investigación. Ejemplos:
            </p>
            <ul className="space-y-2 mb-6">
              {examples.map((ex) => (
                <li key={ex}>
                  <button
                    onClick={() => setTopic(ex)}
                    className="text-left text-sm font-mono bg-red-50 text-red-700 px-3 py-1.5 rounded hover:bg-red-100 transition-colors w-full"
                  >
                    /mi-review {ex}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder="Escribe tu tema de investigación..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-gray-800"
            />
            <button
              onClick={handleStart}
              disabled={!topic.trim()}
              className="bg-gray-900 text-white px-6 rounded-lg font-medium hover:bg-gray-700 disabled:opacity-40 transition-colors"
            >
              Iniciar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 px-6 py-4 flex items-center gap-4 sticky top-0 bg-white z-10">
        <button
          onClick={() => { setStarted(false); setMessages([]); setTopic(""); }}
          className="text-gray-400 hover:text-gray-700 text-sm"
        >
          ← Nueva revisión
        </button>
        <span className="text-gray-300">|</span>
        <span className="text-sm font-mono text-gray-500">MI-REVIEW · PRISMA 2020</span>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-8">
          {messages.map((msg, i) => (
            <div key={i}>
              {msg.role === "user" ? (
                <div className="flex justify-end">
                  <div className="bg-gray-100 rounded-2xl px-4 py-3 max-w-xl text-gray-800 text-sm">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none text-gray-800">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                  {loading && i === messages.length - 1 && (
                    <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1" />
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Follow-up input */}
      <div className="border-t border-gray-200 px-4 py-4 bg-white">
        <form onSubmit={handleFollowUp} className="max-w-3xl mx-auto flex gap-2">
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Profundiza en un estudio, outcome o sección específica..."
            disabled={loading}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-gray-800 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !topic.trim()}
            className="bg-gray-900 text-white px-5 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {loading ? "..." : "Enviar"}
          </button>
        </form>
      </div>
    </div>
  );
}
