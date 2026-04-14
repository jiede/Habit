import { NavLink } from "react-router-dom";
import { logout } from "../lib/session";

const linkStyle = ({ isActive }: { isActive: boolean }) => ({
  fontWeight: isActive ? 700 : 400,
  marginRight: "1rem",
});

interface NavBarProps {
  onLogout: () => void;
}

export default function NavBar({ onLogout }: NavBarProps) {
  async function handleLogout() {
    try {
      await logout();
    } finally {
      onLogout();
    }
  }

  return (
    <nav
      style={{
        padding: "0.75rem 1rem",
        borderBottom: "1px solid #ddd",
        display: "flex",
        alignItems: "center",
      }}
    >
      <div>
        <NavLink to="/" end style={linkStyle}>
          今日
        </NavLink>
        <NavLink to="/week" style={linkStyle}>
          本周
        </NavLink>
        <NavLink to="/stats" style={linkStyle}>
          统计
        </NavLink>
        <NavLink to="/habits" style={linkStyle}>
          习惯
        </NavLink>
      </div>
      <button type="button" onClick={() => void handleLogout()} style={{ marginLeft: "auto" }}>
        退出登录
      </button>
    </nav>
  );
}
