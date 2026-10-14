// A screen whose data is not wired yet: its title and the words it shows when
// there is nothing to list.
export function StubPage({ title, empty }: { title: string; empty: string }) {
  return (
    <section>
      <h1 className="mb-4 text-2xl font-bold">{title}</h1>
      <p className="rounded-2xl border border-line bg-surface p-5 text-fg-body">{empty}</p>
    </section>
  );
}
