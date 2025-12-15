/**
 * 統計ダッシュボード (Phase 8.3)
 * スタッフ・家族共通ビュー
 * @see docs/STATS_DASHBOARD_SPEC.md
 */

import { useState } from 'react';
import { Layout } from '../../components/Layout';
import { useStats } from '../../hooks/useStats';
import type {
  ItemStatsData,
  Alert,
  AlertSeverity,
  CategoryDistribution,
  ExpirationCalendarEntry,
} from '../../types/stats';
import { ALERT_SEVERITY_COLORS, ALERT_SEVERITY_LABELS, ALERT_TYPE_LABELS } from '../../types/stats';
import { getCategoryLabel } from '../../types/careItem';

// デモ用の入居者ID（将来は認証から取得）
const DEMO_RESIDENT_ID = 'resident-001';

type StatsTab = 'items' | 'alerts';

export function StatsDashboard() {
  const [activeTab, setActiveTab] = useState<StatsTab>('items');
  const { itemStats, alerts, isLoading, error, refetch } = useStats({
    residentId: DEMO_RESIDENT_ID,
    include: ['items', 'alerts'],
  });

  return (
    <Layout title="統計" subtitle="品物・アラート状況" showBackButton>
      <div className="pb-4">
        {/* タブ切り替え */}
        <div className="flex border-b border-gray-200 mb-4 bg-white rounded-t-lg">
          <TabButton
            label="品物状況"
            icon="📦"
            isActive={activeTab === 'items'}
            onClick={() => setActiveTab('items')}
          />
          <TabButton
            label="アラート"
            icon="🔔"
            isActive={activeTab === 'alerts'}
            onClick={() => setActiveTab('alerts')}
            badge={alerts.filter(a => a.severity === 'urgent').length}
          />
        </div>

        {/* ローディング */}
        {isLoading && (
          <div className="bg-white rounded-lg shadow-card p-6">
            <div className="flex flex-col items-center text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2" />
              <p className="text-sm">データを読み込み中...</p>
            </div>
          </div>
        )}

        {/* エラー */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-700 text-sm">{error}</p>
            <button
              onClick={refetch}
              className="mt-2 text-sm text-red-600 underline"
            >
              再読み込み
            </button>
          </div>
        )}

        {/* タブコンテンツ */}
        {!isLoading && !error && (
          <>
            {activeTab === 'items' && <ItemStatsTab data={itemStats} />}
            {activeTab === 'alerts' && <AlertsTab alerts={alerts} />}
          </>
        )}
      </div>
    </Layout>
  );
}

// =============================================================================
// タブボタン
// =============================================================================

interface TabButtonProps {
  label: string;
  icon: string;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
}

