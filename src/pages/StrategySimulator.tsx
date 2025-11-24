import type { JSX } from "react";
import { useEffect, useState, useMemo, useRef } from "react";
import {
    TrendingUp, TrendingDown, Loader2, Flame,
    Filter, Columns, ArrowUpDown, Check,
    Activity, History, X, Users, ExternalLink,
    Search, EyeOff, Eye,
    PanelLeftClose, PieChart, Info
} from "lucide-react";

// --- CONFIGURATION ---

const API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY || "C97M6KSBBYG7JF41A39P8JTUMN277CPU94";
const PUNKS_ADDRESS = "0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB";
const PUNKS_HOLDING_WALLET = "0x1244eae9fa2c064453b5f605d708c0a0bfba4838";
const TOPIC_PUNK_BOUGHT = "0x58e5d5a525e3b40bc15abaa38b5882678db1ee68befd2f60bafe3a7fd06db9e3";
const TOPIC_STD_BUY = "0x272af40a157c8d1a7d3bf7ff2920db021097ec61b7e260f97bb50144520ad177";
const TOPIC_STD_SELL = "0x89c3b465a41d0ab0891833425d7da4f89bafffceffba56a40bfafff01d68d51e";

type EcoConfig = {
    ticker: string;
    coingeckoId: string;
    tokenAddress: string;
    network: "eth" | "solana";
};

const ECOSYSTEM_CONFIG: Record<string, EcoConfig> = {
    "boredapeyachtclub": {
        ticker: "APE",
        coingeckoId: "apecoin",
        tokenAddress: "0x4d224452801aced8b2f0aebe155379bb5d594381",
        network: "eth"
    },
    "pudgypenguins": {
        ticker: "PENGU",
        coingeckoId: "pudgy-penguins",
        tokenAddress: "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv",
        network: "solana"
    },
};

// --- COLUMNS DEFINITION ---

type ColumnId =
    | "strategy" | "price" | "priceChange24h" | "volume24h" | "stratMcap" | "burn" | "stratHolders"
    | "buyVolume" | "saleVolume" | "realizedPnL" | "treasury"
    | "feesStrat" | "feesPnkstr" | "feesRoyalties"
    | "nftFloor" | "nftMcap" | "nftHolders"
    | "ecoToken" | "ecoMcap" | "ecoHolders"
    | "ecoColRatio" | "stratColRatio" | "navRatio" | "ecoColHolderRatio" | "ecoStratHolderRatio" | "stratColHolderRatio";

const COLUMN_DEFS: { id: ColumnId; label: string; align: "left" | "right" | "center"; headerGroup?: string }[] = [
    { id: "strategy", label: "Strategy", align: "left" }, // No Group

    // Group: Strategy
    { id: "price", label: "Price", align: "right", headerGroup: "Strategy" },
    { id: "priceChange24h", label: "24h %", align: "right", headerGroup: "Strategy" },
    { id: "volume24h", label: "Vol 24h", align: "right", headerGroup: "Strategy" },
    { id: "stratMcap", label: "Mcap", align: "right", headerGroup: "Strategy" },
    { id: "burn", label: "Burn", align: "right", headerGroup: "Strategy" },
    { id: "stratHolders", label: "Holders", align: "center", headerGroup: "Strategy" },

    // Group: Trades & Holdings
    { id: "buyVolume", label: "Buy Vol (Ξ)", align: "right", headerGroup: "Trades & Holdings" },
    { id: "saleVolume", label: "Sale Vol (Ξ)", align: "right", headerGroup: "Trades & Holdings" },
    { id: "realizedPnL", label: "Realized P&L", align: "right", headerGroup: "Trades & Holdings" },
    { id: "treasury", label: "Treasury", align: "right", headerGroup: "Trades & Holdings" },

    // Group: Fees
    { id: "feesStrat", label: "Strat (8%)", align: "right", headerGroup: "Fees" },
    { id: "feesPnkstr", label: "PNKSTR (1%)", align: "right", headerGroup: "Fees" },
    { id: "feesRoyalties", label: "Royalties (1%)", align: "right", headerGroup: "Fees" },

    // Group: NFT Collection
    { id: "nftFloor", label: "NFT Floor", align: "right", headerGroup: "NFT Collection" },
    { id: "nftMcap", label: "NFT Col Mcap", align: "right", headerGroup: "NFT Collection" },
    { id: "nftHolders", label: "Col Holders", align: "right", headerGroup: "NFT Collection" },

    // Group: Ecosystem Token
    { id: "ecoToken", label: "Eco Token", align: "center", headerGroup: "Ecosystem Token" },
    { id: "ecoMcap", label: "Eco Mcap", align: "right", headerGroup: "Ecosystem Token" },
    { id: "ecoHolders", label: "Eco Holders", align: "center", headerGroup: "Ecosystem Token" },

    // Group: KPI / Ratio
    { id: "ecoColRatio", label: "Eco/Col %", align: "right", headerGroup: "KPI / Ratio" },
    { id: "stratColRatio", label: "Str/Col %", align: "right", headerGroup: "KPI / Ratio" },
    { id: "navRatio", label: "NAV Ratio", align: "right", headerGroup: "KPI / Ratio" },
    { id: "ecoColHolderRatio", label: "Eco/Col Holders %", align: "right", headerGroup: "KPI / Ratio" },
    { id: "ecoStratHolderRatio", label: "Eco/Strat Holders %", align: "right", headerGroup: "KPI / Ratio" },
    { id: "stratColHolderRatio", label: "Strat/Col Holders %", align: "right", headerGroup: "KPI / Ratio" },
];

// --- DEFAULT VISIBLE COLUMNS ---
const DEFAULT_VISIBLE_SET = new Set<ColumnId>([
    "strategy",
    "price",
    "priceChange24h",
    "stratMcap",
    "stratHolders",
    "realizedPnL",
    "treasury",
    "stratColRatio",
    "navRatio"
]);

// --- STYLES MAPPING ---
const GROUP_BG_STYLES: Record<string, string> = {
    "Strategy": "bg-white dark:bg-gray-900",
    "Trades & Holdings": "bg-gray-50 dark:bg-gray-800/40",
    "Fees": "bg-slate-50 dark:bg-slate-900/20",
    "NFT Collection": "bg-zinc-50 dark:bg-zinc-900/20",
    "Ecosystem Token": "bg-stone-50 dark:bg-stone-900/20",
    "KPI / Ratio": "bg-orange-50/30 dark:bg-orange-900/10"
};

