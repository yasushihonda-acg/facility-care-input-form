/**
 * チャットドロワー (Phase 45)
 * 下からスライドするAIチャットパネル
 */

import { useEffect, useRef } from 'react';
import type { RecordChatMessage } from '../../types/chat';
import { SAMPLE_QUESTIONS } from '../../types/chat';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { SampleQuestions } from './SampleQuestions';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: RecordChatMessage[];
  suggestedQuestions: string[];
  onSendMessage: (message: string) => void;
  onClearMessages: () => void;
  isLoading: boolean;
  isDemo?: boolean;
}

export function ChatDrawer({
  isOpen,
  onClose,
  messages,
  suggestedQuestions,
  onSendMessage,
  onClearMessages,
  isLoading,
  isDemo,
}: ChatDrawerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // メッセージが追加されたらスクロール
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // 背景クリックで閉じる
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const displayQuestions =
    messages.length === 0
      ? SAMPLE_QUESTIONS.map((q) => q.text)
      : suggestedQuestions;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50"
      onClick={handleBackdropClick}
    >
      <div
        data-testid="chat-drawer"
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-xl"
        style={{ height: '70vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <h2 className="font-bold">記録AIアシスタント</h2>
            {isDemo && (
              <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded">
                デモ
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={onClearMessages}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                履歴クリア
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>

        {/* メッセージエリア */}
        <div
          className="overflow-y-auto p-4"
          style={{ height: 'calc(70vh - 140px)' }}
        >
          {messages.length === 0 && !isLoading ? (
            <div className="text-center text-gray-500 py-8">
              <p className="mb-4">ケア記録について質問してください</p>
              <SampleQuestions
                questions={SAMPLE_QUESTIONS}
                onSelect={onSendMessage}
                disabled={isLoading}
              />
            </div>
          ) : messages.length === 0 && isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-bounce text-4xl mb-4">🤖</div>
              <p className="text-gray-600 font-medium">AIが回答を準備中...</p>
              <p className="text-gray-400 text-sm mt-2">記録データを分析しています</p>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => (
                <ChatMessage key={index} message={msg} />
              ))}
              {isLoading && (
                <div data-testid="chat-loading" className="flex items-center gap-2 text-gray-500 py-2">
                  <span className="animate-pulse">🤖</span>
                  <span>考え中...</span>
                </div>
              )}
              {displayQuestions.length > 0 && !isLoading && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">続けて質問：</p>
                  <div className="flex flex-wrap gap-2">
                    {displayQuestions.map((q, i) => (
                      <button
                        key={i}
                        data-testid="chat-suggestion"
                        onClick={() => onSendMessage(q)}
                        className="text-sm bg-gray-100 hover:bg-gray-200 active:bg-gray-300 active:scale-95 px-3 py-1 rounded-full transition-all duration-150"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* 入力エリア */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
          <ChatInput
            onSend={onSendMessage}
            isLoading={isLoading}
            placeholder="質問を入力..."
          />
        </div>
      </div>
    </div>
  );
}
