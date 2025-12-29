/**
 * チャットメッセージ表示 (Phase 45)
 * Phase 47: react-markdown でMarkdownレンダリング強化
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { RecordChatMessage } from '../../types/chat';

interface ChatMessageProps {
  message: RecordChatMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        data-testid={isUser ? 'chat-message-user' : 'chat-message-assistant'}
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
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="text-sm chat-markdown">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // 段落
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                // 箇条書き
                ul: ({ children }) => <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="ml-2">{children}</li>,
                // 太字・イタリック
                strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                // テーブル
                table: ({ children }) => (
                  <div className="overflow-x-auto my-2">
                    <table className="min-w-full text-xs border-collapse">{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead className="bg-gray-200">{children}</thead>,
                tbody: ({ children }) => <tbody>{children}</tbody>,
                tr: ({ children }) => <tr className="border-b border-gray-300">{children}</tr>,
                th: ({ children }) => <th className="px-2 py-1 text-left font-semibold">{children}</th>,
                td: ({ children }) => <td className="px-2 py-1">{children}</td>,
                // 見出し
                h1: ({ children }) => <h1 className="text-base font-bold mt-3 mb-1">{children}</h1>,
                h2: ({ children }) => <h2 className="text-sm font-bold mt-2 mb-1">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>,
                // コードブロック
                code: ({ children, className }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className="bg-gray-200 px-1 rounded text-xs">{children}</code>
                  ) : (
                    <code className="block bg-gray-200 p-2 rounded text-xs my-2 overflow-x-auto">{children}</code>
                  );
                },
                // 引用
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-gray-400 pl-2 my-2 text-gray-600">{children}</blockquote>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
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
