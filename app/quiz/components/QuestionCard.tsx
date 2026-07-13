import type { PublicQuestion } from "../lib/types";
import { ContentBlock } from "./ContentBlock";
import { AnswerOption } from "./AnswerOption";

type Props = {
  question: PublicQuestion;
  selectedLetter: string;
  onSelect: (letter: string) => void;
  disabled?: boolean;
};

export function QuestionCard({
  question,
  selectedLetter,
  onSelect,
  disabled,
}: Props) {
  return (
    <div>
      <ContentBlock
        type={question.type}
        text={question.question}
        imageUrl={question.imageUrl}
        alt={`Pertanyaan ${question.orderIndex}`}
        className="font-medium"
      />
      <div className="mt-6 space-y-3" role="radiogroup" aria-label="Pilihan jawaban">
        {question.answers.map((a) => (
          <AnswerOption
            key={a.id}
            answer={a}
            selected={selectedLetter.toUpperCase() === a.letter.toUpperCase()}
            onSelect={() => onSelect(a.letter)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
