"use client";

type Props = {
  label?: string;
  size?: "sm" | "md";
};

export function AiLoader({ label, size = "md" }: Props) {
  const dotSize = size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`${dotSize} rounded-full bg-violet-400 animate-bounce`}
            style={{ animationDelay: `${i * 150}ms`, animationDuration: "900ms" }}
          />
        ))}
      </div>
      {label && (
        <span className={`${textSize} text-zinc-400`}>{label}</span>
      )}
    </div>
  );
}
