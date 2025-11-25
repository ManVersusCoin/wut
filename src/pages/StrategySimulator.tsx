import type { JSX } from "react";
import { useEffect, useState, useMemo, useRef } from "react";
import {
    TrendingUp, TrendingDown, Loader2, Flame,
    Filter, Columns, ArrowUpDown, Check, ChevronDown, ChevronUp, ChevronRight, ChevronLeft,
    Activity, History, X, Users,
    Search, EyeOff, Eye, PanelLeftClose, PieChart, Info,
    Maximize2, ArrowLeft, Wallet, Clock, Trophy, ZapIcon,
    Globe, FileText, Anchor, Coins, UserCheck, Percent
} from "lucide-react";
/*import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, PieChart as RePieChart, Pie, Cell, ComposedChart, ReferenceLine
} from 'recharts';*/

// --- 1. CONFIGURATION ---

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

// --- 2. COLUMNS DEFINITION ---

type ColumnId =
    | "strategy" | "price" | "priceChange24h" | "volume24h" | "stratMcap" | "burn" | "stratHolders"
    | "buyVolume" | "saleVolume" | "realizedPnL" | "treasury" | "currentBalance"
    | "buy24h" | "sell24h" | "buy7d" | "sell7d"
    | "feesStrat" | "feesPnkstr" | "feesRoyalties"
    | "nftFloor" | "nftMcap" | "nftHolders"
    | "ecoToken" | "ecoMcap" | "ecoHolders"
    | "ecoColRatio" | "stratColRatio" | "navRatio" | "ecoColHolderRatio" | "ecoStratHolderRatio" | "stratColHolderRatio"
    | "actions";

const COLUMN_DEFS: { id: ColumnId; label: string; align: "left" | "right" | "center"; headerGroup?: string; width?: string }[] = [
    { id: "strategy", label: "Strategy", align: "left" },

    // Group: Strategy
    { id: "price", label: "Price", align: "right", headerGroup: "Strategy" },
    { id: "priceChange24h", label: "24h %", align: "right", headerGroup: "Strategy" },
    { id: "volume24h", label: "Vol 24h", align: "right", headerGroup: "Strategy" },
    { id: "stratMcap", label: "Mcap", align: "right", headerGroup: "Strategy" },
    { id: "burn", label: "Burn", align: "right", headerGroup: "Strategy" },
    { id: "stratHolders", label: "Holders", align: "center", headerGroup: "Strategy" },

    // Group: Activity (NEW)
    { id: "buy24h", label: "Buy 24h", align: "right", headerGroup: "NFT Activity" },
    { id: "sell24h", label: "Sell 24h", align: "right", headerGroup: "NFT Activity" },
    { id: "buy7d", label: "Buy 7d", align: "right", headerGroup: "NFT Activity" },
    { id: "sell7d", label: "Sell 7d", align: "right", headerGroup: "NFT Activity" },

    // Group: Trades & Holdings
    { id: "buyVolume", label: "Buy Vol (Ξ)", align: "right", headerGroup: "Trades & Holdings" },
    { id: "saleVolume", label: "Sale Vol (Ξ)", align: "right", headerGroup: "Trades & Holdings" },
    { id: "realizedPnL", label: "Realized P&L", align: "right", headerGroup: "Trades & Holdings" },
    { id: "treasury", label: "Treasury", align: "right", headerGroup: "Trades & Holdings" },
    { id: "currentBalance", label: "Balance", align: "right", headerGroup: "Trades & Holdings" },

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

    // ACTIONS
    { id: "actions", label: "", align: "center", width: "50px" }
];

// --- DEFAULT VISIBLE COLUMNS ---
const DEFAULT_VISIBLE_SET = new Set<ColumnId>([
    "strategy",
    "price",
    "priceChange24h",
    "stratMcap",
    "buy7d",
    "sell7d",
    "realizedPnL",
    "treasury",
    "stratColRatio",
    "navRatio",
    "actions"
]);

// --- STYLES MAPPING ---
const GROUP_BG_STYLES: Record<string, string> = {
    "Strategy": "bg-white dark:bg-gray-900",
    "NFT Activity": "bg-blue-50/50 dark:bg-blue-900/10",
    "Trades & Holdings": "bg-gray-50 dark:bg-gray-800/40",
    "Fees": "bg-slate-50 dark:bg-slate-900/20",
    "NFT Collection": "bg-zinc-50 dark:bg-zinc-900/20",
    "Ecosystem Token": "bg-stone-50 dark:bg-stone-900/20",
    "KPI / Ratio": "bg-orange-50/30 dark:bg-orange-900/10"
};

// --- TYPES ---
type TradeDetail = { tokenId: string; buyPriceEth: number; buyTx: string; buyDate: Date; sellPriceEth: number; sellTx: string; sellDate: Date; profitEth: number; daysHeld: number; };
type RawEvent = { type: "BUY" | "SELL"; tokenId: string; price: number; tx: string; time: Date; };
type StrategyData = { id: string; collection: string; tokenAddress: string; collectionName: string; collectionOsSlug: string | null; collectionImage: string; tokenName: string; tokenSymbol: string; blockNumber: string; deadWalletBalance: string; poolData: { market_cap_usd: string; price_usd: string; }; transactionHash: string; poolId: string; type: string; };
type HolderData = { count: number; distribution: Record<string, string>; };

type MergedData = StrategyData & {
    dataLoaded: boolean; isLoading: boolean; priceChange24h?: number; volume24h?: number;
    buyCount24h: number; buyVol24h: number; sellCount24h: number; sellVol24h: number;
    buyCount7d: number; buyVol7d: number; sellCount7d: number; sellVol7d: number;
    buyVolume?: number; saleVolume?: number; buyCount?: number; saleCount?: number; realizedPnLEth?: number;
    tradesCount?: number; tradeHistory?: TradeDetail[];
    rawEvents?: RawEvent[];
    gtBuyCount24h: number; gtBuyVol24h: number; gtSellCount24h: number; gtSellVol24h: number;
    nftSupply?: number; nftFloorPriceEth?: number;
    nftMarketCapEth?: number; nftMarketCapUsd?: number; nftHolders?: number;
    stratHoldersData?: HolderData; stratHolders?: number;
    ecoHoldersData?: HolderData; ecoHolders?: number;
    ecoTicker?: string; ecoPriceUsd?: number; ecoMarketCapUsd?: number; ecoTokenAddress?: string;
    burnedPercentage?: number; burnedAmount?: number; treasuryValueUsd?: number; inventoryCount?: number; currentBalance?: number;
    feesStrat?: number; feesPnkstr?: number; feesRoyalties?: number;
    ecoColRatio?: number; stratColRatio?: number; navRatio?: number;
    ecoColHolderRatio?: number; ecoStratHolderRatio?: number; stratColHolderRatio?: number;
};

