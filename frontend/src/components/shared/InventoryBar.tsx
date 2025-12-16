/**
 * 在庫バー コンポーネント
 * docs/INVENTORY_CONSUMPTION_SPEC.md セクション5.2/5.3 に基づく
 *
 * 品物の残量をプログレスバーで視覚的に表示
 */

import { useMemo } from 'react';

interface InventoryBarProps {
  /** 現在の残量 */
  currentQuantity: number;
  /** 初期数量 */
  initialQuantity: number;
  /** 単位 */
  unit: string;
  /** サイズ */
  size?: 'sm' | 'md' | 'lg';
  /** 詳細表示 */
  showDetails?: boolean;
  /** 平均摂食率（%） */
  avgConsumptionRate?: number;
  /** 賞味期限（YYYY-MM-DD） */
  expirationDate?: string;
  /** カスタムクラス */
  className?: string;
}

/**
 * 賞味期限までの日数を計算
 */
function getDaysUntilExpiration(expirationDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(expirationDate);
  expDate.setHours(0, 0, 0, 0);
  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * 残量に基づいてバーの色を決定
 */
function getBarColor(percentage: number): string {
  if (percentage <= 0) return 'bg-gray-300';
  if (percentage <= 25) return 'bg-red-500';
  if (percentage <= 50) return 'bg-amber-500';
  return 'bg-green-500';
}

/**
 * 期限までの日数に基づいて警告色を決定
 */
function getExpirationColor(days: number): string {
  if (days < 0) return 'text-red-600';
  if (days === 0) return 'text-red-600';
  if (days <= 3) return 'text-amber-600';
  return 'text-gray-600';
}

/**
 * 期限表示テキストを生成
 */
function getExpirationText(days: number, expirationDate: string): string {
  if (days < 0) return `${Math.abs(days)}日前に期限切れ`;
  if (days === 0) return '本日期限';
  if (days === 1) return '明日期限';
  if (days <= 3) return `あと${days}日`;
  return expirationDate.replace(/-/g, '/');
}

export function InventoryBar({
  currentQuantity,
  initialQuantity,
  unit,
  size = 'md',
  showDetails = false,
  avgConsumptionRate,
  expirationDate,
  className = '',
}: InventoryBarProps) {
  // 消費率を計算
  const percentage = useMemo(() => {
    if (initialQuantity <= 0) return 0;
    return Math.round((currentQuantity / initialQuantity) * 100);
  }, [currentQuantity, initialQuantity]);

  // 期限情報を計算
  const expirationInfo = useMemo(() => {
    if (!expirationDate) return null;
    const days = getDaysUntilExpiration(expirationDate);
    return {
      days,
      color: getExpirationColor(days),
      text: getExpirationText(days, expirationDate),
    };
  }, [expirationDate]);

  // サイズに基づくスタイル
  const sizeStyles = {
    sm: {
      bar: 'h-2',
      text: 'text-xs',
      padding: 'p-1',
    },
    md: {
      bar: 'h-3',
      text: 'text-sm',
      padding: 'p-2',
    },
    lg: {
      bar: 'h-4',
      text: 'text-base',
      padding: 'p-3',
    },
  };

  const styles = sizeStyles[size];

  return (
    <div className={`${className}`}>
      {/* メインバー */}
      <div className="flex items-center gap-2">
        <div className={`flex-1 bg-gray-200 rounded-full overflow-hidden ${styles.bar}`}>
          <div
            className={`${styles.bar} ${getBarColor(percentage)} transition-all duration-300`}
            style={{ width: `${Math.max(percentage, 0)}%` }}
          />
        </div>
        <span className={`${styles.text} text-gray-700 font-medium whitespace-nowrap`}>
          {currentQuantity.toFixed(1)}/{initialQuantity}{unit}
        </span>
      </div>

      {/* 詳細表示 */}
      {showDetails && (
        <div className={`flex justify-between ${styles.text} text-gray-500 mt-1`}>
          <span>残り {percentage}%</span>
          {avgConsumptionRate !== undefined && (
            <span>平均摂食率: {avgConsumptionRate}%</span>
          )}
          {expirationInfo && (
            <span className={expirationInfo.color}>
              期限: {expirationInfo.text}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * ステータスバッジ
 * 品物のステータスを色付きバッジで表示
 */
interface StatusBadgeProps {
  status: 'pending' | 'in_progress' | 'served' | 'consumed' | 'expired' | 'discarded';
}

const STATUS_CONFIG = {
  pending: { label: '未提供', color: 'bg-yellow-100 text-yellow-700', icon: '' },
  in_progress: { label: '提供中', color: 'bg-blue-100 text-blue-700', icon: '' },
  served: { label: '提供済み', color: 'bg-blue-100 text-blue-700', icon: '' },
  consumed: { label: '消費完了', color: 'bg-green-100 text-green-700', icon: '' },
  expired: { label: '期限切れ', color: 'bg-red-100 text-red-700', icon: '' },
  discarded: { label: '廃棄', color: 'bg-gray-100 text-gray-700', icon: '' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

/**
 * 在庫サマリーカード
 * 家族ホーム用のコンパクトな在庫表示
 */
interface InventorySummaryCardProps {
  itemName: string;
  currentQuantity: number;
  initialQuantity: number;
  unit: string;
  status: string;
  expirationDate?: string;
  latestNote?: string;
  categoryIcon?: string;
  onClick?: () => void;
}

export function InventorySummaryCard({
  itemName,
  currentQuantity,
  initialQuantity,
  unit,
  status,
  expirationDate,
  latestNote,
  categoryIcon = '',
  onClick,
}: InventorySummaryCardProps) {
  return (
    <div
      className={`bg-white border rounded-lg p-3 shadow-sm ${onClick ? 'cursor-pointer hover:border-blue-300 hover:shadow-md transition-all' : ''}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {categoryIcon && <span className="text-lg">{categoryIcon}</span>}
          <span className="font-medium text-gray-900">{itemName}</span>
        </div>
        <StatusBadge status={status as StatusBadgeProps['status']} />
      </div>

      <InventoryBar
        currentQuantity={currentQuantity}
        initialQuantity={initialQuantity}
        unit={unit}
        size="sm"
        expirationDate={expirationDate}
      />

      {expirationDate && (
        <p className="text-xs text-gray-500 mt-1">
          期限: {expirationDate.replace(/-/g, '/')}
        </p>
      )}

      {latestNote && (
        <p className="text-xs text-gray-600 mt-2 line-clamp-2 italic">
          「{latestNote}」
        </p>
      )}
    </div>
  );
}
