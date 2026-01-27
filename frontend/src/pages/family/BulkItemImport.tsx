/**
 * 品物一括登録ページ
 * Excel/画像から複数の品物を一括で登録する機能
 */

import { useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { useCareItems } from '../../hooks/useCareItems';
import { useDemoMode } from '../../hooks/useDemoMode';
import { useBulkImport } from '../../hooks/useBulkImport';
import { useImageBulkImport } from '../../hooks/useImageBulkImport';
import { ExcelUploader } from '../../components/family/ExcelUploader';
import { ImageUploader } from '../../components/family/ImageUploader';
import { BulkImportPreview } from '../../components/family/BulkImportPreview';
import { BulkImportConfirmDialog } from '../../components/family/BulkImportConfirmDialog';
import { downloadTemplate } from '../../utils/excelParser';
import type { ParsedBulkItem, ParsedImageItem } from '../../types/bulkImport';
import type { EditableItemFields } from '../../hooks/useBulkImport';

// 入居者ID・ユーザーID（単一入居者専用アプリのため固定値）
const DEMO_RESIDENT_ID = 'resident-001';
const DEMO_USER_ID = 'family-001';

type ImportSource = 'excel' | 'image';
type PageStep = 'upload' | 'preview' | 'complete';

export function BulkItemImport() {
  const navigate = useNavigate();
  const isDemo = useDemoMode();
  const basePath = useMemo(() => (isDemo ? '/demo' : ''), [isDemo]);

  // 既存品物を取得（重複チェック用）
  const { data: careItemsData } = useCareItems({ residentId: DEMO_RESIDENT_ID });
  const existingItems = useMemo(() => careItemsData?.items ?? [], [careItemsData]);

  // 共通状態
  const [importSource, setImportSource] = useState<ImportSource>('excel');
  const [step, setStep] = useState<PageStep>('upload');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Excel一括登録フック
  const excelImport = useBulkImport({
    residentId: DEMO_RESIDENT_ID,
    userId: DEMO_USER_ID,
    existingItems,
    isDemo,
  });

  // 画像一括登録フック
  const imageImport = useImageBulkImport({
    residentId: DEMO_RESIDENT_ID,
    userId: DEMO_USER_ID,
    existingItems,
    isDemo,
  });

  // 現在のソースに応じた状態を取得
  const currentImport = importSource === 'excel' ? excelImport : imageImport;
  const isLoading = importSource === 'excel' ? excelImport.isLoading : imageImport.isAnalyzing;
  const isImporting = currentImport.isImporting;
  const importResult = currentImport.importResult;
  const error = currentImport.error;

  // プレビュー用の品物リスト（Excel/画像共通で使えるよう型を合わせる）
  const parsedItemsForPreview: (ParsedBulkItem | ParsedImageItem)[] = useMemo(() => {
    if (importSource === 'excel') {
      return excelImport.parsedItems;
    }
    return imageImport.parsedItems;
  }, [importSource, excelImport.parsedItems, imageImport.parsedItems]);

  // 選択された品物数（登録対象）
  const selectedItemsCount = importSource === 'excel'
    ? excelImport.selectedItems.length
    : imageImport.selectedItems.length;

  const duplicateItemsCount = importSource === 'excel'
    ? excelImport.duplicateItems.length
    : imageImport.duplicateItems.length;

  // 未選択の品物数
  const unselectedCount = importSource === 'excel'
    ? excelImport.validItems.length - excelImport.selectedItems.length
    : imageImport.validItems.length - imageImport.selectedItems.length;

  // タブ切り替え
  const handleSourceChange = useCallback((source: ImportSource) => {
    if (step === 'upload') {
      setImportSource(source);
      excelImport.reset();
      imageImport.reset();
    }
  }, [step, excelImport, imageImport]);

  // Excelファイル選択時
  const handleExcelSelected = useCallback(
    async (file: File) => {
      await excelImport.parseFile(file);
      setStep('preview');
    },
    [excelImport]
  );

  // 画像選択時
  const handleImageSelected = useCallback(
    async (base64: string, mimeType: string) => {
      await imageImport.analyzeImage(base64, mimeType);
      // analyzeImage完了後、常にプレビュー画面に遷移（エラーは画面上で表示される）
      setStep('preview');
    },
    [imageImport]
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
      await currentImport.importItems();
      setShowConfirmDialog(false);
      setStep('complete');
    } catch {
      // エラーはフック内で処理される
    }
  }, [currentImport]);

  // やり直し
  const handleRetry = useCallback(() => {
    excelImport.reset();
    imageImport.reset();
    setStep('upload');
  }, [excelImport, imageImport]);

  // 品物一覧に戻る
  const handleGoToItems = useCallback(() => {
    navigate(`${basePath}/family/items`);
  }, [navigate, basePath]);

  // 行を除外
  const handleRemoveItem = useCallback((rowIndex: number) => {
    if (importSource === 'excel') {
      excelImport.removeItem(rowIndex);
    } else {
      imageImport.removeItem(rowIndex);
    }
  }, [importSource, excelImport, imageImport]);

  // 品物の編集
  const handleUpdateItem = useCallback((rowIndex: number, fields: EditableItemFields) => {
    if (importSource === 'excel') {
      excelImport.updateItem(rowIndex, fields);
    } else {
      imageImport.updateItem(rowIndex, fields);
    }
  }, [importSource, excelImport, imageImport]);

  // 選択切り替え
  const handleToggleSelect = useCallback((rowIndex: number) => {
    if (importSource === 'excel') {
      excelImport.toggleSelect(rowIndex);
    } else {
      imageImport.toggleSelect(rowIndex);
    }
  }, [importSource, excelImport, imageImport]);

  // 全選択
  const handleSelectAll = useCallback(() => {
    if (importSource === 'excel') {
      excelImport.selectAll();
    } else {
      imageImport.selectAll();
    }
  }, [importSource, excelImport, imageImport]);

  // 全選択解除
  const handleDeselectAll = useCallback(() => {
    if (importSource === 'excel') {
      excelImport.deselectAll();
    } else {
      imageImport.deselectAll();
    }
  }, [importSource, excelImport, imageImport]);

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
            Excelファイルまたは画像から複数の品物を一度に登録できます
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

        {/* 画像解析の警告表示 */}
        {importSource === 'image' && imageImport.metadata && imageImport.metadata.warnings.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2 text-yellow-700">
              <svg className="w-5 h-5 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="font-medium">画像解析の注意</p>
                <ul className="text-sm mt-1 list-disc list-inside">
                  {imageImport.metadata.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: アップロード */}
        {step === 'upload' && (
          <div className="space-y-6">
            {/* ソース選択タブ */}
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="flex border-b">
                <button
                  onClick={() => handleSourceChange('excel')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    importSource === 'excel'
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Excelファイル
                  </div>
                </button>
                <button
                  onClick={() => handleSourceChange('image')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    importSource === 'image'
                      ? 'bg-green-50 text-green-700 border-b-2 border-green-500'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    画像から読み取り
                  </div>
                </button>
              </div>

              <div className="p-4">
                {importSource === 'excel' ? (
                  // Excelアップロード
                  <div className="space-y-4">
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

                    <div>
                      <h2 className="font-medium text-gray-900 mb-2">Step 2: Excelファイルをアップロード</h2>
                      <p className="text-gray-600 text-sm mb-4">
                        入力済みのExcelファイルをアップロードしてください。
                      </p>
                      <ExcelUploader
                        onFileSelected={handleExcelSelected}
                        isLoading={isLoading}
                      />
                    </div>
                  </div>
                ) : (
                  // 画像アップロード
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h2 className="font-medium text-green-900 mb-2">画像から品物を読み取り</h2>
                      <p className="text-green-800 text-sm">
                        食事スケジュール表の写真をアップロードすると、AIが品物情報を自動で抽出します。
                        手書きのメモや印刷された表にも対応しています。
                      </p>
                    </div>

                    <ImageUploader
                      onImageSelected={handleImageSelected}
                      isLoading={isLoading}
                    />

                    <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                      <p className="font-medium text-gray-700 mb-1">読み取りのヒント</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li>表全体が写るように撮影してください</li>
                        <li>文字が鮮明に見える明るい場所で撮影してください</li>
                        <li>斜めからではなく、真上から撮影すると精度が上がります</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: プレビュー */}
        {step === 'preview' && (
          <div className="space-y-6">
            {/* 信頼度表示（画像の場合） */}
            {importSource === 'image' && imageImport.metadata && (
              <div className={`p-3 rounded-lg text-sm ${
                imageImport.metadata.confidence === 'high'
                  ? 'bg-green-50 text-green-700'
                  : imageImport.metadata.confidence === 'medium'
                  ? 'bg-yellow-50 text-yellow-700'
                  : 'bg-red-50 text-red-700'
              }`}>
                <div className="flex items-center gap-2">
                  {imageImport.metadata.confidence === 'high' ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span>
                    読み取り精度: {
                      imageImport.metadata.confidence === 'high' ? '高' :
                      imageImport.metadata.confidence === 'medium' ? '中' : '低'
                    }
                    {imageImport.metadata.confidence !== 'high' && '（内容をご確認ください）'}
                  </span>
                </div>
              </div>
            )}

            <div className="bg-white border rounded-lg p-4">
              <h2 className="font-medium text-gray-900 mb-4">
                プレビュー
                <span className="ml-2 text-sm font-normal text-gray-500">
                  （クリックで内容を編集できます）
                </span>
              </h2>
              <BulkImportPreview
                items={parsedItemsForPreview}
                onRemoveItem={handleRemoveItem}
                onUpdateItem={handleUpdateItem}
                onToggleSelect={handleToggleSelect}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                showSelection={true}
              />
            </div>

            {/* アクションボタン */}
            <div className="flex justify-between">
              <button
                onClick={handleRetry}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                {importSource === 'excel' ? 'ファイルを選び直す' : '画像を選び直す'}
              </button>
              <button
                onClick={handleOpenConfirm}
                disabled={selectedItemsCount === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {selectedItemsCount}件を登録する
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
                        {importSource === 'excel' ? `行${r.rowIndex}` : `品物${r.rowIndex + 1}`}: {r.itemName} - {r.error}
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
          itemCount={selectedItemsCount}
          skipCount={duplicateItemsCount + unselectedCount}
          onConfirm={handleConfirmImport}
          onCancel={handleCloseConfirm}
          isImporting={isImporting}
        />
      </div>
    </Layout>
  );
}
