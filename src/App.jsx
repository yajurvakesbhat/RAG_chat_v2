import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import PdfViewer from './components/PdfViewer';
import Chat from './components/Chat';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      setDocuments(data);
      if (data.length > 0 && !selectedDoc) {
        setSelectedDoc(data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch documents', error);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  return (
    <div className="app-shell">
      <Sidebar
        documents={documents}
        selectedDoc={selectedDoc}
        onSelect={setSelectedDoc}
        onUploadSuccess={fetchDocuments}
      />
      <main className="main-area">
        {selectedDoc ? (
          <>
            <div className="panel pdf-panel">
              <div className="panel-header">
                <span className="panel-icon">📄</span>
                <span className="panel-title">{selectedDoc.originalName}</span>
              </div>
              <PdfViewer filename={selectedDoc.filename} />
            </div>
            <div className="panel chat-panel">
              <Chat documentId={selectedDoc._id} documentName={selectedDoc.originalName} />
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect x="8" y="4" width="28" height="36" rx="4" fill="var(--accent-soft)" />
                <rect x="12" y="14" width="16" height="2" rx="1" fill="var(--accent)" />
                <rect x="12" y="20" width="20" height="2" rx="1" fill="var(--accent)" />
                <rect x="12" y="26" width="12" height="2" rx="1" fill="var(--accent)" />
                <circle cx="36" cy="36" r="10" fill="var(--accent)" />
                <path d="M32 36h8M36 32v8" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="empty-title">No document selected</h2>
            <p className="empty-sub">Upload a PDF from the sidebar to start chatting</p>
          </div>
        )}
      </main>
    </div>
  );
}
