import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Trophy,
  Users,
  Book,
  FileQuestion,
  CheckSquare,
  FileDown,
  Image,
  CreditCard,
  DollarSign,
  GraduationCap,
  Component,
  Layers,
  BookOpenCheck,
  FileText,
  ChevronDown,
  Blocks,
  Menu,
  X,
  Settings,
  Bell,
  Shield,
  Layout,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Permission mapping for each menu item
const ITEM_PERMISSIONS = {
  // Overview
  analytics: 'analytics',
  leaderboard: null, // accessible to all
  
  // Users
  Users: 'users',
  subAdmins: 'users', // Only super_admin, handled separately
  
  // Structure
  semesters: 'content',
  module: 'content',
  categoriesOfModules: 'content',
  createCategoriesForCourses: 'content',
  
  // Exams
  examParYears: 'content',
  examCourses: 'content',
  qcmBanque: 'content',
  addQuestions: 'content',
  
  // Content
  resumes: 'content',
  explications: 'reports',
  reportQuestions: 'reports',
  
  // Imports
  importExamParYears: 'content',
  importExamParCourse: 'content',
  importQCMBanque: 'content',
  importResumes: 'content',
  importExplications: 'content',
  generateExplanationsAI: 'content',
  importImages: 'content',
  
  // Payments
  subscription: 'payments',
  demandesDePayements: 'payments',
  paypalSettings: 'payments',
  
  // Settings
  notifications: 'notifications',
  contactMessages: 'settings',
  landingSettings: 'settings',
  privacyPolicy: 'settings',
};

// Items that require super_admin role (not just permissions)
const SUPER_ADMIN_ONLY_ITEMS = ['subAdmins'];

