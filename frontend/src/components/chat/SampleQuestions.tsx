/**
 * サンプル質問表示 (Phase 45)
 * 初期表示時に提案される質問
 */

interface SampleQuestion {
  icon: string;
  text: string;
}

interface SampleQuestionsProps {
  questions: SampleQuestion[];
  onSelect: (question: string) => void;
}

export function SampleQuestions({ questions, onSelect }: SampleQuestionsProps) {
  return (
    <div className="grid gap-2">
      {questions.map((q, index) => (
        <button
          key={index}
          onClick={() => onSelect(q.text)}
          className="flex items-center gap-2 w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors"
        >
          <span className="text-xl">{q.icon}</span>
          <span className="text-sm text-gray-700">{q.text}</span>
        </button>
      ))}
    </div>
  );
}
