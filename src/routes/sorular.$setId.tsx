import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { createRoom } from "@/lib/game.functions";
import {
  addQuestion,
  deleteQuestion,
  getSet,
  listQuestions,
  updateQuestion,
  type QuestionRow,
} from "@/lib/questions.functions";

export const Route = createFileRoute("/sorular/$setId")({
  head: () => ({
    meta: [
      { title: "Soru Seti Düzenle — Halat Yarışı" },
      {
        name: "description",
        content: "Soru setine istediğin kadar soru ekle, düzenle veya sil; sonra bu seti sun.",
      },
      { property: "og:title", content: "Soru Seti Düzenle — Halat Yarışı" },
      { property: "og:description", content: "Soru setini hazırla ve yarışmada sun." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QuestionsPage,
});

const LETTERS = ["A", "B", "C", "D"] as const;

const empty = {
  question: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_answer: "A",
  category: "Genel Kültür",
};

function QuestionsPage() {
  const { setId } = Route.useParams();
  const navigate = useNavigate();
  const fetchAll = useServerFn(listQuestions);
  const fetchSet = useServerFn(getSet);
  const add = useServerFn(addQuestion);
  const edit = useServerFn(updateQuestion);
  const remove = useServerFn(deleteQuestion);
  const create = useServerFn(createRoom);

  const setInfo = useQuery({
    queryKey: ["set", setId],
    queryFn: () => fetchSet({ data: { id: setId } }),
  });
  const list = useQuery<QuestionRow[]>({
    queryKey: ["questions", setId],
    queryFn: () => fetchAll({ data: { setId } }),
  });

  const [form, setForm] = useState({ ...empty });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);

  const set = (k: keyof typeof empty, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editingId) await edit({ data: { ...form, id: editingId } });
      else await add({ data: { ...form, setId } });
      setForm({ ...empty });
      setEditingId(null);
      await list.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kaydedilemedi");
    }
    setSaving(false);
  };

  const startContest = async () => {
    setStarting(true);
    setError(null);
    try {
      const res = await create({ data: { setId } });
      void navigate({ to: "/host/$code", params: { code: res.code } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yarışma başlatılamadı");
      setStarting(false);
    }
  };

  const total = list.data?.length ?? 0;

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.35em] text-muted-foreground">
              SORU SETİ
            </p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-foreground">
              {setInfo.data?.title ?? "..."}
            </h1>
            <p className="mt-2 text-sm font-semibold text-muted-foreground">
              Bu sette {total} soru var. Sunduğunda hepsi sırayla sorulur.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/sorular"
              className="rounded-xl border-2 border-border bg-panel px-4 py-3 text-sm font-bold text-foreground hover:bg-muted"
            >
              SETLERE DÖN
            </Link>
            <button
              onClick={startContest}
              disabled={starting || total === 0}
              className="rounded-xl bg-foreground px-5 py-3 text-sm font-bold text-background disabled:opacity-40"
            >
              {starting ? "HAZIRLANIYOR..." : "BU SETİ SUN"}
            </button>
          </div>
        </header>

        {error && <p className="mt-4 text-sm font-semibold text-destructive">{error}</p>}

        <section className="mt-6 rounded-[var(--radius)] bg-panel p-6 shadow-[var(--shadow-panel)]">
          <h2 className="text-lg font-extrabold text-foreground">
            {editingId ? "SORUYU DÜZENLE" : "YENİ SORU EKLE"}
          </h2>
          <div className="mt-4 grid gap-3">
            <Field label="Soru metni">
              <textarea
                value={form.question}
                onChange={(e) => set("question", e.target.value)}
                rows={2}
                placeholder="Güneş sistemimizde kaç gezegen bulunur?"
                className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 text-base font-semibold text-foreground outline-none focus:border-team1"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              {LETTERS.map((l) => (
                <Field key={l} label={`${l} seçeneği`}>
                  <input
                    value={form[`option_${l.toLowerCase()}` as "option_a"]}
                    onChange={(e) =>
                      set(`option_${l.toLowerCase()}` as keyof typeof empty, e.target.value)
                    }
                    className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 text-base font-semibold text-foreground outline-none focus:border-team1"
                  />
                </Field>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Doğru cevap">
                <div className="flex gap-2">
                  {LETTERS.map((l) => (
                    <button
                      key={l}
                      onClick={() => set("correct_answer", l)}
                      className={`h-12 flex-1 rounded-xl text-base font-extrabold transition-colors ${
                        form.correct_answer === l
                          ? "bg-foreground text-background"
                          : "border-2 border-border bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Kategori">
                <input
                  value={form.category}
                  onChange={(e) => set("category", e.target.value)}
                  className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 text-base font-semibold text-foreground outline-none focus:border-team1"
                />
              </Field>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={save}
                disabled={saving}
                className="rounded-xl bg-team1 px-6 py-3 text-sm font-bold text-panel disabled:opacity-40"
              >
                {saving ? "KAYDEDİLİYOR..." : editingId ? "GÜNCELLE" : "SORUYU EKLE"}
              </button>
              {editingId && (
                <button
                  onClick={() => {
                    setEditingId(null);
                    setForm({ ...empty });
                  }}
                  className="rounded-xl border-2 border-border px-6 py-3 text-sm font-bold text-foreground hover:bg-muted"
                >
                  VAZGEÇ
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 space-y-3">
          {list.isLoading && (
            <p className="text-sm font-semibold text-muted-foreground">Sorular yükleniyor...</p>
          )}
          {(list.data ?? []).map((q) => (
            <article
              key={q.id}
              className="rounded-[var(--radius)] bg-panel p-5 shadow-[var(--shadow-panel)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-[0.25em] text-muted-foreground">
                    {q.category.toUpperCase()}
                  </p>
                  <h3 className="mt-1 text-lg font-extrabold text-foreground">{q.question}</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingId(q.id);
                      setForm({
                        question: q.question,
                        option_a: q.option_a,
                        option_b: q.option_b,
                        option_c: q.option_c,
                        option_d: q.option_d,
                        correct_answer: q.correct_answer.toUpperCase(),
                        category: q.category,
                      });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="rounded-xl border-2 border-border px-3 py-2 text-xs font-bold text-foreground hover:bg-muted"
                  >
                    DÜZENLE
                  </button>
                  <button
                    onClick={async () => {
                      setError(null);
                      try {
                        await remove({ data: { id: q.id } });
                        await list.refetch();
                      } catch (e) {
                        setError(e instanceof Error ? e.message : "Silinemedi");
                      }
                    }}
                    className="rounded-xl border-2 border-destructive px-3 py-2 text-xs font-bold text-destructive"
                  >
                    SİL
                  </button>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {LETTERS.map((l) => {
                  const value = q[`option_${l.toLowerCase()}` as "option_a"];
                  const correct = q.correct_answer.toUpperCase() === l;
                  return (
                    <p
                      key={l}
                      className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold ${
                        correct
                          ? "border-foreground bg-muted text-foreground"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {l}. {value}
                      {correct ? " ✓" : ""}
                    </p>
                  );
                })}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold tracking-[0.18em] text-muted-foreground">
        {label.toUpperCase()}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
