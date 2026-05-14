import { Link, NavLink, useNavigate } from "react-router-dom";
import { Sparkles, Coins, LogOut, ShieldCheck, User as UserIcon } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useUserCredits } from "@/hooks/useUserCredits";

export function Navbar() {
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();
  const { credits } = useUserCredits();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between gap-2">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </span>
          <span className="text-gradient hidden sm:inline">Convertify</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {[
            { to: "/", label: "Home" },
            { to: "/pricing", label: "Pricing" },
          ].map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted",
                  isActive && "bg-accent text-accent-foreground"
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user && credits && (
            <Link
              to="/pricing"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
              title="Your credits"
            >
              <Coins className="h-3.5 w-3.5 text-primary" />
              {credits.isUnlimited ? "Unlimited" : credits.credits}
            </Link>
          )}
          <ThemeToggle />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Account">
                  <UserIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {credits && (
                  <DropdownMenuItem className="sm:hidden" onSelect={() => navigate("/pricing")}>
                    <Coins className="h-4 w-4 mr-2" />
                    {credits.isUnlimited ? "Unlimited" : `${credits.credits} credits`}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => navigate("/pricing")}>
                  <Coins className="h-4 w-4 mr-2" /> Buy credits
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onSelect={() => navigate("/admin/payments")}>
                    <ShieldCheck className="h-4 w-4 mr-2" /> Admin payments
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => signOut()}>
                  <LogOut className="h-4 w-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" onClick={() => navigate("/auth")}>Sign in</Button>
          )}
        </div>
      </div>
    </header>
  );
}
