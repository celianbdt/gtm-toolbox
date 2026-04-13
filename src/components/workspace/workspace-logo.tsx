type Props = {
  logoUrl: string | null | undefined;
  color: string;
  name: string;
  size?: "xs" | "sm" | "md";
};

const SIZES = {
  xs: { container: "size-3", dot: "size-1.5" },
  sm: { container: "size-5", dot: "size-2.5" },
  md: { container: "size-8", dot: "size-4" },
};

export function WorkspaceLogo({ logoUrl, color, name, size = "sm" }: Props) {
  const s = SIZES[size];

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={name}
        className={`${s.container} rounded-full object-cover shrink-0`}
      />
    );
  }

  return (
    <span
      className={`${s.dot} rounded-full shrink-0`}
      style={{ backgroundColor: color }}
    />
  );
}
