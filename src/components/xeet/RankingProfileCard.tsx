import { useState } from "react";
import { Share2 } from "lucide-react";
import StatsShareModal from "./StatsShareModal";

interface RankingProfileCardProps {
    p: any;
    selectedTopics: any[];
    topicsForDataset: any[];
    getTopicMeta: any;
    dataset: "tournament" | "7d" | "30d";
    metric: "rankTotal" | "rankSignal" | "rankNoise";
    noiseFilterMode: "all" | "gt" | "lt";
    ethosScoreFilterMode: "all" | "gt" | "lt";
}

function formatFollowers(count?: number | null) {
    if (!count || count < 10000) return count?.toLocaleString() ?? "0";

    if (count >= 1_000_000) {
        return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    }

    return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
}

function RankingProfileCard({
    p,
    selectedTopics,
    topicsForDataset,
    getTopicMeta,
    dataset,
    metric,
    noiseFilterMode,
    ethosScoreFilterMode,
}: RankingProfileCardProps) {
    const [modalOpen, setModalOpen] = useState(false);

    // Helper to determine color based on Noise Ratio
    const getRatioColor = (ratio: number) => {
        if (ratio > 60) return "text-red-500 dark:text-red-400";
        if (ratio >= 40) return "text-orange-500 dark:text-orange-400";
        return "text-green-600 dark:text-green-400";
    };

    // Function to sort topics by rank in ascending order
    const sortTopicsByRank = (topics: any[]) => {
        return topics.sort((a, b) => {
            const metaA = getTopicMeta(a.topicSlug || a);
            const metaB = getTopicMeta(b.topicSlug || b);

            const rankA = p.ranksFiltered?.[metaA.topicSlug]?.[metric] || Infinity;
            const rankB = p.ranksFiltered?.[metaB.topicSlug]?.[metric] || Infinity;

            return rankA - rankB;
        });
    };
    
    return (
        <div
            key={p.userId}
            className="relative bg-gray-100 dark:bg-gray-800 rounded-xl p-3 hover:bg-gray-200 dark:hover:bg-gray-700 transition group/card"
        >
            {(ethosScoreFilterMode !== "all") && (
                <div className="absolute top-2 right-10 flex flex-row items-center gap-2 z-10">

                    {/* Ethos Score */}
                    {typeof p.ethos_score === "number" && (
                        <span
                            className="text-xs font-semibold px-2 py-1 rounded-full
                bg-blue-300 dark:bg-blue-700
                text-blue-900 dark:text-blue-200 shadow"
                            title="Profile Ethos Score"
                        >
                            Ethos: {p.ethos_score.toFixed(1)}

                        </span>
                    )}

                </div>
            )}
            {/* Buttons in top-right */}
            <div className="absolute top-2 right-2 flex items-center gap-2">
                <button
                    onClick={() => setModalOpen(true)}
                    className="bg-black/30 hover:bg-black/50 text-white p-1.5 rounded-full"
                    title="Share stats"
                >
                    <Share2 size={14} />
                </button>
            </div>

            {/* Profile */}
            <div className="flex items-center gap-3 mb-3 pr-8">
                <img
                    src={p.avatarUrl || "/default-avatar.jpg"}
                    alt={p.name}
                    className="w-10 h-10 rounded-full border flex-shrink-0"
                />

                <div className="flex flex-col min-w-0">
                    {/* Username + verified */}
                    <div className="flex items-center gap-1 min-w-0">
                        <a
                            href={`https://x.com/${p.handle}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-blue-600 dark:text-blue-400 truncate"
                        >
                            @{p.handle}
                        </a>

                        {p.isVerified && (
                            <span
                                title="Certified tournament profile"
                                className="flex items-center justify-center w-4 h-4 rounded-full bg-pink-500 flex-shrink-0"
                            >
                                <svg
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    className="w-3 h-3 text-white"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-7.364 7.364a1 1 0 01-1.414 0L3.293 9.414a1 1 0 011.414-1.414l3.222 3.222 6.657-6.657a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </span>
                        )}
                    </div>

                    {/* Name + followers */}
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 truncate">
                        <span className="truncate">{p.name}</span>

                        {typeof p.followersCount === "number" && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    className="w-3 h-3 opacity-70"
                                >
                                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zM8 11c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                                </svg>
                                <span className="font-medium">
                                    {formatFollowers(p.followersCount)}
                                </span>
                            </span>
                        )}
                    </div>
                </div>
            </div>



            {/* Topics grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 text-xs">
                {sortTopicsByRank(
                    selectedTopics.length > 0
                        ? selectedTopics.map((s) => getTopicMeta(s))
                        : topicsForDataset
                ).map((tmeta) => {
                    const r = (p as any).ranksFiltered
                        ? (p as any).ranksFiltered[tmeta.topicSlug]
                        : undefined;

                    const display = r
                        ? metric === "rankTotal"
                            ? r.rankTotal
                            : metric === "rankSignal"
                                ? r.rankSignal
                                : r.rankNoise
                        : "-";

                    if (display === "-" || display === 0) return null;

                    return (
                        <div
                            key={tmeta.topicSlug}
                            className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded-md relative min-w-0"
                        >
                            <img
                                src={tmeta.logoUrl || "/default-avatar.jpg"}
                                alt={tmeta.title}
                                className="w-4 h-4 rounded-full border flex-shrink-0"
                            />
                            <span className="truncate flex-1 min-w-0">{tmeta.title}</span>

                            <div className="flex items-center ml-auto flex-shrink-0">
                                {/* Noise Ratio with Tooltip & Color */}
                                {noiseFilterMode !== "all" && r.ratio !== undefined && (
                                    <div className="group relative flex items-center">
                                        <span
                                            className={`text-[10px] mr-1.5 font-medium cursor-help ${getRatioColor(r.ratio)}`}
                                        >
                                            {r.ratio.toFixed(0)}%
                                        </span>
                                        {/* Tooltip for Ratio - Positioned RIGHT to avoid overflow */}
                                        <div className="pointer-events-none absolute bottom-full right-0 mb-2 w-max max-w-[200px] px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg whitespace-normal text-center">
                                            Noise Ratio: % of Noise Points / Total Points
                                            {/* Triangle arrow (aligned right) */}
                                            <div className="absolute top-full right-2 -mt-[1px] border-4 border-transparent border-t-gray-900"></div>
                                        </div>
                                    </div>
                                )}

                                {/* Rank with Tooltip */}
                                <div className="group relative flex items-center">
                                    {r.multiplier > 1 && r.multiplier !== undefined && (
                                        <span className="bg-green-50 dark:bg-green-900 text-white-600 dark:text-white-400 font-semibold px-2 mx-2 rounded">
                                        {r.multiplier}
                                    </span>
                                    )}
                                    <span className="text-blue-600 dark:text-blue-400 font-semibold cursor-help">
                                        #{display}
                                    </span>
                                    {/* Tooltip for Rank - Positioned RIGHT */}
                                    <div className="pointer-events-none absolute bottom-full right-0 mb-2 w-max px-2 py-1 bg-blue-600 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                                        Multplier / Current Rank ({metric.replace("rank", "")})
                                        {/* Triangle arrow */}
                                        <div className="absolute top-full right-1 -mt-[1px] border-4 border-transparent border-t-blue-600"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Share Modal */}
            {modalOpen && (
                <StatsShareModal
                    profile={p}
                    selectedTopics={selectedTopics}
                    topicsForDataset={topicsForDataset}
                    dataset={dataset}
                    metric={metric}
                    onClose={() => setModalOpen(false)}
                />
            )}
        </div>
    );
}

export default RankingProfileCard;