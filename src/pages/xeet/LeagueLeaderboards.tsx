import type { JSX } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import InfoModal from "../../components/xeet/InfoModal";
import RankingProfileCard from "../../components/xeet/RankingProfileCard";

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
};

type GlobalProfile = {
    handle?: string;
    name?: string;
    avatarUrl?: string | null;
    twitterId?: string;
    userId?: string;
    topics: TopicEntry[];
};

// UI types
const TOP_OPTIONS = [50, 100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000];

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
    const itemsPerPage = 30;
    const viewMode = "cards";
    const [sortConfig, setSortConfig] = useState<{ slug: string; metric: string; direction: "asc" | "desc" } | null>(null);
    const [generationDate, setGenerationDate] = useState<Date | null>(null);
    // load once
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [gRes, tRes] = await Promise.all([
                    fetch("/leaderboards/xeet_global/latest.json"),
                    fetch("/xeet_topics_raw.json").catch(() => null),
                ]);

                if (!gRes.ok) throw new Error("Failed to fetch /xeet_global/latest.json");
                const gjson = await gRes.json();
                const profiles: GlobalProfile[] = Array.isArray(gjson.profiles) ? gjson.profiles : [];
                setGlobalProfiles(profiles);
                setGenerationDate(gjson.generationDate || null);

                if (tRes && tRes.ok) {
                    const tjson = await tRes.json();
                    // pick only isLeague topics (if present) and map to expected shape
                    const metas: TopicMeta[] = (Array.isArray(tjson) ? tjson : [])
                        .filter((t: any) => t.isLeague !== false) // keep leagues (or all if no isLeague)
                        .map((t: any) => ({
                            id: t.id,
                            title: t.title ?? t.topicSlug,
                            topicSlug: t.topicSlug,
                            logoUrl: t.logoUrl,
                            isLeague: !!t.isLeague,
                        }));
                    setTopicMetas(metas);
                } else {
                    // Build topic metas from globalProfiles if topics_raw not available
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

    // close dropdown outside click
    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            if (!dropdownRef.current) return;
            if (!dropdownRef.current.contains(e.target as Node)) setTopicDropdownOpen(false);
        }
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, []);

    // Helper: build derived profiles mapping for the *selected dataset* and chosen metric/topLimit
    const derivedProfiles = useMemo(() => {
        // map each global profile to a simplified object with ranks per topic for the selected dataset
        const profiles = globalProfiles.map((p) => {
            const ranks: Record<string, { rankSignal?: number; rankNoise?: number; rankTotal?: number; signalPoints?: number; noisePoints?: number; totalPoints?: number; }> = {};
            for (const t of p.topics) {
                if (t.period !== dataset) continue;
                ranks[t.topicSlug] = {
                    rankSignal: t.rankSignal,
                    rankNoise: t.rankNoise,
                    rankTotal: t.rankTotal,
                    signalPoints: t.signalPoints,
                    noisePoints: t.noisePoints,
                    totalPoints: t.totalPoints,
                };
            }
            return {
                userId: p.userId,
                handle: p.handle,
                name: p.name,
                avatarUrl: p.avatarUrl,
                ranks,
            };
        });

        // Filter by topLimit using the selected metric: remove topics which don't meet topLimit? Actually we keep users but per earlier logic we only consider ranks <= topLimit as existing.
        // We will treat rank > topLimit as non-existing for filtering/sorting by selected metric.
        return profiles;
    }, [globalProfiles, dataset]);

    // compute global leaderboardCount: number of topic entries with chosen dataset and rank <= topLimit
    // NOTE: This calculation is preserved but is no longer used in the JSX summary to allow for dynamic filtering.
    /*const leaderboardCount = useMemo(() => {
        let count = 0;
        for (const p of globalProfiles) {
            for (const t of p.topics) {
                if (t.period !== dataset) continue;
                const val = metric === "rankTotal" ? t.rankTotal : metric === "rankSignal" ? t.rankSignal : t.rankNoise;
                if (typeof val === "number" && val <= topLimit) count++;
            }
        }
        return count;
    }, [globalProfiles, dataset, metric, topLimit]);
    */
    // topic meta list used in UI (filter only topics that exist for selected dataset)
    const topicsForDataset = useMemo(() => {
        const setSlugs = new Set<string>();
        for (const p of globalProfiles) {
            for (const t of p.topics) {
                if (t.period === dataset) setSlugs.add(t.topicSlug);
            }
        }
        // Use topicMetas to get title/logo when possible
        return topicMetas
            .filter((m) => setSlugs.has(m.topicSlug))
            .sort((a, b) => (a.title || a.topicSlug).localeCompare(b.title || b.topicSlug, undefined, { sensitivity: "base" }));
    }, [globalProfiles, topicMetas, dataset]);

    // visibleTopics inside dropdown (search)
    const visibleTopics = useMemo(() => {
        const q = topicQuery.trim().toLowerCase();
        if (!q) return topicsForDataset;
        return topicsForDataset.filter((t) => (t.title || t.topicSlug).toLowerCase().includes(q) || t.topicSlug.toLowerCase().includes(q));
    }, [topicsForDataset, topicQuery]);

    // topicCountOptions dynamic:
    // if topics selected: compute counts for selectedTopics (exactly i of the selected)
    // else use global counts (number of topics user appears in for this dataset)
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
                        // treat rank > topLimit as non-existing
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
        // 1️⃣ Base — appliquer topLimit sur les ranks
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

                    // ratio Noise/Signal
                    const ratio =
                        r.signalPoints && r.noisePoints
                            ? (r.noisePoints / r.signalPoints) * 100
                            : null;

                    if (typeof val === "number" && val <= topLimit) {
                        ranksFiltered[slug] = { ...r, ratio };
                    }
                }
                return { ...p, ranksFiltered };
            })
            // 2️⃣ Filtre par recherche
            .filter((p) => {
                const q = profileSearch.trim().toLowerCase();
                if (!q) return true;
                return (
                    (p.name || "").toLowerCase().includes(q) ||
                    (p.handle || "").toLowerCase().includes(q)
                );
            });
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
        // 3️⃣ Filtre par topics sélectionnés
        if (selectedTopics.length > 0) {
            arr = arr.filter((p) =>
                selectedTopics.some((s) => p.ranksFiltered && p.ranksFiltered[s])
            );
        }

        // 4️⃣ Filtre par topic overlap
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

        // 5️⃣ Supprimer les profils sans aucun classement valide
        arr = arr.filter((p) => Object.keys(p.ranksFiltered || {}).length > 0);

        // 6️⃣ Si un tri manuel est actif (via clic sur Signal / Noise / Total)
        if (sortConfig) {
            const { slug, metric, direction } = sortConfig;
            arr.sort((a, b) => {
                const av = a.ranksFiltered?.[slug]?.[metric] ?? Infinity;
                const bv = b.ranksFiltered?.[slug]?.[metric] ?? Infinity;
                if (av === bv) return (a.name || "").localeCompare(b.name || "");
                return direction === "asc" ? av - bv : bv - av;
            });
            return arr;
        }

        // 7️⃣ Sinon, tri automatique en fonction de la sélection de topics
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
            // 8️⃣ Si plusieurs topics → tri par meilleur rank et somme
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
            // 9️⃣ Aucun topic sélectionné → tri automatique (par score pondéré)
            arr = arr
                .map((p) => {
                    const ranks = Object.values(p.ranksFiltered || {});
                    if (ranks.length === 0) return { ...p, __score: 0 };

                    // méthode "points" (simple et stable)
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
        sortConfig, // 👈 pour déclencher un nouveau tri manuel
    ]);

    // **DÉBUT DES NOUVELLES CALCULATIONS DYNAMIQUES (CORRIGÉES)**

    // Calcule les comptes dynamiques des Topics et des Entrées à partir des profils filtrés
    const dynamicCounts = useMemo(() => {
        const activeTopics = new Set<string>();
        let leaderboardEntriesCount = 0;

        // Créer un Set pour une recherche rapide si des topics sont sélectionnés
        const selectedTopicsSet = new Set(selectedTopics);
        const topicsAreFiltered = selectedTopics.length > 0;

        filteredSortedProfiles.forEach(p => {
            const topicSlugs = Object.keys(p.ranksFiltered || {});

            topicSlugs.forEach(slug => {
                // CORRECTION: Si des topics sont sélectionnés, ne compte que l'entrée et le topic 
                // s'ils sont dans la liste sélectionnée.
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
    }, [filteredSortedProfiles, selectedTopics]); // Ajout de selectedTopics en dépendance

    const { activeTopicsCount, leaderboardEntriesCount } = dynamicCounts;

    // Calculer le nombre de profils filtrés
    const filteredProfilesCount = filteredSortedProfiles.length;

    // Nouvel Indicateur : Profile Coverage Ratio = Profiles Analyzed / Leaderboard Entries
    const profileCoverageRatio = useMemo(() => {
        if (leaderboardEntriesCount === 0) return 0;
        return (filteredProfilesCount / leaderboardEntriesCount) * 100;
    }, [filteredProfilesCount, leaderboardEntriesCount]);

    // **FIN DES NOUVELLES CALCULATIONS DYNAMIQUES**

    // pagination
    const totalPages = Math.max(1, Math.ceil(filteredSortedProfiles.length / itemsPerPage));
    useEffect(() => { if (currentPage > totalPages) setCurrentPage(1); }, [totalPages]);
    const start = (currentPage - 1) * itemsPerPage;
    const pageProfiles = filteredSortedProfiles.slice(start, start + itemsPerPage);


    const handleSort = (slug: string, metric: string) => {
        setSortConfig((prev) => {
            if (prev && prev.slug === slug && prev.metric === metric) {
                return { ...prev, direction: prev.direction === "asc" ? "desc" : "asc" };
            }
            return { slug, metric, direction: "asc" };
        });
    };


    // helpers
    const toggleTopic = (slug: string) => {
        setSelectedTopics((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
        setCurrentPage(1);
    };
    const clearTopics = () => { setSelectedTopics([]); setCurrentPage(1); };
    const selectVisible = () => { setSelectedTopics(visibleTopics.map((t) => t.topicSlug)); setCurrentPage(1); };

    // render helpers
    const getTopicMeta = (slug: string) => topicMetas.find((t) => t.topicSlug === slug) ?? { topicSlug: slug, title: slug };

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
                    <div className="text-white text-sm font-medium">Profile Coverage Ratio</div>
                    <div className="text-white text-2xl font-bold">{profileCoverageRatio.toFixed(2)}%</div>
                </div>
            </div>
            {/* Controls */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                    <select value={dataset} onChange={(e) => { setDataset(e.target.value as any); setCurrentPage(1); }} className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <option value="tournament">Tournament</option>
                        <option value="7d">7D Signals</option>
                        <option value="30d">30D Signals</option>
                    </select>

                    {(dataset === "7d" || dataset === "30d") && (
                        <select value={metric} onChange={(e) => { setMetric(e.target.value as any); setCurrentPage(1); }} className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
                            <option value="rankTotal">Total Rank</option>
                            <option value="rankSignal">Signal Rank</option>
                            <option value="rankNoise">Noise Rank</option>
                        </select>
                    )}

                    <select value={topLimit} onChange={(e) => { setTopLimit(Number(e.target.value)); setCurrentPage(1); }} className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
                        {TOP_OPTIONS.map((n) => <option key={n} value={n}>Top {n}</option>)}
                    </select>

                    {/* Topic dropdown trigger */}
                    <div className="relative" ref={dropdownRef}>
                        <button onClick={() => setTopicDropdownOpen((o) => !o)} className="flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
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
                    <InfoModal />
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <input value={profileSearch} onChange={(e) => { setProfileSearch(e.target.value); setCurrentPage(1); }} placeholder="Search profiles..." className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 w-full md:w-64" />
                    </div>

                </div>
                {/* Last generation date */}
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    Last updated: {generationDate ? new Date(generationDate).toLocaleString() : 'N/A'}
                </div>

            </div>

            {/* topic-overlap filter */}
            <div className="flex flex-wrap gap-2">
                {topicCountOptions.filter(opt => opt.count > 0).map((opt) => (
                    <button key={opt.count} onClick={() => setTopicCountFilter(topicCountFilter === opt.count ? null : opt.count)} className={`px-3 py-1 rounded-md border text-sm ${topicCountFilter === opt.count ? "bg-blue-600 text-white border-blue-700" : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700"}`}>
                        {opt.count} topic{opt.count > 1 ? "s" : ""}: <strong>{opt.num}</strong>
                    </button>
                ))}
            </div>

            {/* Main content: cards or table */}
            {loading ? (
                <div className="py-20 text-center text-gray-500">Loading...</div>
            ) : filteredSortedProfiles.length === 0 ? (
                <div className="py-10 text-center text-gray-500">No profiles found.</div>
            ) : viewMode === "cards" ? (
                <>{/*
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pageProfiles.map((p) => (
                            <div key={p.userId} className="bg-gray-100 dark:bg-gray-800 rounded-xl p-3 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                                <div className="flex items-center gap-3 mb-3">
                                    <img src={p.avatarUrl || "/default-avatar.jpg"} alt={p.name} className="w-10 h-10 rounded-full border" />
                                    <div className="flex flex-col min-w-0">
                                        <a href={`https://x.com/${p.handle}`} target="_blank" rel="noreferrer" className="font-medium text-blue-600 dark:text-blue-400 truncate">@{p.handle}</a>
                                        <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{p.name}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                                    {(selectedTopics.length > 0 ? selectedTopics.map((s) => getTopicMeta(s)) : topicsForDataset).map((tmeta) => {
                                        const r = (p as any).ranksFiltered ? (p as any).ranksFiltered[tmeta.topicSlug] : undefined;
                                        const display = r ? ((metric === "rankTotal" ? r.rankTotal : metric === "rankSignal" ? r.rankSignal : r.rankNoise) ?? "-") : "-";
                                        if (display === "-" || display === 0) return null;
                                        return (
                                            <div key={tmeta.topicSlug} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded-md">
                                                <img src={tmeta.logoUrl || "/default-avatar.jpg"} alt={tmeta.title} className="w-4 h-4 rounded-full border" />
                                                <span className="truncate">{tmeta.title}</span>
                                                <span className="ml-auto text-blue-600 dark:text-blue-400 font-semibold">#{display}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                    */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pageProfiles.map((p) => (
                            <RankingProfileCard
                                p={p}
                                selectedTopics={selectedTopics}
                                topicsForDataset={topicsForDataset}
                                getTopicMeta={getTopicMeta}
                                dataset={dataset}
                                metric={metric}

                            />
                        ))}
                    </div>
                </>
            ) : (
                // TABLE VIEW — Enhanced version
                <div className="overflow-auto border rounded">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium">#</th>
                                <th className="px-3 py-2 text-left text-xs font-medium">Profile</th>

                                {(selectedTopics.length > 0 ? selectedTopics : topicsForDataset.map(t => t.topicSlug)).map((slug) => {
                                    const meta = getTopicMeta(slug);
                                    return (
                                        <th key={slug} colSpan={4} className="px-3 py-2 text-center text-xs font-medium">
                                            <div className="flex justify-center items-center gap-2">
                                                <img src={meta.logoUrl || "/default-avatar.jpg"} alt={meta.title} className="w-4 h-4 rounded-full" />
                                                <div>{meta.title}</div>
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                            <tr className="bg-gray-50 dark:bg-gray-900">
                                <th></th>
                                <th></th>
                                {(selectedTopics.length > 0 ? selectedTopics : topicsForDataset.map(t => t.topicSlug)).flatMap((slug) => [
                                    <th
                                        key={slug + "-sig"}
                                        className="px-3 py-1 text-xs font-medium cursor-pointer select-none hover:underline"
                                        onClick={() => handleSort(slug, "rankSignal")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Sig #
                                            {sortConfig?.slug === slug && sortConfig?.metric === "rankSignal" ? (
                                                sortConfig.direction === "asc" ? (
                                                    <ArrowUp className="w-3 h-3 text-blue-500 inline-block" />
                                                ) : (
                                                    <ArrowDown className="w-3 h-3 text-blue-500 inline-block" />
                                                )
                                            ) : (
                                                <ArrowUp className="w-3 h-3 text-gray-400 opacity-30 inline-block" />
                                            )}
                                        </div>
                                    </th>,
                                    <th
                                        key={slug + "-noi"}
                                        className="px-3 py-1 text-xs font-medium cursor-pointer select-none hover:underline"
                                        onClick={() => handleSort(slug, "rankNoise")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Noise #
                                            {sortConfig?.slug === slug && sortConfig?.metric === "rankNoise" ? (
                                                sortConfig.direction === "asc" ? (
                                                    <ArrowUp className="w-3 h-3 text-blue-500 inline-block" />
                                                ) : (
                                                    <ArrowDown className="w-3 h-3 text-blue-500 inline-block" />
                                                )
                                            ) : (
                                                <ArrowUp className="w-3 h-3 text-gray-400 opacity-30 inline-block" />
                                            )}
                                        </div>
                                    </th>,
                                    <th
                                        key={slug + "-tot"}
                                        className="px-3 py-1 text-xs font-medium cursor-pointer select-none hover:underline"
                                        onClick={() => handleSort(slug, "rankTotal")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Total #
                                            {sortConfig?.slug === slug && sortConfig?.metric === "rankTotal" ? (
                                                sortConfig.direction === "asc" ? (
                                                    <ArrowUp className="w-3 h-3 text-blue-500 inline-block" />
                                                ) : (
                                                    <ArrowDown className="w-3 h-3 text-blue-500 inline-block" />
                                                )
                                            ) : (
                                                <ArrowUp className="w-3 h-3 text-gray-400 opacity-30 inline-block" />
                                            )}
                                        </div>
                                    </th>,
                                    <th
                                        key={slug + "-ratio"}
                                        className="px-3 py-1 text-xs font-medium cursor-pointer select-none hover:underline"
                                        onClick={() => handleSort(slug, "rankRatio")}
                                    >
                                        <div className="flex items-center gap-1">
                                            Ratio %
                                            {sortConfig?.slug === slug && sortConfig?.metric === "rankRatio" ? (
                                                sortConfig.direction === "asc" ? (
                                                    <ArrowUp className="w-3 h-3 text-blue-500 inline-block" />
                                                ) : (
                                                    <ArrowDown className="w-3 h-3 text-blue-500 inline-block" />
                                                )
                                            ) : (
                                                <ArrowUp className="w-3 h-3 text-gray-400 opacity-30 inline-block" />
                                            )}
                                        </div>
                                    </th>,
                                ])}
                            </tr>
                        </thead>

                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredSortedProfiles.map((p, idx) => (
                                <tr key={p.userId}>
                                    <td className="px-3 py-2 text-xs">{idx + 1}</td>
                                    <td className="px-3 py-2 text-sm flex items-center gap-2">
                                        <img src={p.avatarUrl || ''} alt={p.name} className="w-6 h-6 rounded-full" />
                                        <div>
                                            <div className="font-medium">{p.name}</div>
                                            <a
                                                href={`https://x.com/${p.handle}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-blue-500 hover:underline"
                                            >
                                                @{p.handle}
                                            </a>
                                        </div>
                                    </td>

                                    {(selectedTopics.length > 0 ? selectedTopics : topicsForDataset.map(t => t.topicSlug)).flatMap((slug) => {
                                        const r = p.ranksFiltered?.[slug];
                                        if (!r) {
                                            return [
                                                <td key={slug + "-sig-" + p.userId} className="px-3 py-1 text-xs text-gray-400">-</td>,
                                                <td key={slug + "-noi-" + p.userId} className="px-3 py-1 text-xs text-gray-400">-</td>,
                                                <td key={slug + "-tot-" + p.userId} className="px-3 py-1 text-xs text-gray-400">-</td>,
                                                <td key={slug + "-ratio-" + p.userId} className="px-3 py-1 text-xs text-gray-400">-</td>,
                                            ];
                                        }
                                        return [
                                            <td key={slug + "-sig-" + p.userId} className="px-3 py-1 text-xs">
                                                {r.rankSignal ?? "-"}{" "}
                                                <span className="text-gray-500 text-[10px] ml-1">
                                                    ({r.signalPoints?.toFixed(1)})
                                                </span>
                                            </td>,
                                            <td key={slug + "-noi-" + p.userId} className="px-3 py-1 text-xs">
                                                {r.rankNoise ?? "-"}{" "}
                                                <span className="text-gray-500 text-[10px] ml-1">
                                                    ({r.noisePoints?.toFixed(1)})
                                                </span>
                                            </td>,
                                            <td key={slug + "-tot-" + p.userId} className="px-3 py-1 text-xs">
                                                {r.rankTotal ?? "-"}{" "}
                                                <span className="text-gray-500 text-[10px] ml-1">
                                                    ({r.totalPoints?.toFixed(1)})
                                                </span>
                                            </td>,
                                            <td key={slug + "-ratio-" + p.userId} className="px-3 py-1 text-xs">
                                                {r.rankRatio ?? "-"}{" "}
                                                <span className="text-gray-500 text-[10px] ml-1">
                                                    ({r.ratio?.toFixed(1)}%)
                                                </span>
                                            </td>,
                                        ];
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>


            )}

            {/* Pagination controls */}
            {filteredSortedProfiles.length > itemsPerPage && (
                <div className="flex justify-center items-center gap-3 my-4 pb-6">
                    <button onClick={() => setCurrentPage((cp) => Math.max(1, cp - 1))} disabled={currentPage === 1} className="px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 disabled:opacity-50">← Previous</button>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Page {currentPage} / {totalPages}</span>
                    <button onClick={() => setCurrentPage((cp) => Math.min(totalPages, cp + 1))} disabled={currentPage === totalPages} className="px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 disabled:opacity-50">Next →</button>
                </div>
            )}

        </div>
    );
}