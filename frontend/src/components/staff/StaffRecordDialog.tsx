/**
 * StaffRecordDialog - 統一された提供・摂食記録ダイアログ
 * Phase 15.3: 家族連絡詳細からのダイアログ表示
 * Phase 15.9: 写真アップロード機能追加
 * Phase 29: タブ式UI（食事/水分）、水分記録機能
 * 設計書: docs/STAFF_RECORD_FORM_SPEC.md セクション4.2, 12, 13
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { CareItem } from '../../types/careItem';
import type { RemainingHandling } from '../../types/consumptionLog';
import { getCategoryIcon, migrateCategory, formatRemainingHandlingWithConditions } from '../../types/careItem';
import { determineConsumptionStatus, REMAINING_HANDLING_OPTIONS } from '../../types/consumptionLog';
import { useRecordConsumptionLog, useCorrectDiscardedRecord } from '../../hooks/useConsumptionLogs';
import { submitMealRecord, uploadCareImage, submitHydrationRecord } from '../../api';
import { useMealFormSettings } from '../../hooks/useMealFormSettings';
import { DAY_SERVICE_OPTIONS } from '../../types/mealForm';
import type { SnackRecord } from '../../types/mealForm';
import { calculateConsumptionAmounts } from '../../utils/consumptionCalc';
import { getTodayString } from '../../utils/scheduleUtils';

// Phase 29: タブ種別
type RecordTab = 'meal' | 'hydration';

// Phase 29: 特記事項のデフォルト値
const DEFAULT_NOTE = '【ケアに関すること】\n\n【ACPiece】';

/**
 * Phase 29/31: カテゴリに基づくタブを決定（タブ固定化）
 * drink → hydration（水分）、food/その他 → meal（食事）
 * Phase 31: 旧カテゴリにも対応（migrateCategory経由）
 */
function getDefaultTab(category: string): RecordTab {
  const migratedCategory = migrateCategory(category);
  return migratedCategory === 'drink' ? 'hydration' : 'meal';
}

/**
 * Phase 29: 品物の数量・単位から水分量(cc)を計算
 */
function calculateHydrationAmount(
  quantity: number,
  unit: string
): number | null {
  const normalizedUnit = unit.toLowerCase().trim();
  switch (normalizedUnit) {
    case 'ml':
    case 'cc':
      return quantity;
    case 'l':
      return quantity * 1000;
    case 'コップ':
    case '杯':
      return quantity * 200; // 1杯 ≈ 200cc
    default:
      return null; // 手動入力が必要
  }
}

interface StaffRecordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: CareItem;
  onSuccess?: () => void;
  isDemo?: boolean;
}

/**
 * 統一された提供・摂食記録ダイアログ
 */
