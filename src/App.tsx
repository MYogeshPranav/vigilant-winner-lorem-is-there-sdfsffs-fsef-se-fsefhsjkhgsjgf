import { useMemo, useState } from "react";

type CodeKind = "pin" | "token" | "uuid" | "color";

type Settings = {
  uppercase: boolean;
  lowercase: boolean;
  digits: boolean;
};

type HistoryItem = {
  value: string;
  label: string;
  id: number;
};

const codeKinds: Array<{ id: CodeKind; label: string; note: string }> = [
  { id: "pin", label: "PIN", note: "numeric" },
  { id: "token", label: "Access key", note: "readable" },
  { id: "uuid", label: "UUID", note: "standard" },
  { id: "color", label: "Hex color", note: "six digit" },
];

const lengths = [6, 8, 12, 16, 24, 32];
const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const lowercase = "abcdefghjkmnpqrstuvwxyz";
const digits = "23456789";

function secureRandom(length: number) {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    return Array.from(crypto.getRandomValues(new Uint32Array(length)));
  }
  return Array.from({ length }, () => Math.floor(Math.random() * 0xffffffff));
}

function fromAlphabet(length: number, alphabet: string) {
  return secureRandom(length)
    .map((value) => alphabet[value % alphabet.length])
    .join("");
}

function group(value: string, size: number) {
  return value.match(new RegExp(`.{1,${size}}`, "g"))?.join("-") ?? value;
}

function buildCode(kind: CodeKind, length: number, settings: Settings) {
  if (kind === "pin") return group(fromAlphabet(Math.min(length, 8), "0123456789"), 3);

  if (kind === "uuid") {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    const bytes = secureRandom(16).map((value) => value & 0xff);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  if (kind === "color") return `#${fromAlphabet(6, "0123456789ABCDEF")}`;

  const alphabet = `${settings.uppercase ? uppercase : ""}${settings.lowercase ? lowercase : ""}${settings.digits ? digits : ""}`;
  return group(fromAlphabet(length, alphabet || uppercase), 4);
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="8" y="8" width="11" height="11" rx="1.5" />
      <path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-10A1.5 1.5 0 0 0 3 5.5v10A1.5 1.5 0 0 0 4.5 17H8" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 4v6h-6" />
    </svg>
  );
}

