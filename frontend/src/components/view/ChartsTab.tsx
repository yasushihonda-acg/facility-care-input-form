/**
 * ChartsTab - グラフタブのコンテナ
 * バイタル / 排泄 / 体重 / 水分摂取量 の折れ線グラフを表示
 */

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useSheetRecords } from '../../hooks/usePlanData';
import { LoadingSpinner } from '../LoadingSpinner';
import type { PlanDataRecord } from '../../types';

interface ChartsTabProps {
  year: number;
  month: number | null;
}

// 日付でフィルタ
function filterByYearMonth(records: PlanDataRecord[], year: number, month: number | null) {
  return records.filter(record => {
    if (!record.timestamp) return false;
    const match = record.timestamp.match(/^(\d{4})\/(\d{1,2})/);
    if (!match) return false;
    const recordYear = parseInt(match[1], 10);
    const recordMonth = parseInt(match[2], 10);
    if (recordYear !== year) return false;
    if (month !== null && recordMonth !== month) return false;
    return true;
  });
}

// タイムスタンプから日付文字列を取得
function getDateString(timestamp: string): string {
  const match = timestamp.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (!match) return '';
  return `${match[2]}/${match[3]}`;
}

// バイタルデータの変換
interface VitalDataPoint {
  date: string;
  fullDate: string;
  temperature: number | null;
  systolic: number | null;
  diastolic: number | null;
  pulse: number | null;
  spo2: number | null;
}

function transformVitalData(records: PlanDataRecord[]): VitalDataPoint[] {
  const dataMap = new Map<string, VitalDataPoint>();

  records.forEach(record => {
    const date = getDateString(record.timestamp);
    if (!date) return;

    const existing = dataMap.get(date) || {
      date,
      fullDate: record.timestamp.split(' ')[0],
      temperature: null,
      systolic: null,
      diastolic: null,
      pulse: null,
      spo2: null,
    };

    // データフィールドから値を取得
    const temp = record.data['体温（KT）はいくつでしたか？'];
    const sys = record.data['最高血圧（BP）はいくつでしたか？'];
    const dia = record.data['最低血圧（BP）はいくつでしたか？'];
    const p = record.data['脈拍（P）はいくつでしたか？'];
    const spo2 = record.data['酸素飽和度（SpO2）はいくつですか？'];

    if (temp) existing.temperature = parseFloat(temp) || null;
    if (sys) existing.systolic = parseInt(sys, 10) || null;
    if (dia) existing.diastolic = parseInt(dia, 10) || null;
    if (p) existing.pulse = parseInt(p, 10) || null;
    if (spo2) existing.spo2 = parseInt(spo2, 10) || null;

    dataMap.set(date, existing);
  });

  return Array.from(dataMap.values()).sort((a, b) =>
    a.fullDate.localeCompare(b.fullDate)
  );
}

// 排泄データの変換
interface ExcretionDataPoint {
  date: string;
  fullDate: string;
  bowelCount: number;
  urineCount: number;
}

function transformExcretionData(records: PlanDataRecord[]): ExcretionDataPoint[] {
  const dataMap = new Map<string, ExcretionDataPoint>();

  records.forEach(record => {
    const date = getDateString(record.timestamp);
    if (!date) return;

    const existing = dataMap.get(date) || {
      date,
      fullDate: record.timestamp.split(' ')[0],
      bowelCount: 0,
      urineCount: 0,
    };

    // 排便があれば+1
    const hasBowel = record.data['排便はありましたか？'];
    if (hasBowel && hasBowel.includes('あり')) {
      existing.bowelCount += 1;
    }

    // 排尿があれば+1
    const hasUrine = record.data['排尿はありましたか？'];
    if (hasUrine && hasUrine.includes('あり')) {
      existing.urineCount += 1;
    }

    dataMap.set(date, existing);
  });

  return Array.from(dataMap.values()).sort((a, b) =>
    a.fullDate.localeCompare(b.fullDate)
  );
}

// 体重データの変換
interface WeightDataPoint {
  date: string;
  fullDate: string;
  weight: number | null;
}

function transformWeightData(records: PlanDataRecord[]): WeightDataPoint[] {
  const dataMap = new Map<string, WeightDataPoint>();

  records.forEach(record => {
    const date = getDateString(record.timestamp);
    if (!date) return;

    // 体重フィールドを探す
    const weightValue = Object.entries(record.data).find(([key]) =>
      key.includes('体重') || key.includes('kg')
    );

    if (weightValue && weightValue[1]) {
      const weight = parseFloat(weightValue[1]);
      if (!isNaN(weight)) {
        dataMap.set(date, {
          date,
          fullDate: record.timestamp.split(' ')[0],
          weight,
        });
      }
    }
  });

  return Array.from(dataMap.values()).sort((a, b) =>
    a.fullDate.localeCompare(b.fullDate)
  );
}

