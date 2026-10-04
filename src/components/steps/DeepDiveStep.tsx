"use client";

import { useEffect, useRef, useState } from "react";
import { QUIZ, TALK_PROMPTS, type Answers, type Question } from "@/lib/quiz";

type Props = {
  answers: Answers;
  transcript: string;
  onAnswers: (a: Answers) => void;
  onTranscript: (t: string) => void;
  onDone: () => void;
};

export default function DeepDiveStep(props: Props) {
  const [mode, setMode] = useState<"pick" | "quiz" | "talk">("pick");

  if (mode === "quiz") return <Quiz {...props} onBack={() => setMode("pick")} />;
  if (mode === "talk") return <Talk {...props} onBack={() => setMode("pick")} />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="font-display text-3xl font-bold">Let&apos;s get to know you</h2>
        <p className="text-muted">The more your little you knows, the better friends it finds. Pick how you want to do it.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <button className="card text-left hover:border-brand transition group" onClick={() => setMode("quiz")}>
          <div className="text-4xl">📝</div>
          <div className="font-display text-2xl font-semibold mt-2 group-hover:text-brand">Take the quiz</div>
          <p className="text-muted mt-1">{QUIZ.length} quick questions — tap, slide, a few short answers. About 5 minutes.</p>
        </button>
        <button className="card text-left hover:border-brand transition group" onClick={() => setMode("talk")}>
          <div className="text-4xl">🎙️</div>
          <div className="font-display text-2xl font-semibold mt-2 group-hover:text-brand">Just talk</div>
          <p className="text-muted mt-1">Answer {TALK_PROMPTS.length} prompts out loud, like a voice memo. AI listens and figures you out.</p>
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------- Quiz ---------------------------------- */

function Quiz({ answers, onAnswers, onDone, onBack }: Props & { onBack: () => void }) {
  const [i, setI] = useState(0);
  const q = QUIZ[i];
  const a = answers[q.id];
  const set = (v: Answers[string]) => onAnswers({ ...answers, [q.id]: v });
  const answered = a !== undefined && a !== "" && !(Array.isArray(a) && a.length === 0);
  const last = i === QUIZ.length - 1;
  const advance = () => (last ? onDone() : setI(i + 1));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 text-sm text-muted">
        <button onClick={() => (i ? setI(i - 1) : onBack())} className="underline">← Back</button>
        <span className="font-semibold uppercase tracking-wide">{q.section}</span>
        <span className="ml-auto">{i + 1} / {QUIZ.length}</span>
      </div>
      <div className="h-2.5 rounded-full bg-line overflow-hidden">
        <div className="h-full bg-brand transition-all duration-300" style={{ width: `${((i + 1) / QUIZ.length) * 100}%` }} />
      </div>

      <div key={q.id} className="card rise space-y-6">
        <h2 className="font-display text-2xl sm:text-3xl font-semibold">{q.prompt}</h2>
        <QuestionInput q={q} value={a} onChange={set} onAutoAdvance={advance} />
      </div>

      <div className="flex justify-between">
        <button className="btn-ghost" onClick={advance}>{last ? "Skip & finish" : "Skip"}</button>
        <button className="btn" onClick={advance} disabled={!answered}>{last ? "Finish ✓" : "Next →"}</button>
      </div>
    </div>
  );
}

function QuestionInput({ q, value, onChange, onAutoAdvance }: { q: Question; value: Answers[string] | undefined; onChange: (v: Answers[string]) => void; onAutoAdvance: () => void }) {
  if (q.kind === "chips") {
    const sel = (value as string[]) ?? [];
    return (
      <div className="flex flex-wrap gap-2">
        {q.options.map((o) => {
          const on = sel.includes(o);
          return (
            <button
              key={o}
              className="chip text-base"
              data-on={on}
              onClick={() => {
                if (on) onChange(sel.filter((x) => x !== o));
                else if (!q.max || sel.length < q.max) onChange([...sel, o]);
              }}
            >
              {o}
            </button>
          );
        })}
      </div>
    );
  }
  if (q.kind === "single") {
    return (
      <div className="grid sm:grid-cols-2 gap-2">
        {q.options.map((o) => (
          <button
            key={o}
            className={`rounded-2xl border-2 px-4 py-3 text-left font-medium transition ${value === o ? "border-brand bg-brand/10" : "border-line hover:border-muted"}`}
            onClick={() => {
              onChange(o);
              setTimeout(onAutoAdvance, 220);
            }}
          >
            {o}
          </button>
        ))}
      </div>
    );
  }
  if (q.kind === "scale") {
    return (
      <div className="space-y-3">
        <div className="flex justify-between gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => {
                onChange(n);
                setTimeout(onAutoAdvance, 220);
              }}
              className={`flex-1 aspect-square max-w-20 rounded-2xl border-2 font-display text-xl transition ${value === n ? "border-brand bg-brand text-white scale-105" : "border-line hover:border-muted"}`}
              style={{ transform: value === n ? undefined : `scale(${0.8 + Math.abs(n - 3) * 0.1})` }}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-sm text-muted"><span>{q.low}</span><span>{q.high}</span></div>
      </div>
    );
  }
  return (
    <textarea className="input min-h-32" placeholder={q.placeholder} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} autoFocus />
  );
}

