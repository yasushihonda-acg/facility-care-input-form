/**
 * 通知セクションコンポーネント (Phase 19.2)
 * ホーム画面に新着通知を表示
 * @see docs/CHAT_INTEGRATION_SPEC.md セクション4.6
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getNotifications } from "../../api";
import type { ChatNotification, SenderType } from "../../types/chat";
import { formatMessageTime, NOTIFICATION_TYPE_CONFIG } from "../../types/chat";
import { useDemoMode, DEMO_RESIDENT_ID } from "../../hooks/useDemoMode";

interface NotificationSectionProps {
  userType: SenderType;
  maxItems?: number;
}

/**
 * ホーム用通知セクション
 * 新着メッセージ・記録追加などの通知を表示
 */
export function NotificationSection({
  userType,
  maxItems = 5,
}: NotificationSectionProps) {
  const isDemo = useDemoMode();
  const pathPrefix = isDemo ? "/demo" : "";

  const [notifications, setNotifications] = useState<ChatNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNotifications();
  }, [userType, isDemo]);

  const loadNotifications = async () => {
    // デモモードではAPIを呼び出さず、ダミーデータを使用
    // @see docs/FOOTERNAV_DEMO_FIX_SPEC.md
    if (isDemo) {
      setNotifications([
        {
          id: 'demo-notif-1',
          type: 'new_message',
          title: '山田さんからメッセージ',
          body: 'みかんを半分食べました',
          relatedItemId: 'item-001',
          relatedItemName: 'みかん',
          targetType: userType,
          read: false,
          createdAt: new Date().toISOString(),
          linkTo: `/staff/family-messages/item-001`,
        },
        {
          id: 'demo-notif-2',
          type: 'record_added',
          title: '記録が追加されました',
          body: 'りんごの提供記録',
          relatedItemId: 'item-002',
          relatedItemName: 'りんご',
          targetType: userType,
          read: true,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          linkTo: `/staff/family-messages/item-002`,
        },
      ]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await getNotifications({
        residentId: DEMO_RESIDENT_ID,
        targetType: userType,
        limit: maxItems,
        unreadOnly: false,
      });

      if (response.success && response.data) {
        setNotifications(response.data.notifications);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "通知の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // 通知アイコンを取得
  const getNotificationIcon = (type: ChatNotification["type"]): string => {
    return NOTIFICATION_TYPE_CONFIG[type]?.icon || "🔔";
  };

  // 通知リンクを調整（デモモード対応）
  const getNotificationLink = (notification: ChatNotification): string => {
    // linkToが既にフルパスの場合はデモプレフィックスを追加
    if (notification.linkTo.startsWith("/")) {
      // /staff/ や /family/ から始まる場合はデモプレフィックスを追加
      if (
        notification.linkTo.startsWith("/staff/") ||
        notification.linkTo.startsWith("/family/")
      ) {
        return `${pathPrefix}${notification.linkTo}`;
      }
    }
    return notification.linkTo;
  };

  if (loading) {
    return (
      <div
        data-testid="notification-section"
        className="bg-white rounded-lg shadow-card p-4 mb-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🔔</span>
          <h2 className="font-bold text-sm text-gray-700">新着通知</h2>
        </div>
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-testid="notification-section"
        className="bg-white rounded-lg shadow-card p-4 mb-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🔔</span>
          <h2 className="font-bold text-sm text-gray-700">新着通知</h2>
        </div>
        <div className="text-center py-4 text-gray-500 text-sm">{error}</div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div
        data-testid="notification-section"
        className="bg-white rounded-lg shadow-card p-4 mb-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🔔</span>
          <h2 className="font-bold text-sm text-gray-700">新着通知</h2>
        </div>
        <div className="text-center py-4 text-gray-500 text-sm">
          新しい通知はありません
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="notification-section"
      className="bg-white rounded-lg shadow-card p-4 mb-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🔔</span>
        <h2 className="font-bold text-sm text-gray-700">新着通知</h2>
        {notifications.filter((n) => !n.read).length > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white">
            {notifications.filter((n) => !n.read).length}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {notifications.map((notification) => (
          <Link
            key={notification.id}
            to={getNotificationLink(notification)}
            data-testid="notification-item"
            className={`block p-3 rounded-lg border transition hover:bg-gray-50 ${
              notification.read
                ? "border-gray-100 bg-gray-50"
                : "border-blue-200 bg-blue-50"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0">
                {getNotificationIcon(notification.type)}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    notification.read ? "text-gray-600" : "text-gray-900"
                  }`}
                >
                  {notification.title}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {notification.body}
                </p>
                {notification.relatedItemName && (
                  <p className="text-xs text-gray-400 mt-1">
                    📦 {notification.relatedItemName}
                  </p>
                )}
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {formatMessageTime(notification.createdAt)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default NotificationSection;
