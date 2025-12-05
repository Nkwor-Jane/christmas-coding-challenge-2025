import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import PDFUploader from './components/PDFUploader';
import PDFViewer from './components/PDFViewer';

interface PDFData {
  name: string;
  size: number;
  url: string;
  file: File;
}

function App() {
  const [pdfData, setPdfData] = useState<PDFData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePDFUpload = (data: PDFData): void => {
    setPdfData(data);
    setError(null);
    console.log('PDF uploaded:', data.name, data.size);
  };

  const handleError = (errorMessage: string): void => {
    setError(errorMessage);
    setTimeout(() => setError(null), 5000);
  };

  const handleClose = (): void => {
    setPdfData(null);
    // setExtractedText('');
  };

  const handleTextExtracted = (text: string): void => {
    // setExtractedText(text);
    console.log('Extracted text ready for TTS and AI:', text);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🎧 AI-Powered PDF Reader
          </h1>
          <p className="text-gray-600">
            Upload a PDF to listen and ask questions
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Main Content */}
        {!pdfData ? (
          <div className="max-w-2xl mx-auto">
            <PDFUploader 
              onPDFUpload={handlePDFUpload}
       
              onError={handleError}
            />
            
            {/* Features Info */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                <div className="text-3xl mb-2">🔊</div>
                <h3 className="font-semibold text-gray-800 mb-1">Listen</h3>
                <p className="text-sm text-gray-600">Text-to-speech narration</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                <div className="text-3xl mb-2">💬</div>
                <h3 className="font-semibold text-gray-800 mb-1">Ask</h3>
                <p className="text-sm text-gray-600">AI-powered Q&A</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                <div className="text-3xl mb-2">📖</div>
                <h3 className="font-semibold text-gray-800 mb-1">Learn</h3>
                <p className="text-sm text-gray-600">Interactive reading</p>
              </div>
            </div>
          </div>
        ) : (
          <PDFViewer 
            pdfData={pdfData}
            onClose={handleClose}
            onTextExtracted={handleTextExtracted}
          />
        )}
      </div>
    </div>
  );
}

export default App;