/* ---------------------------------- Talk ---------------------------------- */

type SpeechRec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void;
  onend: () => void;
  onerror: (e: { error: string }) => void;
};

function getRecognizer(): SpeechRec | null {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

function parseTranscript(t: string): string[] {
  // transcript is stored as "Q: prompt\nA: answer" blocks so the LLM sees the context
  return TALK_PROMPTS.map((p) => {
    const m = t.split("\n\n").find((b) => b.startsWith(`Q: ${p}`));
    return m ? m.split("\nA: ")[1] ?? "" : "";
  });
}

function Talk({ transcript, onTranscript, onDone, onBack }: Props & { onBack: () => void }) {
  const [i, setI] = useState(0);
  const [parts, setParts] = useState<string[]>(() => parseTranscript(transcript));
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [supported, setSupported] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const recRef = useRef<SpeechRec | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection runs client-side only
    setSupported(!!getRecognizer());
    return () => recRef.current?.stop();
  }, []);

  useEffect(() => {
    if (!listening) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [listening]);

  const save = (next: string[]) => {
    setParts(next);
    onTranscript(TALK_PROMPTS.map((p, k) => (next[k] ? `Q: ${p}\nA: ${next[k]}` : "")).filter(Boolean).join("\n\n"));
  };

  function start() {
    const rec = getRecognizer();
    if (!rec) return;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    const base = parts[i] ? parts[i] + " " : "";
    let finalText = "";
    rec.onresult = (e) => {
      let inter = "";
      for (let k = e.resultIndex; k < e.results.length; k++) {
        const r = e.results[k];
        if (r.isFinal) finalText += r[0].transcript + " ";
        else inter += r[0].transcript;
      }
      setInterim(inter);
      const next = [...parts];
      next[i] = (base + finalText).trim();
      save(next);
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed") setSupported(false);
    };
    recRef.current = rec;
    setSeconds(0);
    setListening(true);
    rec.start();
  }
  function stop() {
    recRef.current?.stop();
  }

  const last = i === TALK_PROMPTS.length - 1;
  const go = (n: number) => {
    stop();
    setI(n);
  };
  const totalWords = parts.join(" ").split(/\s+/).filter(Boolean).length;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 text-sm text-muted">
        <button onClick={() => (i ? go(i - 1) : onBack())} className="underline">← Back</button>
        <span className="font-semibold uppercase tracking-wide">Just talk</span>
        <span className="ml-auto">Prompt {i + 1} / {TALK_PROMPTS.length} · {totalWords} words so far</span>
      </div>

      <div key={i} className="card rise space-y-5">
        <h2 className="font-display text-2xl sm:text-3xl font-semibold">{TALK_PROMPTS[i]}</h2>
        <p className="text-sm text-muted">Talk for a minute or so. Ramble — details help (kids, work, hobbies, where you hang out).</p>

        {supported ? (
          <div className="flex items-center gap-4">
            <button
              onClick={listening ? stop : start}
              className={`relative w-20 h-20 rounded-full text-3xl text-white transition ${listening ? "bg-red-500" : "bg-brand hover:scale-105"}`}
              aria-label={listening ? "Stop recording" : "Start recording"}
            >
              {listening && <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-40" />}
              <span className="relative">{listening ? "■" : "🎙️"}</span>
            </button>
            <div className="text-sm">
              {listening ? (
                <span className="font-semibold">Listening… {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</span>
              ) : (
                <span className="text-muted">Tap to start talking. You can also type or edit below.</span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm rounded-xl bg-accent/30 px-3 py-2">Voice isn&apos;t available in this browser (try Chrome or Safari) — type your answer instead.</p>
        )}

        <textarea
          className="input min-h-36"
          value={parts[i] + (interim ? ` ${interim}` : "")}
          onChange={(e) => {
            const next = [...parts];
            next[i] = e.target.value;
            save(next);
          }}
          placeholder="Your words show up here…"
        />
      </div>

      <div className="flex justify-between">
        <button className="btn-ghost" onClick={() => (last ? onDone() : go(i + 1))}>Skip</button>
        <button className="btn" onClick={() => (last ? (stop(), onDone()) : go(i + 1))} disabled={!parts[i]?.trim()}>
          {last ? "I'm done ✓" : "Next prompt →"}
        </button>
      </div>
    </div>
  );
}
