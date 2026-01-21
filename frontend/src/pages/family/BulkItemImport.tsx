/**
 * 品物一括登録ページ
 * Excelファイルから複数の品物を一括で登録する機能
 */

import { useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { useCareItems } from '../../hooks/useCareItems';
import { useDemoMode } from '../../hooks/useDemoMode';
import { useBulkImport } from '../../hooks/useBulkImport';
import { ExcelUploader } from '../../components/family/ExcelUploader';
import { BulkImportPreview } from '../../components/family/BulkImportPreview';
import { BulkImportConfirmDialog } from '../../components/family/BulkImportConfirmDialog';
import { downloadTemplate } from '../../utils/excelParser';

// 入居者ID・ユーザーID（単一入居者専用アプリのため固定値）
const DEMO_RESIDENT_ID = 'resident-001';
const DEMO_USER_ID = 'family-001';

type PageStep = 'upload' | 'preview' | 'complete';

export function BulkItemImport() {
  const navigate = useNavigate();
  const isDemo = useDemoMode();
  const basePath = useMemo(() => (isDemo ? '/demo' : ''), [isDemo]);

  // 既存品物を取得（重複チェック用）
  const { data: careItemsData } = useCareItems({ residentId: DEMO_RESIDENT_ID });
  const existingItems = useMemo(() => careItemsData?.items ?? [], [careItemsData]);

  // 一括登録フック
  const {
    parsedItems,
    validItems,
    duplicateItems,
    isLoading,
    isImporting,
    importResult,
    error,
    parseFile,
    importItems,
    removeItem,
    reset,
  } = useBulkImport({
    residentId: DEMO_RESIDENT_ID,
    userId: DEMO_USER_ID,
    existingItems,
    isDemo,
  });

  const [step, setStep] = useState<PageStep>('upload');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // ファイル選択時
  const handleFileSelected = useCallback(
    async (file: File) => {
      await parseFile(file);
      setStep('preview');
    },
    [parseFile]
  );

  // テンプレートダウンロード
  const handleDownloadTemplate = useCallback(async () => {
    await downloadTemplate();
  }, []);

  // 登録確認ダイアログを開く
  const handleOpenConfirm = useCallback(() => {
    setShowConfirmDialog(true);
  }, []);

  // 登録確認ダイアログを閉じる
  const handleCloseConfirm = useCallback(() => {
    setShowConfirmDialog(false);
  }, []);

  // 登録実行
  const handleConfirmImport = useCallback(async () => {
    try {
      await importItems();
      setShowConfirmDialog(false);
      setStep('complete');
    } catch {
      // エラーはフック内で処理される
    }
  }, [importItems]);

  // やり直し
  const handleRetry = useCallback(() => {
    reset();
    setStep('upload');
  }, [reset]);

  // 品物一覧に戻る
  const handleGoToItems = useCallback(() => {
    navigate(`${basePath}/family/items`);
  }, [navigate, basePath]);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* ヘッダー */}
        <div className="mb-6">
          <Link
            to={`${basePath}/family/items`}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-2"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            品物一覧
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">品物の一括登録</h1>
          <p className="text-gray-600 mt-1">
            Excelファイルから複数の品物を一度に登録できます
          </p>
        </div>

        {/* ステップ表示 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {['アップロード', 'プレビュー', '完了'].map((label, index) => {
              const stepIndex = ['upload', 'preview', 'complete'].indexOf(step);
              const isActive = index === stepIndex;
              const isCompleted = index < stepIndex;

              return (
                <div key={label} className="flex items-center flex-1">
                  <div
                    className={`
                      flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                      ${isCompleted ? 'bg-green-500 text-white' : ''}
                      ${isActive ? 'bg-blue-500 text-white' : ''}
                      ${!isActive && !isCompleted ? 'bg-gray-200 text-gray-500' : ''}
                    `}
                  >
                    {isCompleted ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    className={`ml-2 text-sm ${isActive ? 'text-blue-600 font-medium' : 'text-gray-500'}`}
                  >
                    {label}
                  </span>
                  {index < 2 && (
                    <div
                      className={`flex-1 h-0.5 mx-4 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* Step 1: アップロード */}
        {step === 'upload' && (
          <div className="space-y-6">
            {/* テンプレートダウンロード */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h2 className="font-medium text-blue-900 mb-2">Step 1: テンプレートをダウンロード</h2>
              <p className="text-blue-800 text-sm mb-3">
                まず入力用のExcelテンプレートをダウンロードし、品物情報を入力してください。
              </p>
              <button
                onClick={handleDownloadTemplate}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                テンプレートをダウンロード
              </button>
            </div>

            {/* ファイルアップロード */}
            <div className="bg-white border rounded-lg p-4">
              <h2 className="font-medium text-gray-900 mb-2">Step 2: Excelファイルをアップロード</h2>
              <p className="text-gray-600 text-sm mb-4">
                入力済みのExcelファイルをアップロードしてください。
              </p>
              <ExcelUploader
                onFileSelected={handleFileSelected}
                isLoading={isLoading}
              />
            </div>
          </div>
        )}

        {/* Step 2: プレビュー */}
        {step === 'preview' && (
          <div className="space-y-6">
            <div className="bg-white border rounded-lg p-4">
              <h2 className="font-medium text-gray-900 mb-4">プレビュー</h2>
              <BulkImportPreview
                items={parsedItems}
                onRemoveItem={removeItem}
              />
            </div>

            {/* アクションボタン */}
            <div className="flex justify-between">
              <button
                onClick={handleRetry}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                ファイルを選び直す
              </button>
              <button
                onClick={handleOpenConfirm}
                disabled={validItems.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {validItems.length}件を登録する
              </button>
            </div>
          </div>
        )}

        {/* Step 3: 完了 */}
        {step === 'complete' && importResult && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-green-900 mb-2">登録が完了しました</h2>
              <div className="text-green-800 space-y-1">
                <p>登録成功: {importResult.success}件</p>
                {importResult.failed > 0 && (
                  <p className="text-red-600">登録失敗: {importResult.failed}件</p>
                )}
                {importResult.skipped > 0 && (
                  <p className="text-yellow-600">スキップ（重複）: {importResult.skipped}件</p>
                )}
              </div>
            </div>

            {/* 結果詳細 */}
            {importResult.results.some(r => r.status === 'failed') && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-medium text-red-900 mb-2">失敗した品物</h3>
                <ul className="text-sm text-red-700 space-y-1">
                  {importResult.results
                    .filter(r => r.status === 'failed')
                    .map(r => (
                      <li key={r.rowIndex}>
                        行{r.rowIndex}: {r.itemName} - {r.error}
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {/* アクションボタン */}
            <div className="flex justify-center gap-4">
              <button
                onClick={handleRetry}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                続けて登録する
              </button>
              <button
                onClick={handleGoToItems}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                品物一覧へ
              </button>
            </div>
          </div>
        )}

        {/* 確認ダイアログ */}
        <BulkImportConfirmDialog
          isOpen={showConfirmDialog}
          itemCount={validItems.length}
          skipCount={duplicateItems.length}
          onConfirm={handleConfirmImport}
          onCancel={handleCloseConfirm}
          isImporting={isImporting}
        />
      </div>
    </Layout>
  );
}
