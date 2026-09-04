import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Home,
  Trophy,
  Book,
  SquareLibrary,
  NotebookPen,
  ChevronDown,
  Loader2,
  Heart,
  Activity,
  FlaskConical,
  Pill,
  Microscope,
  Brain,
  Stethoscope,
  Dna,
  HelpCircle,
  Lock,
  CreditCard,
  BarChart3,
  GraduationCap,
  Crown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { moduleService } from "@/services/moduleService";
import { userService } from "@/services/userService";
import { useSemester } from "@/context/SemesterContext";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { isPremiumProPlan } from "@/utils/subscriptionDisplay";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
const SideBar = ({ sidebarOpen, setSidebarOpen, isMobile }) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const [activeTab, setActiveTab] = useState("overview");
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [userPlan, setUserPlan] = useState("Free");

  // Use shared semester context - only show modules for the selected semester
  const { selectedSemester, userSemesters } = useSemester();

  // Minimum swipe distance for gesture detection
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    if (isLeftSwipe && isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  };

  // Collapsible section open states (all collapsed by default)
  const [openGroups, setOpenGroups] = useState({
    dashboard: false,
    modules: false,
    analysis: false,
    library: false,
  });

  const toggleGroup = (groupKey) =>
    setOpenGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));

  // Load user plan from localStorage
  useEffect(() => {
    const applyCachedUserPlan = () => {
      const storedUser = localStorage.getItem("userProfile") || localStorage.getItem("user");
      if (!storedUser) return;

      try {
        const user = JSON.parse(storedUser);
        setUserPlan(user.plan || "Free");
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    };

    const syncUserPlan = async () => {
      try {
        const user = await userService.getUserProfile(true);
        setUserPlan(user?.plan || "Free");
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("userProfile", JSON.stringify(user));
      } catch (error) {
        console.error("Error fetching user plan:", error);
        applyCachedUserPlan();
      }
    };

    const handleAuthStateChanged = () => {
      syncUserPlan();
    };

    applyCachedUserPlan();
    syncUserPlan();
    window.addEventListener('auth-state-changed', handleAuthStateChanged);

    return () => {
      window.removeEventListener('auth-state-changed', handleAuthStateChanged);
    };
  }, []);

  useEffect(() => {
    const fetchModules = async () => {
      try {
        setLoading(true);
        const { data } = await moduleService.getAllmodules();
        const allModules = data.data || [];
        setModules(allModules);
        
        // Try to save to localStorage with quota exceeded protection
        try {
          localStorage.setItem("modules", JSON.stringify(allModules));
        } catch (e) {
          console.warn("Cannot save modules to localStorage (quota exceeded):", e);
          // Firefox/Brave have stricter storage limits - just continue without cache
        }
      } catch (error) {
        console.error("Error fetching modules:", error);
        // Fallback to localStorage if API fails
        try {
          const storedModules = localStorage.getItem("modules");
          if (storedModules) {
            setModules(JSON.parse(storedModules));
          }
        } catch (e) {
          console.error("Cannot read from localStorage:", e);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchModules();
  }, []);

  // Filter modules based on selected semester from context
  const filteredModules = modules.filter((module) => {
    // Modules available in all semesters are always shown
    if (module.availableInAllSemesters) {
      return true;
    }
    // If a specific semester is selected, show only modules from that semester
    if (selectedSemester) {
      return module.semester === selectedSemester;
    }
    // If no semester selected but user has subscribed semesters, show all subscribed
    if (userSemesters && userSemesters.length > 0) {
      return userSemesters.includes(module.semester);
    }
    // Default: show only S1 for free users (and only the first module)
    return module.semester === "S1";
  }).slice(0, (userPlan === "Free" || userPlan === "GRATUIT") ? 1 : undefined); // GRATUIT users see only 1 module

  // Group modules by semester
  const modulesBySemester = filteredModules.reduce((acc, module) => {
    const semester = module.semester || 'Unknown';
    if (!acc[semester]) {
      acc[semester] = [];
    }
    acc[semester].push(module);
    return acc;
  }, {});

  // Sort semesters (S1, S2, ..., S10)
  const sortedSemesters = Object.keys(modulesBySemester).sort((a, b) => {
    const numA = parseInt(a.replace('S', ''));
    const numB = parseInt(b.replace('S', ''));
    return numA - numB;
  });

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && isMobile && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobile, sidebarOpen, setSidebarOpen]);

  // Base items
  const dashboardItem = {
    id: "overview",
    label: t('dashboard:dashboard'),
    icon: Home,
    path: "/dashboard/home",
  };

  // Icon mapping for medical modules
  const getModuleIcon = (moduleName) => {
    const name = moduleName.toLowerCase();
    if (name.includes('anatomie')) return Heart;
    if (name.includes('physiologie')) return Activity;
    if (name.includes('biochimie')) return FlaskConical;
    if (name.includes('pharmacologie')) return Pill;
    if (name.includes('histologie')) return Microscope;
    if (name.includes('neurologie')) return Brain;
    if (name.includes('pathologie')) return Stethoscope;
    if (name.includes('génétique') || name.includes('genetique')) return Dna;
    return Book; // Default icon
  };

  // Create module sidebar item
  const createModuleSidebarItem = (module) => ({
    id: module._id,
    label: module.name,
    icon: getModuleIcon(module.name),
    path: `/dashboard/subjects/${module._id}`,
  });

  // Other grouped items
  const analysisItems = [
    {
      id: "leaderboard",
      label: t('dashboard:ranking'),
      icon: Trophy,
      path: "/dashboard/leaderboard",
      requiresPremium: true, // PREMIUM or PREMIUM PRO required
      isPremiumFeature: true,
    },
    {
      id: "statistics",
      label: t('dashboard:statistics', 'Statistiques'),
      icon: BarChart3,
      path: "/dashboard/statistics",
      requiresPremium: true, // PREMIUM or PREMIUM PRO required
      isPremiumFeature: true,
    },
  ].filter(item => {
    // Filter out premium features for GRATUIT users
    if (item.requiresPremium && (userPlan === "Free" || userPlan === "GRATUIT")) {
      return false;
    }
    return true;
  });

  const libraryItems = [
    {
      id: "playlist",
      label: t('dashboard:my_playlists'),
      icon: SquareLibrary,
      path: "/dashboard/playlist",
      requiresPremiumPro: true,
    },
    {
      id: "note",
      label: t('dashboard:my_notes'),
      icon: NotebookPen,
      path: "/dashboard/note",
      requiresPremiumPro: true,
    },
    {
      id: "subscription",
      label: t('dashboard:subscription', 'Abonnement'),
      icon: CreditCard,
      path: "/dashboard/subscription",
    },
    {
      id: "support",
      label: t('dashboard:support', 'Support'),
      icon: HelpCircle,
      path: "/dashboard/support",
    },
  ].filter(item => {
    // Filter out Premium Pro features for other subscription tiers.
    if (item.requiresPremiumPro && !isPremiumProPlan(userPlan)) {
      return false;
    }
    return true;
  });

  const navigate = useNavigate();
  return (
    <>
      {/* Mobile Overlay - with fade animation */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
            style={{ top: "4rem" }}
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{
          x: isMobile ? -280 : 0,
          width: isMobile ? 280 : 256,
        }}
        animate={{
          x: isMobile && !sidebarOpen ? -280 : 0,
          width: isMobile ? 280 : sidebarOpen ? 256 : 80,
        }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={`${isMobile ? "fixed" : "relative"} z-50 ${isMobile ? "h-[calc(100vh-4rem)]" : "h-full"
          } flex flex-col bg-card border-r border-border shadow-xl left-0 ${isMobile ? "top-16" : "top-0"
          } ${isMobile ? "lg:relative lg:top-0" : ""} overflow-hidden touch-pan-y`}
      >
        {/* Navigation */}
        <ScrollArea className="flex-1 h-0 min-h-0">
          <TooltipProvider delayDuration={300}>
            <nav
              className={cn(
                "space-y-1.5 flex-1",
                sidebarOpen ? "p-4 pt-4" : "p-2 pt-4"
              )}
            >
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm text-muted-foreground font-medium"
                    >
                      {t('dashboard:loading_modules')}
                    </motion.span>
                  )}
                </div>
              ) : (
                <>
                  {/* Dashboard - Direct Link (no submenu) */}
                  <SidebarItem
                    item={dashboardItem}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    navigate={navigate}
                    isMobile={isMobile}
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                  />

                  <Separator className="my-2" />

                  {/* Group: Modules - Display directly without semester grouping */}
                  <CollapsibleSection
                    id="modules"
                    title={t('dashboard:modules')}
                    count={filteredModules.length}
                    isOpen={openGroups.modules}
                    forceOpen={!sidebarOpen}
                    onToggle={() => toggleGroup("modules")}
                    sidebarOpen={sidebarOpen}
                    icon={Book}
                  >
                    {filteredModules.length === 0 ? (
                      sidebarOpen && (
                        <div className="px-3 py-4 text-center">
                          {userSemesters && userSemesters.length > 0 ? (
                            <>
                              <Book className="h-8 w-8 mx-auto text-blue-400/50 mb-2" />
                              <p className="text-xs text-muted-foreground">
                                Aucun module pour {selectedSemester || 'ce semestre'}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {userSemesters.length > 1 
                                  ? 'Essayez un autre semestre'
                                  : 'Les modules seront ajoutés prochainement'
                                }
                              </p>
                            </>
                          ) : (
                            <>
                              <Lock className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                              <p className="text-xs text-muted-foreground">
                                {t('dashboard:no_modules_available', 'Aucun module disponible')}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {t('dashboard:subscribe_to_access', 'Souscrivez à un plan pour accéder aux modules')}
                              </p>
                            </>
                          )}
                        </div>
                      )
                    ) : (
                      filteredModules.map((module) => (
                        <SidebarItem
                          key={module._id}
                          item={createModuleSidebarItem(module)}
                          activeTab={activeTab}
                          setActiveTab={setActiveTab}
                          navigate={navigate}
                          isMobile={isMobile}
                          sidebarOpen={sidebarOpen}
                          setSidebarOpen={setSidebarOpen}
                        />
                      ))
                    )}
                  </CollapsibleSection>

                  {/* Group: Analyse */}
                  <CollapsibleSection
                    id="analysis"
                    title={t('dashboard:analysis')}
                    count={analysisItems.length}
                    isOpen={openGroups.analysis}
                    forceOpen={!sidebarOpen}
                    onToggle={() => toggleGroup("analysis")}
                    sidebarOpen={sidebarOpen}
                    icon={Trophy}
                  >
                    {analysisItems.map((item) => (
                      <SidebarItem
                        key={item.id}
                        item={item}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        navigate={navigate}
                        isMobile={isMobile}
                        sidebarOpen={sidebarOpen}
                        setSidebarOpen={setSidebarOpen}
                      />
                    ))}
                  </CollapsibleSection>

                  {/* Group: Bibliothèque */}
                  <CollapsibleSection
                    id="library"
                    title={t('dashboard:library')}
                    count={libraryItems.length}
                    isOpen={openGroups.library}
                    forceOpen={!sidebarOpen}
                    onToggle={() => toggleGroup("library")}
                    sidebarOpen={sidebarOpen}
                    icon={SquareLibrary}
                  >
                    {libraryItems.map((item) => (
                      <SidebarItem
                        key={item.id}
                        item={item}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        navigate={navigate}
                        isMobile={isMobile}
                        sidebarOpen={sidebarOpen}
                        setSidebarOpen={setSidebarOpen}
                      />
                    ))}
                  </CollapsibleSection>
                </>
              )}
            </nav>
          </TooltipProvider>
        </ScrollArea>
      </motion.div>
    </>
  );
};

