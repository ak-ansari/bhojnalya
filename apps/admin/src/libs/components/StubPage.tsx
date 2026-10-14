// A screen whose data is not wired yet: its title and the words it shows when
// there is nothing to list.
export function StubPage({ title, empty }: { title: string; empty: string }) {
  return (
    <section>
      <h1 className="mb-4 text-2xl font-bold">{title}</h1>
      <p className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-600">{empty}</p>
    </section>
  );
}
