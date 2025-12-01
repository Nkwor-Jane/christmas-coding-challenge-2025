# 🎧 AI-Powered PDF Reader

An intelligent PDF reader that brings your documents to life with text-to-speech narration and AI-powered Q&A capabilities. Listen to your PDFs, pause anytime, and ask questions about the content.

## ✨ Features

- **📄 PDF Upload & Preview** - Upload and view PDF documents with an intuitive interface
- **🔊 Text-to-Speech Narration** - Listen to your PDFs with natural voice synthesis
- **⏯️ Playback Controls** - Play, pause, resume, and control reading speed
- **🤖 AI Chat Assistant** - Ask questions about the PDF content and get instant answers
- **📍 Reading Progress** - Visual indicators show exactly what's being read
- **💾 Context Awareness** - AI understands the full document context for accurate responses
- **🎨 Beautiful UI** - Clean, modern interface built with Tailwind CSS
- **📱 Responsive Design** - Works seamlessly on desktop and mobile devices

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- API key from OpenAI

### Installation

```bash
# Clone the repository
git clone https://github.com/Nkwor-Jane/christmas-coding-challenge-2025

# Navigate to project directory
cd AI-Powered-PDF-Reader

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Add your API key to .env
# VITE_OPENAI_API_KEY=your_api_key_here

# Start development server
npm run dev
```

Visit `http://localhost:5173` to see the app in action.

## 🎯 How to Use

1. **Upload a PDF** - Click the upload button or drag and drop a PDF file
2. **Start Listening** - Press play to begin text-to-speech narration
3. **Control Playback** - Use controls to pause, resume, or adjust speed
4. **Ask Questions** - Pause at any time and type questions in the chat
5. **Get Answers** - The AI assistant will answer based on the PDF content

## 🛠️ Tech Stack

- **React** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling and design
- **PDF.js** - PDF parsing and text extraction
- **Web Speech API** - Text-to-speech functionality
- **Anthropic Claude API** - AI-powered question answering
- **Lucide React** - Beautiful icon library

## 📁 Project Structure

AI-Powered-PDF-Reader/
├── src/
│   ├── components/
│   │   ├── PDFUploader.jsx      # File upload component
│   │   ├── PDFViewer.jsx        # PDF display component
│   │   ├── AudioControls.jsx    # TTS playback controls
│   │   ├── ChatInterface.jsx    # AI chat UI
│   │   └── ReadingProgress.jsx  # Progress indicator
│   ├── hooks/
│   │   ├── usePDFReader.js      # PDF text extraction logic
│   │   ├── useTextToSpeech.js   # TTS functionality
│   │   └── useAIChat.js         # AI integration
│   ├── utils/
│   │   ├── pdfParser.js         # PDF parsing utilities
│   │   └── apiClient.js         # API communication
│   ├── App.jsx
│   └── main.jsx
├── public/
├── .env.example
├── package.json
└── README.md

## 🎨 Features in Detail

### Text-to-Speech

- Natural voice synthesis using Web Speech API
- Adjustable reading speed (0.5x to 2x)
- Sentence-by-sentence highlighting

### AI Chat Assistant

- Context-aware responses based on PDF content
- Conversation history maintained throughout session
- Support for follow-up questions
- Citation of relevant PDF sections

### PDF Processing

- Support for text-based PDFs
- Automatic text extraction and chunking
- Page navigation and bookmarking
- Search functionality within documents

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License

## 🙏 Acknowledgments

- PDF.js team for the excellent PDF parsing library
- Anthropic for Claude AI API
- Web Speech API contributors
- All open-source contributors

## 📧 Contact

Nkwor Jane

Project Link: [https://github.com/Nkwor-Jane/christmas-coding-challenge-2025](https://github.com/Nkwor-Jane/christmas-coding-challenge-2025)

**Built with ❤️ for the WCC Christmas Coding Challenge 2024**