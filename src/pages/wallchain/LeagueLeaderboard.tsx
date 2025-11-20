/* eslint-disable @typescript-eslint/no-explicit-any */
import type { JSX } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

import RankingProfileCard from "../../components/wallchain/RankingProfileCard";

type TopicMeta = {
    id?: string;
    title: string;
    topicSlug: string;
    logoUrl?: string | null;
    backgroundImageUrl?: string | null;
    buttonText?: string;
    description?: string;
    countdown?: {
        label: string;
        endDate: string;
    };
    section?: string;
    width?: string;
};

type TopicEntry = {
    topicSlug: string;
    period: string;
    rankTotal?: number;
    totalPoints?: number;
};

type GlobalProfile = {
    handle?: string;
    name?: string;
    avatarUrl?: string | null;
    topics: TopicEntry[];
};

// Local type mirroring the structure expected by RankingProfileCard
type ProfileForCard = {
    userId?: string;
    handle?: string;
    avatarUrl?: string | null;
    name?: string;
    ranks: Record<string, any>;
    ranksFiltered: Record<string, any>;
    __score?: number;
    __xScore: number; // Valeur brute (totalPoints)
};

const TOP_OPTIONS = [50, 100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000];

// Type pour le mode de filtre du score X
type XScoreFilterMode = "all" | "gt" | "lt"; // 'gt' pour >, 'lt' pour <

