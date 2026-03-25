import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import dotenv from 'dotenv';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/uploads', (req, res, next) => {
  express.static(uploadsDir, { fallthrough: false })(req, res, (err) => {
    if (err) {
      if (err.status === 404) {
        res.status(404).send('PDF file not found on server.');
      } else {
        next(err);
      }
    } else {
      next();
    }
  });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rag-chatbot';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const ChunkSchema = new mongoose.Schema({
  text: String,
  embedding: [Number],
});

const DocumentSchema = new mongoose.Schema({
  filename: String,
  originalName: String,
  uploadDate: { type: Date, default: Date.now },
  chunks: [ChunkSchema],
});

const Document = mongoose.model('Document', DocumentSchema);

async function extractTextFromPDF(dataBuffer) {
  const uint8Array = new Uint8Array(dataBuffer);
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true });
  const pdfDocument = await loadingTask.promise;
  let fullText = '';
  for (let i = 1; i <= pdfDocument.numPages; i++) {
    const page = await pdfDocument.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
}

function chunkText(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize - overlap;
  }
  return chunks;
}

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

app.post('/api/upload-parse', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const filePath = req.file.path;
    const dataBuffer = fs.readFileSync(filePath);
    const text = await extractTextFromPDF(dataBuffer);
    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'Could not extract text from PDF' });
    }
    const chunks = chunkText(text);
    res.json({
      message: 'Parse successful',
      filename: req.file.filename,
      originalName: req.file.originalname,
      chunks
    });
  } catch (error) {
    console.error('Parse error:', error);
    res.status(500).json({ error: 'Failed to process PDF' });
  }
});

app.post('/api/documents', async (req, res) => {
  try {
    const { filename, originalName, chunks } = req.body;
    if (!filename || !originalName || !chunks) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const doc = new Document({ filename, originalName, chunks });
    await doc.save();
    res.json({ message: 'Document saved', documentId: doc._id });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: 'Failed to save document' });
  }
});

app.get('/api/documents', async (req, res) => {
  try {
    const docs = await Document.find({}, 'filename originalName uploadDate').sort({ uploadDate: -1 });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

app.post('/api/search', async (req, res) => {
  try {
    const { queryEmbedding, documentId } = req.body;
    if (!queryEmbedding || !documentId) {
      return res.status(400).json({ error: 'queryEmbedding and documentId are required' });
    }
    const doc = await Document.findById(documentId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    const scoredChunks = doc.chunks.map(chunk => ({
      text: chunk.text,
      score: cosineSimilarity(queryEmbedding, chunk.embedding)
    }));
    scoredChunks.sort((a, b) => b.score - a.score);
    const topChunks = scoredChunks.slice(0, 3).map(c => c.text);
    res.json({ topChunks });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search document' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();