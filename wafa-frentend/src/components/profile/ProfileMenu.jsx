import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const ProfileMenu = ({ isOpen, setIsOpen }) => {
    const navigate = useNavigate();
    // Mock user data - in a real app, this would come from context/props
    const user = {
        name: "Gt Er",
        email: "krarouchyousf@gmail.com",
        initials: "GE",
    };

    const menuItems = [
      
        {
            icon: (
                <svg
                    className="w-5 h-5 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={ 2 }
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={ 2 }
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                </svg>
            ),
            label: "Paramètres",
            onClick: () => navigate("/dashboard/settings"),
        },
        {
            icon: (
                <svg
                    className="w-5 h-5 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={ 2 }
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                </svg>
            ),
            label: "Contactez-nous",
            onClick: () => console.log("Navigate to contact"),
        },
    ];

    return (
        <div className="relative z-50">
            <div
                className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold cursor-pointer "
                onClick={ () => setIsOpen(!isOpen) }
            >
                { user.initials }
            </div>

            {/* Dropdown Menu */ }
            { isOpen && (
                <div className="absolute  right-0 mt-5 w-80 bg-popover text-popover-foreground rounded-xl shadow-lg border border-border py-2 ">
                    {/* User Info Header */ }
                    <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                                { user.initials }
                            </div>
                            <div>
                                <div className="font-semibold text-foreground">{ user.name }</div>
                                <div className="text-sm text-gray-500">{ user.email }</div>
                            </div>
                        </div>
                    </div>

                    {/* Menu Items */ }
                    <div className="py-2">
                        { menuItems.map((item, index) => (
                            <button
                                key={ index }
                                onClick={ item.onClick }
                                className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-accent transition-colors duration-200 text-muted-foreground hover:text-foreground"
                            >
                                { item.icon }
                                <span className="font-medium">{ item.label }</span>
                            </button>
                        )) }
                    </div>

                    {/* Logout Button */ }
                    <div className="border-t border-gray-100 pt-2">
                        <button
                            onClick={ () => console.log("Logout") }
                            className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-red-50 transition-colors duration-200 text-red-600 hover:text-red-700"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={ 2 }
                                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                />
                            </svg>
                            <span className="font-medium">Se déconnecter</span>
                        </button>
                    </div>
                </div>
            ) }

            {/* Backdrop */ }
            { isOpen && (
                <div className="fixed inset-0 " onClick={ () => setIsOpen(false) } />
            ) }
        </div>
    );
};

export default ProfileMenu;