// 水分データの変換
interface HydrationDataPoint {
  date: string;
  fullDate: string;
  totalAmount: number;
}

function transformHydrationData(records: PlanDataRecord[]): HydrationDataPoint[] {
  const dataMap = new Map<string, HydrationDataPoint>();

  records.forEach(record => {
    const date = getDateString(record.timestamp);
    if (!date) return;

    const existing = dataMap.get(date) || {
      date,
      fullDate: record.timestamp.split(' ')[0],
      totalAmount: 0,
    };

    // 水分量を取得
    const amountStr = record.data['水分量はいくらでしたか？'];
    if (amountStr) {
      const amount = parseInt(amountStr, 10);
      if (!isNaN(amount)) {
        existing.totalAmount += amount;
      }
    }

    dataMap.set(date, existing);
  });

  return Array.from(dataMap.values()).sort((a, b) =>
    a.fullDate.localeCompare(b.fullDate)
  );
}

export function ChartsTab({ year, month }: ChartsTabProps) {
  // 各シートのデータを取得
  const { records: vitalRecords, isLoading: vitalLoading } = useSheetRecords('バイタル');
  const { records: excretionRecords, isLoading: excretionLoading } = useSheetRecords('排便・排尿');
  const { records: weightRecords, isLoading: weightLoading } = useSheetRecords('体重');
  const { records: hydrationRecords, isLoading: hydrationLoading } = useSheetRecords('水分摂取量');

  const isLoading = vitalLoading || excretionLoading || weightLoading || hydrationLoading;

  // フィルタリング + 変換
  const vitalData = useMemo(() =>
    transformVitalData(filterByYearMonth(vitalRecords, year, month)),
    [vitalRecords, year, month]
  );

  const excretionData = useMemo(() =>
    transformExcretionData(filterByYearMonth(excretionRecords, year, month)),
    [excretionRecords, year, month]
  );

  const weightData = useMemo(() =>
    transformWeightData(filterByYearMonth(weightRecords, year, month)),
    [weightRecords, year, month]
  );

  const hydrationData = useMemo(() =>
    transformHydrationData(filterByYearMonth(hydrationRecords, year, month)),
    [hydrationRecords, year, month]
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner message="グラフデータを読み込み中..." />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {/* バイタルグラフ */}
      <div className="bg-white rounded-lg shadow-card p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>❤️</span>
          <span>バイタル</span>
        </h3>
        {vitalData.length === 0 ? (
          <p className="text-gray-500 text-center py-8">データがありません</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={vitalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis yAxisId="temp" orientation="left" domain={[35, 40]} fontSize={12} />
              <YAxis yAxisId="bp" orientation="right" domain={[40, 200]} fontSize={12} />
              <Tooltip />
              <Legend />
              <Line yAxisId="temp" type="monotone" dataKey="temperature" stroke="#ff7300" name="体温" dot={{ r: 3 }} />
              <Line yAxisId="bp" type="monotone" dataKey="systolic" stroke="#8884d8" name="収縮期血圧" dot={{ r: 3 }} />
              <Line yAxisId="bp" type="monotone" dataKey="diastolic" stroke="#82ca9d" name="拡張期血圧" dot={{ r: 3 }} />
              <Line yAxisId="bp" type="monotone" dataKey="pulse" stroke="#ffc658" name="脈拍" dot={{ r: 3 }} />
              <Line yAxisId="bp" type="monotone" dataKey="spo2" stroke="#00C49F" name="SpO2" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 排泄グラフ */}
      <div className="bg-white rounded-lg shadow-card p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>🚻</span>
          <span>排泄</span>
        </h3>
        {excretionData.length === 0 ? (
          <p className="text-gray-500 text-center py-8">データがありません</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={excretionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis domain={[0, 'auto']} fontSize={12} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="bowelCount" stroke="#8B4513" name="排便回数" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="urineCount" stroke="#4169E1" name="排尿回数" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 体重・水分グラフ（横並び） */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 体重グラフ */}
        <div className="bg-white rounded-lg shadow-card p-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>⚖️</span>
            <span>体重</span>
          </h3>
          {weightData.length === 0 ? (
            <p className="text-gray-500 text-center py-8">データがありません</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weightData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis domain={['dataMin - 5', 'dataMax + 5']} fontSize={12} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="weight" stroke="#6B7280" name="体重(kg)" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 水分摂取量グラフ */}
        <div className="bg-white rounded-lg shadow-card p-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>💧</span>
            <span>水分摂取量</span>
          </h3>
          {hydrationData.length === 0 ? (
            <p className="text-gray-500 text-center py-8">データがありません</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={hydrationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis domain={[0, 'auto']} fontSize={12} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="totalAmount" stroke="#3B82F6" name="水分量(cc)" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
