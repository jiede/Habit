import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastCtx = { show: (msg: string) => void };

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const show = useCallback((m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 3500);
  }, []);
  const v = useMemo(() => ({ show }), [show]);
  return (
    <Ctx.Provider value={v}>
      {children}
      {msg ? (
        <div
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            background: "#333",
            color: "#fff",
            padding: "0.75rem 1rem",
            borderRadius: 8,
          }}
        >
          {msg}
        </div>
      ) : null}
    </Ctx.Provider>
  );
}

export function useToast() {
  const v = useContext(Ctx);
  if (!v) throw new Error("ToastProvider missing");
  return v;
}
