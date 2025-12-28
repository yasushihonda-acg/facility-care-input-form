/**
 * チャットフローティングボタン (Phase 45)
 * 右下に表示されるAIチャットボットを開くボタン
 */

interface ChatFloatingButtonProps {
  onClick: () => void;
  hasNewMessage?: boolean;
}

export function ChatFloatingButton({ onClick, hasNewMessage }: ChatFloatingButtonProps) {
  return (
    <button
      onClick={onClick}
      data-testid="chat-fab-button"
      className="fixed bottom-20 right-4 z-40 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
      aria-label="AIチャットを開く"
    >
      <span className="text-2xl">💬</span>
      {hasNewMessage && (
        <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full" />
      )}
    </button>
  );
}
