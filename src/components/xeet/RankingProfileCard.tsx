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
}

function RankingProfileCard({
    p,
    selectedTopics,
    topicsForDataset,
    getTopicMeta,
    dataset,
    metric,
    noiseFilterMode,
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
            <div className="flex items-center gap-3 mb-3 pr-8"> {/* Added pr-8 to avoid overlap with share button */}
                <img
                    src={p.avatarUrl || "/default-avatar.jpg"}
                    alt={p.name}
                    className="w-10 h-10 rounded-full border flex-shrink-0"
                />
                <div className="flex flex-col min-w-0">
                    <a
                        href={`https://x.com/${p.handle}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-blue-600 dark:text-blue-400 truncate block"
                    >
                        @{p.handle}
                    </a>
                    <span className="text-xs text-gray-600 dark:text-gray-400 truncate block">
                        {p.name}
                    </span>
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
                                    <span className="text-blue-600 dark:text-blue-400 font-semibold cursor-help">
                                        #{display}
                                    </span>
                                    {/* Tooltip for Rank - Positioned RIGHT */}
                                    <div className="pointer-events-none absolute bottom-full right-0 mb-2 w-max px-2 py-1 bg-blue-600 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                                        Current Rank ({metric.replace("rank", "")})
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