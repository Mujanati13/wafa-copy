import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Menu,
  GraduationCap,
  UserRound,
  Settings,
  CreditCard,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import NotificationDropdown from "./NotificationDropdown";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { userService } from "@/services/userService";
import { signOut } from "@/services/authService";
import { api } from "@/lib/utils";

const parseStorageJSON = (key, fallback = null) => {
  try {
    const rawValue = localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch (error) {
    console.warn(`Invalid JSON found in localStorage for key: ${key}`, error);
    return fallback;
  }
};

const normalizeLandingSettings = (settings) => {
  const currentSettings = settings || {};
  const siteName = /^(atlas\s*qcm|wafa)$/i.test(currentSettings.siteName?.trim() || '')
    ? 'YourQCM'
    : currentSettings.siteName || 'YourQCM';

  return { ...currentSettings, siteName };
};

const TopBar = ({ onMenuClick }) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const [user, setUser] = useState(() => parseStorageJSON('userProfile', parseStorageJSON('user', null)));
  const [landingSettings, setLandingSettings] = useState(() => normalizeLandingSettings(
    parseStorageJSON('landingSettings', { siteName: 'YourQCM', siteVersion: 'v1.1', logoUrl: '' })
  ));
  const navigate = useNavigate();

  // Fetch landing settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get('/landing-settings');
        if (data.success && data.data) {
          const normalizedSettings = normalizeLandingSettings(data.data);
          setLandingSettings(normalizedSettings);
          localStorage.setItem('landingSettings', JSON.stringify(normalizedSettings));
        }
      } catch (error) {
        console.error('Failed to fetch landing settings:', error);
      }
    };
    fetchSettings();
  }, []);

  // Fetch user profile on mount (force refresh to get latest data)
  useEffect(() => {
    let isMounted = true;

    const fetchUser = async () => {
      try {
        // Force refresh on component mount to ensure we have latest data
        const userData = await userService.getUserProfile(true);
        if (!isMounted) return;
        setUser(userData);
        // Sync both localStorage keys
        localStorage.setItem('userProfile', JSON.stringify(userData));
        localStorage.setItem('user', JSON.stringify(userData));
      } catch (error) {
        console.error('Failed to fetch user in TopBar:', error);
        setUser(parseStorageJSON('userProfile', parseStorageJSON('user', null)));
      }
    };

    const handleAuthStateChanged = () => {
      fetchUser();
    };

    const handleStorageChange = (event) => {
      if (!event.key || event.key === 'user' || event.key === 'userProfile' || event.key === 'token') {
        fetchUser();
      }
    };

    fetchUser();
    window.addEventListener('auth-state-changed', handleAuthStateChanged);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      isMounted = false;
      window.removeEventListener('auth-state-changed', handleAuthStateChanged);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const getUserInitials = () => {
    if (!user?.name) return 'U';
    const parts = user.name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    try {
      await signOut();
      userService.clearProfileCache();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Force logout even if there's an error
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("userProfile");
      userService.clearProfileCache();
      navigate("/login");
    }
  };

  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm h-14 sm:h-16">
      <div className="flex items-center justify-between h-full px-3 sm:px-4 md:px-6 gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {/* Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10"
          >
            <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>

          {/* Logo - Hidden on mobile, visible on sm and up */}
          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
            {landingSettings.logoUrl ? (
              <img 
                src={landingSettings.logoUrl} 
                alt={landingSettings.siteName || 'YourQCM'}
                className="h-8 w-8 rounded-lg object-cover"
              />
            ) : (
              <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
            )}
            <div className="hidden sm:flex flex-col">
              <span className="text-sm font-bold text-foreground leading-none">{landingSettings.siteName || 'YourQCM'}</span>
              <span className="text-xs text-muted-foreground">{landingSettings.siteVersion || 'v1.1'}</span>
            </div>
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Theme Toggle */}
          <ThemeToggle />
          {/* Notifications */}
          <NotificationDropdown />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full p-0">
                <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
                  <AvatarImage src={user?.profilePicture?.startsWith('http') ? user.profilePicture : user?.profilePicture ? `${import.meta.env.VITE_API_URL?.replace('/api/v1', '')}${user.profilePicture}` : undefined} alt={user?.name} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-teal-500 text-white">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-72 sm:w-80 max-h-[500px] overflow-y-auto rounded-md border border-slate-200 bg-white p-0 text-slate-900 shadow-lg dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              align="end"
              sideOffset={8}
              forceMount
            >
              <DropdownMenuLabel className="font-normal p-3 sm:p-4">
                <div className="flex flex-col space-y-2">
                  <p className="text-sm sm:text-base font-semibold leading-none">{user?.name || t('common:user')}</p>
                  <p className="text-xs sm:text-sm leading-none text-muted-foreground truncate">
                    {user?.email || ''}
                  </p>
                  {/* User Stats Row */}
                  <div className="flex items-center gap-2 sm:gap-3 pt-2 text-xs">
                    {/* <div className="flex items-center gap-1" title="Points Questions">
                      <span className="text-yellow-500">⚡</span>
                      <span className="font-medium">{user?.normalPoints || 0}</span>
                    </div> */}
                    <div className="flex items-center gap-1" title="Reports approuvés">
                      <span className="text-green-500">🟢</span>
                      <span className="font-medium">{user?.greenPoints || 0}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Explications approuvées">
                      <span className="text-blue-500">🔵</span>
                      <span className="font-medium">{user?.bluePoints || 0}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex-shrink-0 ml-auto">
                      {user?.totalPoints || 0} pts
                    </Badge>
                  </div>
                  
                  {/* Level and Progress */}
                  <div className="pt-2 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground font-medium">Niveau {Math.floor((user?.totalPoints || 0) / 50)}</span>
                      <span className="text-muted-foreground">{((user?.totalPoints || 0) % 50)}/50 XP</span>
                    </div>
                    
                    {/* Detailed Progress Bar */}
                    <div className="w-full bg-muted rounded-full h-3 overflow-hidden relative">
                      {(() => {
                        const totalPoints = user?.totalPoints || 0;
                        const currentLevelPoints = totalPoints % 50;
                        const progressPercent = (currentLevelPoints / 50) * 100;
                        
                        return (
                          <div 
                            className="bg-gradient-to-r from-blue-400 to-blue-500 h-full transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                          />
                        );
                      })()}
                    </div>
                    
                    {/* Legend */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                      {(user?.normalPoints || 0) > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                          <span>Questions ({user?.normalPoints || 0})</span>
                        </div>
                      )}
                      {(user?.greenPoints || 0) > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-400"></div>
                          <span>Reports ({(user?.greenPoints || 0) * 30})</span>
                        </div>
                      )}
                      {(user?.bluePoints || 0) > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                          <span>Explic. ({(user?.bluePoints || 0) * 40})</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="m-0 bg-slate-200 dark:bg-slate-700" />
              <DropdownMenuItem
                onClick={() => navigate("/dashboard/profile")}
                className="cursor-pointer gap-3 rounded-none px-4 py-3 text-sm focus:bg-slate-100 dark:focus:bg-slate-800"
              >
                <UserRound className="h-4 w-4 text-slate-500" aria-hidden="true" />
                <span>Profil</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/dashboard/settings")}
                className="cursor-pointer gap-3 rounded-none px-4 py-3 text-sm focus:bg-slate-100 dark:focus:bg-slate-800"
              >
                <Settings className="h-4 w-4 text-slate-500" aria-hidden="true" />
                <span>Paramètres</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/dashboard/subscription")}
                className="cursor-pointer gap-3 rounded-none px-4 py-3 text-sm focus:bg-slate-100 dark:focus:bg-slate-800"
              >
                <CreditCard className="h-4 w-4 text-slate-500" aria-hidden="true" />
                <span>L&apos;abonnement</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="m-0 bg-slate-200 dark:bg-slate-700" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer gap-3 rounded-none px-4 py-3 text-sm text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-950/40 dark:focus:text-red-300"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span>{t('common:logout')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
