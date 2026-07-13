import type { PublicAnswer } from "../lib/types";
import { ContentBlock } from "./ContentBlock";

type Props = {
  answer: PublicAnswer;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
};

export function AnswerOption({ answer, selected, onSelect, disabled }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`w-full rounded-xl border-2 p-4 text-left transition ${
        selected
          ? "border-[var(--color-dark-blue)] bg-[var(--color-dark-blue)]/5"
          : "border-black/10 bg-white hover:border-[var(--color-accent)]/50"
      } disabled:opacity-50`}
      aria-pressed={selected}
    >
      <span className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-sm font-bold">
        {answer.letter}
      </span>
      <ContentBlock
        type={answer.type}
        text={answer.text}
        imageUrl={answer.imageUrl}
        alt={`Jawaban ${answer.letter}`}
      />
    </button>
  );
}
