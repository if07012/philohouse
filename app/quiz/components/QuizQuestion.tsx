"use client";

import Image from "next/image";
import type { ContentType, PublicAnswer } from "../lib/types";

type QuestionCardProps = {
  type: ContentType;
  question: string;
  imageUrl: string;
  orderIndex: number;
  total: number;
};

export function QuestionCard({
  type,
  question,
  imageUrl,
  orderIndex,
  total,
}: QuestionCardProps) {
  const showText = type === "text" || type === "mixed";
  const showImage = (type === "image" || type === "mixed") && imageUrl;

  return (
    <div>
      <p className="text-sm font-medium text-black/60">
      </p>
      {showText && question && (
        <p className="mt-3 whitespace-pre-wrap text-lg font-medium">{question}</p>
      )}
      {showImage && (
        <div className="relative mt-4 aspect-video max-h-72 w-full overflow-hidden rounded-lg bg-black/5">
          <Image
            src={imageUrl}
            alt={question || `Question ${orderIndex}`}
            fill
            className="object-contain"
            unoptimized
          />
        </div>
      )}
    </div>
  );
}

type AnswerOptionProps = {
  answer: PublicAnswer;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  showResult?: boolean;
  isCorrect?: boolean;
};

export function AnswerOption({
  answer,
  selected,
  onSelect,
  disabled,
  showResult,
  isCorrect,
}: AnswerOptionProps) {
  const showText = answer.type === "text" || answer.type === "mixed";
  const showImage =
    (answer.type === "image" || answer.type === "mixed") && answer.imageUrl;

  let borderClass = "border-black/15 bg-white hover:border-[var(--color-accent)]";
  if (selected && !showResult) {
    borderClass = "border-[var(--color-dark-blue)] bg-[var(--color-soft)]/50";
  }
  if (showResult && isCorrect) {
    borderClass = "border-emerald-500 bg-emerald-50";
  }
  if (showResult && selected && !isCorrect) {
    borderClass = "border-red-400 bg-red-50";
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`flex w-full flex-col gap-2 rounded-xl border-2 p-4 text-left transition ${borderClass} disabled:cursor-default`}
      aria-pressed={selected}
    >
      <span className="font-semibold text-[var(--color-dark-blue)]">
        {answer.letter}.
      </span>
      {showText && answer.text && (
        <span className="whitespace-pre-wrap text-sm">{answer.text}</span>
      )}
      {showImage && (
        <div className="relative h-32 w-full overflow-hidden rounded-lg bg-black/5">
          <Image
            src={answer.imageUrl}
            alt={`Answer ${answer.letter}`}
            fill
            className="object-contain"
            unoptimized
          />
        </div>
      )}
      {showResult && isCorrect && (
        <span className="text-sm font-semibold text-emerald-700">✔ Correct</span>
      )}
      {showResult && selected && !isCorrect && (
        <span className="text-sm font-semibold text-red-700">✖ Wrong</span>
      )}
    </button>
  );
}

export function formatAnswerLabel(
  answer: PublicAnswer | undefined,
  letter: string
): string {
  if (!answer) return letter || "—";
  const parts = [letter];
  if (answer.text) parts.push(answer.text);
  return parts.join(". ");
}
