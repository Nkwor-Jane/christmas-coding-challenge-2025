import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, MessageSquare, Trash2 } from 'lucide-react';


const ChatInterface = () =>{
    const [isLoading, setIsLoading] = useState(false)

    return (
    <div className="bg-white rounded-lg shadow-lg flex flex-col h-[600px]">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6" />
          <div>
           <h3 className="font-semibold">AI Assistant</h3>
            <p className="text-xs text-blue-100">Ask questions about .... </p>
          </div>
        </div>

        <button
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="Clear chat"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <Bot className="w-16 h-16 text-blue-600 mx-auto mb-2" />
              <h4 className="text-lg font-semibold text-gray-800 mb-2">
                Start a Conversation
              </h4>
              <p className="text-gray-600 mb-4">
                Ask me anything about the PDF content. I can help you understand, summarize, or find specific information.
              </p>
              {/* <div className="space-y-2 text-sm text-left bg-white p-4 rounded-lg shadow-sm">
                <p className="font-medium text-gray-700">Try asking:</p>
                <ul className="space-y-1 text-gray-600">
                  <li>• "What is this document about?"</li>
                  <li>• "Summarize the main points"</li>
                  <li>• "Find information about [topic]"</li>
                  <li>• "Explain [specific section]"</li>
                </ul>
              </div> */}
            </div>
          </div>

          {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200 rounded-b-lg">
        <div className="flex gap-2">
            <textarea
                placeholder="Ask a question about the PDF..."
                className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={1}
                disabled={isLoading}
                style={{
                minHeight: '44px',
                maxHeight: '120px'
                }}
            />
            <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
                {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                <Send className="w-5 h-5" />
                )}
            </button>
        </div>
            <p className="text-xs text-gray-500 mt-2">
            Press Enter to send, Shift+Enter for new line
            </p>
    </div>
    </div>
    </div>
    ); 
}


export default ChatInterface;