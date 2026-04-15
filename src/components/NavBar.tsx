import { NavLink, type NavLinkRenderProps } from "react-router-dom";
import { logout } from "../lib/session";

const navLinkClass = ({ isActive }: NavLinkRenderProps) => `nav-link${isActive ? " is-active" : ""}`;

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
    <nav className="app-nav">
      <div>
        <NavLink to="/" end className={navLinkClass}>
          今日
        </NavLink>
        <NavLink to="/week" className={navLinkClass}>
          本周
        </NavLink>
        <NavLink to="/stats" className={navLinkClass}>
          统计
        </NavLink>
        <NavLink to="/habits" className={navLinkClass}>
          习惯
        </NavLink>
      </div>
      <button type="button" onClick={() => void handleLogout()} className="logout-btn ghost">
        退出登录
      </button>
    </nav>
  );
}