export function StaffRecordDialog({
  isOpen,
  onClose,
  item,
  onSuccess,
  isDemo = false,
}: StaffRecordDialogProps) {
  const { settings } = useMealFormSettings();
  const recordMutation = useRecordConsumptionLog();
  const correctDiscardedMutation = useCorrectDiscardedRecord();

  // 現在の残量
  const currentQuantity = item.currentQuantity ?? item.remainingQuantity ?? item.quantity;

  // フォーム状態
  const [formData, setFormData] = useState({
    // Phase 29: タブ選択
    activeTab: 'meal' as RecordTab,
    // 共通項目
    staffName: '',
    dayServiceUsage: '利用中ではない' as '利用中' | '利用中ではない',
    dayServiceName: '',
    // 品物記録
    servedQuantity: 1,
    // Phase 15.6: 数値入力（0-10）
    consumptionRateInput: 10,  // 0-10の入力値
    consumptionNote: '',
    noteToFamily: '',
    followedFamilyInstructions: true,
    // Phase 15.6: 残った分への対応
    remainingHandling: '' as RemainingHandling | '',
    remainingHandlingOther: '',
    // 共通項目（下部）
    snack: '',
    note: DEFAULT_NOTE, // Phase 29: placeholderからdefaultValueに変更
    isImportant: '重要ではない' as '重要' | '重要ではない',
    // Phase 15.9: 写真アップロード
    photo: null as File | null,
    photoPreview: '',
    // Phase 29: 水分記録
    hydrationAmount: null as number | null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // モーダルが開いた時にフォームをリセット
  useEffect(() => {
    if (isOpen) {
      // 家族の指示から推奨提供数を計算
      const suggestedQuantity = getSuggestedQuantity(item);

      // Phase 59: 破棄済み品物の修正記録の場合、破棄された数量（復元される数量）を使用
      // 通常の記録の場合は残量との最小値を使用
      // フォールバック優先順位:
      // 1. remainingHandlingLogs[].quantity (消費記録API経由の廃棄)
      // 2. servedQuantity (最後に提供した数量)
      // 3. quantity (登録時の元数量)
      // 4. 1 (最終フォールバック)
      const rhlQty = item.remainingHandlingLogs?.find(log => log.handling === 'discarded')?.quantity;
      const discardedQty = rhlQty || item.servedQuantity || item.quantity || 1;

      // Phase 59 Fix: 廃棄記録がある場合は discardedQty を使用
      // - status === 'discarded' の場合
      // - または remainingHandlingLogs に discarded エントリがある場合（status が consumed でも）
      const hasDiscardedLog = !!rhlQty;
      const isDiscardedItem = item.status === 'discarded' || hasDiscardedLog;

      const servedQty = isDiscardedItem && discardedQty
        ? discardedQty
        : Math.min(suggestedQuantity, currentQuantity);

      // デバッグログ
      console.log('[修正記録] ダイアログ開始:', {
        itemName: item.itemName,
        status: item.status,
        hasDiscardedLog,
        isDiscardedItem,
        'rhlQty': rhlQty,
        servedQuantity: item.servedQuantity,
        quantity: item.quantity,
        currentQuantity: item.currentQuantity,
        '→ discardedQty': discardedQty,
        '→ servedQty(初期値)': servedQty
      });

      // Phase 29/31: カテゴリに基づくタブ決定（旧カテゴリも自動変換）
      const defaultTab = getDefaultTab(item.category);

      // Phase 29/31: 飲み物カテゴリの場合、水分量を自動計算
      const migratedCategory = migrateCategory(item.category);
      const autoHydrationAmount = migratedCategory === 'drink'
        ? calculateHydrationAmount(servedQty, item.unit)
        : null;

      // Phase 33: 家族の処置指示がある場合は自動選択
      const familyInstruction = item.remainingHandlingInstruction;
      const autoRemainingHandling: RemainingHandling | '' =
        familyInstruction && familyInstruction !== 'none'
          ? (familyInstruction as RemainingHandling)
          : '';

      // eslint-disable-next-line react-hooks/set-state-in-effect -- ダイアログ初期化処理
      setFormData({
        // Phase 29: タブ選択
        activeTab: defaultTab,
        staffName: '',
        dayServiceUsage: '利用中ではない',
        dayServiceName: '',
        servedQuantity: servedQty,
        consumptionRateInput: 10,  // Phase 15.6: デフォルト完食
        consumptionNote: '',
        noteToFamily: '',
        followedFamilyInstructions: true,
        remainingHandling: autoRemainingHandling,
        remainingHandlingOther: '',
        snack: '',
        note: DEFAULT_NOTE, // Phase 29: placeholderからdefaultValueに変更
        isImportant: '重要ではない',
        // Phase 15.9: 写真リセット
        photo: null,
        photoPreview: '',
        // Phase 29: 水分量
        hydrationAmount: autoHydrationAmount,
      });
      setErrors({});
    }
  }, [isOpen, item, currentQuantity]);

  // Phase 15.6: 摂食割合が10になったら残り対応をリセット
  useEffect(() => {
    if (formData.consumptionRateInput === 10) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 派生状態の自動更新
      setFormData(prev => ({
        ...prev,
        remainingHandling: '',
        remainingHandlingOther: '',
      }));
    }
  }, [formData.consumptionRateInput]);

  // Phase 29修正: 提供数変更時に水分量を自動再計算
  useEffect(() => {
    if (formData.activeTab === 'hydration') {
      const newHydrationAmount = calculateHydrationAmount(formData.servedQuantity, item.unit);
      if (newHydrationAmount !== null) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- 派生状態の自動更新
        setFormData(prev => ({
          ...prev,
          hydrationAmount: newHydrationAmount,
        }));
      }
    }
  }, [formData.servedQuantity, formData.activeTab, item.unit]);

  // バリデーション
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // 共通バリデーション
    if (!formData.staffName.trim()) {
      newErrors.staffName = '入力者名を入力してください。';
    }
    if (formData.dayServiceUsage === '利用中' && !formData.dayServiceName) {
      newErrors.dayServiceName = 'デイサービスを選択してください。';
    }
    if (formData.servedQuantity <= 0) {
      newErrors.servedQuantity = '提供数量を入力してください。';
    }
    // Phase 59: 破棄済み品物の修正記録の場合、在庫は復元されるためこのチェックをスキップ
    if (item.status !== 'discarded' && formData.servedQuantity > currentQuantity) {
      newErrors.servedQuantity = `提供数量が残量(${currentQuantity}${item.unit})を超えています`;
    }

    // Phase 29: タブ別バリデーション
    if (formData.activeTab === 'meal') {
      // 食事タブ: 残り対応バリデーション
      // Phase 15.6: 残った分がある場合は対応を必須に
      if (formData.consumptionRateInput < 10 && !formData.remainingHandling) {
        newErrors.remainingHandling = '残った分への対応を選択してください。';
      }
      // Phase 15.6: その他を選択した場合は詳細を必須に
      if (formData.remainingHandling === 'other' && !formData.remainingHandlingOther.trim()) {
        newErrors.remainingHandlingOther = '対応の詳細を入力してください。';
      }
    } else {
      // 水分タブ: 水分量バリデーション
      if (formData.hydrationAmount === null || formData.hydrationAmount <= 0) {
        newErrors.hydrationAmount = '水分量を入力してください。';
      }
      // Phase 29追加: 水分タブでも残った分への対応を必須に
      const maxHydrationAmount = calculateHydrationAmount(formData.servedQuantity, item.unit);
      if (maxHydrationAmount !== null &&
          formData.hydrationAmount !== null &&
          formData.hydrationAmount < maxHydrationAmount &&
          !formData.remainingHandling) {
        newErrors.remainingHandling = '残った分への対応を選択してください。';
      }
      if (formData.remainingHandling === 'other' && !formData.remainingHandlingOther.trim()) {
        newErrors.remainingHandlingOther = '対応の詳細を入力してください。';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, currentQuantity, item.unit]);

  // デモモード用のローディング状態
  const [isDemoSubmitting, setIsDemoSubmitting] = useState(false);

  // 送信ハンドラ
  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    // デモモードの場合はAPIを呼び出さずにフィードバックを表示
    if (isDemo) {
      setIsDemoSubmitting(true);
      // 少し遅延を入れてUXを向上
      await new Promise(resolve => setTimeout(resolve, 800));
      setIsDemoSubmitting(false);
      alert('✅ デモモードのため実際には保存されていませんが、\n入力内容は正常です！\n\n本番環境では記録がスプレッドシートに保存されます。');
      onSuccess?.();
      onClose();
      return;
    }

    try {
      // Phase 15.9: 写真がある場合は先にアップロードしてURLを取得
      let photoUrl: string | undefined;
      if (formData.photo) {
        const uploadResult = await uploadCareImage({
          staffId: formData.staffName,
          residentId: item.residentId,
          image: formData.photo,
          staffName: formData.staffName,
          date: getTodayString(),
        });
        // ApiResponse<UploadCareImageResponse> からphotoUrlを取得
        photoUrl = uploadResult.data?.photoUrl;
      }

      // 1. consumption_log に記録（在庫更新）
      // Phase 29: 水分タブの場合は消費率を100%として記録
      const consumptionRate = formData.activeTab === 'meal'
        ? formData.consumptionRateInput * 10
        : 100; // 水分は全量消費として扱う
      const consumedQuantity = (consumptionRate / 100) * formData.servedQuantity;
      const consumptionStatus = determineConsumptionStatus(consumptionRate);

      // 破棄済みの品物に対する修正記録の場合は correctDiscardedRecord API を使用
      const isCorrection = item.status === 'discarded';

      if (isCorrection) {
        // 修正記録API: 破棄ログを無効化し、新しい記録で置き換える
        await correctDiscardedMutation.mutateAsync({
          itemId: item.id,
          servedDate: getTodayString(),
          servedTime: new Date().toTimeString().slice(0, 5),
          mealTime: 'snack',
          servedQuantity: formData.servedQuantity,
          servedBy: formData.staffName,
          consumedQuantity: consumedQuantity,
          consumptionStatus: consumptionStatus,
          consumptionNote: formData.consumptionNote || undefined,
          noteToFamily: formData.noteToFamily || undefined,
          recordedBy: formData.staffName,
          ...(formData.activeTab === 'meal' && formData.remainingHandling && {
            remainingHandling: formData.remainingHandling,
            remainingHandlingOther: formData.remainingHandlingOther || undefined,
          }),
        });
      } else {
        // 通常記録API
        await recordMutation.mutateAsync({
          itemId: item.id,
          servedDate: getTodayString(),
          servedTime: new Date().toTimeString().slice(0, 5),
          mealTime: 'snack', // 品物ベースの記録はすべて間食として消費ログに記録
          servedQuantity: formData.servedQuantity,
          servedBy: formData.staffName,
          consumedQuantity: consumedQuantity,
          consumptionStatus: consumptionStatus,
          consumptionNote: formData.consumptionNote || undefined,
          noteToFamily: formData.noteToFamily || undefined,
          recordedBy: formData.staffName,
          // Phase 15.7: 残り対応をAPIに送信（食事タブのみ）
          ...(formData.activeTab === 'meal' && formData.remainingHandling && {
            remainingHandling: formData.remainingHandling,
            remainingHandlingOther: formData.remainingHandlingOther || undefined,
          }),
        });
      }

      // Phase 29: タブ別にシート記録APIを呼び出し
      if (formData.activeTab === 'meal') {
        // 2a. 食事タブ: Sheet B に記録
        const snackRecord: SnackRecord = {
          itemId: item.id,
          itemName: item.itemName,
          servedQuantity: formData.servedQuantity,
          unit: item.unit,
          consumptionStatus: consumptionStatus,
          consumptionRate: consumptionRate,
          followedInstruction: formData.followedFamilyInstructions,
          instructionNote: item.noteToStaff || undefined,
          note: formData.consumptionNote || undefined,
          noteToFamily: formData.noteToFamily || undefined,
          // Phase 15.6: 残り対応
          ...(formData.remainingHandling && { remainingHandling: formData.remainingHandling as RemainingHandling }),
          ...(formData.remainingHandlingOther && { remainingHandlingOther: formData.remainingHandlingOther }),
        };

        await submitMealRecord({
          recordMode: 'snack_only',
          staffName: formData.staffName,
          facility: settings.defaultFacility || '',
          residentName: settings.defaultResidentName || '',
          dayServiceUsage: formData.dayServiceUsage,
          isImportant: formData.isImportant,
          ...(formData.dayServiceName && { dayServiceName: formData.dayServiceName }),
          ...(formData.snack && { snack: formData.snack }),
          ...(formData.note && { note: formData.note }),
          snackRecords: [snackRecord],
          residentId: item.residentId,
          // Phase 15.9: 写真URLを渡す（Google Chat Webhook連携用）
          ...(photoUrl && { photoUrl }),
        });
      } else {
        // 2b. 水分タブ: 水分摂取量シートに記録
        await submitHydrationRecord({
          staffName: formData.staffName,
          residentName: settings.defaultResidentName || '',
          residentId: item.residentId,
          hydrationAmount: formData.hydrationAmount || 0,
          note: formData.note || undefined,
          isImportant: formData.isImportant,
          facility: settings.defaultFacility || '',
          dayServiceUsage: formData.dayServiceUsage,
          ...(formData.dayServiceName && { dayServiceName: formData.dayServiceName }),
          // 品物連携情報
          itemId: item.id,
          itemName: item.itemName,
          servedQuantity: formData.servedQuantity,
          unit: item.unit,
        });
      }

      // 注: 破棄済みの品物に対する修正記録の場合、
      // correctDiscardedRecord API がステータス復旧を処理するため手動更新は不要

      onSuccess?.();
      onClose();
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : '記録に失敗しました' });
    }
  }, [formData, item, settings, recordMutation, correctDiscardedMutation, validate, onSuccess, onClose, isDemo]);

  // Phase 15.7: 残り対応に基づいて消費量・残量を計算
  // Phase 29修正: タブ別に計算ロジックを分岐（水分タブも残り対応を考慮）
  const consumptionAmounts = useMemo(() => {
    if (formData.activeTab === 'hydration') {
      // 水分タブ: hydrationAmount(cc) → item.unit への逆変換
      const hydrationCc = formData.hydrationAmount ?? 0;
      const normalizedUnit = item.unit.toLowerCase().trim();

      // 飲んだ量を品物の単位に変換
      let consumedInItemUnit: number;
      switch (normalizedUnit) {
        case 'ml':
        case 'cc':
          consumedInItemUnit = hydrationCc;
          break;
        case 'l':
          consumedInItemUnit = hydrationCc / 1000;
          break;
        case 'コップ':
        case '杯':
          consumedInItemUnit = hydrationCc / 200;
          break;
        default:
          consumedInItemUnit = formData.servedQuantity; // フォールバック
      }

      // 残った量
      const remainingInItemUnit = formData.servedQuantity - consumedInItemUnit;

      // Phase 29追加: 残り対応に基づいて在庫消費量を決定（食事タブと同じロジック）
      let inventoryDeducted: number;
      let wastedQuantity: number;

      if (remainingInItemUnit <= 0) {
        // 全量消費
        inventoryDeducted = formData.servedQuantity;
        wastedQuantity = 0;
      } else if (formData.remainingHandling === 'discarded') {
        // 破棄: 提供量全てを在庫から引く
        inventoryDeducted = formData.servedQuantity;
        wastedQuantity = remainingInItemUnit;
      } else {
        // 保存・その他: 飲んだ分のみ在庫から引く
        inventoryDeducted = consumedInItemUnit;
        wastedQuantity = 0;
      }

      return {
        consumedQuantity: consumedInItemUnit,
        inventoryDeducted,
        wastedQuantity,
      };
    } else {
      // 食事タブ: 従来の計算ロジック
      const rate = formData.consumptionRateInput * 10; // 0-10 → 0-100
      const handling = formData.remainingHandling || undefined;
      return calculateConsumptionAmounts(formData.servedQuantity, rate, handling);
    }
  }, [formData.activeTab, formData.servedQuantity, formData.consumptionRateInput, formData.remainingHandling, formData.hydrationAmount, item.unit]);

  const quantityAfter = currentQuantity - consumptionAmounts.inventoryDeducted;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white px-4 py-3 border-b flex items-center justify-between z-10">
          <h2 className="font-bold text-lg">提供・摂食を記録</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700"
            aria-label="閉じる"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* デモモードバナー */}
          {isDemo && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              🎓 <strong>デモモード</strong>：入力をお試しいただけます。実際には記録は保存されません。
            </div>
          )}

          {/* Phase 31: タブ固定（カテゴリに応じて自動選択、切替不可） */}
          <div className="text-center py-2 px-4 font-medium border-b-2 border-primary text-primary bg-primary/5 rounded-t-lg">
            {formData.activeTab === 'meal' ? '🍪 食事記録' : '💧 水分記録'}
          </div>

          {/* 品物情報 */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getCategoryIcon(item.category)}</span>
              <div>
                <p className="font-bold">{item.itemName}</p>
                <p className="text-sm text-gray-500">
                  {/* Phase 59 Fix: 廃棄記録がある場合は破棄された数量を表示 */}
                  {/* status が 'consumed' でも remainingHandlingLogs に discarded があれば対象 */}
                  残り: {(() => {
                    const rhl = item.remainingHandlingLogs?.find(log => log.handling === 'discarded')?.quantity;
                    const hasDiscarded = item.status === 'discarded' || !!rhl;
                    return hasDiscarded
                      ? (rhl || item.servedQuantity || item.quantity || 1)
                      : currentQuantity;
                  })()}{item.unit}
                  {item.expirationDate && (
                    <span className="ml-2">
                      期限: {new Date(item.expirationDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                    </span>
                  )}
                </p>
              </div>
            </div>
            {item.noteToStaff && (
              <div className="mt-2 text-sm text-blue-700 bg-blue-50 rounded p-2">
                💬 {item.noteToStaff}
              </div>
            )}
          </div>

          {/* エラー表示 */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              {errors.submit}
            </div>
          )}

          {/* 入力者名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              入力者（あなた）は？ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.staffName}
              onChange={(e) => setFormData(prev => ({ ...prev, staffName: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg ${errors.staffName ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="お名前を入力"
            />
            {errors.staffName && (
              <p className="mt-1 text-sm text-red-500">{errors.staffName}</p>
            )}
          </div>

          {/* デイサービス利用 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              デイサービスの利用中ですか？ <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              {(['利用中', '利用中ではない'] as const).map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dayServiceUsage"
                    value={option}
                    checked={formData.dayServiceUsage === option}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        dayServiceUsage: e.target.value as typeof option,
                        dayServiceName: e.target.value === '利用中ではない' ? '' : prev.dayServiceName,
                      }));
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{option}</span>
                </label>
              ))}
            </div>
          </div>

          {/* デイサービス名（条件付き） */}
          {formData.dayServiceUsage === '利用中' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                どこのデイサービスですか？ <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.dayServiceName}
                onChange={(e) => setFormData(prev => ({ ...prev, dayServiceName: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg ${errors.dayServiceName ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">選んでください</option>
                {DAY_SERVICE_OPTIONS.map((ds) => (
                  <option key={ds} value={ds}>{ds}</option>
                ))}
              </select>
              {errors.dayServiceName && (
                <p className="mt-1 text-sm text-red-500">{errors.dayServiceName}</p>
              )}
            </div>
          )}

          {/* 提供数量 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              提供数 <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0.5"
                max={currentQuantity}
                step="0.5"
                value={formData.servedQuantity}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  setFormData(prev => ({
                    ...prev,
                    servedQuantity: value,
                  }));
                }}
                className={`w-24 border rounded-lg px-3 py-2 text-sm ${errors.servedQuantity ? 'border-red-500' : 'border-gray-300'}`}
              />
              <span className="text-gray-600">{item.unit}</span>
            </div>
            {errors.servedQuantity && (
              <p className="mt-1 text-sm text-red-500">{errors.servedQuantity}</p>
            )}
          </div>

          {/* Phase 29: 水分タブ - 水分量入力 */}
          {formData.activeTab === 'hydration' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                水分量（cc） <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.hydrationAmount ?? ''}
                  onChange={(e) => {
                    const inputValue = e.target.value.replace(/[^0-9]/g, '');
                    const value = inputValue === '' ? null : parseInt(inputValue, 10);
                    setFormData(prev => ({ ...prev, hydrationAmount: value }));
                  }}
                  data-testid="hydration-amount"
                  className={`w-32 border rounded-lg px-3 py-2 text-lg font-semibold ${
                    errors.hydrationAmount ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <span className="text-gray-600">cc</span>
              </div>
              {formData.hydrationAmount !== null && migrateCategory(item.category) === 'drink' && (
                <p className="text-xs text-blue-600 mt-1">
                  💡 提供数から自動計算されました
                </p>
              )}
              {errors.hydrationAmount && (
                <p className="mt-1 text-sm text-red-500">{errors.hydrationAmount}</p>
              )}
            </div>
          )}

          {/* Phase 29追加: 水分タブ - 残った分への対応（全量消費していない場合） */}
          {formData.activeTab === 'hydration' && (() => {
            const maxHydrationAmount = calculateHydrationAmount(formData.servedQuantity, item.unit);
            const hasRemaining = maxHydrationAmount !== null &&
              formData.hydrationAmount !== null &&
              formData.hydrationAmount < maxHydrationAmount;
            if (!hasRemaining) return null;
            return (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  残った分への対応 <span className="text-red-500">*</span>
                </label>

                {/* Phase 33: 家族からの処置指示バナー */}
                {item.remainingHandlingInstruction && item.remainingHandlingInstruction !== 'none' && (
                  <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-700">
                      <span className="text-lg">💡</span>
                      <span className="font-medium text-sm">ご家族からの指示があります</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-lg">📌</span>
                      <span className="font-semibold text-amber-800">
                        {formatRemainingHandlingWithConditions(item.remainingHandlingInstruction, item.remainingHandlingConditions)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {REMAINING_HANDLING_OPTIONS.map(option => {
                    // Phase 33: 家族指示がある場合、該当オプション以外は非活性
                    const hasInstruction = item.remainingHandlingInstruction && item.remainingHandlingInstruction !== 'none';
                    const isAllowed = !hasInstruction || option.value === item.remainingHandlingInstruction;
                    const isDisabled = hasInstruction && !isAllowed;

                    return (
                      <label
                        key={option.value}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          isDisabled
                            ? 'cursor-not-allowed opacity-50 border-gray-200 bg-gray-50'
                            : formData.remainingHandling === option.value
                              ? 'cursor-pointer border-primary bg-primary/5'
                              : 'cursor-pointer border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="remainingHandlingHydration"
                          value={option.value}
                          checked={formData.remainingHandling === option.value}
                          disabled={isDisabled}
                          onChange={(e) => setFormData(prev => ({ ...prev, remainingHandling: e.target.value as RemainingHandling }))}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{option.label}</span>
                        {isDisabled && (
                          <span className="text-xs text-gray-400 ml-auto">（家族指示により選択不可）</span>
                        )}
                      </label>
                    );
                  })}
                </div>
                {errors.remainingHandling && (
                  <p className="mt-1 text-sm text-red-500">{errors.remainingHandling}</p>
                )}

                {/* その他の詳細入力 */}
                {formData.remainingHandling === 'other' && (
                  <div className="mt-3">
                    <input
                      type="text"
                      value={formData.remainingHandlingOther}
                      onChange={(e) => setFormData(prev => ({ ...prev, remainingHandlingOther: e.target.value }))}
                      placeholder="対応の詳細を入力"
                      className={`w-full px-3 py-2 border rounded-lg text-sm ${
                        errors.remainingHandlingOther ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.remainingHandlingOther && (
                      <p className="mt-1 text-sm text-red-500">{errors.remainingHandlingOther}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Phase 15.6: 摂食した割合（0-10数値入力）- 食事タブのみ */}
          {formData.activeTab === 'meal' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                摂食した割合 <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="1"
                  value={formData.consumptionRateInput}
                  onChange={(e) => {
                    const value = Math.min(10, Math.max(0, parseInt(e.target.value) || 0));
                    setFormData(prev => ({ ...prev, consumptionRateInput: value }));
                  }}
                  className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-center text-lg font-semibold"
                />
                <span className="text-gray-600 font-medium">/ 10</span>
                <span className="text-sm text-gray-500 ml-2">
                  （{formData.consumptionRateInput * 10}%）
                </span>
              </div>
              {/* スライダー補助（視覚的なフィードバック） */}
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={formData.consumptionRateInput}
                onChange={(e) => setFormData(prev => ({ ...prev, consumptionRateInput: parseInt(e.target.value) }))}
                className="w-full mt-2 accent-primary"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0（食べず）</span>
                <span>5（半分）</span>
                <span>10（完食）</span>
              </div>
            </div>
          )}

          {/* Phase 15.6: 残った分への対応（摂食割合 < 10の場合のみ）- 食事タブのみ */}
          {formData.activeTab === 'meal' && formData.consumptionRateInput < 10 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                残った分への対応 <span className="text-red-500">*</span>
              </label>

              {/* Phase 33: 家族からの処置指示バナー */}
              {item.remainingHandlingInstruction && item.remainingHandlingInstruction !== 'none' && (
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-700">
                    <span className="text-lg">💡</span>
                    <span className="font-medium text-sm">ご家族からの指示があります</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-lg">📌</span>
                    <span className="font-semibold text-amber-800">
                      {formatRemainingHandlingWithConditions(item.remainingHandlingInstruction, item.remainingHandlingConditions)}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {REMAINING_HANDLING_OPTIONS.map(option => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      formData.remainingHandling === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="remainingHandling"
                      value={option.value}
                      checked={formData.remainingHandling === option.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, remainingHandling: e.target.value as RemainingHandling }))}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
              {errors.remainingHandling && (
                <p className="mt-1 text-sm text-red-500">{errors.remainingHandling}</p>
              )}

              {/* その他の詳細入力 */}
              {formData.remainingHandling === 'other' && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={formData.remainingHandlingOther}
                    onChange={(e) => setFormData(prev => ({ ...prev, remainingHandlingOther: e.target.value }))}
                    placeholder="対応の詳細を入力"
                    className={`w-full px-3 py-2 border rounded-lg text-sm ${
                      errors.remainingHandlingOther ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.remainingHandlingOther && (
                    <p className="mt-1 text-sm text-red-500">{errors.remainingHandlingOther}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* メモ（食事タブのみ） */}
          {formData.activeTab === 'meal' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">メモ（任意）</label>
              <textarea
                value={formData.consumptionNote}
                onChange={(e) => setFormData(prev => ({ ...prev, consumptionNote: e.target.value }))}
                placeholder="おいしそうに召し上がりました"
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
              />
            </div>
          )}

          {/* 間食について補足（食事タブのみ） */}
          {formData.activeTab === 'meal' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                間食について補足（自由記入）
              </label>
              <textarea
                value={formData.snack}
                onChange={(e) => setFormData(prev => ({ ...prev, snack: e.target.value }))}
                placeholder="施設のおやつも召し上がりました など"
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
              />
            </div>
          )}

          {/* 特記事項（両タブ共通） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">特記事項</label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
              data-testid="note-field"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>

          {/* 重要特記事項 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              重要特記事項集計表に反映させますか？ <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              {(['重要', '重要ではない'] as const).map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="isImportant"
                    value={option}
                    checked={formData.isImportant === option}
                    onChange={(e) => setFormData(prev => ({ ...prev, isImportant: e.target.value as typeof option }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{option}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Phase 15.9: 写真アップロード */}
          <div data-testid="photo-upload">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              写真（任意）
            </label>
            {!formData.photoPreview ? (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-8 h-8 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-sm text-gray-500">写真を追加</p>
                  <p className="text-xs text-gray-400 mt-1">タップして撮影または選択</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // ファイルサイズチェック（10MB以下）
                      if (file.size > 10 * 1024 * 1024) {
                        setErrors(prev => ({ ...prev, photo: '画像サイズは10MB以下にしてください' }));
                        return;
                      }
                      // プレビュー生成
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setFormData(prev => ({
                          ...prev,
                          photo: file,
                          photoPreview: reader.result as string,
                        }));
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            ) : (
              <div className="relative">
                <img
                  src={formData.photoPreview}
                  alt="プレビュー"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, photo: null, photoPreview: '' }))}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  aria-label="写真を削除"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            {errors.photo && (
              <p className="mt-1 text-sm text-red-500">{errors.photo}</p>
            )}
          </div>

          {/* 記録後の残量プレビュー (Phase 15.7対応) */}
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <span className="text-sm text-gray-600">記録後の残量: </span>
            <span className="text-lg font-semibold text-blue-700">
              {quantityAfter.toFixed(1)}{item.unit}
            </span>
            {consumptionAmounts.wastedQuantity > 0 && (
              <span className="text-xs text-orange-600 block mt-1">
                🗑️ 廃棄: {consumptionAmounts.wastedQuantity.toFixed(1)}{item.unit}
              </span>
            )}
            {quantityAfter <= 0 && (
              <span className="text-xs text-orange-600 block mt-1">
                ※ 在庫がなくなります（品物は「消費完了」になります）
              </span>
            )}
          </div>
        </div>

        {/* フッター */}
        <div className="sticky bottom-0 bg-white flex justify-end gap-2 p-4 border-t">
          <button
            onClick={onClose}
            disabled={recordMutation.isPending || correctDiscardedMutation.isPending || isDemoSubmitting}
            className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={recordMutation.isPending || correctDiscardedMutation.isPending || isDemoSubmitting}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
          >
            {(recordMutation.isPending || correctDiscardedMutation.isPending || isDemoSubmitting) ? '記録中...' : (isDemo ? '記録を保存（デモ）' : '記録を保存')}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 家族の指示から推奨提供数を計算
 */
function getSuggestedQuantity(item: CareItem): number {
  if (!item.noteToStaff) return 1;

  const match = item.noteToStaff.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    const suggested = parseFloat(match[1]);
    if (suggested > 0 && suggested <= 10) {
      return suggested;
    }
  }

  return 1;
}
