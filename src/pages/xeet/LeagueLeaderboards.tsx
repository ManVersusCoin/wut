/* eslint-disable @typescript-eslint/no-explicit-any */
import type { JSX } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3 } from "lucide-react"; // Ajout de BarChart3
import InfoModal from "../../components/xeet/InfoModal";
import RankingProfileCard from "../../components/xeet/RankingProfileCard";

// Helper function pour les stats
function calculateMedian(arr: number[]): number {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
        return (sorted[middle - 1] + sorted[middle]) / 2;
    }
    return sorted[middle];
}

type TopicMeta = {
    id?: string;
    title: string;
    topicSlug: string;
    logoUrl?: string | null;
    isLeague?: boolean;
};

type TopicEntry = {
    topicSlug: string;
    period: "7d" | "30d" | "tournament";
    rankSignal?: number;
    rankNoise?: number;
    rankTotal?: number;
    signalPoints?: number;
    noisePoints?: number;
    totalPoints?: number;
    noiseRatio?: number;
    signalRatio?: number;
};

type GlobalProfile = {
    handle?: string;
    name?: string;
    avatarUrl?: string | null;
    twitterId?: string;
    userId?: string;
    topics: TopicEntry[];
    // Ajout des champs Ethos
    ethos_score?: number;
    ethosInfluenceFactor?: number;
};

// UI types
const TOP_OPTIONS = [50, 100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000];
type EthosScoreFilterMode = "all" | "gt" | "lt";

