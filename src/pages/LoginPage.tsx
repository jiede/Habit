import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/useToast";
import type { SessionUser } from "../lib/session";
import { login, register } from "../lib/session";

type AuthMode = "login" | "register";

interface LoginPageProps {
  onAuthenticated: (user: SessionUser) => void;
}

export default function LoginPage({ onAuthenticated }: LoginPageProps) {
  const navigate = useNavigate();
  const { show } = useToast();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const credentials = { email, password };
      const user =
        mode === "login"
          ? await login(credentials)
          : await register(credentials).then(() => login(credentials));
      onAuthenticated(user);
      navigate("/", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "操作失败，请稍后重试";
      show(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page surface section-block" style={{ maxWidth: 480, margin: "1.4rem auto" }}>
      <h1>{mode === "login" ? "登录" : "注册"}</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 4 }}>
          邮箱
          <input
            type="email"
            value={email}
            autoComplete="email"
            required
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          密码
          <input
            type="password"
            value={password}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? "提交中…" : mode === "login" ? "登录" : "注册并登录"}
        </button>
      </form>
      <button
        type="button"
        className="ghost"
        style={{ marginTop: 12 }}
        onClick={() => setMode((prev) => (prev === "login" ? "register" : "login"))}
      >
        {mode === "login" ? "没有账号？去注册" : "已有账号？去登录"}
      </button>
    </section>
  );
}
