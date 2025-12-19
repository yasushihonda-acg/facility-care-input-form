/**
 * 品物チャットページ (Phase 18)
 * 個別品物のチャットスペース
 * @see docs/CHAT_INTEGRATION_SPEC.md
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { getMessages, sendMessage, markAsRead, getCareItem } from '../../api';
import type { ChatMessage, SenderType } from '../../types/chat';
import { formatMessageTime } from '../../types/chat';
import type { CareItem } from '../../types/careItem';
import { getCategoryIcon } from '../../types/careItem';
import { DEMO_RESIDENT_ID } from '../../hooks/useDemoMode';

interface ItemChatPageProps {
  userType: SenderType;
  userName?: string;
}

export function ItemChatPage({ userType, userName = 'ユーザー' }: ItemChatPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: itemId } = useParams<{ id: string }>();
  const isDemo = location.pathname.startsWith('/demo');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [item, setItem] = useState<CareItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    if (itemId) {
      loadData();
    }
  }, [itemId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadData = async () => {
    if (!itemId) return;

    try {
      setLoading(true);
      setError(null);

      // 品物情報とメッセージを並行取得
      const [itemResponse, messagesResponse] = await Promise.all([
        getCareItem(itemId),
        getMessages({
          residentId: DEMO_RESIDENT_ID,
          itemId,
          limit: 50,
        }),
      ]);

      if (itemResponse.success && itemResponse.data) {
        setItem(itemResponse.data);
      }

      if (messagesResponse.success && messagesResponse.data) {
        // 古い順に並べ替え（APIは新しい順で返すため）
        setMessages(messagesResponse.data.messages.reverse());

        // 既読マーク
        await markAsRead({
          residentId: DEMO_RESIDENT_ID,
          itemId,
          readerType: userType,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !itemId || sending) return;

    try {
      setSending(true);
      const response = await sendMessage({
        residentId: DEMO_RESIDENT_ID,
        itemId,
        senderType: userType,
        senderName: userName,
        content: inputText.trim(),
      });

      if (response.success && response.data) {
        // 送信したメッセージをローカルに追加
        const newMessage: ChatMessage = {
          id: response.data.messageId,
          type: 'text',
          senderType: userType,
          senderName: userName,
          content: inputText.trim(),
          readByStaff: userType === 'staff',
          readByFamily: userType === 'family',
          createdAt: response.data.createdAt,
        };
        setMessages((prev) => [...prev, newMessage]);
        setInputText('');
        inputRef.current?.focus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'メッセージの送信に失敗しました');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleBack = () => {
    const basePath = isDemo
      ? (userType === 'staff' ? '/demo/staff' : '/demo/family')
      : (userType === 'staff' ? '/staff' : '/family');
    navigate(`${basePath}/chats`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center">
          <button
            onClick={handleBack}
            className="mr-3 p-1 hover:bg-gray-100 rounded-full"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {item && (
            <div className="flex items-center">
              <span className="text-xl mr-2">{getCategoryIcon(item.category)}</span>
              <span className="font-bold">{item.itemName}</span>
            </div>
          )}
        </div>
      </div>

      {/* メッセージエリア */}
      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">💬</div>
            <p className="text-gray-500">まだメッセージはありません</p>
            <p className="text-sm text-gray-400 mt-2">
              この品物についてやりとりを始めましょう
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.senderType === userType}
              />
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア */}
      <div className="bg-white border-t sticky bottom-0">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="メッセージを入力..."
            className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || sending}
            className={`p-2 rounded-full ${
              inputText.trim() && !sending
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            {sending ? (
              <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// メッセージバブルコンポーネント
interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
}

function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const bubbleClass = isOwn
    ? 'bg-blue-500 text-white ml-auto'
    : 'bg-white text-gray-900 mr-auto border';

  return (
    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
      {/* 送信者名（自分以外の場合） */}
      {!isOwn && (
        <span className="text-xs text-gray-500 mb-1 ml-1">
          {message.senderName}
        </span>
      )}

      {/* メッセージ本体 */}
      {message.type === 'text' && (
        <div
          data-testid="text-message"
          className={`max-w-[80%] px-4 py-2 rounded-2xl ${bubbleClass}`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>
      )}

      {message.type === 'record' && (
        <RecordMessageCard message={message} />
      )}

      {message.type === 'system' && (
        <div
          data-testid="system-message"
          className="max-w-[90%] px-3 py-2 rounded-lg bg-gray-200 text-gray-600 text-xs text-center mx-auto"
        >
          {message.content}
        </div>
      )}

      {/* 時刻 */}
      <span className={`text-xs text-gray-400 mt-1 ${isOwn ? 'mr-1' : 'ml-1'}`}>
        {formatMessageTime(message.createdAt)}
      </span>
    </div>
  );
}

/**
 * 記録メッセージカードコンポーネント (Phase 19)
 * type='record'のメッセージを中央配置のカード形式で表示
 * @see docs/CHAT_INTEGRATION_SPEC.md セクション6
 */
interface RecordMessageCardProps {
  message: ChatMessage;
}

function RecordMessageCard({ message }: RecordMessageCardProps) {
  const recordData = message.recordData;

  // 摂食状況を日本語ラベルに変換
  const getConsumptionStatusLabel = (status?: string): string => {
    if (!status) return '';
    const labels: Record<string, string> = {
      full: '完食',
      most: 'ほぼ完食',
      half: '半分',
      little: '少し',
      none: '手つかず',
    };
    return labels[status] || status;
  };

  // 摂食状況に応じた色を返す
  const getStatusColor = (status?: string): string => {
    if (!status) return 'text-gray-600';
    const colors: Record<string, string> = {
      full: 'text-green-600',
      most: 'text-green-500',
      half: 'text-yellow-600',
      little: 'text-orange-500',
      none: 'text-red-500',
    };
    return colors[status] || 'text-gray-600';
  };

  return (
    <div className="flex justify-center w-full">
      <div
        data-testid="record-message-card"
        className="max-w-[90%] w-full bg-white border border-gray-200 rounded-lg shadow-sm p-4"
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-blue-600">
            <span className="text-lg">📝</span>
            <span className="font-semibold text-sm">提供記録</span>
          </div>
          <span className="text-xs text-gray-400">
            {message.senderName}
          </span>
        </div>

        {/* 記録内容 */}
        {recordData ? (
          <div className="space-y-2">
            {/* 品物名と提供数 */}
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
              <span className="font-medium">{recordData.itemName}</span>
              <span className="text-sm text-gray-600">
                {recordData.servedQuantity}{recordData.unit || '個'}
              </span>
            </div>

            {/* 摂食状況 */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">摂食状況</span>
              <span className={`font-semibold ${getStatusColor(recordData.consumptionStatus)}`}>
                {getConsumptionStatusLabel(recordData.consumptionStatus)}
              </span>
            </div>

            {/* メモ（あれば） */}
            {recordData.note && (
              <div className="mt-2 text-sm text-gray-600 bg-gray-50 rounded p-2">
                <span className="text-xs text-gray-400 block mb-1">メモ</span>
                {recordData.note}
              </div>
            )}

            {/* 家族への申し送り（あれば） */}
            {recordData.noteToFamily && (
              <div className="mt-2 text-sm text-blue-700 bg-blue-50 rounded p-2">
                <span className="text-xs text-blue-400 block mb-1">家族への申し送り</span>
                {recordData.noteToFamily}
              </div>
            )}
          </div>
        ) : (
          /* recordDataがない場合はcontentをそのまま表示 */
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {message.content}
          </p>
        )}
      </div>
    </div>
  );
}
