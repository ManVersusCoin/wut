import React, { useEffect, useMemo, useState } from "react";
import type { JSX } from "react";
import { motion, AnimatePresence } from "framer-motion";
import RankingProfileCard from "../../components/wallchain/RankingProfileCard";
import { Info, Star } from 'lucide-react'; // NOUVEAU: Import des icônes

type TopicMeta = {
    companyId: string;
    companyName?: string;
    logoUrl?: string;
    title?: string;
    description?: string;
};

type TopicEntry = {
    topicSlug: string;
    period: string;
    rankTotal?: number;
    totalPoints?: number;
};

type ProfileRaw = {
    handle: string;
    name?: string;
    avatarUrl?: string;
    topics: TopicEntry[];
};

type ProfileForCard = ProfileRaw & {
    ranksFiltered: Record<string, { rankTotal?: number; totalPoints?: number }>;
};

type TopicMetrics = {
    topicSlug: string;
    farmingScore: number;
    organicIndex: number;
    exclusiveTopCount: number;
    exclusiveProfiles: ProfileForCard[];
    topProfiles: ProfileForCard[];
};

// MODIFIÉ: Le tooltip est maintenant positionné par rapport à l'icône
const HeaderTooltip = ({ title, explanation }: { title: string; explanation: React.ReactNode }) => (
    <div className="absolute left-1/2 -translate-x-1/2 top-full mb-2 w-72 p-3 text-sm font-normal text-left text-white bg-gray-900 dark:bg-black rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 scale-95 group-hover:scale-100 pointer-events-none">
        <div className="font-semibold text-base mb-1">{title}</div>
        {explanation}
        {/* Flèche */}
        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-gray-900 dark:border-t-black"></div>
    </div>
);