// --- UTILS ---
const padAddress = (addr: string) => "0x" + addr.replace("0x", "").padStart(64, "0").toLowerCase();
const decodeHexInt = (hex: string): number => { try { return parseInt(hex, 16); } catch (e) { console.error("decodeHexPrice error:", e); return 0; } };
const decodeHexPrice = (hex: string): number => { try { return Number(BigInt(hex)) / 1e18; } catch (e) { console.error("decodeHexPrice error:", e); return 0; } };
const decodeLogData = (data: string) => { const c = data.startsWith("0x") ? data.slice(2) : data; return (c.match(/.{1,64}/g) || []).map(x => "0x" + x); };
const fmtUSD = (n?: number, decimals: number = 0) => n ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: decimals, notation: "compact" }).format(n) : "-";
const fmtPrice = (n?: number) => n ? "$" + n.toFixed(4) : "-";
const fmtNum = (n?: number) => n ? new Intl.NumberFormat('en-US', { notation: "compact" }).format(n) : "-";
const fmtEth = (n?: number) => n ? `Ξ${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : "-";


// --- MAIN DASHBOARD ---

export default function StrategyDashboard(): JSX.Element {
    const [strategies, setStrategies] = useState<MergedData[]>([]);
    const [ethPrice, setEthPrice] = useState<number>(0);
    const [globalLoading, setGlobalLoading] = useState<boolean>(true);
    const [statusMessage, setStatusMessage] = useState<string>("Initializing...");

    const [activePanel, setActivePanel] = useState<"strategies" | "columns" | null>(null);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [visibleStrategyIds, setVisibleStrategyIds] = useState<Set<string>>(new Set());
    const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(DEFAULT_VISIBLE_SET);
    const [sortConfig, setSortConfig] = useState<{ key: ColumnId; direction: "asc" | "desc" } | null>(null);

    const tableContainerRef = useRef<HTMLDivElement>(null);
    const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
    const [selectedTradeHistory, setSelectedTradeHistory] = useState<{ name: string, trades: TradeDetail[] } | null>(null);
    const [selectedHolderDist, setSelectedHolderDist] = useState<{ symbol: string, data: HolderData } | null>(null);

    const hasLoadedInit = useRef(false);

    useEffect(() => {
        if (hasLoadedInit.current) return;
        hasLoadedInit.current = true;
        const init = async () => {
            try {
                setStatusMessage("Fetching Strategies...");
                const stratRes = await fetch("/tw_strategies.json");
                const strategiesList: StrategyData[] = await stratRes.json();

                const ethPoolIds = new Set<string>();
                const ethTokenAddresses = new Set<string>();
                const solAddresses = new Set<string>();
                const cgIds = new Set<string>(["ethereum"]);

                strategiesList.forEach(s => {
                    let fullPoolId = s.poolId;
                    if (s.tokenAddress?.startsWith("0x") && s.poolId && !s.poolId.includes('_')) fullPoolId = `${s.poolId}`;
                    if (fullPoolId?.startsWith("0x")) ethPoolIds.add(fullPoolId);
                    if (s.tokenAddress?.startsWith("0x")) ethTokenAddresses.add(s.tokenAddress);
                });
                Object.values(ECOSYSTEM_CONFIG).forEach(c => {
                    if (c.network === "eth") ethTokenAddresses.add(c.tokenAddress);
                    if (c.network === "solana") solAddresses.add(c.tokenAddress);
                    if (c.coingeckoId) cgIds.add(c.coingeckoId);
                });

                setStatusMessage("Fetching Prices...");
                const [ethRes, solRes, cgRes] = await Promise.all([
                    ethPoolIds.size > 0 ? fetch(`https://api.geckoterminal.com/api/v2/networks/eth/pools/multi/${Array.from(ethPoolIds).join(",")}?include_volume_breakdown=true&include_composition=true`).catch(() => null) : null,
                    solAddresses.size ? fetch(`https://api.geckoterminal.com/api/v2/simple/networks/solana/token_price/${Array.from(solAddresses).join(",")}?include_market_cap=true`).catch(() => null) : null,
                    fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${Array.from(cgIds).join(",")}&vs_currencies=usd&include_market_cap=true`).catch(() => null)
                ]);

                const ethDataRaw = ethRes?.ok ? await ethRes.json() : null;
                const solData = solRes?.ok ? await solRes.json() : null;
                const cgData = cgRes?.ok ? await cgRes.json() : {};
                setEthPrice(cgData["ethereum"]?.usd || 0);

                const ethPoolDataByPoolId = new Map<string, any>();
                const ethPoolDataByTokenAddress = new Map<string, any>();
                if (ethDataRaw?.data) {
                    for (const pool of ethDataRaw.data) {
                        const poolId = pool.id;
                        const tokenAddress = pool.relationships.base_token.data.id.split('_')[1];
                        ethPoolDataByPoolId.set(poolId, pool.attributes);
                        ethPoolDataByTokenAddress.set(tokenAddress.toLowerCase(), pool.attributes);
                    }
                }
                const getGtAttr = (addr: string, key: string) => {
                    if (!addr) return null;
                    const solVal = solData?.data?.attributes?.[key]?.[addr];
                    if (solVal !== undefined) return solVal;
                    return null;
                };

                const initialData: MergedData[] = strategiesList.map(strat => {
                    const config = strat.collectionOsSlug ? ECOSYSTEM_CONFIG[strat.collectionOsSlug] : null;
                    let fullPoolId = strat.poolId;
                    if (strat.tokenAddress?.startsWith("0x") && strat.poolId && !strat.poolId.includes('_')) fullPoolId = `eth_${strat.poolId}`;

                    const poolAttrs = ethPoolDataByPoolId.get(fullPoolId);
                    let stratPrice: number, stratMcap: number, stratChg24h: number = 0, stratVol24h: number = 0;
                    let gtBuyCount24h = 0, gtBuyVol24h = 0, gtSellCount24h = 0, gtSellVol24h = 0;

                    if (poolAttrs) {
                        stratPrice = parseFloat(poolAttrs.base_token_price_usd || "0");
                        stratMcap = parseFloat(poolAttrs.market_cap_usd || "0");
                        stratChg24h = parseFloat(poolAttrs.price_change_percentage?.h24 || "0");
                        stratVol24h = parseFloat(poolAttrs.volume_usd?.h24 || "0");
                        gtBuyCount24h = poolAttrs.transactions?.h24?.buys || 0;
                        gtBuyVol24h = parseFloat(poolAttrs.buy_volume_usd?.h24 || "0");
                        gtSellCount24h = poolAttrs.transactions?.h24?.sells || 0;
                        gtSellVol24h = parseFloat(poolAttrs.sell_volume_usd?.h24 || "0");
                    } else {
                        const p = getGtAttr(strat.tokenAddress, "token_prices");
                        const m = getGtAttr(strat.tokenAddress, "market_cap_usd");
                        const vol24h_fallback = parseFloat(getGtAttr(strat.tokenAddress, "h24_volume_usd") || "0");
                        const chg24h_fallback = parseFloat(getGtAttr(strat.tokenAddress, "h24_price_change_percentage") || "0");
                        stratPrice = p ? parseFloat(p) : parseFloat(strat.poolData.price_usd || "0");
                        stratMcap = m ? parseFloat(m) : parseFloat(strat.poolData.market_cap_usd || "0");
                        stratVol24h = vol24h_fallback;
                        stratChg24h = chg24h_fallback;
                    }

                    let ecoTicker, ecoPrice, ecoMcap, ecoAddress;
                    if (config) {
                        ecoTicker = config.ticker; ecoAddress = config.tokenAddress;
                        const ecoPoolAttrs = ethPoolDataByTokenAddress.get(ecoAddress.toLowerCase());
                        if (ecoPoolAttrs) {
                            ecoPrice = parseFloat(ecoPoolAttrs.base_token_price_usd || "0");
                            ecoMcap = parseFloat(ecoPoolAttrs.market_cap_usd || "0");
                        } else {
                            const p = getGtAttr(ecoAddress, "token_prices");
                            const m = getGtAttr(ecoAddress, "market_cap_usd");
                            ecoPrice = p ? parseFloat(p) : (cgData[config.coingeckoId]?.usd || 0);
                            ecoMcap = m ? parseFloat(m) : (cgData[config.coingeckoId]?.usd_market_cap || 0);
                        }
                    } else {
                        ecoTicker = strat.tokenSymbol; ecoAddress = strat.tokenAddress;
                        ecoPrice = stratPrice;
                        ecoMcap = stratMcap;
                    }
                    const burnAmount = parseFloat(strat.deadWalletBalance || "0");
                    return {
                        ...strat,
                        poolData: { ...strat.poolData, price_usd: stratPrice.toString(), market_cap_usd: stratMcap.toString() },
                        priceChange24h: stratChg24h, volume24h: stratVol24h,
                        ecoTicker, ecoPriceUsd: ecoPrice, ecoMarketCapUsd: ecoMcap, ecoTokenAddress: ecoAddress,
                        burnedPercentage: (burnAmount / 1_000_000_000) * 100, burnedAmount: burnAmount,
                        buyCount24h: 0, buyVol24h: 0, sellCount24h: 0, sellVol24h: 0,
                        buyCount7d: 0, buyVol7d: 0, sellCount7d: 0, sellVol7d: 0,
                        gtBuyCount24h, gtBuyVol24h, gtSellCount24h, gtSellVol24h,
                        dataLoaded: false, isLoading: false
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
                    const balanceInfo = fetch(`https://api.etherscan.io/v2/api?chainid=1&module=account&action=balance&address=${strat.tokenAddress}&apikey=${API_KEY}`).catch(() => null);
                    if (strat.ecoTokenAddress && strat.ecoTokenAddress !== strat.tokenAddress) {
                        const ecoNet = ECOSYSTEM_CONFIG[slug || ""]?.network || "eth";
                        fetchEcoInfo = fetch(`https://api.geckoterminal.com/api/v2/networks/${ecoNet}/tokens/${strat.ecoTokenAddress}/info`).catch(() => null);
                    }
                    const fetchOsStats = slug ? fetch(`https://api.opensea.io/api/v2/collections/${slug}/stats`, { headers: osHeaders }).catch(() => null) : Promise.resolve(null);
                    const fetchOsInfo = slug ? fetch(`https://api.opensea.io/api/v2/collections/${slug}`, { headers: osHeaders }).catch(() => null) : Promise.resolve(null);
                    const [stratInfoRes, balanceRes, ecoInfoRes, osStatsRes, osInfoRes, buysRes, sellsRes] = await Promise.all([fetchStratInfo, balanceInfo, fetchEcoInfo, fetchOsStats, fetchOsInfo, fetch(buyUrl).catch(() => null), fetch(sellUrl).catch(() => null)]);

                    let floorEth = 0, supply = 0, nftHolders = 0, currentBalance = 0;
                    if (osStatsRes?.ok) { const d = await osStatsRes.json(); floorEth = d.total?.floor_price || 0; nftHolders = d.total?.num_owners || 0; }
                    if (osInfoRes?.ok) { const d = await osInfoRes.json(); supply = d.total_supply || 0; }
                    let stratHoldersData: HolderData | undefined, ecoHoldersData: HolderData | undefined;
                    let stratHoldersCount = 0, ecoHoldersCount = 0;
                    if (stratInfoRes?.ok) { const d = await stratInfoRes.json(); if (d.data?.attributes?.holders) { stratHoldersData = { count: d.data.attributes.holders.count, distribution: d.data.attributes.holders.distribution_percentage }; stratHoldersCount = stratHoldersData.count; } }
                    if (strat.ecoTokenAddress === strat.tokenAddress) { ecoHoldersData = stratHoldersData; ecoHoldersCount = stratHoldersCount; }
                    else if (ecoInfoRes?.ok) { const d = await ecoInfoRes.json(); if (d.data?.attributes?.holders) { ecoHoldersData = { count: d.data.attributes.holders.count, distribution: d.data.attributes.holders.distribution_percentage }; ecoHoldersCount = ecoHoldersData.count; } }
                    if (balanceRes?.ok) { const d = await balanceRes.json(); if (d.result) currentBalance = d.result / 1e18; }

                    const trades: TradeDetail[] = [];
                    const allRawEvents: RawEvent[] = [];
                    let realizedPnL = 0, inventoryCount = 0, totalBuyVolume = 0, totalSaleVolume = 0, buyCount = 0, saleCount = 0;
                    let b24c = 0, b24v = 0, s24c = 0, s24v = 0, b7c = 0, b7v = 0, s7c = 0, s7v = 0;

                    if (buysRes?.ok && sellsRes?.ok) {
                        const buysData = await buysRes.json(); const sellsData = await sellsRes.json();
                        type NormalizedEvent = { type: "BUY" | "SELL", tokenId: string, price: number, tx: string, time: Date };
                        const events: NormalizedEvent[] = [];
                        const now = Date.now();
                        const oneDay = 24 * 3600 * 1000;
                        const sevenDays = 7 * oneDay;
                        const processLogs = (logs: any[], type: "BUY" | "SELL") => {
                            logs.forEach((log: any) => {
                                let tokenId = "", price = 0; const time = new Date(decodeHexInt(log.timeStamp) * 1000);
                                if (isPunks) { tokenId = BigInt(log.topics[1]).toString(); price = decodeHexPrice(log.data); }
                                else { tokenId = BigInt(log.topics[1]).toString(); const chunks = decodeLogData(log.data); price = decodeHexPrice(chunks[0]); }
                                if (tokenId) {
                                    events.push({ type, tokenId, price, tx: log.transactionHash, time });
                                    allRawEvents.push({ type, tokenId, price, tx: log.transactionHash, time });
                                    if (type === "BUY") { buyCount++; totalBuyVolume += price; } else { saleCount++; totalSaleVolume += price; }
                                    const age = now - time.getTime();
                                    if (type === "BUY") { if (age < oneDay) { b24c++; b24v += price; } if (age < sevenDays) { b7c++; b7v += price; } }
                                    else { if (age < oneDay) { s24c++; s24v += price; } if (age < sevenDays) { s7c++; s7v += price; } }
                                }
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
                        feesStrat: (totalBuyVolume + currentBalance) * 0.8, feesPnkstr: (totalBuyVolume + currentBalance) * 0.1, feesRoyalties: (totalBuyVolume + currentBalance) * 0.1,
                        realizedPnLEth: realizedPnL, tradesCount: trades.length, tradeHistory: trades, rawEvents: allRawEvents,
                        inventoryCount, treasuryValueUsd: treasuryVal, currentBalance,
                        ecoColRatio, stratColRatio, navRatio, ecoColHolderRatio, ecoStratHolderRatio, stratColHolderRatio,
                        buyCount24h: b24c, buyVol24h: b24v, sellCount24h: s24c, sellVol24h: s24v,
                        buyCount7d: b7c, buyVol7d: b7v, sellCount7d: s7c, sellVol7d: s7v,
                        dataLoaded: true, isLoading: false
                    } : s));
                } catch (err) { console.error(`Error loading ${strat.tokenSymbol}`, err); setStrategies(prev => prev.map(s => s.id === strat.id ? { ...s, isLoading: false } : s)); }
            }
        };
        loadMissingData();
    }, [visibleStrategyIds, strategies.length, ethPrice]);

    const toggleStrategy = (id: string) => { const s = new Set(visibleStrategyIds); if (s.has(id)) s.delete(id); else s.add(id); setVisibleStrategyIds(s); };
    const toggleColumn = (id: ColumnId) => { const s = new Set(visibleColumns); if (s.has(id)) s.delete(id); else s.add(id); setVisibleColumns(s); };
    const toggleGroup = (ids: ColumnId[]) => { const s = new Set(visibleColumns); const all = ids.every(id => s.has(id)); ids.forEach(id => all ? s.delete(id) : s.add(id)); setVisibleColumns(s); };
    const handleSort = (key: ColumnId) => { let direction: "asc" | "desc" = "desc"; if (sortConfig?.key === key && sortConfig.direction === "desc") direction = "asc"; setSortConfig({ key, direction }); };

    const scrollTable = (direction: "left" | "right") => {
        if (tableContainerRef.current) {
            const scrollAmount = 300;
            tableContainerRef.current.scrollBy({ left: direction === "right" ? scrollAmount : -scrollAmount, behavior: "smooth" });
        }
    };
    const handleHideStrategy = (e: React.MouseEvent, stratId: string) => { e.stopPropagation(); toggleStrategy(stratId); };
    const selectedStrategy = useMemo(() => selectedStrategyId ? strategies.find(s => s.id === selectedStrategyId) : null, [selectedStrategyId, strategies]);

    if (globalLoading) return <div className=" w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900"><Loader2 className="animate-spin w-10 h-10 text-blue-600" /></div>;
    if (selectedStrategy) return <StrategyDetailView strategy={selectedStrategy} allStrategies={strategies} onSwitch={setSelectedStrategyId} onBack={() => setSelectedStrategyId(null)} />;

    return (
        <div className="absolute inset-0 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950 font-sans z-10">

            <ScrollbarStyles />
            <TradeHistoryModal isOpen={!!selectedTradeHistory} onClose={() => setSelectedTradeHistory(null)} strategy={selectedTradeHistory?.name || ""} trades={selectedTradeHistory?.trades || []} />
            <HolderDistributionModal isOpen={!!selectedHolderDist} onClose={() => setSelectedHolderDist(null)} tokenSymbol={selectedHolderDist?.symbol || ""} data={selectedHolderDist?.data} />
            <InfoModal isOpen={showInfoModal} onClose={() => setShowInfoModal(false)} />

            <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex justify-between items-center shrink-0 z-50">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                            <Activity className="text-blue-600" />
                            <span>TokenWorks™ <span className="text-gray-400 font-normal text-lg">Strategies</span></span>
                        </h1>
                        <div className="text-sm text-gray-500 mt-1 flex items-center gap-2 h-5">
                            {statusMessage ? <><Loader2 size={12} className="animate-spin text-blue-500" /> {statusMessage}</> : `${strategies.filter(s => visibleStrategyIds.has(s.id)).length} active strategies.`}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowInfoModal(true)} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-blue-600"><Info size={20} /></button>
                    <button id="btn-strategies" onClick={() => setActivePanel(activePanel === "strategies" ? null : "strategies")} className={`p-2 rounded-md ${activePanel === "strategies" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100 text-gray-500"}`}><Filter size={20} /></button>
                    <button id="btn-columns" onClick={() => setActivePanel(activePanel === "columns" ? null : "columns")} className={`p-2 rounded-md ${activePanel === "columns" ? "bg-purple-100 text-purple-600" : "hover:bg-gray-100 text-gray-500"}`}><Eye size={20} /></button>
                </div>
            </header>

            <div className="relative flex-1 flex flex-col overflow-hidden">
                {activePanel && <RightPanel mode={activePanel} onClose={() => setActivePanel(null)} strategies={strategies} visibleStrategyIds={visibleStrategyIds} toggleStrategy={toggleStrategy} visibleColumns={visibleColumns} toggleColumn={toggleColumn} toggleGroup={toggleGroup} />}
                <div ref={tableContainerRef} className="flex-1 w-full overflow-auto no-scrollbar bg-white dark:bg-gray-900">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="bg-gray-50 dark:bg-gray-800/90 text-xs uppercase text-gray-500 tracking-wider z-30 sticky top-0 shadow-sm">
                            <tr>
                                {(() => {
                                    const visibleDefs = COLUMN_DEFS.filter(c => visibleColumns.has(c.id));
                                    const headerGroups: { name: string | undefined, colSpan: number, cols: typeof COLUMN_DEFS }[] = [];
                                    visibleDefs.forEach(col => {
                                        const last = headerGroups[headerGroups.length - 1];
                                        if (last && last.name === col.headerGroup) { last.colSpan++; last.cols.push(col); }
                                        else { headerGroups.push({ name: col.headerGroup, colSpan: 1, cols: [col] }); }
                                    });
                                    return headerGroups.map((g, i) => (
                                        <th key={i} colSpan={g.colSpan} rowSpan={g.name ? 1 : 2} className={`px-4 py-2 border-b border-r border-gray-200 dark:border-gray-700/50 text-center font-bold text-gray-400 ${g.name && GROUP_BG_STYLES[g.name] ? GROUP_BG_STYLES[g.name] : "bg-gray-50 dark:bg-gray-900"} ${!g.name && g.cols[0].id === "strategy" ? "sticky left-0 z-40 shadow-[4px_0_5px_-2px_rgba(0,0,0,0.05)] min-w-[280px]" : ""} ${g.cols[0].id === 'actions' ? 'sticky right-0 z-40' : ''}`}>
                                            {g.name || (g.cols[0].id === "strategy" ? "Strategy Identity" : "")}
                                            {g.cols[0].id === "actions" && (
                                                <div className="flex justify-center gap-1 mt-1">
                                                    <button onClick={() => scrollTable("left")} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><ChevronLeft size={14} /></button>
                                                    <button onClick={() => scrollTable("right")} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><ChevronRight size={14} /></button>
                                                </div>
                                            )}
                                        </th>
                                    ));
                                })()}
                            </tr>
                            <tr>
                                {COLUMN_DEFS.filter(c => visibleColumns.has(c.id)).map((col) => {
                                    if (!col.headerGroup) return null;
                                    const bgClass = GROUP_BG_STYLES[col.headerGroup] || "bg-gray-50 dark:bg-gray-900";
                                    return (
                                        <th key={col.id} onClick={() => col.id !== "actions" && handleSort(col.id)} className={`px-4 py-2 cursor-pointer hover:brightness-95 transition border-b border-gray-200 dark:border-gray-700/50 group/th relative ${bgClass} ${col.id === 'actions' ? 'sticky right-0 z-40 border-l border-gray-200' : ''}`}>
                                            <div className={`flex items-center gap-1 ${col.align === "right" ? "justify-end" : col.align === "center" ? "justify-center" : "justify-start"}`}>
                                                {col.label} {sortConfig?.key === col.id && <ArrowUpDown size={12} className="text-blue-500" />}
                                                {col.id !== "actions" && <div className="absolute top-1 right-1 opacity-0 group-hover/th:opacity-100 transition-opacity p-1 bg-white/80 dark:bg-black/50 rounded hover:text-red-500" onClick={(e) => { e.stopPropagation(); toggleColumn(col.id); }} title="Hide Column"><EyeOff size={10} /></div>}
                                            </div>
                                        </th>
                                    )
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {strategies.filter(s => visibleStrategyIds.has(s.id)).sort((a, b) => {
                                if (!sortConfig) return 0;
                                let vA: any = (a as any)[sortConfig.key] || 0, vB: any = (b as any)[sortConfig.key] || 0;
                                if (sortConfig.key === "strategy") { vA = a.tokenSymbol; vB = b.tokenSymbol; }
                                else if (sortConfig.key === "price") { vA = parseFloat(a.poolData.price_usd); vB = parseFloat(b.poolData.price_usd); }
                                else if (sortConfig.key === "stratMcap") { vA = parseFloat(a.poolData.market_cap_usd); vB = parseFloat(b.poolData.market_cap_usd); }
                                else if (sortConfig.key === "realizedPnL") { vA = a.realizedPnLEth; vB = b.realizedPnLEth; }
                                else if (sortConfig.key === "treasury") { vA = a.treasuryValueUsd; vB = b.treasuryValueUsd; }
                                return (vA < vB ? -1 : 1) * (sortConfig.direction === "asc" ? 1 : -1);
                            }).map(s => (
                                <tr key={s.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group">
                                    {COLUMN_DEFS.filter(c => visibleColumns.has(c.id)).map(col => {
                                        const bgClass = col.headerGroup ? GROUP_BG_STYLES[col.headerGroup] : "";
                                        if (col.id === "strategy") return (
                                            <td key={col.id} className="px-4 py-3 bg-white dark:bg-gray-900 sticky left-0 z-20 group-hover:bg-blue-50/30 dark:group-hover:bg-gray-900 shadow-[4px_0_5px_-2px_rgba(0,0,0,0.05)] border-r border-gray-100 dark:border-gray-800 min-w-[280px]">
                                                <div className="flex items-center gap-3 relative">
                                                    <img src={s.collectionImage} className="w-10 h-10 rounded-xl border border-gray-100 dark:border-gray-700 object-cover shadow-sm group-hover:scale-105 transition-transform" />
                                                    <div className="flex flex-col">
                                                        <div className="font-bold text-sm text-gray-900 dark:text-gray-100">{s.tokenSymbol}</div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <a href={`https://nftstrategy.fun/${s.tokenAddress}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-500 transition-colors" title="Strategy Page"><Globe size={12} /></a>
                                                            <a href={`https://etherscan.io/address/${s.tokenAddress}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-orange-500 transition-colors" title="Contract"><FileText size={12} /></a>
                                                            {s.collectionOsSlug && <a href={`https://opensea.io/collection/${s.collectionOsSlug}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-400 transition-colors" title="OpenSea"><Anchor size={12} /></a>}
                                                        </div>
                                                    </div>
                                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={(e) => handleHideStrategy(e, s.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-400 hover:text-red-500" title="Hide Strategy"><EyeOff size={14} /></button>
                                                    </div>
                                                </div>
                                            </td>
                                        );
                                        if (col.id === "actions") return (
                                            <td key={col.id} className="px-4 py-3 text-center sticky right-0 bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800 z-20 group-hover:bg-blue-50/30">
                                                <button onClick={() => setSelectedStrategyId(s.id)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-blue-600 transition-colors" title="Maximize Details"><Maximize2 size={16} /></button>
                                            </td>
                                        );
                                        return (
                                            <td key={col.id} className={`px-4 py-3 text-${col.align} text-sm ${bgClass}`}>
                                                {s.isLoading ? <Loader2 size={14} className="animate-spin text-gray-300 mx-auto" /> : (
                                                    <>
                                                        {col.id === "price" && <div className="font-medium text-gray-900 dark:text-gray-200">{fmtPrice(parseFloat(s.poolData.price_usd))}</div>}
                                                        {col.id === "priceChange24h" && (s.priceChange24h !== undefined ? <div className={`flex items-center justify-end gap-1 text-xs font-medium ${s.priceChange24h >= 0 ? "text-green-600 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded" : "text-red-600 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded"}`}>{s.priceChange24h >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />} {Math.abs(s.priceChange24h).toFixed(2)}%</div> : "-")}
                                                        {col.id === "volume24h" && (s.volume24h ? <div className="text-gray-500 text-xs">{fmtUSD(s.volume24h)}</div> : "-")}
                                                        {col.id === "stratMcap" && fmtUSD(parseFloat(s.poolData.market_cap_usd), 2)}
                                                        {col.id === "stratHolders" && <div onClick={() => s.stratHoldersData && setSelectedHolderDist({ symbol: s.tokenSymbol, data: s.stratHoldersData })} className={`flex items-center justify-center gap-1.5 ${s.stratHoldersData ? "cursor-pointer hover:text-blue-600 text-gray-600 dark:text-gray-400 hover:underline decoration-dotted" : "text-gray-400"}`}><Users size={14} /> {fmtNum(s.stratHolders)}</div>}
                                                        {col.id === "burn" && <div className="flex flex-col items-end"><span className="text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1"><Flame size={10} />{s.burnedPercentage?.toFixed(1)}%</span></div>}

                                                        {col.id === "buy24h" && <div className="flex flex-col items-end"><span className="text-green-600 font-medium">{fmtEth(s.buyVol24h)}</span><span className="text-[10px] text-gray-400">{s.buyCount24h}</span></div>}
                                                        {col.id === "sell24h" && <div className="flex flex-col items-end"><span className="text-red-600 font-medium">{fmtEth(s.sellVol24h)}</span><span className="text-[10px] text-gray-400">{s.sellCount24h}</span></div>}
                                                        {col.id === "buy7d" && <div className="flex flex-col items-end"><span className="text-green-600 font-medium">{fmtEth(s.buyVol7d)}</span><span className="text-[10px] text-gray-400">{s.buyCount7d}</span></div>}
                                                        {col.id === "sell7d" && <div className="flex flex-col items-end"><span className="text-red-600 font-medium">{fmtEth(s.sellVol7d)}</span><span className="text-[10px] text-gray-400">{s.sellCount7d}</span></div>}
                                                        {col.id === "buyVolume" && (<div className="flex flex-col items-end"><div className="text-green-600 dark:text-green-400 font-medium">{fmtEth(s.buyVolume)}</div><div className="text-[10px] text-gray-400">{s.buyCount}</div></div>)}
                                                        {col.id === "saleVolume" && (<div className="flex flex-col items-end"><div className="text-red-600 dark:text-red-400 font-medium">{fmtEth(s.saleVolume)}</div><div className="text-[10px] text-gray-400">{s.saleCount}</div></div>)}
                                                        {col.id === "realizedPnL" && <div className="flex flex-col items-end"><span className={`font-bold ${s.realizedPnLEth && s.realizedPnLEth > 0 ? "text-green-600" : "text-red-600"}`}>{fmtEth(s.realizedPnLEth)}</span>{s.tradesCount ? <button onClick={() => setSelectedTradeHistory({ name: s.tokenSymbol, trades: s.tradeHistory || [] })} className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 mt-0.5"><History size={10} /> {s.tradesCount} trades</button> : null}</div>}
                                                        {col.id === "treasury" && <div className="flex flex-col items-end"><div className="font-bold text-blue-600 dark:text-blue-400">{fmtUSD(s.treasuryValueUsd)}</div><div className="text-[10px] text-gray-400 flex items-center gap-1">{s.inventoryCount || 0} NFTs</div></div>}
                                                        {col.id === "currentBalance" && <span className="text-gray-600 dark:text-gray-400">{fmtEth(s.currentBalance)}</span>}
                                                        {col.id === "feesStrat" && <span className="text-gray-600 dark:text-gray-400">{fmtEth(s.feesStrat)}</span>}
                                                        {col.id === "feesPnkstr" && <span className="text-gray-600 dark:text-gray-400">{fmtEth(s.feesPnkstr)}</span>}
                                                        {col.id === "feesRoyalties" && <span className="text-gray-600 dark:text-gray-400">{fmtEth(s.feesRoyalties)}</span>}
                                                        {col.id === "nftFloor" && (s.nftFloorPriceEth ? `Ξ${s.nftFloorPriceEth.toFixed(2)}` : "-")}
                                                        {col.id === "nftMcap" && fmtUSD(s.nftMarketCapUsd)}
                                                        {col.id === "nftHolders" && fmtNum(s.nftHolders)}
                                                        {col.id === "ecoToken" && <div className="flex flex-col items-center"><span className="bg-white dark:bg-gray-800 px-2 py-1 rounded text-xs font-bold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">{s.ecoTicker}</span>{s.ecoPriceUsd ? <span className="text-[10px] text-gray-500 mt-0.5 font-mono">${s.ecoPriceUsd.toFixed(4)}</span> : null}</div>}
                                                        {col.id === "ecoMcap" && fmtUSD(s.ecoMarketCapUsd)}
                                                        {col.id === "ecoHolders" && <div onClick={() => s.ecoHoldersData && setSelectedHolderDist({ symbol: s.ecoTicker || "", data: s.ecoHoldersData })} className={`flex items-center justify-center gap-1.5 ${s.ecoHoldersData ? "cursor-pointer hover:text-blue-600 text-gray-600 dark:text-gray-400 hover:underline decoration-dotted" : "text-gray-400"}`}>{s.ecoHolders ? fmtNum(s.ecoHolders) : "-"}</div>}
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
                </div>
            </div>
        </div>
    );
}

// --- NEW DETAIL VIEW ---
function StrategyDetailView({ strategy, allStrategies, onSwitch, onBack }: { strategy: MergedData, allStrategies: MergedData[], onSwitch: (id: string) => void, onBack: () => void }) {
    // 1. Best PnL Image
    const bestPnLSummary = useMemo(() => {
        if (!strategy.tradeHistory || strategy.tradeHistory.length === 0) return null;
        const aggregatedTrades = strategy.tradeHistory.reduce((acc, trade) => {
            const key = trade.tokenId;
            if (!acc[key]) acc[key] = { tokenId: key, totalProfitEth: 0, tradeCount: 0 };
            acc[key].totalProfitEth += trade.profitEth;
            acc[key].tradeCount += 1;
            return acc;
        }, {} as Record<string, { tokenId: string, totalProfitEth: number, tradeCount: number }>);
        return Object.values(aggregatedTrades).reduce((max, summary) => (summary.totalProfitEth > max.totalProfitEth ? summary : max), { tokenId: "", totalProfitEth: -Infinity, tradeCount: 0 });
    }, [strategy.tradeHistory]);

    const [bestNftImage, setBestNftImage] = useState<string | null | undefined>(undefined);
    useEffect(() => {
        if (!bestPnLSummary || !strategy.collection) { setBestNftImage(null); return; }
        if (bestNftImage !== undefined) return;
        const osHeaders = { "X-API-KEY": import.meta.env.VITE_OPENSEA_API_KEY || "", "accept": "application/json" };
        const url = `https://api.opensea.io/api/v2/metadata/ethereum/${strategy.collection}/${bestPnLSummary.tokenId}`;
        fetch(url, { headers: osHeaders }).then(res => res.json()).then(data => setBestNftImage(data.image || data.image_url || null)).catch(() => setBestNftImage(null));
        return () => setBestNftImage(undefined);
    }, [bestPnLSummary?.tokenId, strategy.collectionOsSlug]);

    // 2. Chart Data Processing
    /*
    const chartData = useMemo(() => {
        if (!strategy.rawEvents || strategy.rawEvents.length === 0) return [];
        const groupedByDay: Record<string, { date: string, buyCount: number, sellCount: number, buyVol: number, sellVol: number }> = {};
        strategy.rawEvents.forEach(event => {
            const dayKey = event.time.toISOString().split("T")[0];
            if (!groupedByDay[dayKey]) groupedByDay[dayKey] = { date: dayKey, buyCount: 0, sellCount: 0, buyVol: 0, sellVol: 0 };
            if (event.type === "BUY") { groupedByDay[dayKey].buyCount += 1; groupedByDay[dayKey].buyVol += event.price; }
            else { groupedByDay[dayKey].sellCount -= 1; groupedByDay[dayKey].sellVol += event.price; }
        });
        const sortedDays = Object.values(groupedByDay).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let cumBuy = 0, cumSell = 0;
        return sortedDays.map(day => { cumBuy += day.buyVol; cumSell += day.sellVol; return { ...day, cumBuyVol: cumBuy, cumSellVol: cumSell }; });
    }, [strategy.rawEvents]);
    */
    // 3. Holders Distribution
    const topHolders = useMemo(() => {
        if (!strategy.stratHoldersData) return [];
        return Object.entries(strategy.stratHoldersData.distribution)
            .map(([k, v]) => ({ name: k.replace(/_/g, " "), value: parseFloat(v) }))
            .sort((a, b) => b.value - a.value).slice(0, 5);
    }, [strategy.stratHoldersData]);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20 h-full overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-gray-900 p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 sticky top-0 bg-gray-50/95 dark:bg-gray-900 backdrop-blur z-50 py-2 border-b border-gray-200 dark:border-gray-800">
                <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors font-medium">
                    <ArrowLeft size={20} /> Back
                </button>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">Strategy:</span>
                    <div className="relative group">
                        <select value={strategy.id} onChange={(e) => onSwitch(e.target.value)} className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-2 pl-4 pr-10 font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">
                            {allStrategies.map(s => <option key={s.id} value={s.id}>{s.tokenSymbol}</option>)}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* TOP ROW: Identity & Key Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* 1. Identity */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
                    <div className="flex items-start gap-4">
                        <img src={strategy.collectionImage} className="w-16 h-16 rounded-xl object-cover border-2 border-gray-100 dark:border-gray-700 shadow-md" />
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{strategy.tokenName}</h1>
                                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md text-xs font-bold border border-blue-200 dark:border-blue-800">{strategy.tokenSymbol}</span>
                            </div>
                            <div className="flex gap-3 mt-2">
                                <a href={`https://nftstrategy.fun/${strategy.tokenAddress}`} target="_blank" className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"><Globe size={12} /> Website</a>
                                <a href={`https://etherscan.io/address/${strategy.tokenAddress}`} target="_blank" className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded hover:bg-orange-100 dark:hover:bg-orange-900 transition-colors"><FileText size={12} /> Contract</a>
                                {strategy.collectionOsSlug && <a href={`https://opensea.io/collection/${strategy.collectionOsSlug}`} target="_blank" className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"><Anchor size={12} /> OpenSea</a>}
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <div className="text-xs text-gray-400 font-bold uppercase">Price</div>
                            <div className="text-xl font-bold">{fmtPrice(parseFloat(strategy.poolData.price_usd))}</div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <div className="text-xs text-gray-400 font-bold uppercase">Mcap</div>
                            <div className="text-xl font-bold">{fmtUSD(parseFloat(strategy.poolData.market_cap_usd), 2)}</div>
                        </div>
                    </div>
                </div>
                {/* 2. Treasury */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-800 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-4 text-blue-800 dark:text-blue-300 font-bold"><Wallet size={20} /> Treasury & Valuation</div>
                    <div className="flex justify-between items-end mb-4 border-b border-blue-200 dark:border-blue-800 pb-4">
                        <div>
                            <div className="text-sm text-blue-600/70 dark:text-blue-400">Treasury Value</div>
                            <div className="text-3xl font-bold text-blue-900 dark:text-white">{fmtUSD(strategy.treasuryValueUsd, 2)}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-blue-600/70 dark:text-blue-400">NAV Ratio</div>
                            <div className={`text-2xl font-bold ${strategy.navRatio && strategy.navRatio < 1 ? "text-green-600" : "text-blue-600"}`}>{strategy.navRatio?.toFixed(2)}x</div>
                        </div>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span>Held NFTs: <strong>{strategy.inventoryCount}</strong></span>
                        <span>Floor: <strong>{strategy.nftFloorPriceEth?.toFixed(2)} ETH</strong></span>
                    </div>
                </div>
                {/* 3. PnL */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <div className="text-xs text-gray-400 font-bold uppercase mb-1">Total Realized P&L</div>
                            <div className={`text-3xl font-bold ${strategy.realizedPnLEth && strategy.realizedPnLEth >= 0 ? "text-green-600" : "text-red-600"}`}>{fmtEth(strategy.realizedPnLEth)}</div>
                        </div>
                        {bestPnLSummary && bestPnLSummary.tradeCount > 0 && (
                            <div className="flex flex-col items-end">
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Trophy size={10} /> Best Trade</span>
                                <div className="flex items-center gap-2 mt-2">
                                    {bestNftImage && <img src={bestNftImage} className="w-10 h-10 rounded border border-gray-200" />}
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-green-600">+{bestPnLSummary.totalProfitEth.toFixed(2)}Ξ</div>
                                        <div className="text-[10px] text-gray-400">ID #{bestPnLSummary.tokenId}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* NEW SECTION 1: MARKET STATS & FEES */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                {/* Token Stats */}
                <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800">
                    <h3 className="text-sm font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><Activity size={16} /> Token Stats (24h)</h3>
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <div className="text-xs text-gray-400">Volume</div>
                            <div className="text-lg font-bold">{fmtUSD(strategy.volume24h)}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-400">Change</div>
                            <div className={`text-lg font-bold ${strategy.priceChange24h && strategy.priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {strategy.priceChange24h?.toFixed(2)}%
                            </div>
                        </div>
                    </div>
                </div>

                {/* Fees */}
                <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800">
                    <h3 className="text-sm font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><Coins size={16} /> Lifetime Fees Gen.</h3>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span>Strategy (8%)</span><span className="font-mono font-bold">{fmtEth(strategy.feesStrat)}</span></div>
                        <div className="flex justify-between"><span>PNKSTR (1%)</span><span className="font-mono text-gray-600">{fmtEth(strategy.feesPnkstr)}</span></div>
                        <div className="flex justify-between"><span>Royalties (1%)</span><span className="font-mono text-gray-600">{fmtEth(strategy.feesRoyalties)}</span></div>
                    </div>
                </div>

                {/* NFT Flows 24h */}
                <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800">
                    <h3 className="text-sm font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><ZapIcon size={16} /> NFT Flow (24h)</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                            <div className="text-xs text-green-700">Buys</div>
                            <div className="font-bold">{strategy.buyCount24h} <span className="text-xs font-normal">({fmtEth(strategy.buyVol24h)})</span></div>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded">
                            <div className="text-xs text-red-700">Sells</div>
                            <div className="font-bold">{strategy.sellCount24h} <span className="text-xs font-normal">({fmtEth(strategy.sellVol24h)})</span></div>
                        </div>
                    </div>
                </div>
                {/* NFT Flows 7d */}
                <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800">
                    <h3 className="text-sm font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><Clock size={16} /> NFT Flow (7d)</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                            <div className="text-xs text-green-700">Buys</div>
                            <div className="font-bold">{strategy.buyCount7d} <span className="text-xs font-normal">({fmtEth(strategy.buyVol7d)})</span></div>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded">
                            <div className="text-xs text-red-700">Sells</div>
                            <div className="font-bold">{strategy.sellCount7d} <span className="text-xs font-normal">({fmtEth(strategy.sellVol7d)})</span></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* NEW SECTION 2: HOLDERS ANALYSIS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
                    <h3 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2"><UserCheck size={16} /> Token Distribution</h3>
                    <div className="space-y-3">
                        {topHolders.length > 0 ? topHolders.map((h, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className="text-xs font-mono text-gray-400 w-4">{i + 1}.</span>
                                <div className="flex-1">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="capitalize">{h.name}</span>
                                        <span className="font-bold">{h.value.toFixed(2)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-purple-500 h-full" style={{ width: `${Math.min(100, h.value)}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        )) : <div className="text-center text-gray-400 py-4">No distribution data available</div>}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
                    <h3 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2"><Users size={16} /> Holders Analysis</h3>
                    <div className="flex items-center justify-around text-center mb-6">
                        <div>
                            <div className="text-2xl font-bold text-blue-600">{fmtNum(strategy.stratHolders)}</div>
                            <div className="text-xs text-gray-400 uppercase font-bold">Token Holders</div>
                        </div>
                        <div className="text-gray-300"><Percent size={16} /></div>
                        <div>
                            <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">{fmtNum(strategy.nftHolders)}</div>
                            <div className="text-xs text-gray-400 uppercase font-bold">NFT Collection Holders</div>
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Strategy / Collection Coverage</span>
                            <span className="font-bold">{strategy.stratColHolderRatio?.toFixed(2)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-full" style={{ width: `${Math.min(100, strategy.stratColHolderRatio || 0)}%` }}></div>
                        </div>
                    </div>
                </div>


            </div>

            {/* CHART 
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm mb-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold flex items-center gap-2"><BarChart3 className="text-purple-500" /> Market Activity</h2>
                    <div className="flex gap-4 text-sm hidden md:flex">
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-400 rounded-sm"></div> Buys</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-400 rounded-sm"></div> Sells</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-1 bg-green-700"></div> Cum. Buy</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-1 bg-red-700"></div> Cum. Sell</div>
                    </div>
                </div>
                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                            <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} minTickGap={30} />
                            <YAxis yAxisId="left" orientation="left" />
                            <YAxis yAxisId="right" orientation="right" />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                            <ReferenceLine y={0} yAxisId="left" stroke="#666" strokeOpacity={0.3} />
                            <Bar yAxisId="left" dataKey="buyCount" fill="#4ade80" barSize={10} radius={[4, 4, 0, 0]} />
                            <Bar yAxisId="left" dataKey="sellCount" fill="#f87171" barSize={10} radius={[0, 0, 4, 4]} />
                            <Line yAxisId="right" type="monotone" dataKey="cumBuyVol" stroke="#15803d" strokeWidth={2} dot={false} />
                            <Line yAxisId="right" type="monotone" dataKey="cumSellVol" stroke="#b91c1c" strokeWidth={2} dot={false} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
            */}
            {/* ACCORDION HISTORY */}
            <DetailsAccordion title={`Trade History (${strategy.tradeHistory?.length || 0} completed trades)`} icon={<History className="text-blue-500" />}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-gray-500 font-bold">
                            <tr>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Token ID</th>
                                <th className="px-6 py-3 text-right">Buy Price</th>
                                <th className="px-6 py-3 text-right">Sell Price</th>
                                <th className="px-6 py-3 text-right">Held</th>
                                <th className="px-6 py-3 text-right">P&L</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {strategy.tradeHistory && strategy.tradeHistory.length > 0 ? strategy.tradeHistory.sort((a, b) => b.sellDate.getTime() - a.sellDate.getTime()).map((t, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="px-6 py-3 text-gray-500">{t.sellDate.toLocaleDateString()}</td>
                                    <td className="px-6 py-3 font-mono text-gray-600 dark:text-gray-400">#{t.tokenId}</td>
                                    <td className="px-6 py-3 text-right"><span className="font-mono">{t.buyPriceEth.toFixed(3)}</span></td>
                                    <td className="px-6 py-3 text-right"><span className="font-mono">{t.sellPriceEth.toFixed(3)}</span></td>
                                    <td className="px-6 py-3 text-right text-gray-500">{t.daysHeld.toFixed(1)}d</td>
                                    <td className={`px-6 py-3 text-right font-bold ${t.profitEth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {t.profitEth > 0 ? "+" : ""}{t.profitEth.toFixed(3)} Ξ
                                    </td>
                                </tr>
                            )) : <tr><td colSpan={6} className="text-center py-8 text-gray-400">No trades yet.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </DetailsAccordion>
        </div>
    );
}

function DetailsAccordion({ title, icon, children }: { title: string, icon: JSX.Element, children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm mb-4">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="flex items-center gap-3 font-bold text-gray-900 dark:text-white">{icon} {title}</div>
                {isOpen ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
            </button>
            {isOpen && <div className="border-t border-gray-100 dark:border-gray-800">{children}</div>}
        </div>
    );
}

const ScrollbarStyles = () => (
    <style dangerouslySetInnerHTML={{
        __html: `
        /* Cacher la scrollbar pour Chrome, Safari et Opera */
        .no-scrollbar::-webkit-scrollbar {
            display: none !important;
            width: 0px !important;
            height: 0px !important;
            background: transparent !important;
        }
        /* Cacher la scrollbar pour IE, Edge et Firefox */
        .no-scrollbar {
            -ms-overflow-style: none !important;  /* IE and Edge */
            scrollbar-width: none !important;  /* Firefox */
        }
    `}} />
);
function InfoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-gray-200 dark:border-gray-800" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white"><Info size={24} className="text-blue-600" /> Dashboard Docs</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><X size={20} /></button>
                </div>
                <div className="overflow-y-auto flex-1 p-6 custom-scrollbar text-gray-700 dark:text-gray-300 space-y-4 text-sm">
                    <p>Monitor real-time metrics for NFT Strategy Tokens.</p>
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
                            <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">ID</th><th className="px-4 py-3 text-right">Buy</th><th className="px-4 py-3 text-right">Sell</th><th className="px-4 py-3 text-right">Held</th><th className="px-4 py-3 text-right">P&L</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {sortedTrades.map((t, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="px-4 py-3 text-gray-500 text-xs">{t.sellDate.toLocaleDateString()}</td>
                                    <td className="px-4 py-3 font-mono">#{t.tokenId}</td>
                                    <td className="px-4 py-3 text-right"><a href={`https://etherscan.io/tx/${t.buyTx}`} target="_blank" rel="noreferrer" className="hover:text-blue-500">{t.buyPriceEth.toFixed(3)} Ξ</a></td>
                                    <td className="px-4 py-3 text-right"><a href={`https://etherscan.io/tx/${t.sellTx}`} target="_blank" rel="noreferrer" className="hover:text-blue-500">{t.sellPriceEth.toFixed(3)} Ξ</a></td>
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
    const rows = Object.entries(data.distribution).map(([key, val]) => ({ label: key.replace(/_/g, " "), val: parseFloat(val) })).sort((a, b) => b.val - a.val);
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-sm flex flex-col border border-gray-200 dark:border-gray-800" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b bg-gray-50 dark:bg-gray-800/50">
                    <h2 className="text-sm font-bold flex items-center gap-2"><PieChart size={16} /> Holders: {tokenSymbol}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X size={16} /></button>
                </div>
                <div className="p-4">
                    <div className="text-2xl font-bold mb-4">{fmtNum(data.count)} <span className="text-sm font-normal text-gray-500">holders</span></div>
                    <table className="w-full text-sm">
                        <tbody>{rows.map((r, i) => <tr key={i}><td className="py-1 capitalize">{r.label}</td><td className="py-1 text-right font-bold">{r.val.toFixed(2)}%</td></tr>)}</tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function RightPanel({
    mode, onClose, strategies, visibleStrategyIds, toggleStrategy,
    visibleColumns, toggleColumn, toggleGroup
}: {
    mode: "strategies" | "columns" | null;
    onClose: () => void;
    strategies: StrategyData[];
    visibleStrategyIds: Set<string>;
    toggleStrategy: (id: string) => void;
    visibleColumns: Set<ColumnId>;
    toggleColumn: (id: ColumnId) => void;
    toggleGroup: (ids: ColumnId[]) => void;
}) {
    const sidebarRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as HTMLElement;
            if (target.closest("#btn-strategies") || target.closest("#btn-columns")) return;
            if (mode && sidebarRef.current && !sidebarRef.current.contains(target as Node)) onClose();
        }
        if (mode) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [mode, onClose]);

    const [searchTerm, setSearchTerm] = useState("");
    const groupedCols = useMemo(() => {
        const groups: Record<string, typeof COLUMN_DEFS> = { "General": [] };
        COLUMN_DEFS.forEach(col => {
            if (col.id === "actions") return;
            const g = col.headerGroup || "General";
            if (!groups[g]) groups[g] = [];
            groups[g].push(col);
        });
        return groups;
    }, []);
    const filteredStrategies = strategies.filter(s => s.tokenSymbol.toLowerCase().includes(searchTerm.toLowerCase()) || s.collectionName.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <aside ref={sidebarRef} className={`absolute top-0 right-0 h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col shadow-2xl z-[90] transition-transform duration-300 ease-in-out w-72 ${mode ? "translate-x-0" : "translate-x-full"}`}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-2">
                    {mode === "strategies" ? <Filter className="text-blue-600" size={18} /> : <Columns className="text-purple-600" size={18} />}
                    <h2 className="font-bold text-gray-900 dark:text-white text-sm">{mode === "strategies" ? "Filter Strategies" : "Data Columns"}</h2>
                </div>
                <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-md"><PanelLeftClose className="rotate-180" size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
                {mode === "strategies" && (
                    <div>
                        <div className="flex items-center justify-between mb-2"><h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider">Visibility Control</h3><button onClick={() => visibleStrategyIds.size === strategies.length ? strategies.forEach(s => toggleStrategy(s.id)) : strategies.forEach(s => { if (!visibleStrategyIds.has(s.id)) toggleStrategy(s.id) })} className="text-[10px] text-blue-500 hover:underline">{visibleStrategyIds.size === strategies.length ? "Unselect All" : "Select All"}</button></div>
                        <div className="relative mb-2"><Search size={14} className="absolute left-2 top-2 text-gray-400" /><input type="text" placeholder="Search..." className="w-full pl-8 pr-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                        <div className="space-y-1 max-h-[70vh] overflow-y-auto custom-scrollbar pr-1">
                            {filteredStrategies.map(s => (<div key={s.id} onClick={() => toggleStrategy(s.id)} className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-sm ${visibleStrategyIds.has(s.id) ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"}`}><div className={`w-4 h-4 border rounded flex items-center justify-center flex-shrink-0 ${visibleStrategyIds.has(s.id) ? "bg-blue-600 border-blue-600" : "border-gray-300 dark:border-gray-600"}`}>{visibleStrategyIds.has(s.id) && <Check size={10} className="text-white" />}</div><img src={s.collectionImage} className="w-5 h-5 rounded-full object-cover" alt="" /><span className="truncate">{s.tokenSymbol}</span></div>))}
                        </div>
                    </div>
                )}
                {mode === "columns" && (
                    <div>
                        <div className="flex items-center justify-between mb-3"><h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider">Configure Grid</h3></div>
                        <div className="space-y-4">
                            {Object.entries(groupedCols).map(([group, cols]) => (
                                <div key={group}>
                                    <div className="flex items-center justify-between mb-1 group cursor-pointer" onClick={() => toggleGroup(cols.map(c => c.id))}><span className="text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-blue-600">{group}</span><div className={`w-3 h-3 border rounded-sm flex items-center justify-center ${cols.every(c => visibleColumns.has(c.id)) ? "bg-blue-600 border-blue-600" : cols.some(c => visibleColumns.has(c.id)) ? "bg-blue-300 border-blue-300" : "border-gray-300 dark:border-gray-600"}`}>{cols.every(c => visibleColumns.has(c.id)) && <Check size={8} className="text-white" />}</div></div>
                                    <div className="pl-2 border-l-2 border-gray-100 dark:border-gray-800 space-y-0.5">
                                        {cols.map(col => (<div key={col.id} onClick={() => toggleColumn(col.id)} className={`flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer text-xs ${visibleColumns.has(col.id) ? "text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800/50" : "text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>{visibleColumns.has(col.id) ? <Eye size={12} className="text-blue-500" /> : <EyeOff size={12} />}<span>{col.label}</span></div>))}
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