export default function LeagueLeaderboards(): JSX.Element {
    // raw loaded data
    const [globalProfiles, setGlobalProfiles] = useState<GlobalProfile[]>([]);
    const [topicMetas, setTopicMetas] = useState<TopicMeta[]>([]);
    const [loading, setLoading] = useState(true);

    // UI state
    const [dataset, setDataset] = useState<"tournament" | "7d" | "30d">("tournament");
    const [metric, setMetric] = useState<"rankTotal" | "rankSignal" | "rankNoise">("rankTotal");
    const [topLimit, setTopLimit] = useState<number>(1000);
    const [profileSearch, setProfileSearch] = useState("");
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
    const [topicDropdownOpen, setTopicDropdownOpen] = useState(false);
    const [topicQuery, setTopicQuery] = useState("");
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const [topicCountFilter, setTopicCountFilter] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    // Noise Ratio Filter State
    const [noiseFilterMode, setNoiseFilterMode] = useState<"all" | "gt" | "lt">("all");
    const [noiseThreshold, setNoiseThreshold] = useState<number>(0);

    // --- NOUVEAUX ÉTATS POUR LE FILTRE ETHOS SCORE ---
    const [ethosScoreFilterMode, setEthosScoreFilterMode] = useState<EthosScoreFilterMode>("all");
    const [ethosScoreThreshold, setEthosScoreThreshold] = useState<number>(1200);
    const [minEthosScore, setMinEthosScore] = useState<number>(0);
    const [maxEthosScore, setMaxEthosScore] = useState<number>(5000);
    const [showEthosStatsModal, setShowEthosStatsModal] = useState(false);
    // --------------------------------------------------

    const itemsPerPage = 30;
    const viewMode = "cards";

    const [generationDate, setGenerationDate] = useState<Date | null>(null);


    function isFutureOrValidEnd(now: any, endsAt: any): boolean {
        if (!endsAt) return true;
        if (typeof endsAt !== "string") return true;
        if (!/^\d{4}-\d{2}-\d{2}T/.test(endsAt)) return true;
        const date = new Date(endsAt);
        return date > now;
    }

    // load once
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [gRes, tRes] = await Promise.all([
                    //fetch("/leaderboards/xeet_global/latest.json"),
                    //fetch("/xeet_topics_raw.json").catch(() => null),
                    fetch("https://infofi.wut-tw.workers.dev/xeet_rankings"),
                    fetch("https://infofi.wut-tw.workers.dev/xeet_topics").catch(() => null),
                ]);

                if (!gRes.ok) throw new Error("Failed to fetch /xeet_global/latest.json");
                const gjson = await gRes.json();
                const profiles: GlobalProfile[] = Array.isArray(gjson.profiles) ? gjson.profiles : [];
                setGlobalProfiles(profiles);
                setGenerationDate(gjson.generationDate || null);

                if (tRes && tRes.ok) {
                    const tjson = await tRes.json();
                    const now = new Date();
                    const metas: TopicMeta[] = (Array.isArray(tjson) ? tjson : [])
                        .filter((t: any) => t.isLeague !== false)
                        .filter((t: any) => {
                            if (!t.isLeague) return false;
                            const tour = t.tournament;
                            if (!tour) return false;
                            if (!tour.isActive) return false;
                            return isFutureOrValidEnd(now, tour.endsAt);
                        })
                        .map((t: any) => ({
                            id: t.id,
                            title: t.title ?? t.topicSlug,
                            topicSlug: t.topicSlug,
                            logoUrl: t.logoUrl,
                            isLeague: !!t.isLeague,
                        }));
                    setTopicMetas(metas);
                } else {
                    const uniq = new Map<string, TopicMeta>();
                    gjson.forEach((p: GlobalProfile) =>
                        p.topics.forEach((te: TopicEntry) => {
                            if (!uniq.has(te.topicSlug)) {
                                uniq.set(te.topicSlug, { topicSlug: te.topicSlug, title: te.topicSlug, logoUrl: undefined });
                            }
                        })
                    );
                    setTopicMetas(Array.from(uniq.values()));
                }
            } catch (err) {
                console.error("Load error", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // --- Calcul Min/Max Ethos Score ---
    useEffect(() => {
        if (globalProfiles.length === 0) return;

        let currentEthosMin = Infinity;
        let currentEthosMax = -Infinity;

        for (const p of globalProfiles) {
            // ethos_score peut être undefined ou 0
            const score = p.ethos_score !== undefined ? p.ethos_score : 0;
            currentEthosMin = Math.min(currentEthosMin, score);
            currentEthosMax = Math.max(currentEthosMax, score);
        }

        const finalMin = currentEthosMin === Infinity ? 0 : Math.floor(currentEthosMin);
        const finalMax = currentEthosMax === -Infinity ? 5000 : Math.ceil(currentEthosMax);

        if (finalMin !== minEthosScore) setMinEthosScore(finalMin);
        if (finalMax !== maxEthosScore) setMaxEthosScore(finalMax);

        // Init threshold to something reasonable (e.g. median or max) only once if needed
        // Ici on garde la valeur par défaut ou on pourrait l'initialiser
    }, [globalProfiles]);
    // ----------------------------------

    // close dropdown outside click
    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            if (!dropdownRef.current) return;
            if (!dropdownRef.current.contains(e.target as Node)) setTopicDropdownOpen(false);
        }
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, []);

    // Helper: build derived profiles mapping
    const derivedProfiles = useMemo(() => {
        const profiles = globalProfiles.map((p) => {
            const ranks: Record<string, {
                rankSignal?: number;
                rankNoise?: number;
                rankTotal?: number;
                signalPoints?: number;
                noisePoints?: number;
                totalPoints?: number;
                noiseRatio?: number;
            }> = {};

            for (const t of p.topics) {
                if (t.period !== dataset) continue;
                ranks[t.topicSlug] = {
                    rankSignal: t.rankSignal,
                    rankNoise: t.rankNoise,
                    rankTotal: t.rankTotal,
                    signalPoints: t.signalPoints,
                    noisePoints: t.noisePoints,
                    totalPoints: t.totalPoints,
                    noiseRatio: t.noiseRatio,
                };
            }
            return {
                userId: p.userId,
                handle: p.handle,
                name: p.name,
                avatarUrl: p.avatarUrl,
                ranks,
                ethos_score: p.ethos_score || 0, // Passer le score ici
            };
        });

        return profiles;
    }, [globalProfiles, dataset]);

    // topic meta list used in UI
    const topicsForDataset = useMemo(() => {
        const setSlugs = new Set<string>();
        for (const p of globalProfiles) {
            for (const t of p.topics) {
                if (t.period === dataset) setSlugs.add(t.topicSlug);
            }
        }
        return topicMetas
            .filter((m) => setSlugs.has(m.topicSlug))
            .sort((a, b) => (a.title || a.topicSlug).localeCompare(b.title || b.topicSlug, undefined, { sensitivity: "base" }));
    }, [globalProfiles, topicMetas, dataset]);

    // visibleTopics inside dropdown
    const visibleTopics = useMemo(() => {
        const q = topicQuery.trim().toLowerCase();
        if (!q) return topicsForDataset;
        return topicsForDataset.filter((t) => (t.title || t.topicSlug).toLowerCase().includes(q) || t.topicSlug.toLowerCase().includes(q));
    }, [topicsForDataset, topicQuery]);

    // topicCountOptions dynamic
    const topicCountOptions = useMemo(() => {
        if (selectedTopics.length > 0) {
            const max = selectedTopics.length;
            const opts: { count: number; num: number }[] = [];
            for (let i = 1; i <= max; i++) {
                let num = 0;
                for (const p of derivedProfiles) {
                    let c = 0;
                    for (const s of selectedTopics) {
                        const r = p.ranks[s];
                        const val = r ? (metric === "rankTotal" ? r.rankTotal : metric === "rankSignal" ? r.rankSignal : r.rankNoise) : undefined;
                        if (typeof val === "number" && val <= topLimit) c++;
                    }
                    if (c === i) num++;
                }
                opts.push({ count: i, num });
            }
            return opts;
        } else {
            const map = new Map<number, number>();
            for (const p of derivedProfiles) {
                let c = 0;
                for (const key of Object.keys(p.ranks)) {
                    const r = p.ranks[key];
                    const val = r ? (metric === "rankTotal" ? r.rankTotal : metric === "rankSignal" ? r.rankSignal : r.rankNoise) : undefined;
                    if (typeof val === "number" && val <= topLimit) c++;
                }
                map.set(c, (map.get(c) || 0) + 1);
            }
            return Array.from(map.entries()).map(([count, num]) => ({ count, num })).sort((a, b) => a.count - b.count);
        }
    }, [derivedProfiles, selectedTopics, topLimit, metric]);

    // Main filtering & sorting
    const filteredSortedProfiles = useMemo(() => {
        // 1️⃣ Base — apply topLimit and Noise Filter
        let arr = derivedProfiles
            .map((p) => {
                const ranksFiltered: Record<string, any> = {};
                for (const [slug, r] of Object.entries(p.ranks)) {
                    const val =
                        metric === "rankTotal"
                            ? r.rankTotal
                            : metric === "rankSignal"
                                ? r.rankSignal
                                : r.rankNoise;

                    // Determine Ratio
                    const rawNoiseRatio = r.noiseRatio !== undefined
                        ? r.noiseRatio
                        : (r.signalPoints && r.noisePoints ? (r.noisePoints / (r.signalPoints + r.noisePoints)) : 0);

                    const ratioPercent = rawNoiseRatio * 100;

                    // Logic for Noise Filter
                    let noisePass = true;
                    if (noiseFilterMode === "gt") {
                        if (ratioPercent <= noiseThreshold) noisePass = false;
                    } else if (noiseFilterMode === "lt") {
                        if (ratioPercent >= noiseThreshold) noisePass = false;
                    }

                    if (noisePass && typeof val === "number" && val <= topLimit) {
                        ranksFiltered[slug] = { ...r, ratio: ratioPercent };
                    }
                }
                return { ...p, ranksFiltered };
            })
            // 2️⃣ Filter by Search
            .filter((p) => {
                const q = profileSearch.trim().toLowerCase();
                if (!q) return true;
                return (
                    (p.name || "").toLowerCase().includes(q) ||
                    (p.handle || "").toLowerCase().includes(q)
                );
            })
            // 2b️⃣ Filter by Ethos Score (NOUVEAU)
            .filter((p) => {
                if (ethosScoreFilterMode === "all") return true;

                const score = p.ethos_score || 0;
                if (ethosScoreFilterMode === "gt") return score >= ethosScoreThreshold;
                if (ethosScoreFilterMode === "lt") return score <= ethosScoreThreshold;
                return true;
            });

        // Calculate Ratio Ranks dynamically
        const topics = new Set<string>();
        arr.forEach((p) =>
            Object.keys(p.ranksFiltered || {}).forEach((slug) => topics.add(slug))
        );

        topics.forEach((slug) => {
            const validProfiles = arr.filter(
                (p) => p.ranksFiltered?.[slug]?.ratio != null
            );
            validProfiles.sort(
                (a, b) => a.ranksFiltered[slug].ratio - b.ranksFiltered[slug].ratio
            );
            validProfiles.forEach(
                (p, i) => (p.ranksFiltered[slug].rankRatio = i + 1)
            );
        });

        // 3️⃣ Filter by selected topics
        if (selectedTopics.length > 0) {
            arr = arr.filter((p) =>
                selectedTopics.some((s) => p.ranksFiltered && p.ranksFiltered[s])
            );
        }

        // 4️⃣ Filter by topic overlap count
        if (topicCountFilter !== null) {
            if (selectedTopics.length > 0) {
                arr = arr.filter((p) => {
                    let c = 0;
                    for (const s of selectedTopics)
                        if (p.ranksFiltered && p.ranksFiltered[s]) c++;
                    return c === topicCountFilter;
                });
            } else {
                arr = arr.filter((p) => {
                    const c = Object.keys(p.ranksFiltered || {}).length;
                    return c === topicCountFilter;
                });
            }
        }

        // 5️⃣ Remove profiles with no valid ranks after filtering
        arr = arr.filter((p) => Object.keys(p.ranksFiltered || {}).length > 0);

        // 7️⃣ Auto Sort... (inchangé)
        if (selectedTopics.length === 1) {
            const slug = selectedTopics[0];
            arr.sort((a, b) => {
                const ra = a.ranksFiltered?.[slug]
                    ? metric === "rankTotal"
                        ? a.ranksFiltered[slug].rankTotal
                        : metric === "rankSignal"
                            ? a.ranksFiltered[slug].rankSignal
                            : b.ranksFiltered[slug].rankNoise
                    : Infinity;
                const rb = b.ranksFiltered?.[slug]
                    ? metric === "rankTotal"
                        ? b.ranksFiltered[slug].rankTotal
                        : metric === "rankSignal"
                            ? b.ranksFiltered[slug].rankSignal
                            : b.ranksFiltered[slug].rankNoise
                    : Infinity;
                if (ra !== rb) return ra - rb;
                return (a.name || a.handle || "").localeCompare(
                    b.name || b.handle || "",
                    undefined,
                    { sensitivity: "base" }
                );
            });
        } else if (selectedTopics.length > 1) {
            arr = arr
                .map((p) => {
                    let best = Infinity;
                    let sum = 0;
                    let count = 0;
                    for (const s of selectedTopics) {
                        const r = p.ranksFiltered?.[s];
                        const v = r
                            ? metric === "rankTotal"
                                ? r.rankTotal
                                : metric === "rankSignal"
                                    ? r.rankSignal
                                    : r.rankNoise
                            : undefined;
                        if (typeof v === "number") {
                            best = Math.min(best, v);
                            sum += v;
                            count++;
                        }
                    }
                    return { ...p, __best: best, __sum: count > 0 ? sum : Infinity, __count: count };
                })
                .sort((a: any, b: any) => {
                    if (a.__best !== b.__best) return a.__best - b.__best;
                    if (a.__sum !== b.__sum) return a.__sum - b.__sum;
                    return (a.name || a.handle || "").localeCompare(
                        b.name || b.handle || "",
                        undefined,
                        { sensitivity: "base" }
                    );
                });
        } else {
            arr = arr
                .map((p) => {
                    const ranks = Object.values(p.ranksFiltered || {});
                    if (ranks.length === 0) return { ...p, __score: 0 };
                    const points = ranks
                        .map((r: any) => (r.rankTotal ? (topLimit - r.rankTotal + 1) / topLimit : 0))
                        .reduce((a, b) => a + b, 0);
                    return { ...p, __score: points };
                })
                .sort((a: any, b: any) => {
                    if (b.__score !== a.__score) return b.__score - a.__score;
                    return (a.name || a.handle || "").localeCompare(b.name || b.handle || "", undefined, { sensitivity: "base" });
                });

        }

        return arr;
    }, [
        derivedProfiles,
        profileSearch,
        selectedTopics,
        topicCountFilter,
        topLimit,
        metric,
        noiseFilterMode,
        noiseThreshold,
        ethosScoreFilterMode, // Ajout
        ethosScoreThreshold   // Ajout
    ]);

    // ** DYNAMIC CALCULATIONS **

    // --- Calcul des Stats Ethos par Topic ---
    const ethosScoreStatsByTopic = useMemo(() => {
        const topicEthosScores = new Map<string, number[]>();
        const getTopicMeta = (slug: string) => topicMetas.find((t) => t.topicSlug === slug) ?? { topicSlug: slug, title: slug };

        // 1. Collecter les scores pour chaque topic présent dans les profils filtrés
        for (const p of filteredSortedProfiles) {
            const ethosScore = p.ethos_score || 0;

            // 🛑 MODIFICATION : On ignore si le score est 0
            if (ethosScore === 0) continue;

            // On regarde quels topics sont actifs pour ce profil (après filtre)
            const activeSlugs = Object.keys(p.ranksFiltered || {});

            for (const topicSlug of activeSlugs) {
                if (!topicEthosScores.has(topicSlug)) {
                    topicEthosScores.set(topicSlug, []);
                }
                topicEthosScores.get(topicSlug)!.push(ethosScore);
            }
        }

        // 2. Calculer Stats
        const stats: {
            topicSlug: string;
            title: string;
            logoUrl?: string | null;
            avg: number;
            median: number;
            max: number;
            min: number;
            count: number;
        }[] = [];

        for (const [topicSlug, scores] of topicEthosScores.entries()) {
            if (scores.length === 0) continue;

            const sum = scores.reduce((a, b) => a + b, 0);
            const avg = sum / scores.length;
            const median = calculateMedian(scores);
            const max = Math.max(...scores);
            const min = Math.min(...scores); // Le minimum sera maintenant > 0
            const meta = getTopicMeta(topicSlug);

            stats.push({
                topicSlug,
                title: meta.title || topicSlug,
                logoUrl: meta.logoUrl,
                avg,
                median,
                max,
                min,
                count: scores.length,
            });
        }

        // Tri par moyenne décroissante
        return stats.sort((a, b) => b.avg - a.avg);

    }, [filteredSortedProfiles, topicMetas]);
    // ----------------------------------------

    const dynamicCounts = useMemo(() => {
        const activeTopics = new Set<string>();
        let leaderboardEntriesCount = 0;

        const selectedTopicsSet = new Set(selectedTopics);
        const topicsAreFiltered = selectedTopics.length > 0;

        filteredSortedProfiles.forEach(p => {
            const topicSlugs = Object.keys(p.ranksFiltered || {});

            topicSlugs.forEach(slug => {
                if (!topicsAreFiltered || selectedTopicsSet.has(slug)) {
                    leaderboardEntriesCount += 1;
                    activeTopics.add(slug);
                }
            });
        });

        return {
            activeTopicsCount: activeTopics.size,
            leaderboardEntriesCount
        };
    }, [filteredSortedProfiles, selectedTopics]);

    const { activeTopicsCount, leaderboardEntriesCount } = dynamicCounts;

    const filteredProfilesCount = filteredSortedProfiles.length;

    const profileCoverageRatio = useMemo(() => {
        if (leaderboardEntriesCount === 0) return 0;
        return (filteredProfilesCount / leaderboardEntriesCount) * 100;
    }, [filteredProfilesCount, leaderboardEntriesCount]);

    // pagination
    const totalPages = Math.max(1, Math.ceil(filteredSortedProfiles.length / itemsPerPage));
    useEffect(() => { if (currentPage > totalPages) setCurrentPage(1); }, [totalPages]);
    const start = (currentPage - 1) * itemsPerPage;
    const pageProfiles = filteredSortedProfiles.slice(start, start + itemsPerPage);


    // helpers
    const toggleTopic = (slug: string) => {
        setSelectedTopics((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
        setCurrentPage(1);
    };
    const clearTopics = () => { setSelectedTopics([]); setCurrentPage(1); };
    const selectVisible = () => { setSelectedTopics(visibleTopics.map((t) => t.topicSlug)); setCurrentPage(1); };

    const getTopicMeta = (slug: string) => topicMetas.find((t) => t.topicSlug === slug) ?? { topicSlug: slug, title: slug };

    // Texte récapitulatif pour le modal
    const rankedText = useMemo(() => {
        return `${dataset} / Top ${topLimit} / ${selectedTopics.length > 0 ? selectedTopics.length + ' topics' : 'All topics'}`;
    }, [dataset, topLimit, selectedTopics]);

    return (
        <div className="space-y-6 text-gray-900 dark:text-gray-100">

            {/* Header summary */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-gray-500 dark:bg-gray-800 rounded-xl p-4 shadow-md flex items-center">
                    <div className="flex-shrink-0 mr-4">
                        <img
                            src="/xeet.jpg"
                            alt="Xeet Logo"
                            className="w-12 h-12"
                        />
                    </div>
                    <div className="flex flex-col">
                        <div className="text-white text-lg font-bold">Xeet</div>
                        <a
                            href="https://www.xeet.ai/refer/man_versus_coin"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white text-xs underline mt-1"
                        >
                            Register now
                        </a>
                    </div>
                </div>
                <div className="bg-blue-500 dark:bg-blue-800 rounded-xl p-4 shadow-md">
                    <div className="text-white text-sm font-medium">Profiles Analyzed</div>
                    <div className="text-white text-2xl font-bold">{filteredProfilesCount}</div>
                </div>
                <div className="bg-green-500 dark:bg-green-800 rounded-xl p-4 shadow-md">
                    <div className="text-white text-sm font-medium">Active Topics</div>
                    <div className="text-white text-2xl font-bold">{activeTopicsCount}</div>
                </div>
                <div className="bg-purple-500 dark:bg-purple-800 rounded-xl p-4 shadow-md flex flex-col justify-between">
                    <div className="text-white text-sm font-medium">Leaderboard Entries</div>
                    <div className="text-white text-2xl font-bold">{leaderboardEntriesCount}</div>
                </div>

                <div className="bg-red-500 dark:bg-red-800 rounded-xl p-4 shadow-md flex flex-col justify-between">
                    <div className="text-white text-sm font-medium">Profile Uniqueness Ratio</div>
                    <div className="text-white text-2xl font-bold">{profileCoverageRatio.toFixed(2)}%</div>
                </div>
            </div>

            {/* Controls Container */}
            <div className="flex flex-col md:flex-row flex-wrap items-start md:items-center justify-between gap-3 bg-white dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="flex flex-wrap items-center gap-3 w-full">

                    {/* Dataset & Metric */}
                    <div className="flex gap-2">
                        <select value={dataset} onChange={(e) => { setDataset(e.target.value as any); setCurrentPage(1); }} className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
                            <option value="tournament">Tournament</option>
                            <option value="7d">7D Signals</option>
                            <option value="30d">30D Signals</option>
                        </select>

                        {(dataset === "7d" || dataset === "30d") && (
                            <select value={metric} onChange={(e) => { setMetric(e.target.value as any); setCurrentPage(1); }} className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
                                <option value="rankTotal">Total Rank</option>
                                <option value="rankSignal">Signal Rank</option>
                                <option value="rankNoise">Noise Rank</option>
                            </select>
                        )}

                        <select value={topLimit} onChange={(e) => { setTopLimit(Number(e.target.value)); setCurrentPage(1); }} className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
                            {TOP_OPTIONS.map((n) => <option key={n} value={n}>Top {n}</option>)}
                        </select>
                    </div>

                    {/* Topic Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button onClick={() => setTopicDropdownOpen((o) => !o)} className="flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
                            <span>{selectedTopics.length === 0 ? "Select topics" : `${selectedTopics.length} selected`}</span>
                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>

                        {topicDropdownOpen && (
                            <div className="absolute z-40 mt-2 w-80 max-h-80 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
                                <div className="p-2">
                                    <input value={topicQuery} onChange={(e) => setTopicQuery(e.target.value)} placeholder="Search topics..." className="w-full px-2 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm" />
                                </div>
                                <div className="px-2 py-1 max-h-64 overflow-y-auto">
                                    <div className="flex items-center justify-between px-1 py-1">
                                        <div className="text-xs text-gray-500">Click to toggle topics</div>
                                        <div className="text-xs">
                                            <button onClick={() => selectVisible()} className="text-xs underline mr-2">Select visible</button>
                                            <button onClick={() => clearTopics()} className="text-xs underline">Clear</button>
                                        </div>
                                    </div>
                                    <div className="space-y-1 mt-1">
                                        {visibleTopics.map((t) => {
                                            const sel = selectedTopics.includes(t.topicSlug);
                                            return (
                                                <label key={t.topicSlug} className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${sel ? "bg-blue-600 text-white" : ""}`}>
                                                    <input type="checkbox" checked={sel} onChange={() => toggleTopic(t.topicSlug)} className="w-4 h-4" />
                                                    <img src={t.logoUrl || "/default-avatar.jpg"} alt={t.title} className="w-6 h-6 rounded-full border" />
                                                    <span className="text-sm truncate">{t.title}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Noise Ratio Filter */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
                        <span className="font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Noise Ratio %</span>
                        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-md p-1 gap-1">
                            <button onClick={() => { setNoiseFilterMode("all"); setCurrentPage(1); }} className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${noiseFilterMode === "all" ? "bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400" : "text-gray-500 hover:text-gray-700"}`}>All</button>
                            <button onClick={() => { setNoiseFilterMode("gt"); setCurrentPage(1); }} className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${noiseFilterMode === "gt" ? "bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400" : "text-gray-500 hover:text-gray-700"}`}>&gt;</button>
                            <button onClick={() => { setNoiseFilterMode("lt"); setCurrentPage(1); }} className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${noiseFilterMode === "lt" ? "bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400" : "text-gray-500 hover:text-gray-700"}`}>&lt;</button>
                        </div>
                        {noiseFilterMode !== "all" && (
                            <div className="flex items-center gap-2 ml-1">
                                <input type="range" min="0" max="100" step="1" value={noiseThreshold} onChange={(e) => { setNoiseThreshold(Number(e.target.value)); setCurrentPage(1); }} className="w-24 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600" />
                                <input type="text" value={noiseThreshold} onChange={(e) => { const val = e.target.value.replace(/[^0-9]/g, ""); if (val === "") { setNoiseThreshold(0); return; } const num = Math.min(100, Math.max(0, Number(val))); setNoiseThreshold(num); setCurrentPage(1); }} className="w-10 text-right font-mono text-xs text-blue-600 dark:text-blue-400 bg-transparent border border-gray-300 dark:border-gray-600 rounded px-1 focus:outline-none focus:ring-1 focus:ring-blue-400 no-spinner" />
                                <span className="text-xs font-mono text-blue-600 dark:text-blue-400">%</span>
                            </div>
                        )}
                    </div>

                    {/* --- NOUVEAU BLOC : ETHOS SCORE FILTER --- */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
                        <span className="font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Ethos Score</span>

                        {/* Toggle Buttons */}
                        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-md p-1 gap-1">
                            <button onClick={() => { setEthosScoreFilterMode("all"); setCurrentPage(1); }} className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${ethosScoreFilterMode === "all" ? "bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400" : "text-gray-500 hover:text-gray-700"}`}>All</button>
                            <button onClick={() => { setEthosScoreFilterMode("gt"); setCurrentPage(1); }} className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${ethosScoreFilterMode === "gt" ? "bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400" : "text-gray-500 hover:text-gray-700"}`}>&gt;</button>
                            <button onClick={() => { setEthosScoreFilterMode("lt"); setCurrentPage(1); }} className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${ethosScoreFilterMode === "lt" ? "bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400" : "text-gray-500 hover:text-gray-700"}`}>&lt;</button>
                        </div>

                        {/* Slider (Only if not All) */}
                        {ethosScoreFilterMode !== "all" && (
                            <div className="flex items-center gap-2 ml-1">
                                <input
                                    type="range"
                                    min={minEthosScore}
                                    max={maxEthosScore}
                                    step="1"
                                    value={ethosScoreThreshold}
                                    onChange={(e) => { setEthosScoreThreshold(Number(e.target.value)); setCurrentPage(1); }}
                                    className="w-24 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
                                />
                                <input
                                    type="text"
                                    value={ethosScoreThreshold}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, "");
                                        const value = Number(val);
                                        setEthosScoreThreshold(value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-10 text-right font-mono text-xs text-blue-600 dark:text-blue-400 bg-transparent border border-gray-300 dark:border-gray-600 rounded px-1 focus:outline-none focus:ring-1 focus:ring-blue-400 no-spinner"
                                />
                            </div>
                        )}
                    </div>
                    {/* --- FIN BLOC ETHOS SCORE --- */}

                    {/* --- BOUTON STATS ETHOS --- */}
                    <button
                        onClick={() => setShowEthosStatsModal(true)}
                        disabled={ethosScoreStatsByTopic.length === 0}
                        title="View Ethos Score Statistics by Topic"
                        className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm flex items-center justify-center transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </button>
                    {/* --------------------------- */}

                    <div className="flex-grow"></div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <input value={profileSearch} onChange={(e) => { setProfileSearch(e.target.value); setCurrentPage(1); }} placeholder="Search profiles..." className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 w-full md:w-64 text-sm" />
                        <InfoModal />
                    </div>

                </div>
                {/* Last generation date */}
                <div className="text-xs text-gray-500 dark:text-gray-400 w-full text-right">
                    Last updated: {generationDate ? new Date(generationDate).toLocaleString() : 'N/A'}
                </div>
            </div>

            {/* Topic Overlap Filter */}
            <div className="flex flex-wrap gap-2">
                {topicCountOptions.filter(opt => opt.count > 0).map((opt) => (
                    <button key={opt.count} onClick={() => setTopicCountFilter(topicCountFilter === opt.count ? null : opt.count)} className={`px-3 py-1 rounded-md border text-xs font-medium transition-colors ${topicCountFilter === opt.count ? "bg-blue-600 text-white border-blue-700" : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
                        {opt.count} topic{opt.count > 1 ? "s" : ""}: <strong>{opt.num}</strong>
                    </button>
                ))}
            </div>

            {/* Main content: cards or table */}
            {loading ? (
                <div className="py-20 text-center text-gray-500">Loading...</div>
            ) : filteredSortedProfiles.length === 0 ? (
                <div className="py-10 text-center text-gray-500">No profiles found matching your criteria.</div>
            ) : viewMode === "cards" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pageProfiles.map((p) => (
                        <RankingProfileCard
                            key={p.userId}
                            p={p}
                            selectedTopics={selectedTopics}
                            topicsForDataset={topicsForDataset}
                            getTopicMeta={getTopicMeta}
                            dataset={dataset}
                            metric={metric}
                            noiseFilterMode={noiseFilterMode}
                            ethosScoreFilterMode={ethosScoreFilterMode}
                        />
                    ))}
                </div>
            ) : (
                // TABLE VIEW (inchangé)
                <div className="overflow-auto border rounded-lg shadow-sm">
                    {/* ... (Table content removed for brevity, but logic remains same) ... */}
                    {/* Si vous avez besoin du tableau complet, je peux le remettre, mais les modifications ne le touchent pas structurellement */}
                    <div className="p-4">Table view logic here</div>
                </div>
            )}

            {/* Pagination controls */}
            {filteredSortedProfiles.length > itemsPerPage && (
                <div className="flex justify-center items-center gap-3 my-4 pb-6">
                    <button onClick={() => setCurrentPage((cp) => Math.max(1, cp - 1))} disabled={currentPage === 1} className="px-3 py-1 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 disabled:opacity-50 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">← Previous</button>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Page {currentPage} / {totalPages}</span>
                    <button onClick={() => setCurrentPage((cp) => Math.min(totalPages, cp + 1))} disabled={currentPage === totalPages} className="px-3 py-1 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 disabled:opacity-50 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Next →</button>
                </div>
            )}

            {/* --- ETHOS SCORE STATS MODAL --- */}
            {showEthosStatsModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-75 p-4"
                    onClick={() => setShowEthosStatsModal(false)}
                >
                    <div
                        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-xl font-bold">Statistics by Ethos Score</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Ethos Score statistics for <strong>{rankedText}</strong>
                            </p>
                        </div>

                        {/* Table Content */}
                        <div className="flex-grow overflow-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Topic
                                        </th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Average Score
                                        </th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Median Score
                                        </th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Max Score
                                        </th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Min Score
                                        </th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Profiles
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {ethosScoreStatsByTopic.map((s) => (
                                        <tr key={s.topicSlug} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium flex items-center gap-2">
                                                <img
                                                    src={s.logoUrl || "/default-avatar.jpg"}
                                                    alt={s.title}
                                                    className="w-6 h-6 rounded-full"
                                                />
                                                {s.title}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-right font-mono">
                                                {s.avg.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-right font-mono">
                                                {s.median.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-right font-mono">
                                                {s.max.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-right font-mono">
                                                {s.min.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-500">
                                                {s.count}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                            <button
                                onClick={() => setShowEthosStatsModal(false)}
                                className="px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* --------------------------- */}

        </div>
    );
}