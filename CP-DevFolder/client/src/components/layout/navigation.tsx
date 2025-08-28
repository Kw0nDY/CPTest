import { Home, Database, Eye, Zap, Brain, Settings, BarChart3 } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';

const navigationItems = [
  { name: 'Main Menu', href: '/', icon: Home },
  { name: 'Data Integration', href: '/data-integration', icon: Database },
  { name: 'View', href: '/view', icon: Eye },
  { name: 'Automation', href: '/automation', icon: Zap },
  { name: 'AI Models', href: '/ai-models', icon: Brain },
  { name: 'Setting', href: '/setting', icon: Settings },
  { name: 'Management', href: '/management', icon: BarChart3 },
];

export default function Navigation() {
  const [location] = useLocation();

  return (
    <nav className="bg-white border-r border-gray-200 w-64 flex-shrink-0">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Navigation</h2>
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <div
                    className={cn(
                      'flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer',
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                    data-testid={`nav-${item.href.slice(1) || 'home'}`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.name}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}