function TabButton({ label, icon, isActive, onClick, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex-1 py-3 px-4 text-sm font-medium transition
        ${isActive
          ? 'text-blue-600 border-b-2 border-blue-600'
          : 'text-gray-500 hover:text-gray-700'
        }
      `}
    >
      <span className="mr-1">{icon}</span>
      {label}
      {badge && badge > 0 && (
        <span className="absolute -top-1 right-2 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
          {badge}
        </span>
      )}
    </button>
  );
}

// =============================================================================
// 品物状況タブ
// =============================================================================

interface ItemStatsTabProps {
  data: ItemStatsData | null;
}

function ItemStatsTab({ data }: ItemStatsTabProps) {
  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow-card p-6 text-center text-gray-500">
        <p>品物データがありません</p>
      </div>
    );
  }

  const { summary, categoryDistribution, expirationCalendar } = data;

  return (
    <div className="space-y-4">
      {/* サマリカード */}
      <div className="bg-white rounded-lg shadow-card p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">品物状況サマリ</h3>
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard label="総品物数" value={summary.totalItems} color="blue" />
          <SummaryCard label="未提供" value={summary.pendingItems} color="orange" />
          <SummaryCard label="消費済み" value={summary.consumedItems} color="green" />
        </div>
        {(summary.expiringToday > 0 || summary.expiringIn3Days > 0) && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-4 text-sm">
              {summary.expiringToday > 0 && (
                <span className="flex items-center text-red-600">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-1.5" />
                  本日期限: {summary.expiringToday}件
                </span>
              )}
              {summary.expiringIn3Days > 0 && (
                <span className="flex items-center text-orange-600">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-1.5" />
                  3日以内: {summary.expiringIn3Days}件
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* カテゴリ別分布 */}
      {categoryDistribution.length > 0 && (
        <div className="bg-white rounded-lg shadow-card p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">カテゴリ別分布</h3>
          <CategoryChart data={categoryDistribution} />
        </div>
      )}

      {/* 賞味期限カレンダー */}
      {expirationCalendar.length > 0 && (
        <div className="bg-white rounded-lg shadow-card p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">賞味期限カレンダー（今後7日間）</h3>
          <ExpirationList data={expirationCalendar} />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// サマリカード
// =============================================================================

interface SummaryCardProps {
  label: string;
  value: number;
  color: 'blue' | 'orange' | 'green' | 'red';
}

function SummaryCard({ label, value, color }: SummaryCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    orange: 'bg-orange-50 text-orange-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
  };

  return (
    <div className={`rounded-lg p-3 text-center ${colorClasses[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-1">{label}</p>
    </div>
  );
}

// =============================================================================
// カテゴリ別棒グラフ
// =============================================================================

interface CategoryChartProps {
  data: CategoryDistribution[];
}

function CategoryChart({ data }: CategoryChartProps) {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6B7280'];

  return (
    <div className="space-y-2">
      {data.map((item, index) => (
        <div key={item.category} className="flex items-center gap-2">
          <span className="w-20 text-xs text-gray-600 truncate">
            {getCategoryLabel(item.category)}
          </span>
          <div className="flex-1 bg-gray-100 rounded h-5 overflow-hidden">
            <div
              className="h-full rounded flex items-center justify-end pr-2 text-xs text-white font-medium"
              style={{
                width: `${Math.max(item.percentage, 10)}%`,
                backgroundColor: colors[index % colors.length],
              }}
            >
              {item.count}
            </div>
          </div>
          <span className="w-10 text-xs text-gray-500 text-right">{item.percentage}%</span>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// 賞味期限リスト
// =============================================================================

interface ExpirationListProps {
  data: ExpirationCalendarEntry[];
}

function ExpirationList({ data }: ExpirationListProps) {
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const getDaysLabel = (daysUntil: number): { text: string; color: string } => {
    if (daysUntil === 0) return { text: '本日', color: 'text-red-600 bg-red-50' };
    if (daysUntil === 1) return { text: '明日', color: 'text-orange-600 bg-orange-50' };
    return { text: `${daysUntil}日後`, color: 'text-yellow-600 bg-yellow-50' };
  };

  return (
    <div className="space-y-3">
      {data.map((entry) => (
        <div key={entry.date} className="border-l-2 border-gray-200 pl-3">
          <p className="text-xs text-gray-500 mb-1">{formatDate(entry.date)}</p>
          <div className="space-y-1">
            {entry.items.map((item) => {
              const { text, color } = getDaysLabel(item.daysUntil);
              return (
                <div key={item.id} className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${color}`}>
                    {text}
                  </span>
                  <span className="text-sm">{item.itemName}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// アラートタブ
// =============================================================================

interface AlertsTabProps {
  alerts: Alert[];
}

function AlertsTab({ alerts }: AlertsTabProps) {
  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-card p-6 text-center">
        <p className="text-4xl mb-2">✅</p>
        <p className="text-gray-600">アラートはありません</p>
        <p className="text-sm text-gray-400 mt-1">すべて正常です</p>
      </div>
    );
  }

  // 重要度でグループ化
  const urgentAlerts = alerts.filter(a => a.severity === 'urgent');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');
  const infoAlerts = alerts.filter(a => a.severity === 'info');

  return (
    <div className="space-y-4">
      {urgentAlerts.length > 0 && (
        <AlertGroup
          severity="urgent"
          alerts={urgentAlerts}
        />
      )}
      {warningAlerts.length > 0 && (
        <AlertGroup
          severity="warning"
          alerts={warningAlerts}
        />
      )}
      {infoAlerts.length > 0 && (
        <AlertGroup
          severity="info"
          alerts={infoAlerts}
        />
      )}
    </div>
  );
}

// =============================================================================
// アラートグループ
// =============================================================================

interface AlertGroupProps {
  severity: AlertSeverity;
  alerts: Alert[];
}

function AlertGroup({ severity, alerts }: AlertGroupProps) {
  const colors = ALERT_SEVERITY_COLORS[severity];
  const severityIcons: Record<AlertSeverity, string> = {
    urgent: '🔴',
    warning: '🟠',
    info: '🔵',
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span>{severityIcons[severity]}</span>
        <span className="text-sm font-medium text-gray-700">
          {ALERT_SEVERITY_LABELS[severity]} ({alerts.length})
        </span>
      </div>
      <div className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`rounded-lg p-3 border ${colors.bg} ${colors.border}`}
          >
            <div className="flex items-start gap-2">
              <span className="text-lg">
                {getAlertIcon(alert.type)}
              </span>
              <div className="flex-1">
                <p className={`text-sm font-medium ${colors.text}`}>{alert.title}</p>
                <p className="text-xs text-gray-600 mt-0.5">{alert.description}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {ALERT_TYPE_LABELS[alert.type]}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getAlertIcon(type: Alert['type']): string {
  switch (type) {
    case 'expiration_today':
    case 'expiration_soon':
      return '⏰';
    case 'low_stock':
    case 'out_of_stock':
      return '📦';
    case 'consumption_decline':
      return '📉';
    case 'no_recent_record':
      return '📝';
    default:
      return '⚠️';
  }
}
