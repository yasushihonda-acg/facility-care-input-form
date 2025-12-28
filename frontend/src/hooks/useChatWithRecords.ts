/**
 * 記録閲覧チャットボット カスタムフック (Phase 45)
 * AIチャットボットとの会話を管理
 *
 * 注: デモモードでも実データ（plan_data）を使用してRAGを行う
 */

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { chatWithRecords as chatWithRecordsApi } from '../api';
import type {
  RecordChatMessage,
  ChatWithRecordsRequest,
} from '../types/chat';

export interface UseChatWithRecordsOptions {
  context?: {
    sheetName?: string;
    year?: number;
    month?: number | null;
  };
}

export function useChatWithRecords(options: UseChatWithRecordsOptions = {}) {
  const [messages, setMessages] = useState<RecordChatMessage[]>([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: async (message: string) => {
      // デモモードでも本番モードでも同じAPIを呼び出す
      // plan_dataは本番データなのでRAGが正しく動作する
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
