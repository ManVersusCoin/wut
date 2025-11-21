import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

import { X } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);


    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            {/* Sidebar */}
            <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

            {/* Main area */}
            <div className="flex flex-col flex-1 relative">
                <Header onMenuClick={() => setSidebarOpen(true)} />

                {/* Main content */}
                <main className="flex-1 p-6 overflow-y-auto  bg-white dark:bg-gray-900">
                    <div className="min-h-[calc(100vh-120px)]"> {/* Adjust height as needed */}
                        {children}
                    </div>
                </main>

                {/* Footer - Not animated, fixed at bottom */}
                <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-400 px-6 py-3 w-full">
                    <div className="flex justify-center items-center flex-wrap gap-1">
                        <span>{new Date().getFullYear()} - WUT - Web3 Useless Tools - Pointlessly perfect. - By</span>
                        <a
                            href="https://x.com/man_versus_coin"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-500 transition"
                        >
                            <X size={14} />
                            <span>@man_versus_coin</span>
                        </a>
                    </div>
                </footer>
            </div>
        </div>
    );
}