// --- TYPES ---
type TradeDetail = { tokenId: string; buyPriceEth: number; buyTx: string; buyDate: Date; sellPriceEth: number; sellTx: string; sellDate: Date; profitEth: number; daysHeld: number; };
type StrategyData = { id: string; collection: string; tokenAddress: string; collectionName: string; collectionOsSlug: string | null; collectionImage: string; tokenName: string; tokenSymbol: string; blockNumber: string; deadWalletBalance: string; poolData: { market_cap_usd: string; price_usd: string; }; };
type HolderData = { count: number; distribution: Record<string, string>; };
type MergedData = StrategyData & {
    dataLoaded: boolean; isLoading: boolean; priceChange24h?: number; volume24h?: number;
    buyVolume?: number; saleVolume?: number; buyCount?: number; saleCount?: number; realizedPnLEth?: number;
    tradesCount?: number; tradeHistory?: TradeDetail[]; nftSupply?: number; nftFloorPriceEth?: number;
    nftMarketCapEth?: number; nftMarketCapUsd?: number; nftHolders?: number; stratHoldersData?: HolderData; stratHolders?: number;
    ecoTicker?: string; ecoPriceUsd?: number; ecoMarketCapUsd?: number; ecoTokenAddress?: string; ecoHoldersData?: HolderData; ecoHolders?: number;
    burnedPercentage?: number; burnedAmount?: number; treasuryValueUsd?: number; inventoryCount?: number;
    feesStrat?: number; feesPnkstr?: number; feesRoyalties?: number; ecoColRatio?: number; stratColRatio?: number; navRatio?: number;
    ecoColHolderRatio?: number; ecoStratHolderRatio?: number; stratColHolderRatio?: number;
};

// --- UTILS ---
const padAddress = (addr: string) => "0x" + addr.replace("0x", "").padStart(64, "0").toLowerCase();
const decodeHexInt = (hex: string): number => { try { return parseInt(hex, 16); } catch (e) { console.error("decodeHexPrice error:", e); return 0; } };
const decodeHexPrice = (hex: string): number => { try { return Number(BigInt(hex)) / 1e18; } catch (e) { console.error("decodeHexPrice error:", e); return 0; } };
const decodeLogData = (data: string) => { const c = data.startsWith("0x") ? data.slice(2) : data; return (c.match(/.{1,64}/g) || []).map(x => "0x" + x); };

// --- ANIMATION UTILS ---
const flyElementToTarget = (sourceEl: HTMLElement, targetId: string, onComplete: () => void) => {
    const targetEl = document.getElementById(targetId);
    if (!sourceEl || !targetEl) {
        onComplete();
        return;
    }

    const sourceRect = sourceEl.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();

    // Clone
    const clone = sourceEl.cloneNode(true) as HTMLElement;
    clone.style.position = 'fixed';
    clone.style.left = `${sourceRect.left}px`;
    clone.style.top = `${sourceRect.top}px`;
    clone.style.width = `${sourceRect.width}px`;
    clone.style.height = `${sourceRect.height}px`;
    clone.style.zIndex = '9999';
    clone.style.opacity = '0.9';
    clone.style.pointerEvents = 'none';
    // Slower transition as requested (0.8s)
    clone.style.transition = 'all 1.8s cubic-bezier(0.2, 0.8, 0.2, 1)';
    clone.style.transformOrigin = 'center center';

    // Remove interactive elements from clone for visual cleanliness
    const buttons = clone.querySelectorAll('button, .hide-btn');
    buttons.forEach(b => b.remove());

    document.body.appendChild(clone);

    // Force reflow
    void clone.offsetWidth;

    // Animate
    clone.style.left = `${targetRect.left + (targetRect.width / 2) - (sourceRect.width / 4)}px`;
    clone.style.top = `${targetRect.top + (targetRect.height / 2) - (sourceRect.height / 4)}px`;
    clone.style.transform = 'scale(0.05) rotate(15deg)';
    clone.style.opacity = '0';

    setTimeout(() => {
        if (clone.parentNode) clone.parentNode.removeChild(clone);
        onComplete();
    }, 800); // Sync with transition duration
};

// --- COMPONENTS ---

