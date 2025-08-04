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
    { icon: Home, label: "홈", href: "#" },
    { icon: Database, label: "데이터 통합", href: "#", active: true },
    { icon: Bot, label: "AI 모델 관리", href: "#" },
    { icon: Settings2, label: "워크플로우", href: "#" },
    { icon: BarChart, label: "대시보드", href: "#" },
  ];

  const settingsItems = [
    { icon: Users, label: "사용자 관리", href: "#" },
    { icon: Key, label: "API 키 관리", href: "#" },
  ];

  return (
    <aside className="w-60 bg-white border-r border-gray-200 h-full overflow-y-auto">
      <nav className="p-4">
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-600 mb-3">메인메뉴</h2>
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
          <h2 className="text-sm font-medium text-gray-600 mb-3">설정</h2>
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
