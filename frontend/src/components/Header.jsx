import { Link, NavLink } from "react-router-dom";
import { Hand } from "lucide-react";

const navItem = ({ isActive }) =>
  `text-sm tracking-wide transition-colors ${
    isActive ? "text-[#2E5A44]" : "text-[#1F2421]/70 hover:text-[#2E5A44]"
  }`;

export const Header = () => {
  return (
    <header className="glass sticky top-0 z-50" data-testid="site-header">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          to="/"
          className="flex items-center gap-2.5 ring-focus rounded-md"
          data-testid="brand-link"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2E5A44] text-white">
            <Hand strokeWidth={1.6} className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">
            SignBridge<span className="text-[#2E5A44]"> AI</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <NavLink to="/" end className={navItem} data-testid="nav-home">
            Home
          </NavLink>
          <NavLink to="/studio" className={navItem} data-testid="nav-studio">
            Studio
          </NavLink>
          <NavLink to="/analytics" className={navItem} data-testid="nav-analytics">
            Analytics
          </NavLink>
          <NavLink to="/about" className={navItem} data-testid="nav-about">
            About
          </NavLink>
        </nav>
        <Link
          to="/studio"
          className="rounded-full bg-[#2E5A44] px-5 py-2 text-sm font-medium text-white transition-all duration-300 hover:bg-[#244a37] ring-focus"
          data-testid="header-cta-launch"
        >
          Launch Studio
        </Link>
      </div>
    </header>
  );
};
