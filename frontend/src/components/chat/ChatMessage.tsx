/**
 * チャットメッセージ表示 (Phase 45)
 */

import type { RecordChatMessage } from '../../types/chat';

interface ChatMessageProps {
  message: RecordChatMessage;
}

/**
 * マークダウンをHTMLに変換
 * サポート: **太字**, *イタリック*, リスト(- / *), 改行
 */
function markdownToHtml(text: string): string {
  let html = text
    // XSS対策: HTMLエスケープ
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // **太字**
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // *イタリック* (太字でないもの)
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // 改行
    .replace(/\n/g, '<br />');

  // リスト変換: 連続する - または * で始まる行をul/liに
  // 連続するリストアイテムをグループ化
  html = html.replace(
    /(?:(?:^|<br \/>)\s*[-*]\s+[^<]+)+/g,
    (match) => {
      const items = match
        .split(/<br \/>/)
        .filter((line) => line.trim().match(/^[-*]\s+/))
        .map((line) => {
          const content = line.replace(/^\s*[-*]\s+/, '').trim();
          return `<li>${content}</li>`;
        })
        .join('');
      return `<ul class="list-disc list-inside my-2">${items}</ul>`;
    }
  );

  return html;
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
          <div
            className="text-sm chat-content"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(message.content) }}
          />
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