// Reusable item component to keep rendering consistent
const SidebarItem = ({
  item,
  activeTab,
  setActiveTab,
  navigate,
  isMobile,
  sidebarOpen,
  setSidebarOpen,
  extraClassName = "",
}) => {
  const Icon = item.icon;
  const isActive = activeTab === item.id;
  const isPremiumFeature = item.isPremiumFeature || false;

  const button = (
    <motion.button
      key={item.id}
      onClick={() => {
        setActiveTab(item.id);
        navigate(item.path);
        if (isMobile) {
          setSidebarOpen(false);
        }
      }}
      title={sidebarOpen ? undefined : item.label}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "w-full flex items-center min-h-[44px] py-3 rounded-lg transition-all duration-200 group relative",
        sidebarOpen ? "space-x-3 justify-start px-4" : "justify-center px-2",
        isActive
          ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/70 hover:shadow-sm active:bg-accent",
        extraClassName
      )}
    >
      <div className={cn(
        "relative flex items-center justify-center",
        isActive && "animate-pulse"
      )}>
        <Icon className={cn(
          "h-5 w-5 flex-shrink-0 transition-transform duration-200",
          isActive && "scale-110",
          !isActive && "group-hover:scale-110"
        )} />
        {isActive && (
          <motion.div
            layoutId="activeIndicator"
            className="absolute inset-0 rounded-full bg-primary-foreground/20"
            initial={false}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
      </div>
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.span
            key={`${item.id}-label`}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "font-medium text-left text-sm transition-colors flex-1",
              isActive && "font-semibold"
            )}
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
      {/* Premium Badge */}
      {isPremiumFeature && sidebarOpen && (
        <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] px-1.5 py-0.5 font-semibold">
          <Crown className="h-2.5 w-2.5 mr-0.5" />
          Premium
        </Badge>
      )}
      {/* Active indicator line */}
      {isActive && (
        <motion.div
          layoutId="activeLine"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/4 bg-primary-foreground rounded-r-full"
          initial={false}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
    </motion.button>
  );

  // Wrap with tooltip when sidebar is collapsed
  if (!sidebarOpen) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {button}
        </TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
};

