/**
 * 記録閲覧チャットボット カスタムフック (Phase 45)
 * AIチャットボットとの会話を管理
 */

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { chatWithRecords as chatWithRecordsApi } from '../api';
import type {
  RecordChatMessage,
  ChatWithRecordsRequest,
  ChatWithRecordsResponse,
} from '../types/chat';
import { useDemoMode } from './useDemoMode';

/** デモ用の模擬レスポンス */
function getDemoResponse(message: string): ChatWithRecordsResponse {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('頓服') || lowerMessage.includes('排泄') || lowerMessage.includes('排便')) {
    return {
      message: '頓服薬の服用後2〜4時間で排泄パターンに変化が見られる傾向があります。特に下剤系の頓服では顕著です。直近1ヶ月のデータでは、頓服服用日の排泄回数は平均3.2回で、非服用日（平均1.8回）より多くなっています。',
      sources: [
        { sheetName: '内服', recordCount: 45 },
        { sheetName: '排便・排尿', recordCount: 89 },
      ],
      suggestedQuestions: [
        '頓服薬の種類別の効果は？',
        '排泄パターンの時間帯推移を教えて',
        '便秘傾向の日はありますか？',
      ],
    };
  }

  if (lowerMessage.includes('食事') || lowerMessage.includes('摂取')) {
    return {
      message: '直近1ヶ月の食事摂取率は平均78%で安定しています。主食82%、副食74%と、副食がやや低めです。朝食の摂取率が最も高く（85%）、夕食が最も低い（72%）傾向があります。',
      sources: [
        { sheetName: '食事', recordCount: 90 },
      ],
      suggestedQuestions: [
        '摂取率が低かった日は？',
        '間食の記録はありますか？',
        '食事と体調の関係は？',
      ],
    };
  }

  if (lowerMessage.includes('バイタル') || lowerMessage.includes('血圧') || lowerMessage.includes('体温')) {
    return {
      message: '今月のバイタルは概ね安定しています。血圧は収縮期120-135mmHg、拡張期70-85mmHgの範囲内です。体温は36.2-36.8℃で推移しています。12/15に一時的に体温37.2℃を記録しましたが、翌日には正常化しています。',
      sources: [
        { sheetName: 'バイタル', recordCount: 60 },
      ],
      suggestedQuestions: [
        '血圧が高かった日を教えて',
        '発熱時の対応記録はありますか？',
        'SpO2の推移を教えて',
      ],
    };
  }

  if (lowerMessage.includes('水分') || lowerMessage.includes('飲')) {
    return {
      message: '水分摂取量は1日平均1,200mlで、目標の1,500mlをやや下回っています。特に午後の摂取が少ない傾向があります。最も摂取量が少なかったのは12/18の850mlです。',
      sources: [
        { sheetName: '水分摂取量', recordCount: 30 },
      ],
      suggestedQuestions: [
        '水分摂取が多い時間帯は？',
        '季節による変動はありますか？',
        '脱水の兆候はありますか？',
      ],
    };
  }

  // デフォルトレスポンス
  return {
    message: 'ご質問ありがとうございます。申し訳ありませんが、デモモードでは限定的な回答のみ可能です。「頓服」「食事」「バイタル」「水分」に関する質問をお試しください。',
    suggestedQuestions: [
      '頓服と排泄の関係について教えて',
      '最近の食事摂取量の傾向は？',
      '今月のバイタルに異常はありますか？',
    ],
  };
}

export interface UseChatWithRecordsOptions {
  context?: {
    sheetName?: string;
    year?: number;
    month?: number | null;
  };
}

export function useChatWithRecords(options: UseChatWithRecordsOptions = {}) {
  const isDemo = useDemoMode();
  const [messages, setMessages] = useState<RecordChatMessage[]>([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: async (message: string) => {
      // デモモードの場合は模擬レスポンス
      if (isDemo) {
        // 模擬的な遅延
        await new Promise((resolve) => setTimeout(resolve, 800));
        return getDemoResponse(message);
      }

      const request: ChatWithRecordsRequest = {
        message,
        context: options.context || {},
        conversationHistory: messages,
      };

      const response = await chatWithRecordsApi(request);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Chat failed');
      }
      return response.data;
    },
    onSuccess: (data, message) => {
      // ユーザーメッセージを追加
      const userMessage: RecordChatMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };

      // アシスタントメッセージを追加
      const assistantMessage: RecordChatMessage = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      // 提案質問を更新
      if (data.suggestedQuestions) {
        setSuggestedQuestions(data.suggestedQuestions);
      }
    },
  });

  const sendMessage = useCallback(
    (message: string) => {
      mutation.mutate(message);
    },
    [mutation]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setSuggestedQuestions([]);
  }, []);

  return {
    messages,
    suggestedQuestions,
    sendMessage,
    clearMessages,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
