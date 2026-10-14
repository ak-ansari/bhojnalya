export interface RoleOptionProps {
  name: string;
  hint: string;
  onChoose: () => void;
}

/** One large tappable card: the role's name and what it does. */
export function RoleOption({ name, hint, onChoose }: RoleOptionProps) {
  return (
    <button
      type="button"
      onClick={onChoose}
      className="flex min-h-touch flex-col gap-1.5 rounded-card border border-line bg-surface p-4 text-left hover:border-saffron hover:bg-saffron-tint focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saffron-ring"
    >
      <strong className="text-body">{name}</strong>
      <span className="text-body-sm text-fg-muted">{hint}</span>
    </button>
  );
}
