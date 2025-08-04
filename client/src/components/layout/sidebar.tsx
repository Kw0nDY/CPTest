import { 
  Home, 
  Database, 
  Bot, 
  Settings2, 
  BarChart, 
  Users, 
  Key 
} from "lucide-react";

export default function Sidebar() {
  const menuItems = [
    { icon: Home, label: "Home", href: "#" },
    { icon: Database, label: "Data Integration", href: "#", active: true },
    { icon: Bot, label: "AI Model Management", href: "#" },
    { icon: Settings2, label: "Workflows", href: "#" },
    { icon: BarChart, label: "Dashboard", href: "#" },
  ];

  const settingsItems = [
    { icon: Users, label: "User Management", href: "#" },
    { icon: Key, label: "API Key Management", href: "#" },
  ];

  return (
    <aside className="w-60 bg-white border-r border-gray-200 h-full overflow-y-auto">
      <nav className="p-4">
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-600 mb-3">Main Menu</h2>
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className={`flex items-center px-3 py-2 text-sm rounded transition-colors ${
                    item.active
                      ? "cp-sidebar-active"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <item.icon className="w-4 h-4 mr-3" />
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-600 mb-3">Settings</h2>
          <ul className="space-y-1">
            {settingsItems.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className="flex items-center px-3 py-2 text-sm text-gray-700 rounded hover:bg-gray-100 transition-colors"
                >
                  <item.icon className="w-4 h-4 mr-3" />
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </aside>
  );
}