export default function LeagueLeaderboard(): JSX.Element {
    const [globalProfiles, setGlobalProfiles] = useState<GlobalProfile[]>([]);
    const [topicMetas, setTopicMetas] = useState<TopicMeta[]>([]);
    const [loading, setLoading] = useState(true);

    const [dataset, setDataset] = useState<"tournament" | "7d" | "30d">("tournament");
    const [topLimit, setTopLimit] = useState<number>(500);
    const [profileSearch, setProfileSearch] = useState("");
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
    const [topicDropdownOpen, setTopicDropdownOpen] = useState(false);
    const [topicQuery, setTopicQuery] = useState("");
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 30;
    const [sortConfig, setSortConfig] = useState<{ slug: string; direction: "asc" | "desc" } | null>(null);
    const viewMode = "cards";
    const [topicCountFilter, setTopicCountFilter] = useState<number | null>(null);
    const [generationDate, setGenerationDate] = useState<Date | null>(null);

    // NOUVEAUX ÉTATS POUR LE FILTRE X Score
    const [xScoreFilterMode, setXScoreFilterMode] = useState<XScoreFilterMode>("all");
    const [xScoreThreshold, setXScoreThreshold] = useState<number>(80); // Le seuil de filtrage (valeur brute)
    const [minScore, setMinScore] = useState<number>(0); // Min score trouvé dans les données
    const [maxScore, setMaxScore] = useState<number>(1000); // Max score trouvé dans les données
    // Fin Nouveaux États

    // Load Wallchain data
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [gRes, tRes] = await Promise.all([
                    fetch("/leaderboards/wallchain_global/latest.json"),
                    fetch("/wallchain_topics_raw.json").catch(() => null),
                ]);

                if (!gRes.ok) throw new Error("Failed to fetch wallchain_global/latest.json");
                const gjson = await gRes.json();
                const profiles: GlobalProfile[] = Array.isArray(gjson.profiles) ? gjson.profiles : [];
                setGlobalProfiles(profiles);
                setGenerationDate(gjson.generationDate ? new Date(gjson.generationDate) : null);
                if (tRes && tRes.ok) {
                    const tjson = await tRes.json();
                    const metas: TopicMeta[] = (Array.isArray(tjson) ? tjson : []).map((t: any) => ({
                        id: t.companyId,
                        title: t.companyName ?? t.companyId,
                        topicSlug: t.companyId,
                        logoUrl: t.logoUrl,
                        backgroundImageUrl: t.backgroundImageUrl,
                        buttonText: t.buttonText,
                        description: t.description,
                        countdown: t.countdown,
                        section: t.section,
                        width: t.width,
                    }));
                    setTopicMetas(metas);
                } else {
                    // fallback if topic file missing
                    const uniq = new Map<string, TopicMeta>();
                    (gjson.profiles || []).forEach((p: GlobalProfile) => {
                        p.topics.forEach((te: TopicEntry) => {
                            if (!uniq.has(te.topicSlug)) {
                                uniq.set(te.topicSlug, { topicSlug: te.topicSlug, title: te.topicSlug });
                            }
                        });
                    });
                    setTopicMetas(Array.from(uniq.values()));
                }
            } catch (err) {
                console.error("Wallchain load error", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // close dropdown when clicking outside
    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            if (!dropdownRef.current) return;
            if (!dropdownRef.current.contains(e.target as Node)) setTopicDropdownOpen(false);
        }
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, []);

    // Calcul et mise à jour des scores min/max et du seuil initial
    useEffect(() => {
        let currentMin = Infinity;
        let currentMax = -Infinity;

        for (const p of globalProfiles) {
            for (const t of p.topics) {
                if (typeof t.totalPoints === "number") {
                    currentMin = Math.min(currentMin, t.totalPoints);
                    currentMax = Math.max(currentMax, t.totalPoints);
                    // totalPoints est constant pour le profil, on peut break
                    break;
                }
            }
        }

        // Arrondir les scores min et max pour le curseur
        const finalMin = currentMin === Infinity ? 0 : Math.floor(currentMin);
        const finalMax = currentMax === -Infinity ? 100 : Math.ceil(currentMax);

        // Mettre à jour les états min/max
        if (finalMin !== minScore) setMinScore(finalMin);
        if (finalMax !== maxScore) setMaxScore(finalMax);

        // Initialiser le seuil au max la première fois que les données sont chargées
        if (globalProfiles.length > 0 && xScoreThreshold === 0) {
            setXScoreThreshold(finalMax);
        }

    }, [globalProfiles, minScore, maxScore, xScoreThreshold]);


    // Calcul des profiles dérivés (seulement le __xScore non normalisé)
    const derivedProfiles: ProfileForCard[] = useMemo(() => {
        return globalProfiles.map((p) => {
            const ranks: Record<string, { rankTotal?: number; totalPoints?: number }> = {};
            let profileTotalPoints = 0;

            for (const t of p.topics) {
                if (t.period === dataset) {
                    ranks[t.topicSlug] = {
                        rankTotal: t.rankTotal,
                        totalPoints: t.totalPoints,
                    };
                }
                // Récupérer le totalPoints du profil pour __xScore
                if (typeof t.totalPoints === "number" && profileTotalPoints === 0) {
                    profileTotalPoints = t.totalPoints;
                }
            }

            return {
                userId: p.handle,
                handle: p.handle,
                name: p.name,
                avatarUrl: p.avatarUrl,
                ranks: ranks,
                ranksFiltered: {},
                __score: 0,
                __xScore: profileTotalPoints, // Valeur brute
            } as ProfileForCard;
        });
    }, [globalProfiles, dataset]);

    const topicsForDataset = useMemo(() => {
        const setSlugs = new Set<string>();
        for (const p of globalProfiles) {
            for (const t of p.topics) {
                if (t.period === dataset) setSlugs.add(t.topicSlug);
            }
        }
        return topicMetas
            .filter((m) => setSlugs.has(m.topicSlug))
            .sort((a, b) => (a.title || a.topicSlug).localeCompare(b.title || b.topicSlug));
    }, [globalProfiles, topicMetas, dataset]);

    const visibleTopics = useMemo(() => {
        const q = topicQuery.trim().toLowerCase();
        if (!q) return topicsForDataset;
        return topicsForDataset.filter((t) =>
            (t.title || "").toLowerCase().includes(q) || t.topicSlug.toLowerCase().includes(q)
        );
    }, [topicsForDataset, topicQuery]);


    const filteredProfiles: ProfileForCard[] = useMemo(() => {
        let arr: ProfileForCard[] = derivedProfiles.map((p) => {
            const ranksFiltered: Record<string, any> = {};
            for (const [slug, r] of Object.entries(p.ranks)) {
                // Étape 1 : Applique la limite 'topLimit'
                if (r && typeof r.rankTotal === "number" && r.rankTotal <= topLimit) {
                    ranksFiltered[slug] = { ...r };
                }
            }
            return { ...p, ranksFiltered };
        });

        // FILTRAGE LOGIQUE

        // 1. Filtrer par topics sélectionnés (si spécifié)
        if (selectedTopics.length > 0) {
            arr = arr.map(p => {
                const newRanksFiltered: Record<string, any> = {};
                for (const slug of selectedTopics) {
                    if (p.ranksFiltered[slug]) {
                        newRanksFiltered[slug] = p.ranksFiltered[slug];
                    }
                }
                return {
                    ...p,
                    ranksFiltered: newRanksFiltered,
                };
            });
        }


        // 2. FILTRE X SCORE (utilise la valeur brute)
        if (xScoreFilterMode !== "all") {
            const threshold = xScoreThreshold;
            arr = arr.filter((p) => {
                if (xScoreFilterMode === "gt") {
                    return p.__xScore >= threshold;
                }
                if (xScoreFilterMode === "lt") {
                    return p.__xScore <= threshold;
                }
                return true;
            });
        }
        // FIN FILTRE X SCORE


        // 3. Filtrer par recherche de profil
        if (profileSearch.trim()) {
            const q = profileSearch.toLowerCase();
            arr = arr.filter(
                (p) => p.handle?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q)
            );
        }

        // 4. Filtrer par nombre de topics
        if (topicCountFilter) {
            arr = arr.filter((p) => Object.keys(p.ranksFiltered).length === topicCountFilter);
        }

        // 5. Calculer le score et trier
        if (!selectedTopics.length) {

            arr = arr
                .map((p) => {
                    const ranks = Object.values(p.ranksFiltered || {});
                    if (!ranks.length) return { ...p, __score: 0 };
                    const points = ranks
                        .map((r: any) => (r.rankTotal ? (topLimit - r.rankTotal + 1) / topLimit : 0))
                        .reduce((a, b) => a + b, 0);
                    return { ...p, __score: points };
                })
                .sort((a, b) => {
                    if ((b.__score ?? 0) !== (a.__score ?? 0)) return (b.__score ?? 0) - (a.__score ?? 0);
                    return (a.name || a.handle || "").localeCompare(b.name || b.handle || "", undefined, {
                        sensitivity: "base",
                    });
                });
        } else if (selectedTopics.length === 1 && !sortConfig) {

            const slug = selectedTopics[0];
            arr.sort((a, b) => {
                const av = a.ranksFiltered?.[slug]?.rankTotal ?? Infinity;
                const bv = b.ranksFiltered?.[slug]?.rankTotal ?? Infinity;
                if (av === bv) return (a.name || "").localeCompare(b.name || "");
                return av - bv;
            });
        } else if (sortConfig) {
            const { slug, direction } = sortConfig;
            arr.sort((a, b) => {
                const av = a.ranksFiltered?.[slug]?.rankTotal ?? Infinity;
                const bv = b.ranksFiltered?.[slug]?.rankTotal ?? Infinity;
                if (av === bv) return (a.name || "").localeCompare(b.name || "");
                return direction === "asc" ? av - bv : bv - av;
            });
        }


        // 6. Filtre final : retire les profils qui n'ont plus d'entrées de classement
        return arr.filter((p) => Object.keys(p.ranksFiltered).length > 0) as ProfileForCard[];
    }, [derivedProfiles, selectedTopics, profileSearch, topLimit, sortConfig, topicCountFilter, xScoreFilterMode, xScoreThreshold]);


    const topicCountOptions = useMemo(() => {
        const counts: Record<number, number> = {};
        filteredProfiles.forEach((p) => {
            const n = Object.keys(p.ranksFiltered || {}).length;
            if (n > 0) counts[n] = (counts[n] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([count, num]) => ({ count: parseInt(count), num }))
            .sort((a, b) => a.count - b.count);
    }, [filteredProfiles]);


    const activeTopicSlugs = useMemo(() => {
        const slugs = new Set<string>();
        filteredProfiles.forEach((p) => {
            Object.keys(p.ranksFiltered || {}).forEach((s) => slugs.add(s));
        });
        return Array.from(slugs);
    }, [filteredProfiles]);

    const activeTopicsCount = activeTopicSlugs.length;

    const visibleLeaderboardEntriesCount = useMemo(() => {
        return filteredProfiles.reduce((count, p) => {
            return count + Object.keys(p.ranksFiltered || {}).length;
        }, 0);
    }, [filteredProfiles]);

    const filteredProfilesCount = filteredProfiles.length;
    const profileCoverageRatio = useMemo(() => {
        if (visibleLeaderboardEntriesCount === 0) return 0;
        return (filteredProfilesCount / visibleLeaderboardEntriesCount) * 100;
    }, [filteredProfilesCount, visibleLeaderboardEntriesCount]);


    const totalPages = Math.max(1, Math.ceil(filteredProfiles.length / itemsPerPage));
    const start = (currentPage - 1) * itemsPerPage;
    const pageProfiles = filteredProfiles.slice(start, start + itemsPerPage);

    const getTopicMeta = (slug: string): TopicMeta | undefined =>
        topicMetas.find((t) => t.topicSlug === slug);

    const handleSort = (slug: string) => {
        setSortConfig((prev) => {
            if (prev && prev.slug === slug) {
                return { slug, direction: prev.direction === "asc" ? "desc" : "asc" };
            }
            return { slug, direction: "asc" };
        });
    };

    const handleSelectAllTopics = () => {
        setSelectedTopics(topicsForDataset.map(t => t.topicSlug));
    };

    const handleClearTopics = () => {
        setSelectedTopics([]);
    };

    return (
        <div className="space-y-6 text-gray-900 dark:text-gray-100">
            {/* Header summary */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-gray-500 dark:bg-gray-800 rounded-xl p-4 shadow-md flex items-center">
                    <div className="flex-shrink-0 mr-4">
                        <img
                            src="/wallchain.jpg" // Replace with the actual path to your logo
                            alt="Wallchain Logo"
                            className="w-12 h-12"
                        />
                    </div>
                    <div className="flex flex-col">
                        <div className="text-white text-lg font-bold">Wallchain</div>
                        <a
                            href="https://quacks.app/?ref=man_versus_coin" // Replace with the actual registration link
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
                    <div className="text-white text-2xl font-bold">{visibleLeaderboardEntriesCount}</div>
                </div>

                <div className="bg-red-500 dark:bg-red-800 rounded-xl p-4 shadow-md flex flex-col justify-between">
                    <div className="text-white text-sm font-medium">Profile Coverage Ratio</div>
                    <div className="text-white text-2xl font-bold">{profileCoverageRatio.toFixed(2)}%</div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={dataset}
                        onChange={(e) => {
                            setDataset(e.target.value as any);
                            setCurrentPage(1);
                        }}
                        className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                    >
                        <option value="tournament">Current Epoch LBs</option>
                        <option value="7d">7D</option>
                        <option value="30d">30D</option>
                    </select>

                    <select
                        value={topLimit}
                        onChange={(e) => setTopLimit(Number(e.target.value))}
                        className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                    >
                        {TOP_OPTIONS.map((n) => (
                            <option key={n} value={n}>
                                Top {n}
                            </option>
                        ))}
                    </select>

                    {/* Topics dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setTopicDropdownOpen((o) => !o)}
                            className="flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                        >
                            <span>
                                {selectedTopics.length === 0
                                    ? "Select topics"
                                    : `${selectedTopics.length} selected`}
                            </span>
                            <svg
                                className="w-4 h-4"
                                viewBox="0 0 20 20"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M6 8l4 4 4-4"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </button>

                        {topicDropdownOpen && (
                            <div className="absolute z-40 mt-2 w-80 max-h-96 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
                                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                                    <input
                                        value={topicQuery}
                                        onChange={(e) => setTopicQuery(e.target.value)}
                                        placeholder="Search topics..."
                                        className="w-full px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <div className="flex justify-between mt-2">
                                        <button
                                            onClick={handleSelectAllTopics}
                                            className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                                        >
                                            Select All ({topicsForDataset.length})
                                        </button>
                                        <button
                                            onClick={handleClearTopics}
                                            className="text-xs text-red-500 hover:text-red-600 font-medium"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>
                                <div className="p-2 max-h-64 overflow-y-auto">
                                    {visibleTopics.length === 0 ? (
                                        <div className="text-center text-sm text-gray-500 py-4">No topics found.</div>
                                    ) : (
                                        visibleTopics.map((t) => {
                                            const sel = selectedTopics.includes(t.topicSlug);
                                            return (
                                                <label
                                                    key={t.topicSlug}
                                                    className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors duration-100 ${sel
                                                        ? "bg-blue-600 text-white hover:bg-blue-700"
                                                        : "hover:bg-gray-100 dark:hover:bg-gray-800"
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={sel}
                                                        onChange={() => {
                                                            setSelectedTopics((prev) =>
                                                                prev.includes(t.topicSlug)
                                                                    ? prev.filter((s) => s !== t.topicSlug)
                                                                    : [...prev, t.topicSlug]
                                                            )
                                                        }}
                                                        className={`w-4 h-4 ${sel ? 'text-white bg-white border-white' : 'text-blue-600 bg-gray-100 border-gray-300'}`}
                                                    />
                                                    <img
                                                        src={t.logoUrl || "/default-avatar.jpg"}
                                                        alt={t.title}
                                                        className="w-6 h-6 rounded-full border"
                                                    />
                                                    <span className={`text-sm truncate ${sel ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>{t.title}</span>
                                                </label>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* NOUVEAU BLOC DE FILTRE X SCORE */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
                        <span className="font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">X Score</span>

                        {/* Toggle Buttons */}
                        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-md p-1 gap-1">
                            <button
                                onClick={() => { setXScoreFilterMode("all"); setCurrentPage(1); }}
                                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${xScoreFilterMode === "all" ? "bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400" : "text-gray-500 hover:text-gray-700"}`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => { setXScoreFilterMode("gt"); setCurrentPage(1); }}
                                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${xScoreFilterMode === "gt" ? "bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400" : "text-gray-500 hover:text-gray-700"}`}
                            >
                                &gt;
                            </button>
                            <button
                                onClick={() => { setXScoreFilterMode("lt"); setCurrentPage(1); }}
                                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${xScoreFilterMode === "lt" ? "bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400" : "text-gray-500 hover:text-gray-700"}`}
                            >
                                &lt;
                            </button>
                        </div>

                        {/* Slider (Only if not All) */}
                        {xScoreFilterMode !== "all" && (
                            <div className="flex items-center gap-2 ml-1">
                                <input
                                    type="range"
                                    min={minScore}
                                    max={maxScore}
                                    step="1"
                                    value={xScoreThreshold}
                                    onChange={(e) => { setXScoreThreshold(Number(e.target.value)); setCurrentPage(1); }}
                                    className="w-24 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
                                />
                                {/* REMPLACEMENT DU SPAN PAR UN INPUT TEXT */}
                                <input
                                    type="text"

                                    value={xScoreThreshold}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, ""); // numeric only
                                        const value = Number(val);
                                        // Optionnel : Limiter la valeur aux bornes min/max
                                        // const boundedValue = Math.min(maxScore, Math.max(minScore, value));

                                        setXScoreThreshold(value);
                                        setCurrentPage(1);
                                    }}


                                    //className="w-12 text-right font-mono text-xs p-1 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400"
                                    className="w-10 text-right font-mono text-xs text-blue-600 dark:text-blue-400 bg-transparent border border-gray-300 dark:border-gray-600 rounded px-1 focus:outline-none focus:ring-1 focus:ring-blue-400 no-spinner"
                                />
                            </div>
                        )}
                    </div>
                    {/* FIN NOUVEAU BLOC DE FILTRE X SCORE */}

                    <input
                        value={profileSearch}
                        onChange={(e) => setProfileSearch(e.target.value)}
                        placeholder="Search profiles..."
                        className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 w-full md:w-64"
                    />
                </div>
                {/* Last generation date */}
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    Last updated: {generationDate ? new Date(generationDate).toLocaleString() : 'N/A'}
                </div>
            </div>

            {/* topic-overlap filter */}
            <div className="flex flex-wrap gap-2 my-2">
                {topicCountOptions.map((opt) => {
                    const isActive = topicCountFilter === opt.count;
                    const isDisabled = opt.num === 0;

                    return (
                        <button
                            key={opt.count}
                            onClick={() =>
                                !isDisabled &&
                                setTopicCountFilter(isActive ? null : opt.count)
                            }
                            className={`px-3 py-1 rounded-md border text-sm transition-colors duration-150
          ${isActive ? "bg-blue-600 text-white border-blue-700" : ""}
          ${!isActive && !isDisabled ? "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700" : ""}
          ${isDisabled ? "bg-gray-50 dark:bg-gray-900 text-gray-400 cursor-not-allowed border-gray-200 dark:border-gray-700" : ""}
        `}
                        >
                            {opt.count} topic{opt.count > 1 ? "s" : ""}: <strong>{opt.num}</strong>
                        </button>
                    );
                })}
            </div>

            {/* Main content */}
            {loading ? (
                <div className="py-20 text-center text-gray-500">Loading...</div>
            ) : filteredProfiles.length === 0 ? (
                <div className="py-10 text-center text-gray-500">No profiles found.</div>
            ) : viewMode === "cards" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pageProfiles.map((p) => (
                        <RankingProfileCard
                            key={p.userId}
                            p={p as any}
                            selectedTopics={selectedTopics}
                            topicsForDataset={topicsForDataset as any}
                            getTopicMeta={getTopicMeta}
                            dataset={dataset}
                            metric="rankTotal"
                            xScoreFilterMode={xScoreFilterMode} // PASSAGE DE LA NOUVELLE PROP
                        />
                    ))}
                </div>
            ) : (
                <div className="overflow-auto border rounded">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium">#</th>
                                <th className="px-3 py-2 text-left text-xs font-medium">Profile</th>
                                {selectedTopics.map((slug) => {
                                    const meta = getTopicMeta(slug) ?? { topicSlug: slug, title: slug };
                                    return (
                                        <th
                                            key={slug}
                                            className="px-3 py-2 text-center text-xs font-medium cursor-pointer select-none"
                                            onClick={() => handleSort(slug)}
                                        >
                                            <div className="flex justify-center items-center gap-2">
                                                <img
                                                    src={meta.logoUrl || "/default-avatar.jpg"}
                                                    alt={meta.title}
                                                    className="w-4 h-4 rounded-full"
                                                />
                                                <div>{meta.title}</div>
                                                {sortConfig?.slug === slug ? (
                                                    sortConfig.direction === "asc" ? (
                                                        <ArrowUp className="w-3 h-3 text-blue-500 inline-block" />
                                                    ) : (
                                                        <ArrowDown className="w-3 h-3 text-blue-500 inline-block" />
                                                    )
                                                ) : (
                                                    <ArrowUp className="w-3 h-3 text-gray-400 opacity-30 inline-block" />
                                                )}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredProfiles.map((p, idx) => (
                                <tr key={p.userId}>
                                    <td className="px-3 py-2 text-xs">{idx + 1}</td>
                                    <td className="px-3 py-2 text-sm flex items-center gap-2">
                                        <img src={p.avatarUrl || ""} alt={p.name} className="w-6 h-6 rounded-full" />
                                        <div>
                                            <div className="font-medium">{p.name}</div>
                                            {p.handle && (
                                                <a
                                                    href={`https://x.com/${p.handle}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-blue-500 hover:underline"
                                                >
                                                    @{p.handle}
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                    {selectedTopics.map((slug) => {
                                        const r = p.ranksFiltered?.[slug];
                                        return (
                                            <td key={slug + p.userId} className="px-3 py-1 text-xs text-center">
                                                {r ? (
                                                    <>
                                                        #{r.rankTotal}{" "}
                                                        <span className="text-gray-500 text-[10px] ml-1">
                                                            ({r.totalPoints?.toFixed(1)})
                                                        </span>
                                                    </>
                                                ) : (
                                                    "-"
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {/* Pagination reste inchangé */}
            {filteredProfiles.length > itemsPerPage && (
                <div className="flex justify-center items-center gap-3 my-4 pb-6">
                    <button
                        onClick={() => setCurrentPage((cp) => Math.max(1, cp - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage((cp) => Math.min(totalPages, cp + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}