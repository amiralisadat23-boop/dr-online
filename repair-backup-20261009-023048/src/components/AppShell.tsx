import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Bot, HeartPulse, Home, Stethoscope, Users, FileHeart, Bell } from "lucide-react";
import { useAuth } from "../auth";

const nav = {
  patient: [
    { to: "/app", icon: Home, label: "خانه", end: true },
    { to: "/app/log", icon: HeartPulse, label: "ثبت" },
    { to: "/app/ai", icon: Bot, label: "هوشمند" },
    { to: "/app/record", icon: FileHeart, label: "پرونده" },
  ],
  caregiver: [
    { to: "/app", icon: Users, label: "بیماران", end: true },
    { to: "/app/alerts", icon: Bell, label: "هشدار" },
    { to: "/app/ai", icon: Bot, label: "هوشمند" },
    { to: "/app/me", icon: HeartPulse, label: "من" },
  ],
  doctor: [
    { to: "/app", icon: Stethoscope, label: "پنل", end: true },
    { to: "/app/alerts", icon: Bell, label: "هشدار" },
    { to: "/app/ai", icon: Bot, label: "هوشمند" },
    { to: "/app/me", icon: FileHeart, label: "من" },
  ],
};

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  const items = nav[user.role];

  return (
    <div className="phone-shell bg-paper relative min-h-dvh">
      <header className="sticky top-0 z-20 flex items-center justify-between px-5 pt-5 pb-3 bg-paper/80 backdrop-blur">
        <div>
          <p className="text-xs text-muted">{roleLabel(user.role)}</p>
          <h1 className="text-lg font-bold leading-none mt-1">{user.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="text-sm text-teal" onClick={() => navigate("/app/me")}>
            حساب
          </button>
          <button
            className="text-sm text-coral"
            onClick={() => {
              logout();
              navigate("/");
            }}
          >
            خروج
          </button>
        </div>
      </header>
      <div className="safe-bottom px-4 rise">
        <Outlet />
      </div>
      <nav className="fixed bottom-0 inset-x-0 mx-auto max-w-[430px] bg-white/90 backdrop-blur border-t border-black/5 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4 h-[72px]">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 text-[11px] ${
                  isActive ? "text-teal font-bold" : "text-muted"
                }`
              }
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

function roleLabel(role: string) {
  if (role === "patient") return "پنل بیمار";
  if (role === "caregiver") return "پنل مراقب";
  return "پنل پزشک";
}
