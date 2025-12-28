/**
 * チャットメッセージ表示 (Phase 45)
 */

import type { RecordChatMessage } from '../../types/chat';

interface ChatMessageProps {
  message: RecordChatMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-primary text-white'
            : 'bg-gray-100 text-gray-800'
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-1 mb-1">
            <span className="text-sm">🤖</span>
            <span className="text-xs text-gray-500">AI</span>
          </div>
        )}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p className="text-xs opacity-60 mt-1">
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
