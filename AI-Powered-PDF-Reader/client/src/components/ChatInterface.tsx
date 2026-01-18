import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, MessageSquare, Trash2 } from 'lucide-react';

interface Message {
  id:string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  pdfContext: string;
  pdfName: string;
  pdfId?: string;
  isEnabled?: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  pdfContext,
  pdfName,
  pdfId,
  isEnabled = true
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when message count changes
  useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages.length]);


  // Focus input on mount
  useEffect(() => {
    if (isEnabled) {
      inputRef.current?.focus();
    }
  }, [isEnabled]);

    const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !isEnabled) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      if (pdfId) {
        const response = await fetch('https://christmas-coding-challenge-2025.onrender.com/api/chat/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pdf_id: pdfId,
            message: userMessage.content,
            conversation_history: messages.map(msg => ({
              role: msg.role,
              content: msg.content
            }))
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || `API error: ${response.status}`);
        }

        const data = await response.json();
        
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
      } 
    } catch (err) {
      console.error('Chat error:', err);
      setError('Failed to get response. Please try again.');
      
      setMessages(prev => prev.slice(0, -1));
      setInputMessage(userMessage.content);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!isEnabled) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
        <MessageSquare className="w-12 h-12 text-gray-400 dark:text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 dark:text-gray-400">
          Upload a PDF to start asking questions
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col h-[600px]" data-pdf-context={pdfContext}>
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600  to-indigo-600 text-white dark:text-gray-300 p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6" />
          <div>
            <h3 className="font-semibold">AI Assistant</h3>
            <p className="text-xs text-blue-100 dark:text-blue-200">Ask questions about {pdfName}</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="p-2 hover:bg-white/20 dark:hover:bg-white/30 rounded-lg transition-colors"
            title="Clear chat"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-700">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <Bot className="w-16 h-16 text-violet-600 dark:text-violet-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Start a Conversation
              </h4>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Ask me anything about the PDF content. I can help you understand, summarize, or find specific information.
              </p>
              <div className="space-y-2 text-sm text-left bg-white p-4 rounded-lg shadow-sm">
                <p className="font-medium text-gray-700 dark:text-gray-300">Try asking:</p>
                <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                  <li>• "What is this document about?"</li>
                  <li>• "Summarize the main points"</li>
                  <li>• "Find information about [topic]"</li>
                  <li>• "Explain [specific section]"</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-violet-600 dark:bg-violet-400 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white dark:text-white" />
                    </div>
                  </div>
                )}

                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-violet-600  text-white shadow-md dark:bg-violet-500 dark:text-white'
                      : 'bg-white text-gray-800 shadow-sm border border-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-blue-100 dark:text-blue-200' : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </p>
                </div>

                {message.role === 'user' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gray-600 dark:bg-gray-400 flex items-center justify-center">
                      <User className="w-5 h-5 text-white dark:text-white" />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-violet-600 dark:bg-violet-400 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white dark:text-white" />
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 dark:bg-gray-600 dark:border-gray-500">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-violet-600 dark:text-violet-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-400 border-t border-red-200">
          <p className="text-sm text-red-600 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-gray-900 dark:bg-gray-800 border-t border-gray-200 rounded-b-lg">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about the PDF..."
            className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
            rows={2}
            disabled={isLoading}
            style={{
              minHeight: '44px',
              maxHeight: '120px'
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 dark:bg-violet-500 dark:hover:bg-violet-600"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 dark:text-gray-500">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};

export default ChatInterface;