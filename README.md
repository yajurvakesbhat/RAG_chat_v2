# RAG_CHAT - PDF RAG Chatbot

A full-stack Retrieval-Augmented Generation (RAG) chatbot application. This application allows users to upload PDF documents, processes them by extracting and chunking the text, stores the embeddings in MongoDB, and provides an intelligent chat interface powered by the Google Gemini API to query the document content.

## 🚀 Features

- **Document Processing**: Upload PDF files and extract text automatically.
- **Smart Chunking**: Splits extracted text into manageable chunks with overlap for better context retention.
- **Vector Search**: Computes embeddings and uses Cosine Similarity to retrieve the most relevant sections of the document based on your query.
- **AI-Powered Chat**: Integrates with Google Gemini API to generate accurate, context-aware answers using the retrieved document context.
- **Modern UI**: Clean and responsive React frontend built with Vite, Tailwind CSS.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS
- **Backend**: Node.js, Express
- **Database**: MongoDB (Mongoose)
- **AI Engine**: Google Gemini API (`@google/genai`)
- **PDF Processing**: `pdfjs-dist`, `multer`

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas)
- A Google Gemini API Key. Get it from [Google AI Studio](https://aistudio.google.com/).

## ⚙️ Environment Variables

Create a `.env` file in the root directory of the project and add the following variables:

```env
# MongoDB Connection String
MONGODB_URI=mongodb://localhost:27017/rag-chatbot

# Google Gemini API Key
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

## 🚀 Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Application**
   ```bash
   npm run dev
   ```
   *Note: This runs `Server.js` which serves both the Express API backend and Vite middleware for the frontend concurrently.*

3. **Open the App**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## 📂 Project Structure

- `Server.js`: Main entry point for the Express backend, PDF processing logic, and API routes.
- `src/`: Contains the React frontend components, styles, and assets.
- `uploads/`: Local directory where uploaded PDF documents are stored server-side.

## 📝 License

This project is open-source and available under the MIT License.
