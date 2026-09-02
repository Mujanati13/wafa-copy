import React, { useState } from "react";
import TopBar from "./TopBar";
import SideBarAdmin from "./SideBarAdmin";
import { Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion as Motion, AnimatePresence } from "framer-motion";

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Bar */}
      <TopBar 
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
        loginPath="/admin/login"
      />
      
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Overlay */}
        <AnimatePresence>
          {isMobile && sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <Motion.aside
          initial={false}
          animate={{
            x: isMobile && !sidebarOpen ? -280 : 0,
            width: sidebarOpen ? (isMobile ? 280 : 280) : 80,
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
          className={cn(
            "h-full bg-card border-r border-border shadow-lg",
            isMobile && "fixed left-0 top-16 z-50 h-[calc(100vh-4rem)]"
          )}
        >
          <SideBarAdmin 
            sidebarOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            isMobile={isMobile}
          />
        </Motion.aside>

        {/* Main Content */}
        <Motion.main
          initial={false}
          animate={{
            marginLeft: isMobile ? 0 : 0,
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
          className="flex-1 overflow-y-auto"
        >
          <div className="container mx-auto p-2 sm:p-4 md:p-6 max-w-7xl">
            <Motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Outlet />
            </Motion.div>
          </div>
        </Motion.main>
      </div>
    </div>
  );
};

export default AdminLayout;
