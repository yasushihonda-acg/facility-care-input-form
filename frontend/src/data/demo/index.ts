/**
 * デモデータ エクスポート集約
 * @see docs/DEMO_SHOWCASE_SPEC.md
 *
 * デモショーケース用のシードデータを提供します。
 * 本番APIを呼ばずにローカルデータで動作確認が可能です。
 */

// 既存の家族向けデモデータ（再エクスポート）
export {
  DEMO_RESIDENT,
  DEMO_FAMILY_USER,
  DEMO_PRESETS,
  DEMO_PROHIBITIONS,
  DEMO_CARE_INSTRUCTIONS,
  DEMO_TIMELINE_ITEMS,
  DEMO_EVIDENCE_DATA,
  getTimelineForDate,
  getEvidenceData,
  getCareInstructionsForResident,
  getTodayString,
  formatDateDisplay,
  formatDateTime,
} from '../demoFamilyData';

// 品物デモデータ
export * from './demoCareItems';

// 消費ログデモデータ
export * from './demoConsumptionLogs';

// 統計デモデータ
export * from './demoStats';

// タスクデモデータ
export * from './demoTasks';

// 食品マスタデモデータ (Phase 11)
export * from './demoFoodMasters';

// チャットメッセージデモデータ (Phase 18)
export * from './demoMessages';

// 品物イベント（編集履歴）デモデータ (Phase 22.3)
export * from './demoItemEvents';

// スタッフ注意事項デモデータ (Phase 40)
export * from './demoStaffNotes';
