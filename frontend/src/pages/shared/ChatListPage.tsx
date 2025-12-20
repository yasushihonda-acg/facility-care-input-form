/**
 * チャット一覧ページ (Phase 18)
 * アクティブなチャットスレッド（hasMessages=trueの品物）のみ表示
 * @see docs/CHAT_INTEGRATION_SPEC.md
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getActiveChatItems } from '../../api';
import type { CareItemWithChat, SenderType } from '../../types/chat';
import { formatMessageTime } from '../../types/chat';
import { getCategoryIcon } from '../../types/careItem';
import { DEMO_RESIDENT_ID } from '../../hooks/useDemoMode';
import { getDemoActiveChatItems } from '../../data/demo';

interface ChatListPageProps {
  userType: SenderType;
}

export function ChatListPage({ userType }: ChatListPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isDemo = location.pathname.startsWith('/demo');

  const [items, setItems] = useState<CareItemWithChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadChatItems();
  }, [userType]);

  const loadChatItems = async () => {
    try {
      setLoading(true);
      setError(null);

      // デモモードではローカルデータを使用
      if (isDemo) {
        const demoItems = getDemoActiveChatItems(userType);
        setItems(demoItems);
        setLoading(false);
        return;
      }

      // 本番モード: API経由で取得
      const response = await getActiveChatItems({
        residentId: DEMO_RESIDENT_ID,
        userType,
      });

      if (response.success && response.data) {
        setItems(response.data.items);
      } else {
        setError(response.error?.message || 'チャット一覧の取得に失敗しました');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (itemId: string) => {
    const basePath = isDemo
      ? (userType === 'staff' ? '/demo/staff' : '/demo/family')
      : (userType === 'staff' ? '/staff' : '/family');

    navigate(`${basePath}/chat/${itemId}`);
  };

  const handleBack = () => {
    const basePath = isDemo
      ? (userType === 'staff' ? '/demo/staff' : '/demo/family')
      : (userType === 'staff' ? '/staff' : '/family');
    navigate(basePath);
  };

  const getUnreadCount = (item: CareItemWithChat) => {
    return userType === 'staff' ? item.unreadCountStaff : item.unreadCountFamily;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
          <h1 className="text-lg font-bold">チャット</h1>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-lg mx-auto px-4 py-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {items.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">💬</div>
            <p className="text-gray-500 mb-2">チャットはまだありません</p>
            <p className="text-sm text-gray-400">
              {userType === 'staff'
                ? '品物一覧からチャットを開始できます'
                : '品物詳細からチャットを開始できます'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const unreadCount = getUnreadCount(item);
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className="w-full bg-white rounded-lg shadow-sm border p-4 text-left hover:bg-gray-50 transition"
                >
                  <div className="flex items-start">
                    {/* アイコン */}
                    <div className="text-2xl mr-3">
                      {getCategoryIcon(item.category)}
                    </div>

                    {/* メイン情報 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900 truncate">
                          {item.itemName}
                        </span>
                        {item.lastMessageAt && (
                          <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                            {formatMessageTime(item.lastMessageAt)}
                          </span>
                        )}
                      </div>

                      {item.lastMessagePreview && (
                        <p className="text-sm text-gray-500 truncate">
                          {item.lastMessagePreview}
                        </p>
                      )}
                    </div>

                    {/* 未読バッジ */}
                    {unreadCount > 0 && (
                      <div className="ml-2 flex-shrink-0">
                        <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
