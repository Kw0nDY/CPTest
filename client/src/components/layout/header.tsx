import { Home } from "lucide-react";

export default function Header() {
  return (
    <header className="cp-header h-12 flex items-center justify-between px-4 fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center space-x-4">
        <h1 className="text-lg font-semibold">Collaboration Portal</h1>
        <Home className="w-4 h-4 text-yellow-300" />
      </div>
      <div className="flex items-center space-x-4 text-sm">
        <span>Hello Admin</span>
        <span className="cursor-pointer hover:text-yellow-300">Logout</span>
      </div>
    </header>
  );
}
