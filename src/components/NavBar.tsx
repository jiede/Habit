import { NavLink } from "react-router-dom";

const linkStyle = ({ isActive }: { isActive: boolean }) => ({
  fontWeight: isActive ? 700 : 400,
  marginRight: "1rem",
});

export default function NavBar() {
  return (
    <nav style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #ddd" }}>
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
    </nav>
  );
}