const ScrollbarStyles = () => (
    <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #cbd5e1; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #374151; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #4b5563; }
    `}</style>
);

// --- MODALS ---

function InfoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-gray-200 dark:border-gray-800" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                        <Info size={24} className="text-blue-600" /> Dashboard Documentation
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><X size={20} /></button>
                </div>
                <div className="overflow-y-auto flex-1 p-6 custom-scrollbar text-gray-700 dark:text-gray-300 space-y-6">
                    <div className="prose dark:prose-invert max-w-none text-sm">
                        <p>This dashboard simulates and monitors NFT Strategy Tokens. It aggregates data from Etherscan, CoinGecko, and OpenSea to provide real-time metrics.</p>

                        <h3 className="font-bold text-lg mt-4 mb-2 text-gray-900 dark:text-white">Strategy Metrics</h3>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Price:</strong> Current trading price of the strategy token (USD).</li>
                            <li><strong>Mcap:</strong> Fully Diluted Market Cap of the strategy token.</li>
                            <li><strong>Burn:</strong> Percentage of the token supply sent to the dead wallet.</li>
                            <li><strong>Holders:</strong> Count of unique wallets holding the strategy token.</li>
                        </ul>

                        <h3 className="font-bold text-lg mt-4 mb-2 text-gray-900 dark:text-white">Trades & Holdings</h3>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Buy Vol:</strong> Total volume (ETH) spent by the strategy to buy NFTs.</li>
                            <li><strong>Sale Vol:</strong> Total volume (ETH) received from selling NFTs.</li>
                            <li><strong>Realized P&L:</strong> Net profit/loss from completed buy/sell cycles of specific NFT IDs.</li>
                            <li><strong>Treasury:</strong> Estimated value of current NFT inventory (Inventory Count * Floor Price).</li>
                        </ul>

                        <h3 className="font-bold text-lg mt-4 mb-2 text-gray-900 dark:text-white">Ratios & KPIs</h3>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Eco/Col %:</strong> Ecosystem Token Mcap divided by NFT Collection Mcap.</li>
                            <li><strong>Str/Col %:</strong> Strategy Token Mcap divided by NFT Collection Mcap.</li>
                            <li><strong>NAV Ratio:</strong> Strategy Mcap divided by Treasury Value.</li>
                        </ul>
                    </div>
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">Close Documentation</button>
                </div>
            </div>
        </div>
    );
}

function TradeHistoryModal({ isOpen, onClose, strategy, trades }: { isOpen: boolean; onClose: () => void; strategy: string; trades: TradeDetail[] }) {
    if (!isOpen) return null;
    const sortedTrades = [...trades].sort((a, b) => b.sellDate.getTime() - a.sellDate.getTime());
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col border border-gray-200 dark:border-gray-800" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-lg font-bold flex items-center gap-2"><History size={20} className="text-blue-600" /> Trade History: {strategy}</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><X size={20} /></button>
                </div>
                <div className="overflow-y-auto flex-1 p-0 custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 text-xs uppercase text-gray-500 z-10">
                            <tr><th className="px-4 py-3">ID</th><th className="px-4 py-3 text-right">Buy</th><th className="px-4 py-3 text-right">Sell</th><th className="px-4 py-3 text-right">Held</th><th className="px-4 py-3 text-right">P&L</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {sortedTrades.map((t, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="px-4 py-3 font-mono">#{t.tokenId}</td>
                                    <td className="px-4 py-3 text-right"><div className="font-medium">{t.buyPriceEth.toFixed(3)} Ξ</div><a href={`https://etherscan.io/tx/${t.buyTx}`} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline flex items-center justify-end gap-1">{t.buyDate.toLocaleDateString()} <ExternalLink size={8} /></a></td>
                                    <td className="px-4 py-3 text-right"><div className="font-medium">{t.sellPriceEth.toFixed(3)} Ξ</div><a href={`https://etherscan.io/tx/${t.sellTx}`} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline flex items-center justify-end gap-1">{t.sellDate.toLocaleDateString()} <ExternalLink size={8} /></a></td>
                                    <td className="px-4 py-3 text-right text-xs text-gray-500">{t.daysHeld.toFixed(1)}d</td>
                                    <td className={`px-4 py-3 text-right font-bold ${t.profitEth >= 0 ? 'text-green-600' : 'text-red-600'}`}>{t.profitEth > 0 ? "+" : ""}{t.profitEth.toFixed(3)} Ξ</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function HolderDistributionModal({ isOpen, onClose, tokenSymbol, data }: { isOpen: boolean; onClose: () => void; tokenSymbol: string; data: HolderData | undefined }) {
    if (!isOpen || !data) return null;

    // Format keys (e.g. "top_10" -> "Top 10")
    const rows = Object.entries(data.distribution).map(([key, val]) => {
        const label = key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
        return { label, val: parseFloat(val) };
    }).sort((a, b) => b.val - a.val); // Sort desc

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-sm flex flex-col border border-gray-200 dark:border-gray-800 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <h2 className="text-sm font-bold flex items-center gap-2"><PieChart size={16} className="text-purple-600" /> Holders: {tokenSymbol}</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500"><X size={16} /></button>
                </div>
                <div className="p-4">
                    <div className="flex justify-between items-end mb-4">
                        <div className="text-xs text-gray-500 uppercase">Total Holders</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{new Intl.NumberFormat('en-US').format(data.count)}</div>
                    </div>
                    <table className="w-full text-sm">
                        <thead className="text-xs uppercase text-gray-400 border-b border-gray-100 dark:border-gray-700">
                            <tr><th className="pb-2 text-left">Group</th><th className="pb-2 text-right">Held %</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {rows.map((r, i) => (
                                <tr key={i}>
                                    <td className="py-2.5 font-medium text-gray-700 dark:text-gray-300">{r.label}</td>
                                    <td className="py-2.5 text-right font-bold text-gray-900 dark:text-white">{r.val.toFixed(2)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// --- SIDEBAR (UNIFIED PANEL) ---

type PanelMode = "strategies" | "columns" | null;

function RightPanel({
    mode, onClose, strategies, visibleStrategyIds, toggleStrategy,
    visibleColumns, toggleColumn, toggleGroup
}: {
    mode: PanelMode;
    onClose: () => void;
    strategies: StrategyData[];
    visibleStrategyIds: Set<string>;
    toggleStrategy: (id: string) => void;
    visibleColumns: Set<ColumnId>;
    toggleColumn: (id: ColumnId) => void;
    toggleGroup: (ids: ColumnId[]) => void;
}) {
    const sidebarRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as HTMLElement;

            // Ignore clicks on trigger buttons
            if (target.closest("#btn-strategies") || target.closest("#btn-columns")) {
                return;
            }

            if (mode && sidebarRef.current && !sidebarRef.current.contains(target as Node)) {
                onClose();
            }
        }

        if (mode) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [mode, onClose]);

    const [searchTerm, setSearchTerm] = useState("");
    const groupedCols = useMemo(() => {
        const groups: Record<string, typeof COLUMN_DEFS> = { "General": [] };
        COLUMN_DEFS.forEach(col => { const g = col.headerGroup || "General"; if (!groups[g]) groups[g] = []; groups[g].push(col); });
        return groups;
    }, []);

    const isGroupFullySelected = (cols: typeof COLUMN_DEFS) => cols.every(c => visibleColumns.has(c.id));
    const isGroupPartiallySelected = (cols: typeof COLUMN_DEFS) => cols.some(c => visibleColumns.has(c.id)) && !isGroupFullySelected(cols);
    const filteredStrategies = strategies.filter(s => s.tokenSymbol.toLowerCase().includes(searchTerm.toLowerCase()) || s.collectionName.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <aside
            ref={sidebarRef}
            className={`absolute top-0 right-0 h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col shadow-2xl z-[100] transition-transform duration-300 ease-in-out w-72 ${mode ? "translate-x-0" : "translate-x-full"}`}
        >
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-2">
                    {mode === "strategies" ? <Filter className="text-blue-600" size={18} /> : <Columns className="text-purple-600" size={18} />}
                    <h2 className="font-bold text-gray-900 dark:text-white text-sm">
                        {mode === "strategies" ? "Filter Strategies" : "Data Columns"}
                    </h2>
                </div>
                <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-md"><PanelLeftClose className="rotate-180" size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">

                {/* MODE: STRATEGIES */}
                {mode === "strategies" && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider">Visibility Control</h3>
                            <button onClick={() => visibleStrategyIds.size === strategies.length ? strategies.forEach(s => toggleStrategy(s.id)) : strategies.forEach(s => { if (!visibleStrategyIds.has(s.id)) toggleStrategy(s.id) })} className="text-[10px] text-blue-500 hover:underline">
                                {visibleStrategyIds.size === strategies.length ? "Unselect All" : "Select All"}
                            </button>
                        </div>
                        <div className="relative mb-2">
                            <Search size={14} className="absolute left-2 top-2 text-gray-400" />
                            <input type="text" placeholder="Search..." className="w-full pl-8 pr-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <div className="space-y-1 max-h-[70vh] overflow-y-auto custom-scrollbar pr-1">
                            {filteredStrategies.map(s => (
                                <div key={s.id} onClick={() => toggleStrategy(s.id)} className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-sm ${visibleStrategyIds.has(s.id) ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"}`}>
                                    <div className={`w-4 h-4 border rounded flex items-center justify-center flex-shrink-0 ${visibleStrategyIds.has(s.id) ? "bg-blue-600 border-blue-600" : "border-gray-300 dark:border-gray-600"}`}>{visibleStrategyIds.has(s.id) && <Check size={10} className="text-white" />}</div>
                                    <img src={s.collectionImage} className="w-5 h-5 rounded-full object-cover" alt="" />
                                    <span className="truncate">{s.tokenSymbol}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* MODE: COLUMNS */}
                {mode === "columns" && (
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider">Configure Grid</h3>
                        </div>
                        <div className="space-y-4">
                            {Object.entries(groupedCols).map(([group, cols]) => (
                                <div key={group}>
                                    <div className="flex items-center justify-between mb-1 group cursor-pointer" onClick={() => toggleGroup(cols.map(c => c.id))}>
                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-blue-600">{group}</span>
                                        <div className={`w-3 h-3 border rounded-sm flex items-center justify-center ${isGroupFullySelected(cols) ? "bg-blue-600 border-blue-600" : isGroupPartiallySelected(cols) ? "bg-blue-300 border-blue-300" : "border-gray-300 dark:border-gray-600"}`}>
                                            {isGroupFullySelected(cols) && <Check size={8} className="text-white" />}
                                        </div>
                                    </div>
                                    <div className="pl-2 border-l-2 border-gray-100 dark:border-gray-800 space-y-0.5">
                                        {cols.map(col => (
                                            <div key={col.id} onClick={() => toggleColumn(col.id)} className={`flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer text-xs ${visibleColumns.has(col.id) ? "text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800/50" : "text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                                                {visibleColumns.has(col.id) ? <Eye size={12} className="text-blue-500" /> : <EyeOff size={12} />}
                                                <span>{col.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}

// --- MAIN COMPONENT ---

export default function StrategyDashboard(): JSX.Element {
    const [strategies, setStrategies] = useState<MergedData[]>([]);
    const [ethPrice, setEthPrice] = useState<number>(0);
    const [globalLoading, setGlobalLoading] = useState<boolean>(true);
    const [statusMessage, setStatusMessage] = useState<string>("Initializing...");

    // UI States
    const [activePanel, setActivePanel] = useState<PanelMode>(null);
    const [showInfoModal, setShowInfoModal] = useState(false);

    const [visibleStrategyIds, setVisibleStrategyIds] = useState<Set<string>>(new Set());
    const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(DEFAULT_VISIBLE_SET);

    const [sortConfig, setSortConfig] = useState<{ key: ColumnId; direction: "asc" | "desc" } | null>(null);

    // Modals State
    const [selectedTradeHistory, setSelectedTradeHistory] = useState<{ name: string, trades: TradeDetail[] } | null>(null);
    const [selectedHolderDist, setSelectedHolderDist] = useState<{ symbol: string, data: HolderData } | null>(null);

    const hasLoadedInit = useRef(false);

    // --- 1. INITIAL LOAD ---
    useEffect(() => {
        if (hasLoadedInit.current) return;
        hasLoadedInit.current = true;

        const init = async () => {
            try {
                setStatusMessage("Fetching Strategies...");
                const stratRes = await fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent("https://www.nftstrategy.fun/api/strategies"));
                const strategiesList: StrategyData[] = await stratRes.json();
                const ethAddresses = new Set<string>();
                const solAddresses = new Set<string>();
                const cgIds = new Set<string>(["ethereum"]);

                strategiesList.forEach(s => { if (s.tokenAddress?.startsWith("0x")) ethAddresses.add(s.tokenAddress); });
                Object.values(ECOSYSTEM_CONFIG).forEach(c => {
                    if (c.network === "eth") ethAddresses.add(c.tokenAddress);
                    if (c.network === "solana") solAddresses.add(c.tokenAddress);
                    if (c.coingeckoId) cgIds.add(c.coingeckoId);
                });

                setStatusMessage("Fetching Prices...");
                const [ethRes, solRes, cgRes] = await Promise.all([
                    fetch(`https://api.geckoterminal.com/api/v2/simple/networks/eth/token_price/${Array.from(ethAddresses).join(",")}?include_market_cap=true&include_24hr_vol=true&include_24hr_price_change=true`).catch(() => null),
                    solAddresses.size ? fetch(`https://api.geckoterminal.com/api/v2/simple/networks/solana/token_price/${Array.from(solAddresses).join(",")}?include_market_cap=true`).catch(() => null) : null,
                    fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${Array.from(cgIds).join(",")}&vs_currencies=usd&include_market_cap=true`).catch(() => null)
                ]);

                const ethData = ethRes?.ok ? await ethRes.json() : null;
                const solData = solRes?.ok ? await solRes.json() : null;
                const cgData = cgRes?.ok ? await cgRes.json() : {};

                setEthPrice(cgData["ethereum"]?.usd || 0);
                const getGtAttr = (addr: string, key: string) => {
                    if (!addr) return null;
                    const ethVal = ethData?.data?.attributes?.[key]?.[addr.toLowerCase()];
                    if (ethVal !== undefined) return ethVal;
                    const solVal = solData?.data?.attributes?.[key]?.[addr];
                    if (solVal !== undefined) return solVal;
                    return null;
                };

                const initialData: MergedData[] = strategiesList.map(strat => {
                    const config = strat.collectionOsSlug ? ECOSYSTEM_CONFIG[strat.collectionOsSlug] : null;
                    let ecoTicker, ecoPrice, ecoMcap, ecoAddress;
                    if (config) {
                        ecoTicker = config.ticker; ecoAddress = config.tokenAddress;
                        const p = getGtAttr(ecoAddress, "token_prices"); const m = getGtAttr(ecoAddress, "market_cap_usd");
                        ecoPrice = p ? parseFloat(p) : (cgData[config.coingeckoId]?.usd || 0);
                        ecoMcap = m ? parseFloat(m) : (cgData[config.coingeckoId]?.usd_market_cap || 0);
                    } else {
                        ecoTicker = strat.tokenSymbol; ecoAddress = strat.tokenAddress;
                        const p = getGtAttr(strat.tokenAddress, "token_prices"); const m = getGtAttr(strat.tokenAddress, "market_cap_usd");
                        ecoPrice = p ? parseFloat(p) : parseFloat(strat.poolData.price_usd || "0");
                        ecoMcap = m ? parseFloat(m) : parseFloat(strat.poolData.market_cap_usd || "0");
                    }
                    const gtPrice = getGtAttr(strat.tokenAddress, "token_prices");
                    const price = gtPrice ? parseFloat(gtPrice) : parseFloat(strat.poolData.price_usd || "0");
                    const gtMcap = getGtAttr(strat.tokenAddress, "market_cap_usd");
                    const mcap = gtMcap ? parseFloat(gtMcap) : parseFloat(strat.poolData.market_cap_usd || "0");
                    const burnAmount = parseFloat(strat.deadWalletBalance || "0");
                    const vol24h = parseFloat(getGtAttr(strat.tokenAddress, "h24_volume_usd") || "0");
                    const chg24h = parseFloat(getGtAttr(strat.tokenAddress, "h24_price_change_percentage") || "0");

                    return {
                        ...strat,
                        poolData: { ...strat.poolData, price_usd: price.toString(), market_cap_usd: mcap.toString() },
                        priceChange24h: chg24h, volume24h: vol24h, ecoTicker, ecoPriceUsd: ecoPrice, ecoMarketCapUsd: ecoMcap, ecoTokenAddress: ecoAddress,
                        burnedPercentage: (burnAmount / 1_000_000_000) * 100, burnedAmount: burnAmount, dataLoaded: false, isLoading: false
                    };
                });
                setStrategies(initialData);
                setVisibleStrategyIds(new Set(initialData.map(s => s.id)));
                setGlobalLoading(false);
                setStatusMessage("");
            } catch (e) { console.error(e); setGlobalLoading(false); }
        };
        init();
    }, []);

    // --- 2. LAZY LOADER ---
    useEffect(() => {
        if (strategies.length === 0) return;
        const loadMissingData = async () => {
            const toLoad = strategies.filter(s => visibleStrategyIds.has(s.id) && !s.dataLoaded && !s.isLoading);
            if (toLoad.length === 0) return;
            const osHeaders = { "X-API-KEY": import.meta.env.VITE_OPENSEA_API_KEY || "", "accept": "application/json" };
            setStrategies(prev => prev.map(s => toLoad.find(t => t.id === s.id) ? { ...s, isLoading: true } : s));

            for (const strat of toLoad) {
                await new Promise(r => setTimeout(r, 1200));
                try {
                    const slug = strat.collectionOsSlug;
                    const isPunks = slug === "cryptopunks";
                    const baseUrl = "https://api.etherscan.io/v2/api?chainid=1&module=logs&action=getLogs";
                    let strategyAddressPadded = padAddress(strat.tokenAddress);

                    let buyUrl = "", sellUrl = "";
                    if (isPunks) {
                        strategyAddressPadded = padAddress(PUNKS_HOLDING_WALLET);
                        buyUrl = `${baseUrl}&fromBlock=${strat.blockNumber}&toBlock=latest&address=${PUNKS_ADDRESS}&topic0=${TOPIC_PUNK_BOUGHT}&topic3=${strategyAddressPadded}&apikey=${API_KEY}`;
                        sellUrl = `${baseUrl}&fromBlock=${strat.blockNumber}&toBlock=latest&address=${PUNKS_ADDRESS}&topic0=${TOPIC_PUNK_BOUGHT}&topic2=${strategyAddressPadded}&apikey=${API_KEY}`;
                    } else {
                        buyUrl = `${baseUrl}&fromBlock=${strat.blockNumber}&toBlock=latest&address=${strat.tokenAddress}&topic0=${TOPIC_STD_BUY}&apikey=${API_KEY}`;
                        sellUrl = `${baseUrl}&fromBlock=${strat.blockNumber}&toBlock=latest&address=${strat.tokenAddress}&topic0=${TOPIC_STD_SELL}&apikey=${API_KEY}`;
                    }
                    const gtNetwork = strat.tokenAddress.startsWith("0x") ? "eth" : "solana";
                    const fetchStratInfo = fetch(`https://api.geckoterminal.com/api/v2/networks/${gtNetwork}/tokens/${strat.tokenAddress}/info`).catch(() => null);
                    let fetchEcoInfo = Promise.resolve(null as Response | null);
                    if (strat.ecoTokenAddress && strat.ecoTokenAddress !== strat.tokenAddress) {
                        const ecoNet = ECOSYSTEM_CONFIG[slug || ""]?.network || "eth";
                        fetchEcoInfo = fetch(`https://api.geckoterminal.com/api/v2/networks/${ecoNet}/tokens/${strat.ecoTokenAddress}/info`).catch(() => null);
                    }
                    const fetchOsStats = slug ? fetch(`https://api.opensea.io/api/v2/collections/${slug}/stats`, { headers: osHeaders }).catch(() => null) : Promise.resolve(null);
                    const fetchOsInfo = slug ? fetch(`https://api.opensea.io/api/v2/collections/${slug}`, { headers: osHeaders }).catch(() => null) : Promise.resolve(null);
                    const [stratInfoRes, ecoInfoRes, osStatsRes, osInfoRes, buysRes, sellsRes] = await Promise.all([fetchStratInfo, fetchEcoInfo, fetchOsStats, fetchOsInfo, fetch(buyUrl).catch(() => null), fetch(sellUrl).catch(() => null)]);

                    let floorEth = 0, supply = 0, nftHolders = 0;
                    if (osStatsRes?.ok) { const d = await osStatsRes.json(); floorEth = d.total?.floor_price || 0; nftHolders = d.total?.num_owners || 0; }
                    if (osInfoRes?.ok) { const d = await osInfoRes.json(); supply = d.total_supply || 0; }

                    let stratHoldersData: HolderData | undefined, ecoHoldersData: HolderData | undefined;
                    let stratHoldersCount = 0, ecoHoldersCount = 0;
                    if (stratInfoRes?.ok) { const d = await stratInfoRes.json(); if (d.data?.attributes?.holders) { stratHoldersData = { count: d.data.attributes.holders.count, distribution: d.data.attributes.holders.distribution_percentage }; stratHoldersCount = stratHoldersData.count; } }
                    if (strat.ecoTokenAddress === strat.tokenAddress) { ecoHoldersData = stratHoldersData; ecoHoldersCount = stratHoldersCount; }
                    else if (ecoInfoRes?.ok) { const d = await ecoInfoRes.json(); if (d.data?.attributes?.holders) { ecoHoldersData = { count: d.data.attributes.holders.count, distribution: d.data.attributes.holders.distribution_percentage }; ecoHoldersCount = ecoHoldersData.count; } }

                    const trades: TradeDetail[] = [];
                    let realizedPnL = 0, inventoryCount = 0, totalBuyVolume = 0, totalSaleVolume = 0, buyCount = 0, saleCount = 0;
                    if (buysRes?.ok && sellsRes?.ok) {
                        const buysData = await buysRes.json(); const sellsData = await sellsRes.json();
                        type NormalizedEvent = { type: "BUY" | "SELL", tokenId: string, price: number, tx: string, time: Date };
                        const events: NormalizedEvent[] = [];
                        const processLogs = (logs: any[], type: "BUY" | "SELL") => {
                            logs.forEach((log: any) => {
                                let tokenId = "", price = 0; const time = new Date(decodeHexInt(log.timeStamp) * 1000);
                                if (isPunks) { tokenId = BigInt(log.topics[1]).toString(); price = decodeHexPrice(log.data); }
                                else { tokenId = BigInt(log.topics[1]).toString(); const chunks = decodeLogData(log.data); price = decodeHexPrice(chunks[0]); }
                                if (tokenId) { events.push({ type, tokenId, price, tx: log.transactionHash, time }); if (type === "BUY") { buyCount++; totalBuyVolume += price; } else { saleCount++; totalSaleVolume += price; } }
                            });
                        };
                        processLogs(buysData.result || [], "BUY"); processLogs(sellsData.result || [], "SELL");
                        events.sort((a, b) => a.time.getTime() - b.time.getTime());
                        const inventory = new Map<string, NormalizedEvent[]>();
                        events.forEach(ev => {
                            if (ev.type === "BUY") { const q = inventory.get(ev.tokenId) || []; q.push(ev); inventory.set(ev.tokenId, q); }
                            else { const q = inventory.get(ev.tokenId); if (q?.length) { const match = q.shift(); if (match) { const profit = ev.price - match.price; trades.push({ tokenId: ev.tokenId, buyPriceEth: match.price, buyTx: match.tx, buyDate: match.time, sellPriceEth: ev.price, sellTx: ev.tx, sellDate: ev.time, profitEth: profit, daysHeld: Math.max(0, (ev.time.getTime() - match.time.getTime()) / 86400000) }); realizedPnL += profit; } } }
                        });
                        inventory.forEach(q => inventoryCount += q.length);
                    }

                    const stratMcap = parseFloat(strat.poolData.market_cap_usd || "0");
                    const nftMcapUsd = supply * floorEth * ethPrice;
                    const treasuryVal = inventoryCount * floorEth * ethPrice;
                    const ecoColRatio = (nftMcapUsd > 0 && strat.ecoMarketCapUsd) ? (strat.ecoMarketCapUsd / nftMcapUsd) * 100 : 0;
                    const stratColRatio = nftMcapUsd > 0 ? stratMcap / nftMcapUsd * 100 : 0;
                    const navRatio = treasuryVal > 0 ? stratMcap / treasuryVal : 0;
                    const ecoColHolderRatio = (ecoHoldersCount > 0 && nftHolders > 0) ? (ecoHoldersCount / nftHolders) * 100 : 0;
                    const ecoStratHolderRatio = (ecoHoldersCount > 0 && stratHoldersCount > 0) ? (ecoHoldersCount / stratHoldersCount) * 100 : 0;
                    const stratColHolderRatio = (stratHoldersCount > 0 && nftHolders > 0) ? (stratHoldersCount / nftHolders) * 100 : 0;

                    setStrategies(prev => prev.map(s => s.id === strat.id ? {
                        ...s, nftSupply: supply, nftFloorPriceEth: floorEth, nftMarketCapUsd: nftMcapUsd, nftHolders,
                        stratHolders: stratHoldersCount, stratHoldersData, ecoHolders: ecoHoldersCount, ecoHoldersData,
                        buyVolume: totalBuyVolume, saleVolume: totalSaleVolume, buyCount, saleCount,
                        feesStrat: totalBuyVolume * 0.8, feesPnkstr: totalBuyVolume * 0.1, feesRoyalties: totalBuyVolume * 0.1,
                        realizedPnLEth: realizedPnL, tradesCount: trades.length, tradeHistory: trades, inventoryCount, treasuryValueUsd: treasuryVal,
                        ecoColRatio, stratColRatio, navRatio, ecoColHolderRatio, ecoStratHolderRatio, stratColHolderRatio, dataLoaded: true, isLoading: false
                    } : s));
                } catch (err) { console.error(`Error loading ${strat.tokenSymbol}`, err); setStrategies(prev => prev.map(s => s.id === strat.id ? { ...s, isLoading: false } : s)); }
            }
        };
        loadMissingData();
    }, [visibleStrategyIds, strategies.length, ethPrice]);

    // --- HELPERS ---
    const toggleStrategy = (id: string) => { const s = new Set(visibleStrategyIds); if (s.has(id)) s.delete(id); else s.add(id); setVisibleStrategyIds(s); };
    const toggleColumn = (id: ColumnId) => { const s = new Set(visibleColumns); if (s.has(id)) s.delete(id); else s.add(id); setVisibleColumns(s); };

    const toggleGroup = (ids: ColumnId[]) => {
        const s = new Set(visibleColumns);
        const allSelected = ids.every(id => s.has(id));
        ids.forEach(id => {
            if (allSelected) s.delete(id);
            else s.add(id);
        });
        setVisibleColumns(s);
    };
    const handleSort = (key: ColumnId) => { let direction: "asc" | "desc" = "desc"; if (sortConfig?.key === key && sortConfig.direction === "desc") direction = "asc"; setSortConfig({ key, direction }); };

    // Animation trigger wrappers
    const handleHideColumn = (e: React.MouseEvent, colId: ColumnId) => {
        e.stopPropagation();
        const headerCell = (e.target as HTMLElement).closest("th");
        if (headerCell) {
            // Flies to the EYE button
            flyElementToTarget(headerCell, "btn-columns", () => toggleColumn(colId));
        } else {
            toggleColumn(colId);
        }
    };

    const handleHideStrategy = (e: React.MouseEvent, stratId: string) => {
        e.stopPropagation();
        const row = (e.target as HTMLElement).closest("tr");
        const img = row?.querySelector("img");
        if (img) {
            // Flies to the FILTER button
            flyElementToTarget(img as HTMLElement, "btn-strategies", () => toggleStrategy(stratId));
        } else {
            toggleStrategy(stratId);
        }
    };

    //const fmtUSD = (n?: number) => n ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0, notation: "compact" }).format(n) : "-";
    const fmtUSD = (n?: number, decimals: number = 0) => n ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: decimals,
        notation: "compact"
    }).format(n) : "-";
    const fmtPrice = (n?: number) => n ? "$" + n.toFixed(4) : "-";
    const fmtNum = (n?: number) => n ? new Intl.NumberFormat('en-US', { notation: "compact" }).format(n) : "-";
    const fmtEth = (n?: number) => n ? `Ξ${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : "-";

    const processedData = useMemo(() => {
        const data = strategies.filter(s => visibleStrategyIds.has(s.id));
        if (sortConfig) {
            data.sort((a, b) => {
                let valA: number | string = 0, valB: number | string = 0;
                switch (sortConfig.key) {
                    case "strategy": valA = a.tokenSymbol; valB = b.tokenSymbol; break;
                    case "price": valA = parseFloat(a.poolData.price_usd); valB = parseFloat(b.poolData.price_usd); break;
                    case "stratMcap": valA = parseFloat(a.poolData.market_cap_usd); valB = parseFloat(b.poolData.market_cap_usd); break;
                    case "burn": valA = a.burnedPercentage || 0; valB = b.burnedPercentage || 0; break;
                    case "stratHolders": valA = a.stratHolders || 0; valB = b.stratHolders || 0; break;
                    case "buyVolume": valA = a.buyVolume || 0; valB = b.buyVolume || 0; break;
                    case "saleVolume": valA = a.saleVolume || 0; valB = b.saleVolume || 0; break;
                    case "realizedPnL": valA = a.realizedPnLEth || 0; valB = b.realizedPnLEth || 0; break;
                    case "nftFloor": valA = a.nftFloorPriceEth || 0; valB = b.nftFloorPriceEth || 0; break;
                    default: valA = (a as any)[sortConfig.key] || 0; valB = (b as any)[sortConfig.key] || 0; break;
                }
                if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
                if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
                return 0;
            });
        }
        return data;
    }, [strategies, visibleStrategyIds, sortConfig]);

    const visibleDefs = COLUMN_DEFS.filter(c => visibleColumns.has(c.id));
    const headerGroups = useMemo(() => {
        const groups: { name: string | undefined, colSpan: number, cols: typeof COLUMN_DEFS }[] = [];
        visibleDefs.forEach(col => {
            const last = groups[groups.length - 1];
            if (last && last.name === col.headerGroup) { last.colSpan++; last.cols.push(col); }
            else { groups.push({ name: col.headerGroup, colSpan: 1, cols: [col] }); }
        });
        return groups;
    }, [visibleDefs]);

    if (globalLoading) return <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900"><Loader2 className="animate-spin w-10 h-10 text-blue-600" /></div>;

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 font-sans overflow-hidden">
            <ScrollbarStyles />
            <TradeHistoryModal isOpen={!!selectedTradeHistory} onClose={() => setSelectedTradeHistory(null)} strategy={selectedTradeHistory?.name || ""} trades={selectedTradeHistory?.trades || []} />
            <HolderDistributionModal isOpen={!!selectedHolderDist} onClose={() => setSelectedHolderDist(null)} tokenSymbol={selectedHolderDist?.symbol || ""} data={selectedHolderDist?.data} />
            <InfoModal isOpen={showInfoModal} onClose={() => setShowInfoModal(false)} />

            {/* HEADER */}
            <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex justify-between items-center shrink-0 z-50 relative">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                            <Activity className="text-blue-600" />
                            <span>TokenWorks™ <span className="text-gray-400 font-normal text-lg">Strategies</span></span>
                        </h1>
                        <div className="text-sm text-gray-500 mt-1 flex items-center gap-2 h-5">
                            {statusMessage ? <><Loader2 size={12} className="animate-spin text-blue-500" /> {statusMessage}</> : `${processedData.length} active strategies monitored.`}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowInfoModal(true)}
                        className="p-2 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-blue-600"
                        title="Documentation"
                    >
                        <Info size={20} />
                    </button>

                    {/* BUTTON: STRATEGIES FILTER */}
                    <button
                        id="btn-strategies"
                        onClick={() => setActivePanel(activePanel === "strategies" ? null : "strategies")}
                        className={`p-2 rounded-md transition-colors ${activePanel === "strategies" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"}`}
                        title="Filter Strategies"
                    >
                        <Filter size={20} />
                    </button>

                    {/* BUTTON: COLUMNS VISIBILITY */}
                    <button
                        id="btn-columns"
                        onClick={() => setActivePanel(activePanel === "columns" ? null : "columns")}
                        className={`p-2 rounded-md transition-colors ${activePanel === "columns" ? "bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"}`}
                        title="Show/Hide Columns"
                    >
                        <Eye size={20} />
                    </button>
                </div>
            </header>

            {/* CONTENT CONTAINER */}
            <div className="relative flex-1 overflow-hidden">

                {/* UNIFIED RIGHT PANEL */}
                <RightPanel
                    mode={activePanel}
                    onClose={() => setActivePanel(null)}
                    strategies={strategies} visibleStrategyIds={visibleStrategyIds} toggleStrategy={toggleStrategy}
                    visibleColumns={visibleColumns} toggleColumn={toggleColumn} toggleGroup={toggleGroup}
                />

                {/* TABLE AREA */}
                <main className="w-full h-full overflow-auto custom-scrollbar bg-white dark:bg-gray-900">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="bg-gray-50 dark:bg-gray-800/90 text-xs uppercase text-gray-500 tracking-wider z-30 sticky top-0 shadow-sm">
                            <tr>
                                {headerGroups.map((g, i) => {
                                    const bgClass = g.name && GROUP_BG_STYLES[g.name] ? GROUP_BG_STYLES[g.name] : "bg-gray-50 dark:bg-gray-900";
                                    return (
                                        <th key={i} colSpan={g.name ? g.colSpan : 1} rowSpan={g.name ? 1 : 2} className={`px-4 py-2 border-b border-r border-gray-200 dark:border-gray-700/50 text-center font-bold text-gray-400 ${bgClass} ${!g.name && g.cols[0].id === "strategy" ? "sticky left-0 z-40 shadow-[4px_0_5px_-2px_rgba(0,0,0,0.05)] min-w-[260px]" : ""}`}>
                                            {g.name || (g.cols[0].id === "strategy" ? "Strategy Identity" : "")}
                                        </th>
                                    );
                                })}
                            </tr>
                            <tr>
                                {visibleDefs.map((col) => {
                                    if (!col.headerGroup) return null;
                                    const bgClass = GROUP_BG_STYLES[col.headerGroup] || "bg-gray-50 dark:bg-gray-900";
                                    return (
                                        <th key={col.id} onClick={() => handleSort(col.id)} className={`px-4 py-2 cursor-pointer hover:brightness-95 transition border-b border-gray-200 dark:border-gray-700/50 group/th relative ${bgClass}`}>
                                            <div className={`flex items-center gap-1 ${col.align === "right" ? "justify-end" : col.align === "center" ? "justify-center" : "justify-start"}`}>
                                                {col.label}
                                                {sortConfig?.key === col.id && <ArrowUpDown size={12} className="text-blue-500" />}

                                                {/* HIDE COLUMN BUTTON */}
                                                <div
                                                    className="absolute top-1 right-1 opacity-0 group-hover/th:opacity-100 transition-opacity p-1 bg-white/80 dark:bg-black/50 rounded hover:text-red-500"
                                                    onClick={(e) => handleHideColumn(e, col.id)}
                                                    title="Hide Column"
                                                >
                                                    <EyeOff size={10} />
                                                </div>
                                            </div>
                                        </th>
                                    )
                                })}
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {processedData.map(s => (
                                <tr key={s.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group">
                                    {visibleDefs.map(col => {
                                        if (col.id === "strategy") return (
                                            <td key={col.id} className="px-4 py-3 bg-white dark:bg-gray-900 sticky left-0 z-20 group-hover:bg-blue-50/30 dark:group-hover:bg-gray-900 shadow-[4px_0_5px_-2px_rgba(0,0,0,0.05)] border-r border-gray-100 dark:border-gray-800 min-w-[260px]">
                                                <div className="flex items-center gap-3 relative">
                                                    <div className="relative">
                                                        <img src={s.collectionImage} className="w-10 h-10 rounded-xl border border-gray-100 dark:border-gray-700 object-cover shadow-sm group-hover:scale-105 transition-transform" alt={s.tokenName} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <a href={`https://www.nftstrategy.fun/strategies/${s.tokenAddress}`} target="_blank" rel="noreferrer" className="font-bold text-sm text-gray-900 dark:text-gray-100 hover:text-blue-600 flex items-center gap-1">
                                                            {s.tokenSymbol} <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400" />
                                                        </a>
                                                        <a href={s.collectionOsSlug ? `https://opensea.io/collection/${s.collectionOsSlug}` : "#"} target="_blank" rel="noreferrer" className="text-[10px] text-gray-500 hover:text-blue-500 uppercase tracking-wide flex items-center gap-1">
                                                            {s.collectionName?.slice(0, 20)}
                                                        </a>
                                                    </div>

                                                    {/* HIDE STRATEGY BUTTON */}
                                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => handleHideStrategy(e, s.id)}
                                                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-400 hover:text-red-500"
                                                            title="Hide Strategy"
                                                        >
                                                            <EyeOff size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        );

                                        const bgClass = col.headerGroup ? GROUP_BG_STYLES[col.headerGroup] : "";

                                        return (
                                            <td key={col.id} className={`px-4 py-3 text-${col.align} text-sm ${bgClass}`}>
                                                {s.isLoading && col.id !== "price" ? <div className="w-full flex justify-end"><Loader2 size={14} className="animate-spin text-gray-300" /></div> : (
                                                    <>
                                                        {col.id === "price" && <div className="font-medium text-gray-900 dark:text-gray-200">{fmtPrice(parseFloat(s.poolData.price_usd))}</div>}
                                                        {col.id === "volume24h" && (s.volume24h ? <div className="text-gray-500 text-xs">{fmtUSD(s.volume24h)}</div> : "-")}
                                                        {col.id === "priceChange24h" && (s.priceChange24h !== undefined ? <div className={`flex items-center justify-end gap-1 text-xs font-medium ${s.priceChange24h >= 0 ? "text-green-600 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded" : "text-red-600 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded"}`}>{s.priceChange24h >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />} {Math.abs(s.priceChange24h).toFixed(2)}%</div> : "-")}
                                                        {col.id === "stratMcap" && fmtUSD(parseFloat(s.poolData.market_cap_usd), 2)}

                                                        {col.id === "burn" && (
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1"><Flame size={10} />{s.burnedPercentage?.toFixed(1)}%</span>
                                                                <span className="text-[9px] text-gray-400 mt-0.5">{fmtNum(s.burnedAmount)}</span>
                                                            </div>
                                                        )}

                                                        {/* HOLDER MODAL TRIGGER */}
                                                        {col.id === "stratHolders" && (
                                                            <div
                                                                onClick={() => s.stratHoldersData && setSelectedHolderDist({ symbol: s.tokenSymbol, data: s.stratHoldersData })}
                                                                className={`flex items-center justify-center gap-1.5 ${s.stratHoldersData ? "cursor-pointer hover:text-blue-600 text-gray-600 dark:text-gray-400 hover:underline decoration-dotted" : "text-gray-400"}`}
                                                            >
                                                                <Users size={14} /> {fmtNum(s.stratHolders)}
                                                            </div>
                                                        )}

                                                        {/* Trades */}
                                                        {col.id === "buyVolume" && (
                                                            <div className="flex flex-col items-end">
                                                                <div className="text-green-600 dark:text-green-400 font-medium">{fmtEth(s.buyVolume)}</div>
                                                                <div className="text-[10px] text-gray-400">{s.buyCount}</div>
                                                            </div>
                                                        )}
                                                        {col.id === "saleVolume" && (
                                                            <div className="flex flex-col items-end">
                                                                <div className="text-red-600 dark:text-red-400 font-medium">{fmtEth(s.saleVolume)}</div>
                                                                <div className="text-[10px] text-gray-400">{s.saleCount}</div>
                                                            </div>
                                                        )}
                                                        {col.id === "realizedPnL" && (
                                                            <div className="flex flex-col items-end">
                                                                <span className={`font-bold ${s.realizedPnLEth && s.realizedPnLEth > 0 ? "text-green-600" : "text-red-600"}`}>{fmtEth(s.realizedPnLEth)}</span>
                                                                {s.tradesCount ? <button onClick={() => setSelectedTradeHistory({ name: s.tokenSymbol, trades: s.tradeHistory || [] })} className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 mt-0.5"><History size={10} /> {s.tradesCount} trades</button> : null}
                                                            </div>
                                                        )}

                                                        {/* UPDATED TREASURY CELL WITH NFT COUNT */}
                                                        {col.id === "treasury" && (
                                                            <div className="flex flex-col items-end">
                                                                <div className="font-bold text-blue-600 dark:text-blue-400">{fmtEth((s.treasuryValueUsd || 0) / (ethPrice || 1))}</div>
                                                                <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                                                    {fmtUSD(s.treasuryValueUsd)}
                                                                    <span className="text-gray-300 dark:text-gray-600">•</span>
                                                                    {s.inventoryCount || 0} NFTs
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* FEES */}
                                                        {col.id === "feesStrat" && <span className="text-gray-600 dark:text-gray-400">{fmtEth(s.feesStrat)}</span>}
                                                        {col.id === "feesPnkstr" && <span className="text-gray-600 dark:text-gray-400">{fmtEth(s.feesPnkstr)}</span>}
                                                        {col.id === "feesRoyalties" && <span className="text-gray-600 dark:text-gray-400">{fmtEth(s.feesRoyalties)}</span>}

                                                        {/* NFT */}
                                                        {col.id === "nftFloor" && (s.nftFloorPriceEth ? `Ξ${s.nftFloorPriceEth.toFixed(2)}` : "-")}
                                                        {col.id === "nftMcap" && fmtUSD(s.nftMarketCapUsd)}
                                                        {col.id === "nftHolders" && fmtNum(s.nftHolders)}

                                                        {/* ECO */}
                                                        {col.id === "ecoToken" && (
                                                            <div className="flex flex-col items-center">
                                                                <span className="bg-white dark:bg-gray-800 px-2 py-1 rounded text-xs font-bold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">{s.ecoTicker}</span>
                                                                {s.ecoPriceUsd ? <span className="text-[10px] text-gray-500 mt-0.5 font-mono">${s.ecoPriceUsd.toFixed(4)}</span> : null}
                                                            </div>
                                                        )}
                                                        {col.id === "ecoMcap" && fmtUSD(s.ecoMarketCapUsd)}
                                                        {col.id === "ecoHolders" && (
                                                            <div
                                                                onClick={() => s.ecoHoldersData && setSelectedHolderDist({ symbol: s.ecoTicker || "", data: s.ecoHoldersData })}
                                                                className={`flex items-center justify-center gap-1.5 ${s.ecoHoldersData ? "cursor-pointer hover:text-blue-600 text-gray-600 dark:text-gray-400 hover:underline decoration-dotted" : "text-gray-400"}`}
                                                            >
                                                                {s.ecoHolders ? fmtNum(s.ecoHolders) : "-"}
                                                            </div>
                                                        )}

                                                        {/* RATIOS */}
                                                        {col.id === "ecoColRatio" && (s.ecoColRatio ? <span className="font-bold text-yellow-600 dark:text-yellow-500">{s.ecoColRatio.toFixed(0)}%</span> : "-")}
                                                        {col.id === "stratColRatio" && (s.stratColRatio ? <span className="font-bold text-yellow-600 dark:text-yellow-500">{s.stratColRatio.toFixed(0)}%</span> : "-")}
                                                        {col.id === "navRatio" && (s.navRatio ? <span className={`font-bold ${s.navRatio < 1 ? "text-green-600 bg-green-50 px-1.5 rounded" : "text-blue-600 bg-blue-50 px-1.5 rounded"}`}>{s.navRatio.toFixed(2)}x</span> : "-")}
                                                        {col.id === "ecoColHolderRatio" && (s.ecoColHolderRatio ? <span className="text-gray-600 dark:text-gray-400">{s.ecoColHolderRatio.toFixed(1)}%</span> : "-")}
                                                        {col.id === "ecoStratHolderRatio" && (s.ecoStratHolderRatio ? <span className="text-gray-600 dark:text-gray-400">{s.ecoStratHolderRatio.toFixed(1)}%</span> : "-")}
                                                        {col.id === "stratColHolderRatio" && (s.stratColHolderRatio ? <span className="text-gray-600 dark:text-gray-400">{s.stratColHolderRatio.toFixed(1)}%</span> : "-")}
                                                    </>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </main>
            </div>
        </div>

    );
}