export default function App() {
  const [kind, setKind] = useState<CodeKind>("token");
  const [length, setLength] = useState(16);
  const [settings, setSettings] = useState<Settings>({ uppercase: true, lowercase: true, digits: true });
  const [code, setCode] = useState(() => buildCode("token", 16, { uppercase: true, lowercase: true, digits: true }));
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copied, setCopied] = useState(false);

  const activeKind = useMemo(() => codeKinds.find((item) => item.id === kind)!, [kind]);
  const isToken = kind === "token";
  const allowsLength = kind === "pin" || kind === "token";

  function generate(nextKind = kind, nextLength = length, nextSettings = settings) {
    const freshCode = buildCode(nextKind, nextLength, nextSettings);
    setCode(freshCode);
    setCopied(false);
    setHistory((items) => [
      { value: freshCode, label: codeKinds.find((item) => item.id === nextKind)!.label, id: Date.now() },
      ...items.filter((item) => item.value !== freshCode),
    ].slice(0, 3));
  }

  function chooseKind(nextKind: CodeKind) {
    setKind(nextKind);
    generate(nextKind);
  }

  function chooseLength(nextLength: number) {
    setLength(nextLength);
    generate(kind, nextLength);
  }

  function toggleSetting(setting: keyof Settings) {
    const nextSettings = { ...settings, [setting]: !settings[setting] };
    setSettings(nextSettings);
    generate(kind, length, nextSettings);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1700);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f2f0e9] text-[#11110f] selection:bg-[#cbff57] selection:text-[#11110f]">
      <div className="site-grain pointer-events-none fixed inset-0" aria-hidden="true" />
      <div className="relative mx-auto flex min-h-screen max-w-[1440px] flex-col px-5 py-5 sm:px-8 sm:py-7 lg:px-12">
        <header className="flex items-center justify-between border-b border-black/15 pb-5">
          <a href="#generator" className="flex items-center gap-3" aria-label="Random Code home">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#161614] text-xs font-bold text-[#cbff57]">R</span>
            <span className="text-[11px] font-bold tracking-[0.22em]">RANDOM CODE</span>
          </a>
          <p className="hidden text-[10px] font-semibold tracking-[0.2em] text-black/45 sm:block">FIELD TOOL / 001</p>
          <button
            type="button"
            onClick={() => generate()}
            className="group flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] transition-opacity hover:opacity-55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
          >
            NEW CODE
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-black/30 transition-transform duration-300 group-hover:rotate-90">
              <ArrowIcon />
            </span>
          </button>
        </header>

        <section id="generator" className="flex flex-1 flex-col justify-center py-12 lg:py-16">
          <div className="grid items-end gap-11 lg:grid-cols-[minmax(0,0.88fr)_minmax(520px,1.12fr)] lg:gap-16">
            <div className="max-w-xl lg:pb-2">
              <p className="mb-6 text-[11px] font-bold tracking-[0.2em] text-black/50">A SMALL UTILITY FOR UNPREDICTABLE THINGS</p>
              <h1 className="font-mono text-[clamp(4rem,10vw,9.5rem)] font-black leading-[0.78] tracking-[-0.1em]">
                RANDOM
                <br />
                <span className="text-[#87ae1c]">CODE</span>
              </h1>
              <p className="mt-9 max-w-sm text-base leading-relaxed text-black/62 sm:text-lg">
                Fresh, browser-generated values for a clean handoff, a quick prototype, or the next thing you need to name.
              </p>
              <div className="mt-10 flex items-center gap-3 text-[10px] font-bold tracking-[0.15em] text-black/45">
                <span className="h-px w-9 bg-black/25" />
                GENERATED LOCALLY
              </div>
            </div>

            <div className="generator-panel bg-[#151513] p-5 text-[#f4f2eb] shadow-[10px_10px_0_#cbff57] sm:p-8">
              <div className="flex items-start justify-between gap-4 border-b border-white/15 pb-5">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.2em] text-[#cbff57]">OUTPUT</p>
                  <p className="mt-1 text-xs text-white/45">{activeKind.label.toUpperCase()} GENERATOR</p>
                </div>
                <span className="flex items-center gap-2 text-[10px] font-bold tracking-[0.13em] text-white/42">
                  <span className="live-dot h-1.5 w-1.5 rounded-full bg-[#cbff57]" />
                  LIVE
                </span>
              </div>

              <div className="code-window my-6 overflow-hidden border border-white/15 bg-[#0c0c0b] px-4 py-7 sm:px-6 sm:py-9">
                <p className="mb-4 font-mono text-[9px] tracking-[0.2em] text-white/35">// {activeKind.note.toUpperCase()}</p>
                <output key={code} className="code-reveal block overflow-x-auto whitespace-nowrap font-mono text-[clamp(1.7rem,4.2vw,3.5rem)] font-bold leading-none tracking-[-0.06em] text-[#cbff57]">
                  {code}
                </output>
              </div>

              <div className="flex flex-col gap-3 border-b border-white/15 pb-6 sm:flex-row">
                <button
                  type="button"
                  onClick={() => generate()}
                  className="flex min-h-12 flex-1 items-center justify-center gap-3 bg-[#cbff57] px-4 text-xs font-black tracking-[0.16em] text-[#161614] transition-colors hover:bg-[#e3ff9f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#cbff57]"
                >
                  GENERATE
                  <span className="h-5 w-5"><ArrowIcon /></span>
                </button>
                <button
                  type="button"
                  onClick={copyCode}
                  className="flex min-h-12 items-center justify-center gap-3 border border-white/35 px-6 text-xs font-bold tracking-[0.14em] transition-colors hover:border-white hover:bg-white hover:text-[#151513] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#cbff57]"
                >
                  <span className="h-4 w-4"><CopyIcon /></span>
                  {copied ? "COPIED" : "COPY"}
                </button>
              </div>

              <div className="pt-6">
                <p className="mb-3 text-[10px] font-bold tracking-[0.18em] text-white/42">FORMAT</p>
                <div className="grid grid-cols-2 gap-px bg-white/15 sm:grid-cols-4">
                  {codeKinds.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => chooseKind(item.id)}
                      className={`min-h-16 px-3 text-left transition-colors focus-visible:relative focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#cbff57] ${
                        kind === item.id ? "bg-[#f4f2eb] text-[#151513]" : "bg-[#151513] text-white hover:bg-white/10"
                      }`}
                    >
                      <span className="block text-xs font-bold">{item.label}</span>
                      <span className={`mt-1 block text-[9px] tracking-[0.08em] ${kind === item.id ? "text-black/45" : "text-white/38"}`}>{item.note}</span>
                    </button>
                  ))}
                </div>
              </div>

              {allowsLength && (
                <div className="pt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[10px] font-bold tracking-[0.18em] text-white/42">LENGTH</p>
                    <span className="font-mono text-xs text-[#cbff57]">{kind === "pin" ? Math.min(length, 8) : length}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {lengths.filter((option) => kind !== "pin" || option <= 8).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => chooseLength(option)}
                        className={`h-8 min-w-9 border px-2 font-mono text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cbff57] ${
                          length === option ? "border-[#cbff57] bg-[#cbff57] text-[#151513]" : "border-white/20 text-white/55 hover:border-white/70 hover:text-white"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isToken && (
                <div className="mt-6 grid grid-cols-3 gap-px border-t border-white/15 pt-6">
                  {([
                    ["A-Z", "uppercase"],
                    ["a-z", "lowercase"],
                    ["0-9", "digits"],
                  ] as Array<[string, keyof Settings]>).map(([label, setting]) => (
                    <button
                      key={setting}
                      type="button"
                      onClick={() => toggleSetting(setting)}
                      className={`min-h-10 border text-[10px] font-bold tracking-[0.12em] transition-colors focus-visible:relative focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#cbff57] ${
                        settings[setting] ? "border-[#cbff57]/70 bg-[#cbff57]/10 text-[#cbff57]" : "border-white/20 text-white/35 hover:border-white/50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-5 border-t border-black/15 pt-5 sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-sm text-xs leading-relaxed text-black/48">
            Values are made in this browser and are never sent anywhere. Use a password manager for high-stakes secrets.
          </p>
          <div className="min-w-[235px]">
            <p className="mb-2 text-[9px] font-bold tracking-[0.18em] text-black/45">RECENT OUTPUT</p>
            {history.length ? (
              <div className="space-y-1">
                {history.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setCode(item.value);
                      setCopied(false);
                    }}
                    className="flex w-full items-center justify-between gap-4 border-b border-black/10 py-1.5 text-left font-mono text-[11px] transition-colors hover:text-[#759c12]"
                  >
                    <span className="max-w-[170px] truncate">{item.value}</span>
                    <span className="font-sans text-[9px] font-bold tracking-[0.1em] text-black/35">{item.label.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="font-mono text-xs text-black/38">waiting for next value</p>
            )}
          </div>
        </footer>
      </div>
    </main>
  );
}