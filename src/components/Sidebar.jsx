import React, { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';

export default function Sidebar({ documents, selectedDoc, onSelect, onUploadSuccess }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setUploadStatus('Parsing PDF...');
    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const parseRes = await fetch('/api/upload-parse', { method: 'POST', body: formData });
      if (!parseRes.ok) throw new Error('Failed to parse PDF');
      const { filename, originalName, chunks } = await parseRes.json();

      setUploadProgress(40);
      setUploadStatus('Generating embeddings...');
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
      if (!apiKey) throw new Error('Gemini API Key is missing.');
      const ai = new GoogleGenAI({ apiKey });

      const chunkData = [];
      for (let i = 0; i < chunks.length; i += 10) {
        const batch = chunks.slice(i, i + 10);
        const embeddingsResult = await ai.models.embedContent({
          model: 'gemini-embedding-2-preview',
          contents: batch,
        });
        batch.forEach((chunk, index) => {
          chunkData.push({ text: chunk, embedding: embeddingsResult.embeddings[index].values });
        });
        setUploadProgress(40 + Math.round((i / chunks.length) * 40));
      }

      setUploadProgress(85);
      setUploadStatus('Saving to database...');
      const saveRes = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, originalName, chunks: chunkData }),
      });
      if (!saveRes.ok) throw new Error('Failed to save document');

      setUploadProgress(100);
      setUploadStatus('Done!');
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStatus('');
      }, 800);

      onUploadSuccess();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload and process PDF');
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatus('');
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <rect x="2" y="1" width="14" height="18" rx="2" fill="var(--accent-soft)" />
            <rect x="4" y="7" width="8" height="1.5" rx="0.75" fill="var(--accent)" />
            <rect x="4" y="10" width="10" height="1.5" rx="0.75" fill="var(--accent)" />
            <rect x="4" y="13" width="6" height="1.5" rx="0.75" fill="var(--accent)" />
            <circle cx="17" cy="17" r="5" fill="var(--accent)" />
            <path d="M15 17h4M17 15v4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <span className="brand-name">OpusMind</span>
      </div>

      <div className="upload-area">
        <button
          className={`upload-btn ${isUploading ? 'uploading' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <span className="upload-spinner" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v8M5 5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
          {isUploading ? uploadStatus : 'Upload PDF'}
        </button>

        {isUploading && (
          <div className="progress-bar-wrap">
            <div className="progress-bar" style={{ width: `${uploadProgress}%` }} />
          </div>
        )}

        <input type="file" ref={fileInputRef} onChange={handleUpload} accept="application/pdf" style={{ display: 'none' }} />
      </div>

      <div className="doc-list-section">
        <p className="doc-list-label">Documents</p>
        {documents.length === 0 ? (
          <div className="doc-empty">
            <p>No documents yet</p>
          </div>
        ) : (
          <ul className="doc-list">
            {documents.map((doc) => (
              <li key={doc._id}>
                <button
                  className={`doc-item ${selectedDoc?._id === doc._id ? 'active' : ''}`}
                  onClick={() => onSelect(doc)}
                  title={doc.originalName}
                >
                  <span className="doc-item-icon">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="1" y="1" width="9" height="12" rx="1.5" fill="currentColor" opacity="0.15" />
                      <rect x="1" y="1" width="9" height="12" rx="1.5" stroke="currentColor" strokeWidth="1" />
                      <path d="M3 5h5M3 7.5h5M3 10h3" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span className="doc-item-name">{doc.originalName}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
