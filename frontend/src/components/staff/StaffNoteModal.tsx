/**
 * スタッフ注意事項 作成/編集モーダル
 * Phase 40: スタッフ専用の注意事項管理機能
 */

import { useState, useEffect } from 'react';
import type { StaffNote, StaffNotePriority, CreateStaffNoteInput } from '../../types/staffNote';
import { STAFF_NOTE_PRIORITIES } from '../../types/staffNote';
import { getTodayString, formatDateString } from '../../utils/scheduleUtils';
import { useOptimisticSubmit } from '../../hooks/useOptimisticSubmit';
import { useDemoMode } from '../../hooks/useDemoMode';

interface StaffNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateStaffNoteInput) => Promise<void>;
  editingNote?: StaffNote | null;
  staffName: string;
}

export function StaffNoteModal({
  isOpen,
  onClose,
  onSubmit,
  editingNote,
  staffName,
}: StaffNoteModalProps) {
  const isEditing = !!editingNote;
  const isDemo = useDemoMode();

  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<StaffNotePriority>('normal');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  // 楽観的送信フック: 二重送信防止とUX改善
  const { submit, isSubmitting } = useOptimisticSubmit({
    onClose,
    loadingMessage: isEditing ? '更新中...' : '保存中...',
    successMessage: isEditing ? '更新しました' : '追加しました',
    isDemo, // デモモードではAPIを呼ばない（親のonSubmitで制御）
  });

  // criticalは期間不要、warning/normalは期間必須
  const needsPeriod = priority !== 'critical';

  // モーダルが開いた時にフォームを初期化
  useEffect(() => {
    if (isOpen) {
      if (editingNote) {
        setContent(editingNote.content);
        setPriority(editingNote.priority);
        setStartDate(editingNote.startDate || '');
        setEndDate(editingNote.endDate || '');
      } else {
        setContent('');
        setPriority('normal');
        // デフォルト: 今日から1週間
        const today = getTodayString();
        const weekLater = new Date();
        weekLater.setDate(weekLater.getDate() + 7);
        setStartDate(today);
        setEndDate(formatDateString(weekLater));
      }
      setError(null);
    }
  }, [isOpen, editingNote]);

  // 優先度変更時に期間をリセット（criticalに変更した場合）
  useEffect(() => {
    if (priority === 'critical') {
      setStartDate('');
      setEndDate('');
    } else if (!startDate || !endDate) {
      // warning/normalに変更した時、期間が未設定ならデフォルトを設定
      const today = getTodayString();
      const weekLater = new Date();
      weekLater.setDate(weekLater.getDate() + 7);
      setStartDate(today);
      setEndDate(formatDateString(weekLater));
    }
  }, [priority, startDate, endDate]);

  // 送信ハンドラ
  // useOptimisticSubmitにより、バリデーション後は即座にダイアログが閉じ、
  // API処理はバックグラウンドで実行される（二重送信防止 + UX改善）
  const handleSubmit = async () => {
    setError(null);

    // バリデーション失敗時はダイアログを閉じない
    if (!content.trim()) {
      setError('内容を入力してください');
      return;
    }

    if (needsPeriod && (!startDate || !endDate)) {
      setError('期間を設定してください');
      return;
    }

    if (needsPeriod && startDate > endDate) {
      setError('終了日は開始日以降にしてください');
      return;
    }

    const input: CreateStaffNoteInput = {
      content: content.trim(),
      priority,
      createdBy: staffName,
      ...(needsPeriod && { startDate, endDate }),
    };

    // submit()を呼び出すと即座にダイアログが閉じ、トースト通知が表示される
    await submit(async () => {
      await onSubmit(input);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">
            {isEditing ? '注意事項を編集' : '注意事項を追加'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700"
            disabled={isSubmitting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* フォーム */}
        <div className="p-4 space-y-4">
          {/* エラー表示 */}
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* 優先度選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              優先度
            </label>
            <div className="flex gap-2">
              {STAFF_NOTE_PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPriority(p.value)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    priority === p.value
                      ? `${p.bgColor} ${p.borderColor} ${p.color}`
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-1">{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {priority === 'critical'
                ? '常時表示されます（期間指定なし）'
                : '指定した期間内のみ表示されます'}
            </p>
          </div>

          {/* 内容 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="注意事項の内容を入力"
            />
          </div>

          {/* 期間（warning/normalのみ） */}
          {needsPeriod && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                表示期間 <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <span className="text-gray-500">〜</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="flex gap-3 p-4 border-t">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting ? '保存中...' : isEditing ? '更新' : '追加'}
          </button>
        </div>
      </div>
    </div>
  );
}
