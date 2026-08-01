import React, { useState, useEffect } from "react";
import { Outlet } from "react-router";
import SideBar from "./SideBar";
import TopBar from "./TopBar";
import { SemesterProvider } from "@/context/SemesterContext";

const DashBoardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024);
      // Auto-collapse sidebar on overlay mode (below lg)
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  return (
    <SemesterProvider>
      <div className="flex flex-col h-screen bg-background">
        <TopBar
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          isMobile={isMobile}
        />
        <div className="flex flex-1 overflow-hidden min-h-0">
          <SideBar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            isMobile={isMobile}
          />
          <main className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SemesterProvider>
  );
};

export default DashBoardLayout;

