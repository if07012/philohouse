import Image from "next/image";
import type { ContentType } from "../lib/types";

type Props = {
  type: ContentType;
  text?: string;
  imageUrl?: string;
  alt?: string;
  className?: string;
};

export function ContentBlock({
  type,
  text = "",
  imageUrl = "",
  alt = "Gambar",
  className = "",
}: Props) {
  const hasText = Boolean(text?.trim());
  const hasImage = Boolean(imageUrl?.trim());

  if (type === "text" || (!hasImage && hasText)) {
    return (
      <p className={`whitespace-pre-wrap text-base leading-relaxed ${className}`}>
        {text}
      </p>
    );
  }

  if (type === "image" || (!hasText && hasImage)) {
    return (
      <div className={`relative mx-auto aspect-video max-w-md overflow-hidden rounded-lg ${className}`}>
        <Image
          src={imageUrl}
          alt={alt}
          fill
          className="object-contain"
          unoptimized={imageUrl.startsWith("http")}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {hasText && (
        <p className="whitespace-pre-wrap text-base leading-relaxed">{text}</p>
      )}
      {hasImage && (
        <div className="relative mx-auto aspect-video max-w-md overflow-hidden rounded-lg">
          <Image
            src={imageUrl}
            alt={alt}
            fill
            className="object-contain"
            unoptimized={imageUrl.startsWith("http")}
          />
        </div>
      )}
    </div>
  );
}
