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
  disabled?: boolean;
}

export function SampleQuestions({ questions, onSelect, disabled }: SampleQuestionsProps) {
  return (
    <div className="grid gap-2">
      {questions.map((q, index) => (
        <button
          key={index}
          data-testid="chat-suggestion"
          onClick={() => onSelect(q.text)}
          disabled={disabled}
          className={`
            flex items-center gap-2 w-full px-4 py-3 rounded-lg text-left
            transition-all duration-150
            ${disabled
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-50 hover:bg-gray-100 active:bg-gray-200 active:scale-[0.98] hover:shadow-sm'
            }
          `}
        >
          <span className="text-xl">{q.icon}</span>
          <span className="text-sm text-gray-700">{q.text}</span>
        </button>
      ))}
    </div>
  );
}