export default function FarmingIndexTable(): JSX.Element {
    const [topicsData, setTopicsData] = useState<TopicMeta[]>([]);
    const [profilesRaw, setProfilesRaw] = useState<ProfileRaw[]>([]);
    const [metrics, setMetrics] = useState<TopicMetrics[]>([]);
    const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const [expandedViewMode, setExpandedViewMode] = useState<'exclusive' | 'all'>('exclusive');

    // Parameters
    const [topCutoff, setTopCutoff] = useState<number>(50);
    const [goodRankThreshold, setGoodRankThreshold] = useState<number>(300);
    const datasetPeriod: "tournament" | "7d" | "30d" = "tournament";

    useEffect(() => {
        let mounted = true;
        async function load() {
            setLoading(true);
            try {
                const [topicsRes, latestRes] = await Promise.all([
                    fetch("/wallchain_topics_raw.json"),
                    fetch("/leaderboards/wallchain_global/latest.json"),
                ]);

                if (!topicsRes.ok) throw new Error("Failed to fetch wallchain_topics_raw.json");
                if (!latestRes.ok) throw new Error("Failed to fetch wallchain_global/latest.json");

                const topicsJson = await topicsRes.json();
                const latestJson = await latestRes.json();

                if (!mounted) return;
                setTopicsData(Array.isArray(topicsJson) ? topicsJson : []);
                setProfilesRaw(Array.isArray(latestJson.profiles) ? latestJson.profiles : []);
            } catch (err) {
                console.error("Failed to load data for FarmingIndexTable", err);
            } finally {
                if (mounted) setLoading(false);
            }
        }
        load();
        return () => {
            mounted = false;
        };
    }, []);

    // Get topic meta
    const getTopicMeta = (slug: string) =>
        topicsData.find((t) => t.companyId === slug) || {
            companyId: slug,
            companyName: slug,
            logoUrl: undefined,
            title: slug,
            description: "",
        };

    const profilesForCards: ProfileForCard[] = useMemo(() => {
        return profilesRaw.map((p) => {
            const ranksFiltered: Record<string, { rankTotal?: number; totalPoints?: number }> = {};
            (p.topics || []).forEach((t) => {
                if (t.period === datasetPeriod) {
                    ranksFiltered[t.topicSlug] = {
                        rankTotal: t.rankTotal ?? undefined,
                        totalPoints: t.totalPoints ?? undefined,
                    };
                }
            });
            return { ...p, ranksFiltered };
        });
    }, [profilesRaw, datasetPeriod]);

    useEffect(() => {
        setLoading(true);
        try {
            const allTopics = Array.from(
                new Set(profilesForCards.flatMap((p) => Object.keys(p.ranksFiltered)))
            );

            const newMetrics: TopicMetrics[] = allTopics.map((topicSlug) => {
                const profilesWithRank = profilesForCards
                    .map((p) => ({
                        profile: p,
                        rank: p.ranksFiltered[topicSlug]?.rankTotal ?? Infinity,
                    }))
                    .filter((x) => isFinite(x.rank))
                    .sort((a, b) => a.rank - b.rank);

                const topN = profilesWithRank.slice(0, topCutoff);
                const farmingCounts: number[] = [];
                const exclusiveProfiles: ProfileForCard[] = [];

                for (const { profile } of topN) {
                    const otherGoodCount = Object.entries(profile.ranksFiltered)
                        .filter(([slug]) => slug !== topicSlug)
                        .filter(
                            ([, r]) =>
                                typeof r?.rankTotal === "number" && r.rankTotal <= goodRankThreshold
                        ).length;

                    farmingCounts.push(otherGoodCount);

                    if (otherGoodCount === 0) exclusiveProfiles.push(profile);
                }

                const farmingScore =
                    farmingCounts.length > 0
                        ? farmingCounts.reduce((a, b) => a + b, 0) / farmingCounts.length
                        : 0;

                const organicIndex = parseFloat((1 / (1 + farmingScore)).toFixed(3));

                const topProfiles = topN.map(item => item.profile);

                return {
                    topicSlug,
                    farmingScore: parseFloat(farmingScore.toFixed(3)),
                    organicIndex,
                    exclusiveTopCount: exclusiveProfiles.length,
                    exclusiveProfiles,
                    topProfiles,
                };
            });

            newMetrics.sort((a, b) => b.organicIndex - a.organicIndex);

            setMetrics(newMetrics);
        } catch (err) {
            console.error("Failed to compute metrics", err);
        } finally {
            setLoading(false);
        }
    }, [profilesForCards, topCutoff, goodRankThreshold]);

    const toggleTopic = (slug: string) => {
        setExpandedTopic((cur) => (cur === slug ? null : slug));
        setExpandedViewMode('exclusive');
    };

    const topicsForDataset = useMemo(
        () =>
            topicsData.map((t) => ({
                topicSlug: t.companyId,
                logoUrl: t.logoUrl,
                title: t.companyName ?? t.companyId,
            })),
        [topicsData]
    );

    return (
        <div className="p-6">
            <h2 className="text-2xl font-semibold mb-3">Farming / Organic Index</h2>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-2xl">
                The farming index checks whether a topic's top participants are also highly ranked across many other
                topics (possible "professional farmers"). Adjust the parameters below and the index will automatically
                recompute. A higher <b>Organic Index</b> means a more genuine, topic-focused community.
            </p>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
                <label className="flex flex-col text-sm">
                    <span className="text-xs text-gray-600 dark:text-gray-400 mb-1">Top Cutoff</span>
                    <select
                        className="px-3 py-1 rounded-md border bg-white dark:bg-gray-800"
                        value={topCutoff}
                        onChange={(e) => setTopCutoff(Number(e.target.value))}
                    >
                        {[50, 100, 150, 200, 300, 400, 500, 1000].map((n) => (
                            <option key={n} value={n}>
                                Top {n}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="flex flex-col text-sm">
                    <span className="text-xs text-gray-600 dark:text-gray-400 mb-1">Good Rank Threshold</span>
                    <select
                        className="px-3 py-1 rounded-md border bg-white dark:bg-gray-800"
                        value={goodRankThreshold}
                        onChange={(e) => setGoodRankThreshold(Number(e.target.value))}
                    >
                        {[100, 300, 500, 1000].map((n) => (
                            <option key={n} value={n}>
                                ≤ {n}
                            </option>
                        ))}
                    </select>
                </label>

                {loading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" />
                        Recomputing...
                    </div>
                ) : (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        Computed {metrics.length} topics · top cutoff {topCutoff} · good threshold ≤ {goodRankThreshold}
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300">
                        <tr>
                            <th className="px-4 py-3 text-left">Topic</th>

                            {/* MODIFIÉ: En-tête avec icône et tooltip */}
                            <th className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                    <span>Farming Score (avg #other good ranks)</span>
                                    <div className="group relative">
                                        <Info size={14} className="text-gray-400 cursor-help" />
                                        <HeaderTooltip
                                            title="Farming Score"
                                            explanation={
                                                <>
                                                    <p>This score represents the average number of *other* topics where a profile (in this topic's Top {topCutoff}) also has a "good rank" (≤ {goodRankThreshold}).</p>
                                                    <p className="mt-2"><b>High Score:</b> Indicates that top participants are active and high-ranking across many topics (potential "farming").</p>
                                                    <p className="mt-2"><b>Low Score:</b> Indicates participants are more focused on this single topic.</p>
                                                </>
                                            }
                                        />
                                    </div>
                                </div>
                            </th>

                            {/* MODIFIÉ: En-tête avec icône et tooltip */}
                            <th className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                    <span>Organic Index (1/(1+score))</span>
                                    <div className="group relative">
                                        <Info size={14} className="text-gray-400 cursor-help" />
                                        <HeaderTooltip
                                            title="Organic Index"
                                            explanation={
                                                <>
                                                    <p>A score from 0 to 1 calculated as: <b>1 / (1 + Farming Score)</b>.</p>
                                                    <p className="mt-2"><b>High Index (near 1):</b> Means a low farming score. The community is considered "organic" and topic-focused.</p>
                                                    <p className="mt-2"><b>Low Index (near 0):</b> Means a high farming score. The topic is likely being "farmed" by general participants.</p>
                                                </>
                                            }
                                        />
                                    </div>
                                </div>
                            </th>
                            <th className="px-4 py-3 text-center"># in top {topCutoff} with no good ranks elsewhere</th>
                        </tr>
                    </thead>
                    <tbody>
                        {metrics.map((m) => {
                            const meta = getTopicMeta(m.topicSlug);
                            return (
                                <React.Fragment key={m.topicSlug}>
                                    <tr className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/40">
                                        <td className="px-4 py-3 flex items-center gap-3">
                                            {meta.logoUrl && (
                                                <img
                                                    src={meta.logoUrl}
                                                    alt={meta.companyName}
                                                    className="w-6 h-6 rounded-full"
                                                />
                                            )}
                                            <div>
                                                <div className="font-medium">
                                                    {meta.companyName ?? m.topicSlug}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {meta.description}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {m.farmingScore.toFixed(3)}
                                        </td>
                                        <td className="px-4 py-3 text-center font-medium text-green-600 dark:text-green-400">
                                            {m.organicIndex.toFixed(3)}
                                        </td>
                                        <td
                                            className="px-4 py-3 text-center text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
                                            onClick={() => toggleTopic(m.topicSlug)}
                                            role="button"
                                            aria-expanded={expandedTopic === m.topicSlug}
                                        >
                                            {m.exclusiveTopCount}
                                        </td>
                                    </tr>

                                    {/* Expanded Row */}
                                    <AnimatePresence>
                                        {expandedTopic === m.topicSlug && (
                                            <motion.tr
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="bg-gray-50 dark:bg-gray-900/40"
                                            >
                                                <td colSpan={4} className="px-4 py-4">
                                                    {/* Tabs de navigation */}
                                                    <div className="flex gap-2 mb-4 border-b dark:border-gray-700">
                                                        <button
                                                            className={`px-3 py-2 text-sm font-medium ${expandedViewMode === 'exclusive'
                                                                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                                                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                                                }`}
                                                            onClick={() => setExpandedViewMode('exclusive')}
                                                        >
                                                            Exclusive Profiles ({m.exclusiveProfiles.length})
                                                        </button>
                                                        <button
                                                            className={`px-3 py-2 text-sm font-medium ${expandedViewMode === 'all'
                                                                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                                                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                                                }`}
                                                            onClick={() => setExpandedViewMode('all')}
                                                        >
                                                            All Top {topCutoff} Profiles ({m.topProfiles.length})
                                                        </button>
                                                    </div>

                                                    {(() => {
                                                        const exclusiveHandles = new Set(m.exclusiveProfiles.map(p => p.handle));
                                                        const profilesToRender = expandedViewMode === 'all' ? m.topProfiles : m.exclusiveProfiles;

                                                        if (profilesToRender.length === 0) {
                                                            return (
                                                                <div className="text-sm text-gray-500">
                                                                    No {expandedViewMode === 'exclusive' ? 'exclusive' : 'top'} profiles for this topic.
                                                                </div>
                                                            );
                                                        }

                                                        return (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                {profilesToRender.map((pRaw) => {
                                                                    const isExclusive = exclusiveHandles.has(pRaw.handle);

                                                                    const fullRanksFiltered: Record<
                                                                        string,
                                                                        { rankTotal?: number; totalPoints?: number }
                                                                    > = {};

                                                                    topicsData.forEach((t) => {
                                                                        const slug = t.companyId;
                                                                        const topicRank = pRaw.ranksFiltered[slug];
                                                                        fullRanksFiltered[slug] = topicRank ?? { rankTotal: undefined, totalPoints: undefined };
                                                                    });
                                                                    const p = {
                                                                        ...pRaw,
                                                                        ranksFiltered: fullRanksFiltered,
                                                                    };

                                                                    return (
                                                                        <div key={p.handle} className="relative">
                                                                            <RankingProfileCard
                                                                                p={p}
                                                                                selectedTopics={topicsData.map(
                                                                                    (t) => t.companyId
                                                                                )}
                                                                                topicsForDataset={topicsForDataset}
                                                                                getTopicMeta={(slug: string) =>
                                                                                    getTopicMeta(slug)
                                                                                }
                                                                                dataset={datasetPeriod}
                                                                                metric="rankTotal"
                                                                                xScoreFilterMode="all"
                                                                            />

                                                                            {/* MODIFIÉ: Indicateur étoile verte (position changée) */}
                                                                            {expandedViewMode === 'all' && isExclusive && (
                                                                                <div
                                                                                    className="absolute top-2 right-10 p-1.5 bg-green-500 rounded-full text-white shadow-lg"
                                                                                    title="Exclusive Profile (no other good ranks elsewhere)"
                                                                                >
                                                                                    {/* Utilisation de l'icône Lucide */}
                                                                                    <Star size={16} fill="currentColor" />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
                                            </motion.tr>
                                        )}
                                    </AnimatePresence>
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}