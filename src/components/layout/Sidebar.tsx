import { NavLink } from "react-router-dom";
import { Home, Trophy, Gift, Laugh, CircleDollarSign, X, IdCardLanyard , Origami } from "lucide-react";

interface SidebarProps {
    open: boolean;
    setOpen: (open: boolean) => void;
}

interface LinkItem {
    to?: string;
    label: string;
    icon?: any;
    logo?: string;
    children?: LinkItem[];
}

const links: LinkItem[] = [
    { to: "/", label: "Home", icon: Home },
    {
        label: "Xeet",
        logo: "/xeet.jpg",
        children: [
            { to: "/xeet-leagues", label: "Leaderboards Analysis", icon: Trophy },
            { to: "/pack-generator", label: "Fake Pack Generator", icon: IdCardLanyard },
        ],
    },
    {
        label: "Wallchain",
        logo: "/wallchain.jpg",
        children: [
            { to: "/wallchain", label: "Leaderboards Analysis", icon: Trophy },
            { to: "/wallchain-index", label: "Organic Index", icon: IdCardLanyard },
        ],
    },
    {
        label: "MindoAI",
        logo: "/mindo.jpg",
        children: [
            { to: "/mindo", label: "Leaderboards Analysis", icon: Trophy },
        ],
    },
    {
        label: "Miscellaneous",
        logo: "/logo.png",
        children: [
            
        ],
    },
    { to: "/nft-roundup", label: "NFT Periodic Roundup", icon: IdCardLanyard },
    { to: "/airdrop-card", label: "Airdrop Card generator", icon: Gift },
    { to: "/dad-jokes", label: "CryptoDad Jokes", icon: Laugh },
    { to: "/earning-card", label: "Creator Earning Card", icon: CircleDollarSign },
    { to: "/theplague-exodus", label: "ThePlague Exodus", icon: Origami },
];

export default function Sidebar({ open, setOpen }: SidebarProps) {
    return (
        <>
            {/* === Desktop Sidebar === */}
            <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 text-sm">
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="flex items-center gap-3 mb-8">
                        <img
                            src="/logo.png"
                            alt="WUT"
                            className="w-20 h-20 rounded-xl shadow-sm bg-gray-100 dark:bg-gray-700 p-1"
                        />
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                                WUT
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Web3 Useless Tools
                            </p>
                        </div>
                    </div>

                    <nav className="space-y-2">
                        {links.map((link) => (
                            <div key={link.label}>
                                {link.children ? (
                                    <div>
                                        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium cursor-default">
                                            <span>{link.label}</span>
                                            {link.logo && (
                                                <img
                                                    src={link.logo}
                                                    alt={link.label}
                                                    className="w-5 h-5 rounded-md"
                                                />
                                            )}
                                        </div>
                                        <div className="ml-4 mt-1 space-y-1">
                                            {link.children.map((child) => (
                                                <NavLink
                                                    key={child.to}
                                                    to={child.to || "#"}
                                                    className={({ isActive }) =>
                                                        `flex items-center gap-2 rounded-xl px-3 py-2 transition ${isActive
                                                            ? "bg-blue-500 text-white"
                                                            : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                                                        }`
                                                    }
                                                >
                                                    {child.icon && <child.icon size={18} />}
                                                    {child.label}
                                                </NavLink>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <NavLink
                                        key={link.to}
                                        to={link.to || "#"}
                                        className={({ isActive }) =>
                                            `flex items-center gap-2 rounded-xl px-3 py-2 transition ${isActive
                                                ? "bg-blue-500 text-white"
                                                : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                                            }`
                                        }
                                    >
                                        {link.icon && <link.icon size={18} />}
                                        {link.label}
                                    </NavLink>
                                )}
                            </div>
                        ))}
                    </nav>
                </div>

                {/* Footer stays unchanged */}
            </aside>

            {/* === Mobile Sidebar === */}
            <div
                className={`fixed inset-0 z-40 md:hidden transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
                <div className="relative w-64 bg-white dark:bg-gray-800 h-full p-4 flex flex-col justify-between">
                    <div>
                        <button
                            onClick={() => setOpen(false)}
                            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex items-center gap-3 mb-8 mt-2">
                            <img
                                src="/logo.png"
                                alt="WUT Logo"
                                className="w-9 h-9 rounded-xl shadow-sm bg-gray-100 dark:bg-gray-700 p-1"
                            />
                            <div>
                                <h2 className="text-lg font-bold leading-tight">WUT</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Web3 Useless Tools
                                </p>
                            </div>
                        </div>

                        <nav className="space-y-2">
                            {links.map((link) => (
                                <div key={link.label}>
                                    {link.children ? (
                                        <div>
                                            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium cursor-default">
                                                <span>{link.label}</span>
                                                {link.logo && (
                                                    <img
                                                        src={link.logo}
                                                        alt={link.label}
                                                        className="w-5 h-5 rounded-md"
                                                    />
                                                )}
                                            </div>
                                            <div className="ml-4 mt-1 space-y-1">
                                                {link.children.map((child) => (
                                                    <NavLink
                                                        key={child.to}
                                                        to={child.to || "#"}
                                                        onClick={() => setOpen(false)}
                                                        className={({ isActive }) =>
                                                            `flex items-center gap-2 rounded-xl px-3 py-2 transition ${isActive
                                                                ? "bg-blue-500 text-white"
                                                                : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                                                            }`
                                                        }
                                                    >
                                                        {child.icon && <child.icon size={18} />}
                                                        {child.label}
                                                    </NavLink>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <NavLink
                                            key={link.to}
                                            to={link.to || "#"}
                                            onClick={() => setOpen(false)}
                                            className={({ isActive }) =>
                                                `flex items-center gap-2 rounded-xl px-3 py-2 transition ${isActive
                                                    ? "bg-blue-500 text-white"
                                                    : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                                                }`
                                            }
                                        >
                                            {link.icon && <link.icon size={18} />}
                                            {link.label}
                                        </NavLink>
                                    )}
                                </div>
                            ))}
                        </nav>
                    </div>

                    {/* Footer stays unchanged */}
                </div>
            </div>
        </>
    );
}