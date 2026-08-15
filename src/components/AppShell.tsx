import { type ReactNode, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  GraduationCap,
  ClipboardCheck,
  Award,
  FileBarChart,
  Database,
  Settings,
  Menu,
  X,
  WifiOff,
  Cloud,
  LogOut,
  Calculator,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useApp } from "@/context/AppContext";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/classes", label: "Classes", icon: GraduationCap },
  { to: "/exams", label: "Exams", icon: ClipboardCheck },
  { to: "/combined", label: "Combined Analysis", icon: Calculator },
  { to: "/assignments", label: "Assignments", icon: ClipboardCheck },
  { to: "/grace-marks", label: "Grace Marks", icon: Award },
  { to: "/reports", label: "Reports", icon: FileBarChart },
  { to: "/import-export", label: "Import / Export", icon: Database },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { mode, signOut, exitOfflineMode, user } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isOnline = mode === "online";

  const SidebarContent = () => (
    <>
      <div className="px-4 py-5 flex items-center gap-3">
        <Logo size={40} />
        <div>
          <h1 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
            SAM
          </h1>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 -mt-0.5">
            Academics Manager
          </p>
        </div>
      </div>

      <div className="px-3 mb-2">
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
            isOnline
              ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
              : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
          }`}
        >
          {isOnline ? (
            <Cloud className="w-4 h-4" />
          ) : (
            <WifiOff className="w-4 h-4" />
          )}
          {isOnline
            ? "Online Mode — Cloud Sync"
            : "Offline Mode — This Device Only"}
        </div>
      </div>

      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-100 dark:border-gray-800">
        {isOnline && user && (
          <div className="px-3 py-2 mb-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user.email}
            </p>
          </div>
        )}
        {isOnline && (
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 w-full transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        )}
        {!isOnline && (
          <button
            onClick={exitOfflineMode}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 w-full transition-all"
          >
            <LogOut className="w-5 h-5" /> Exit Offline Mode
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 fixed h-screen z-30">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 animate-fade-in">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 bg-white dark:bg-gray-900 shadow-e4 animate-slide-up flex flex-col">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 btn-icon z-10"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between no-print">
          <button
            onClick={() => setMobileOpen(true)}
            className="btn-icon"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Logo size={28} />
            <span className="font-semibold text-sm">SAM</span>
          </div>
          <div
            className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-primary-500" : "bg-amber-500"}`}
            title={isOnline ? "Online" : "Offline"}
          />
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
