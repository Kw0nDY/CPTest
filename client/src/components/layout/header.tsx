import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ChevronDown, User, LogOut, Settings, Shield } from 'lucide-react';

interface User {
  id: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
  department: string;
  avatar?: string;
}

const availableUsers: User[] = [
  { id: 'admin', name: 'Admin', role: 'admin', department: 'System' },
  { id: 'mike', name: 'Mike Chen', role: 'manager', department: 'IT Department' },
  { id: 'sarah', name: 'Sarah Kim', role: 'user', department: 'Operations' },
  { id: 'david', name: 'David Park', role: 'user', department: 'IT Department' },
  { id: 'lisa', name: 'Lisa Wang', role: 'manager', department: 'Finance' },
];

interface HeaderProps {
  currentUser: User;
  onUserChange: (user: User) => void;
}

export default function Header({ currentUser, onUserChange }: HeaderProps) {
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'user': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="h-3 w-3" />;
      case 'manager': return <Settings className="h-3 w-3" />;
      case 'user': return <User className="h-3 w-3" />;
      default: return <User className="h-3 w-3" />;
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-blue-700 border-b border-blue-800 h-14 shadow-lg">
      <div className="flex items-center justify-between px-6 h-full">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-blue-600 font-bold text-sm">CP</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">Collaboration Portal</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-white hover:bg-blue-500 hover:text-white" data-testid="user-menu-trigger">
                <span className="text-sm font-medium">Hello {currentUser.name}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-64">
              <div className="p-2">
                <p className="text-xs text-gray-600 mb-2">Switch User (Testing)</p>
                {availableUsers.map((user) => (
                  <DropdownMenuItem
                    key={user.id}
                    onClick={() => onUserChange(user)}
                    className={`flex items-center space-x-2 p-2 ${
                      currentUser.id === user.id ? 'bg-blue-50' : ''
                    }`}
                    data-testid={`user-option-${user.id}`}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-gray-600">{user.department}</p>
                    </div>
                    <Badge className={`${getRoleColor(user.role)} flex items-center space-x-1`}>
                      {getRoleIcon(user.role)}
                      <span className="capitalize text-xs">{user.role}</span>
                    </Badge>
                  </DropdownMenuItem>
                ))}
              </div>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem className="flex items-center space-x-2 p-2">
                <Settings className="h-4 w-4" />
                <span>Profile Settings</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem className="flex items-center space-x-2 p-2 text-red-600">
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export { availableUsers };
export type { User };