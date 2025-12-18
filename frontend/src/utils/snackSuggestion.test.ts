/**
 * snackSuggestion ユニットテスト
 * @see docs/SNACK_RECORD_INTEGRATION_SPEC.md - Phase 5
 */

import { describe, it, expect } from 'vitest';
import {
  extractQuantityFromInstruction,
  extractSuggestedQuantity,
  getExpirationWarning,
} from './snackSuggestion';
import type { CareItem } from '../types/careItem';

describe('extractQuantityFromInstruction', () => {
  it('「1日1切れまで」から1を抽出する', () => {
    expect(extractQuantityFromInstruction('1日1切れまで')).toBe(1);
  });

  it('「2個まで」から2を抽出する', () => {
    expect(extractQuantityFromInstruction('2個まで')).toBe(2);
  });

  it('「1日2切れ」から2を抽出する', () => {
    expect(extractQuantityFromInstruction('1日2切れ')).toBe(2);
  });

  it('「3枚」から3を抽出する', () => {
    expect(extractQuantityFromInstruction('おやつ時に3枚')).toBe(3);
  });

  it('「0.5個」から0.5を抽出する', () => {
    expect(extractQuantityFromInstruction('0.5個ずつ')).toBe(0.5);
  });

  it('数量がない指示ではnullを返す', () => {
    expect(extractQuantityFromInstruction('おやつ時に')).toBeNull();
  });

  it('空文字ではnullを返す', () => {
    expect(extractQuantityFromInstruction('')).toBeNull();
  });
});

describe('extractSuggestedQuantity', () => {
  const baseItem: CareItem = {
    id: 'test-item',
    residentId: 'resident-001',
    userId: 'user-001',
    itemName: 'テスト品',
    category: 'snack',
    sentDate: '2024-12-01',
    quantity: 10,
    unit: '個',
    servingMethod: 'as_is',
    status: 'in_progress',
    remainingQuantity: 5,
    createdAt: '2024-12-01T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
  };

  it('指示がない場合はデフォルト値1を返す', () => {
    const result = extractSuggestedQuantity(baseItem);
    expect(result.quantity).toBe(1);
    expect(result.source).toBe('default');
  });

  it('家族指示から提供数を抽出する', () => {
    const item = { ...baseItem, noteToStaff: '1日2個まで' };
    const result = extractSuggestedQuantity(item);
    expect(result.quantity).toBe(2);
    expect(result.source).toBe('instruction');
    expect(result.reason).toContain('1日2個まで');
  });

  it('在庫より多い指示は在庫に制限される', () => {
    const item = {
      ...baseItem,
      noteToStaff: '1日10個まで',
      currentQuantity: 3,
    };
    const result = extractSuggestedQuantity(item);
    expect(result.quantity).toBe(3);
    expect(result.source).toBe('stock');
  });

  it('在庫が0の場合は0を返す', () => {
    const item = {
      ...baseItem,
      noteToStaff: '1日2個まで',
      currentQuantity: 0,
    };
    const result = extractSuggestedQuantity(item);
    expect(result.quantity).toBe(0);
  });
});

describe('getExpirationWarning', () => {
  // 日付を固定してテスト（ローカルタイムゾーン対応）
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ローカルタイムゾーンでYYYY-MM-DD形式に変換
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  it('期限切れの場合はexpiredを返す', () => {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const result = getExpirationWarning(formatDate(yesterday));
    expect(result?.type).toBe('expired');
    expect(result?.daysLeft).toBe(-1);
  });

  it('本日期限の場合はexpiring_soonを返す', () => {
    const result = getExpirationWarning(formatDate(today));
    expect(result?.type).toBe('expiring_soon');
    expect(result?.daysLeft).toBe(0);
    expect(result?.message).toContain('本日');
  });

  it('3日以内期限の場合はexpiring_soonを返す', () => {
    const inTwoDays = new Date(today);
    inTwoDays.setDate(inTwoDays.getDate() + 2);
    const result = getExpirationWarning(formatDate(inTwoDays));
    expect(result?.type).toBe('expiring_soon');
    expect(result?.daysLeft).toBe(2);
  });

  it('4日以上先の期限はokを返す', () => {
    const inFiveDays = new Date(today);
    inFiveDays.setDate(inFiveDays.getDate() + 5);
    const result = getExpirationWarning(formatDate(inFiveDays));
    expect(result?.type).toBe('ok');
    expect(result?.daysLeft).toBe(5);
  });

  it('期限なしの場合はnullを返す', () => {
    expect(getExpirationWarning(undefined)).toBeNull();
  });
});
