import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, LogIn, UserPlus, LayoutDashboard, User, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

const Header = ({ settings }) => {
  const { t } = useTranslation(['common', 'landing']);
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check if user is logged in
  useEffect(() => {
    const checkAuth = () => {
      const user = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      setIsLoggedIn(!!(user && token));
    };

    checkAuth();
    // Listen for storage changes (login/logout in other tabs)
    window.addEventListener('storage', checkAuth);
    window.addEventListener('auth-state-changed', checkAuth);
    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('auth-state-changed', checkAuth);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Set scrolled state
      setIsScrolled(currentScrollY > 20);

      // Hide/show header on mobile based on scroll direction
      if (window.innerWidth < 768) {
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
          // Scrolling down & past 100px
          setIsVisible(false);
        } else {
          // Scrolling up
          setIsVisible(true);
        }
      } else {
        // Always visible on desktop
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [lastScrollY]);

  const navItems = [
    { label: t('common:nav_home'), href: '#accueil' },
    { label: t('common:nav_about'), href: '#features' },
    { label: t('common:nav_pricing'), href: '#pricing' },
    { label: t('common:nav_contact'), href: '#contact' }
  ];

  // Smooth scroll handler
  const handleNavClick = (e, href) => {
    e.preventDefault();
    setIsMenuOpen(false);

    const targetId = href.substring(1);
    const idAlias = {
      apropos: 'features',
      tarifs: 'pricing'
    };
    const element = document.getElementById(targetId) || document.getElementById(idAlias[targetId]);

    if (element) {
      const headerHeight = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <header className={`fixed left-0 right-0 z-50 transition-all duration-300 ${isScrolled
        ? 'bg-background/95 backdrop-blur-md shadow-lg border-b'
        : 'bg-background/90 backdrop-blur-sm'
      } ${isVisible ? 'top-0' : '-top-20'
      }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 group cursor-pointer transform transition-all duration-300 hover:scale-105"
          >
            {settings?.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={settings?.siteName || "YourQcm"}
                className="h-10 w-10 object-contain rounded-lg shadow-lg"
              />
            ) : (
              <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
            )}
            <div className="hidden sm:flex flex-col">
              <span className="text-lg font-bold leading-none">{settings?.siteName ? settings.siteName : <><span className="text-[#1a237e]">Your</span><span className="text-[#00b0d4]">Qcm</span></>}</span>
              <span className="text-xs text-gray-500">{settings?.siteVersion || "v1.1"}</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className="relative text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-md hover:bg-accent cursor-pointer"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            {isLoggedIn ? (
              <>
                <Button variant="outline" asChild>
                  <Link to="/dashboard/home">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    {t('common:dashboard', 'Tableau de bord')}
                  </Link>
                </Button>
                <Button asChild className="shadow-md">
                  <Link to="/dashboard/profile">
                    <User className="mr-2 h-4 w-4" />
                    {t('common:profile', 'Profil')}
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/login">
                    <LogIn className="mr-2 h-4 w-4" />
                    {t('common:log_in')}
                  </Link>
                </Button>
                <Button asChild className="shadow-md">
                  <Link to="/register">
                    <UserPlus className="mr-2 h-4 w-4" />
                    {t('common:sign_up')}
                  </Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[320px] sm:w-[380px] flex flex-col p-0">
              <div className="flex items-center justify-between p-6 pb-4">
                <div className="flex items-center gap-2">
                  {settings?.logoUrl ? (
                    <img
                      src={settings.logoUrl}
                      alt={settings?.siteName || "YourQcm"}
                      className="h-10 w-10 object-contain rounded-lg shadow-lg"
                    />
                  ) : (
                    <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                      <GraduationCap className="h-6 w-6 text-white" />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-lg font-bold leading-none">{settings?.siteName ? settings.siteName : <><span className="text-[#1a237e] dark:text-blue-300">Your</span><span className="text-[#00b0d4]">Qcm</span></>}</span>
                    <span className="text-xs text-muted-foreground">{settings?.siteVersion || "v1.1"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                </div>
              </div>

              <Separator />

              <nav className="flex flex-col py-2 flex-1">
                {navItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item.href)}
                    className="text-[15px] font-medium text-foreground/90 hover:text-primary hover:bg-accent/80 transition-all px-6 py-4 border-b border-border/40 last:border-b-0 cursor-pointer"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>

              <Separator />

              <div className="flex flex-col gap-3 p-6 bg-muted/30">
                {isLoggedIn ? (
                  <>
                    <Button variant="outline" asChild className="w-full h-12 font-medium shadow-sm hover:shadow">
                      <Link to="/dashboard/home" onClick={() => setIsMenuOpen(false)}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        {t('common:dashboard', 'Tableau de bord')}
                      </Link>
                    </Button>
                    <Button asChild className="w-full h-12 font-medium shadow-md hover:shadow-lg">
                      <Link to="/dashboard/profile" onClick={() => setIsMenuOpen(false)}>
                        <User className="mr-2 h-4 w-4" />
                        {t('common:profile', 'Profil')}
                      </Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" asChild className="w-full h-12 font-medium shadow-sm hover:shadow">
                      <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                        <LogIn className="mr-2 h-4 w-4" />
                        {t('common:log_in')}
                      </Link>
                    </Button>
                    <Button asChild className="w-full h-12 font-medium shadow-md hover:shadow-lg">
                      <Link to="/register" onClick={() => setIsMenuOpen(false)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        {t('common:sign_up')}
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
