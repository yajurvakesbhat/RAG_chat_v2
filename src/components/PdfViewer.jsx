import React from 'react';

export default function PdfViewer({ filename }) {
  const pdfUrl = `/uploads/${filename}`;
  return (
    <div className="pdf-viewer-wrap">
      <iframe
        src={`${pdfUrl}#toolbar=0`}
        className="pdf-iframe"
        title="PDF Viewer"
      />
    </div>
  );
}
