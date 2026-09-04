import { Suspense } from "react";
import { EraView } from "./views/EraView.tsx";
import { AgeView } from "./views/AgeView.tsx";
import { GeoView } from "./views/GeoView.tsx";
import { useUrlState } from "./hooks/useUrlState.ts";

const VIEWS = [
  { id: "era", label: "時代", hint: "2009–2025", ready: true },
  { id: "age", label: "年齢", hint: "年齢階級 × 職種", ready: true },
  { id: "geo", label: "地域", hint: "47都道府県 × LQ", ready: true },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

export function App() {
  const [view, setView] = useUrlState<ViewId>("view", "era", (v) =>
    VIEWS.some((x) => x.id === v && x.ready),
  );

  return (
    <div className="min-h-dvh">
      <header className="border-b border-rule bg-paper/85 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-end justify-between gap-4 px-6 pt-5">
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight">
              日本人はどんな仕事をしてきたか
            </h1>
            <p className="text-[11px] text-muted">
              総務省「労働力調査」「国勢調査」
            </p>
          </div>
          <nav className="flex gap-1 -mb-px" aria-label="ビュー">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                disabled={!v.ready}
                onClick={() => setView(v.id)}
                aria-current={view === v.id ? "page" : undefined}
                className={`cursor-pointer border-b-2 px-3 pt-1 pb-2 text-[13px] transition-colors duration-150 disabled:cursor-not-allowed disabled:text-faint ${
                  view === v.id
                    ? "border-accent font-semibold text-ink"
                    : "border-transparent text-muted hover:text-ink disabled:hover:text-faint"
                }`}
              >
                {v.label}
                <span className="ml-1.5 text-[10px] font-normal text-faint">
                  {v.ready ? v.hint : "準備中"}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <Suspense key={view} fallback={<Loading />}>
        {view === "era" && <EraView />}
        {view === "age" && <AgeView />}
        {view === "geo" && <GeoView />}
      </Suspense>

      <footer className="mx-auto w-full max-w-[1240px] px-6 pt-2 pb-10 text-[11px] leading-relaxed text-faint">
        出典: 総務省「労働力調査」「国勢調査」（e-Stat 経由で取得）。
        時代・年齢は労働力調査（標本推計・万人）、地域は国勢調査（全数・人）。母集団が違うため横断比較しない。
        <a
          href="https://visualizing.jp/"
          className="mt-2 block w-fit transition-colors duration-150 hover:text-muted"
        >
          visualizing.jp
        </a>
      </footer>
    </div>
  );
}

function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-6 py-16 text-[12px] text-faint">
      読み込み中
    </div>
  );
}
