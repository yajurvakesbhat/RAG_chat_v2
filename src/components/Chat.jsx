import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';

export default function Chat({ documentId, documentName }) {
  const [messages, setMessages] = useState([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm ready to answer questions about **"${documentName}"**. What would you like to know?`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setMessages([{
      id: Date.now().toString(),
      role: 'assistant',
      content: `Hello! I'm ready to answer questions about **"${documentName}"**. What would you like to know?`
    }]);
  }, [documentId, documentName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = { id: Date.now().toString(), role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY });

      const queryEmbeddingResult = await ai.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: userMsg.content,
      });
      const queryEmbedding = queryEmbeddingResult.embeddings[0].values;

      const searchRes = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryEmbedding, documentId })
      });
      if (!searchRes.ok) throw new Error('Failed to search document');
      const { topChunks } = await searchRes.json();

      const context = topChunks.join('\n\n---\n\n');
      const prompt = `You are a helpful assistant answering questions based on the provided document context.

Context:
${context}

Question:
${userMsg.content}

Answer based ONLY on the context above. If the answer is not in the context, say "I cannot answer this based on the provided document."`;

      const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text || 'Sorry, I could not generate a response.'
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error while trying to answer your question.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-wrap">
      <div className="chat-header">
        <div className="chat-header-icon">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="8" fill="var(--accent-soft)" />
            <path d="M6 7h6M6 10h4" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <p className="chat-header-title">Document Assistant</p>
          <p className="chat-header-sub">{documentName}</p>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`msg-row ${msg.role}`}>
            {msg.role === 'assistant' && (
              <div className="msg-avatar assistant-avatar">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" fill="var(--accent)" />
                  <path d="M4.5 6h5M4.5 8.5h3.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </div>
            )}
            <div className={`msg-bubble ${msg.role}`}>
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="msg-avatar user-avatar">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="5" r="2.5" fill="currentColor" />
                  <path d="M2 12c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="msg-row assistant">
            <div className="msg-avatar assistant-avatar">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" fill="var(--accent)" />
                <path d="M4.5 6h5M4.5 8.5h3.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="msg-bubble assistant typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <form className="chat-form" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about the document..."
            className="chat-input"
            disabled={isLoading}
          />
          <button type="submit" disabled={!input.trim() || isLoading} className="send-btn">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M15 9L3 3l3 6-3 6 12-6z" fill="currentColor" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