// Collapsible section wrapper with shadcn/ui Collapsible component
const CollapsibleSection = ({
  id,
  title,
  count,
  icon: Icon,
  isOpen,
  onToggle,
  sidebarOpen,
  children,
  forceOpen = false,
}) => {
  const showChildren = forceOpen || isOpen;

  if (!sidebarOpen) {
    // When sidebar is collapsed, show items directly without grouping
    return (
      <div key={`section-${id}`} className="space-y-1">
        {children}
      </div>
    );
  }

  return (
    <Collapsible
      key={`section-${id}`}
      open={showChildren}
      onOpenChange={onToggle}
      className="mt-3 first:mt-0"
    >
      <CollapsibleTrigger asChild>
        <motion.button
          type="button"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "w-full px-3.5 py-2.5 flex items-center justify-between rounded-lg",
            "text-xs font-bold uppercase tracking-wider",
            "text-muted-foreground hover:text-foreground hover:bg-accent/70 transition-all",
            "group border border-transparent hover:border-border/50"
          )}
          title={title}
        >
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" />}
            <span>{title}</span>
            {count !== undefined && (
              <Badge
                variant="secondary"
                className="ml-1 h-5 min-w-5 px-1.5 text-[10px] font-semibold"
              >
                {count}
              </Badge>
            )}
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200 group-hover:text-foreground",
              showChildren && "rotate-180"
            )}
          />
        </motion.button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-1 mt-1 pb-2">
        <AnimatePresence initial={false}>
          {showChildren && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="space-y-1"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </CollapsibleContent>

      <Separator className="my-3" />
    </Collapsible>
  );
};

export default SideBar;