const SideBarAdmin = ({ sidebarOpen = true, onToggle, isMobile = false }) => {
  const { t } = useTranslation(['admin', 'common']);
  const navigate = useNavigate();
  const location = useLocation();

  // Get user role and permissions from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.adminRole === 'super_admin';
  const userPermissions = user.permissions || [];

  const [openCategories, setOpenCategories] = useState({
    overview: true,
    users: false,
    structure: false,
    exams: false,
    content: false,
    imports: false,
    payments: false,
    settings: false,
  });

  const sidebarCategories = [
    // =========== DASHBOARD ===========
    {
      id: "overview",
      label: "📊 " + t('admin:overview'),
      icon: BarChart3,
      items: [
        {
          id: "analytics",
          label: t('admin:analytics'),
          icon: BarChart3,
          path: "/admin/analytics",
        },
        {
          id: "leaderboard",
          label: t('admin:leaderboard'),
          icon: Trophy,
          path: "/admin/leaderboard",
        },
      ],
    },
    // =========== USERS ===========
    {
      id: "users",
      label: "👥 " + t('admin:users'),
      icon: Users,
      items: [
        {
          id: "Users",
          label: t('admin:users'),
          icon: Users,
          path: "/admin/users",
        },
      ],
    },
    // =========== STRUCTURE (Semestres, Modules, Catégories) ===========
    {
      id: "structure",
      label: "🏗️ Structure",
      icon: Component,
      items: [
        {
          id: "semesters",
          label: t('admin:semesters'),
          icon: GraduationCap,
          path: "/admin/semesters",
        },
        {
          id: "module",
          label: t('admin:module'),
          icon: Component,
          path: "/admin/module",
        },
        {
          id: "categoriesOfModules",
          label: t('admin:categories_of_modules'),
          icon: Layers,
          path: "/admin/categoriesOfModules",
        },
        {
          id: "createCategoriesForCourses",
          label: t('admin:create_categories_for_courses'),
          icon: Blocks,
          path: "/admin/createCategoriesForCourses",
        },
      ],
    },
    // =========== EXAMENS ===========
    {
      id: "exams",
      label: "📝 " + t('admin:exams'),
      icon: BookOpenCheck,
      items: [
        {
          id: "examParYears",
          label: t('admin:exam_par_years'),
          icon: BookOpenCheck,
          path: "/admin/examParYears",
        },
        {
          id: "examCourses",
          label: t('admin:exam_par_course'),
          icon: BookOpenCheck,
          path: "/admin/examCourses",
        },
        {
          id: "qcmBanque",
          label: "QCM Banque",
          icon: BookOpenCheck,
          path: "/admin/qcmBanque",
        },
        {
          id: "addQuestions",
          label: t('admin:add_questions'),
          icon: FileQuestion,
          path: "/admin/addQuestions",
        },
      ],
    },
    // =========== CONTENU (Résumés, Explications) ===========
    {
      id: "content",
      label: "📚 " + t('admin:content'),
      icon: Book,
      items: [
        {
          id: "resumes",
          label: t('admin:resumes'),
          icon: FileText,
          path: "/admin/resumes",
        },
        {
          id: "explications",
          label: t('admin:explications'),
          icon: CheckSquare,
          path: "/admin/explications",
        },
        {
          id: "reportQuestions",
          label: t('admin:report_questions'),
          icon: FileQuestion,
          path: "/admin/report-questions",
        },
      ],
    },
    // =========== IMPORTS ===========
    {
      id: "imports",
      label: "📥 Imports",
      icon: FileDown,
      items: [
        {
          id: "importExamParYears",
          label: t('admin:import_exam_par_years'),
          icon: FileDown,
          path: "/admin/importExamParYears",
        },
        {
          id: "importExamParCourse",
          label: t('admin:import_exam_par_course'),
          icon: FileDown,
          path: "/admin/importExamParCourse",
        },
        {
          id: "importQCMBanque",
          label: t('admin:import_qcm_banque', 'Importer QCM Banque'),
          icon: FileDown,
          path: "/admin/importQCMBanque",
        },
        {
          id: "importResumes",
          label: t('admin:import_resumes'),
          icon: FileDown,
          path: "/admin/importResumes",
        },
        {
          id: "importExplications",
          label: t('admin:import_explications'),
          icon: FileDown,
          path: "/admin/importExplications",
        },
        {
          id: "generateExplanationsAI",
          label: t('admin:generate_ai_explications', 'Générer Explications AI'),
          icon: Sparkles,
          path: "/admin/generateExplanationsAI",
        },
        {
          id: "importImages",
          label: t('admin:import_images'),
          icon: Image,
          path: "/admin/importImages",
        },
      ],
    },
    // =========== PAIEMENTS ===========
    {
      id: "payments",
      label: "💳 " + t('admin:payments'),
      icon: CreditCard,
      items: [
        {
          id: "subscription",
          label: t('admin:subscription_plans'),
          icon: CreditCard,
          path: "/admin/subscription",
        },
        {
          id: "demandesDePayements",
          label: t('admin:payment_requests'),
          icon: DollarSign,
          path: "/admin/demandes-de-paiements",
        },
        {
          id: "paypalSettings",
          label: t('admin:paypal_settings', 'Paramètres PayPal'),
          icon: Settings,
          path: "/admin/paypal-settings",
        },
      ],
    },
    // =========== PARAMÈTRES ===========
    {
      id: "settings",
      label: "⚙️ " + t('admin:settings', 'Paramètres'),
      icon: Settings,
      items: [
        {
          id: "notifications",
          label: t('admin:notifications', 'Notifications'),
          icon: Bell,
          path: "/admin/notifications",
        },
        {
          id: "subAdmins",
          label: t('admin:sub_admins', 'Sous-admins'),
          icon: Shield,
          path: "/admin/sub-admins",
        },
        {
          id: "contactMessages",
          label: t('admin:contact_messages', 'Messages de Contact'),
          icon: MessageCircle,
          path: "/admin/contact-messages",
        },
        {
          id: "landingSettings",
          label: t('admin:landing_settings', 'Paramètres Landing Page'),
          icon: Layout,
          path: "/admin/landing-settings",
        },
        {
          id: "feedbacks",
          label: t('admin:feedbacks', 'Témoignages'),
          icon: MessageCircle,
          path: "/admin/feedbacks",
        },
        {
          id: "privacyPolicy",
          label: t('admin:privacy_policy', 'Politique de confidentialité'),
          icon: Shield,
          path: "/admin/privacy-policy",
        },
      ],
    },
  ];

  // Filter categories and items based on user permissions
  const filteredCategories = useMemo(() => {
    if (isSuperAdmin) {
      return sidebarCategories; // Super admin sees everything
    }

    return sidebarCategories
      .map(category => ({
        ...category,
        items: category.items.filter(item => {
          // Check if item is super_admin only
          if (SUPER_ADMIN_ONLY_ITEMS.includes(item.id)) {
            return false;
          }
          
          // Check required permission for this item
          const requiredPermission = ITEM_PERMISSIONS[item.id];
          
          // If no permission required (null), item is visible to all admins
          if (requiredPermission === null || requiredPermission === undefined) {
            return true;
          }
          
          // Check if user has the required permission
          return userPermissions.includes(requiredPermission);
        })
      }))
      .filter(category => category.items.length > 0); // Remove empty categories
  }, [isSuperAdmin, userPermissions, sidebarCategories]);

  const toggleCategory = (categoryId) => {
    setOpenCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const isPathActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="relative flex flex-col h-full bg-card border-r border-border overflow-hidden">
      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-2 sm:px-3 py-3 sm:py-4">
        <nav className="space-y-1 sm:space-y-2">
          {filteredCategories.map((category, idx) => {
            const CategoryIcon = category.icon;
            const isOpen = openCategories[category.id];

            return (
              <div key={category.id}>
                {idx > 0 && <Separator className="my-3" />}

                <Collapsible
                  open={isOpen}
                  onOpenChange={() => toggleCategory(category.id)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-3 h-auto py-2.5 px-3",
                        "hover:bg-accent transition-all duration-200",
                        !sidebarOpen && "justify-center px-2"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-lg",
                        "bg-muted",
                        "group-hover:bg-accent"
                      )}>
                        <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      {sidebarOpen && (
                        <>
                          <span className="flex-1 text-left text-sm font-semibold text-foreground uppercase tracking-wide">
                            {category.label}
                          </span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 text-muted-foreground transition-transform duration-200",
                              isOpen && "rotate-180"
                            )}
                          />
                        </>
                      )}
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="space-y-1 mt-1">
                    {category.items.map((item) => {
                      const ItemIcon = item.icon;
                      const isActive = isPathActive(item.path);

                      return (
                        <Button
                          key={item.id}
                          variant="ghost"
                          onClick={() => navigate(item.path)}
                          className={cn(
                            "w-full justify-start gap-3 h-auto py-2 transition-all duration-200",
                            sidebarOpen ? "pl-6 pr-3" : "justify-center px-2",
                            isActive
                              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-md"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground"
                          )}
                        >
                          <ItemIcon className={cn(
                            "h-4 w-4 flex-shrink-0",
                            isActive ? "text-white" : "text-muted-foreground"
                          )} />
                          {sidebarOpen && (
                            <span className="text-sm font-medium text-left flex-1">
                              {item.label}
                            </span>
                          )}
                          {isActive && sidebarOpen && (
                            <motion.div
                              layoutId="activeIndicator"
                              className="w-1.5 h-1.5 rounded-full bg-white"
                              initial={false}
                              transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                          )}
                        </Button>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      {sidebarOpen && (
        <div className="p-3 sm:p-4 border-t border-border flex-shrink-0">
          <div className="bg-blue-50 dark:bg-blue-950/50 rounded-lg p-2 sm:p-3 border border-blue-200 dark:border-blue-900">
            <p className="text-[10px] sm:text-xs font-medium text-blue-900 dark:text-blue-300 mb-0.5 sm:mb-1">Need help?</p>
            <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-400">Contact support</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SideBarAdmin;
