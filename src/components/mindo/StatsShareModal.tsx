import { useRef, useState } from "react";
import domtoimage from "dom-to-image";
import { X, Copy, Download } from "lucide-react";
import type { Profile, RankEntry } from "./RankingProfileCard";
interface Toast {
    id: number;
    message: string;
    type: "success" | "error";
}

// Définitions de types simplifiées
type MetricType = "rankTotal" | "rankSignal" | "rankNoise";

interface TopicMetaIn {
    topicSlug: string;
    logoUrl?: string | null;
    title?: string;
}

interface StatsShareModalProps {
    profile: Profile;
    selectedTopics: string[]; // slugs
    topicsForDataset: TopicMetaIn[];
    dataset: "tournament" | "7d" | "30d";
    metric: MetricType;
    onClose: () => void;
}

export default function StatsShareModal({
    profile,
    selectedTopics,
    topicsForDataset,
    dataset,
    metric,
    onClose,
}: StatsShareModalProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [toasts, setToasts] = useState<Toast[]>([]);

    // ------------------------------
    // Toast helpers
    // ------------------------------
    const addToast = (message: string, type: "success" | "error") => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    };

    // ------------------------------
    // Copy / Download handlers
    // ------------------------------
    const handleCopyImage = async () => {
        if (!cardRef.current) return;
        try {
            const blob = await domtoimage.toBlob(cardRef.current);
            const item = new ClipboardItem({ "image/png": blob });
            await navigator.clipboard.write([item]);
            addToast("Image copied to clipboard!", "success");
        } catch {
            addToast("Failed to copy image", "error");
        }
    };

    const handleDownloadImage = async () => {
        if (!cardRef.current) return;
        try {
            const blob = await domtoimage.toBlob(cardRef.current);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${profile.handle}_mindo_stats.png`;
            a.click();
            URL.revokeObjectURL(url);
            addToast("Image downloaded!", "success");
        } catch {
            addToast("Failed to download image", "error");
        }
    };

    // Filtre les topics pour n'afficher que ceux sélectionnés, sinon tous ceux du dataset
    const displayedTopics =
        selectedTopics.length > 0
            ? selectedTopics
                .map((s) => topicsForDataset.find((t) => t.topicSlug === s))
                .filter((t): t is TopicMetaIn => !!t)
            : topicsForDataset;

    const metricLabel = () => {
        if (dataset === "tournament") return "Current Epoch ranks";
        if (dataset === "7d") {
            if (metric === "rankTotal") return "7D Total ranks";
            if (metric === "rankSignal") return "7D Signal ranks";
            if (metric === "rankNoise") return "7D Noise ranks";
        }
        if (dataset === "30d") {
            if (metric === "rankTotal") return "30D Total ranks";
            if (metric === "rankSignal") return "30D Signal ranks";
            if (metric === "rankNoise") return "30D Noise ranks";
        }
        return "Ranks";
    };

    // Helper function to get the correct numeric rank value based on the metric
    const getNumericRank = (r: RankEntry | undefined, currentMetric: MetricType): number | undefined => {
        if (!r) return undefined;

        let value: number | undefined;

        if (currentMetric === "rankTotal") value = r.rankTotal;
        else if (currentMetric === "rankSignal") value = r.rankSignal;
        else if (currentMetric === "rankNoise") value = r.rankNoise;

        // Fallback or general rank
        if (value === undefined) value = r.rank;

        return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
    };

    // Helper function to get logo URL
    const getLogoUrl = (tmeta: TopicMetaIn) => {
        if (!tmeta.logoUrl) return "/default-avatar.jpg";

        // Check if URL ends with a standard image extension (case insensitive)
        if (/\.(png|jpg|jpeg|svg|gif)$/i.test(tmeta.logoUrl)) {
            return tmeta.logoUrl;
        }

        // Fallback to topicSlug.jpg if the URL doesn't look like an image
        return `/${tmeta.topicSlug}.jpg`;
    };

    // Filtrer les topics pour la carte: Masquer si rank est manquant/nul
    const topicsToDisplay = displayedTopics.filter(tmeta => {
        const r = profile.ranksFiltered?.[tmeta.topicSlug];
        const rankValue = getNumericRank(r, metric);
        return rankValue !== undefined;
    });

    // Optionnel: Trier les sujets pour le modal (comme dans RankingProfileCard)
    const sortedTopicsToDisplay = [...topicsToDisplay].sort((a, b) => {
        const rankA = getNumericRank(profile.ranksFiltered?.[a.topicSlug], metric) ?? Infinity;
        const rankB = getNumericRank(profile.ranksFiltered?.[b.topicSlug], metric) ?? Infinity;
        return rankA - rankB;
    });


    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            {/* Toasts */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-50 pointer-events-none">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`px-4 py-2 rounded shadow font-semibold text-sm ${t.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
                            } transition-all`}
                    >
                        {t.message}
                    </div>
                ))}
            </div>

            <div
                // Support Dark Mode pour le conteneur du modal
                className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-2xl shadow-2xl p-6 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-500 dark:hover:text-gray-200 transition"
                >
                    <X size={20} />
                </button>

                {/* Card preview */}
                <div className="mb-6">
                    <h3 className="text-xl font-bold mb-4">Share Your Stats</h3>
                    <div
                        ref={cardRef}
                        // La carte de partage est généralement statique (fond sombre) pour un meilleur contraste
                        className="relative bg-gradient-to-r from-gray-900 to-gray-700 text-white rounded-xl p-6 flex flex-col justify-between min-h-[400px] w-full"
                    >
                        {/* Midno + logo */}
                        <div className="absolute top-4 right-4 flex items-center gap-3">
                            <span className="text-white/80 text-xs">{metricLabel()}</span>
                            <img
                                src="/mindo.jpg" 
                                alt="Mindo AI"
                                className="w-12 h-12 rounded-md border border-white/20 shadow-md"
                            />
                        </div>

                        {/* Top: Profile info */}
                        <div className="flex items-center gap-4">
                            <img
                                src={profile.avatarUrl || "/default-avatar.jpg"}
                                alt={profile.name}
                                className="w-16 h-16 rounded-full border border-white/50"
                            />
                            <div>
                                <h2 className="text-lg font-semibold">{profile.name}</h2>
                                <p className="text-sm text-blue-400">@{profile.handle}</p>
                            </div>
                        </div>

                        {/* Middle: Stats grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm my-8">
                            {sortedTopicsToDisplay.map((tmeta) => {
                                const r = profile.ranksFiltered?.[tmeta.topicSlug];
                                const rank = getNumericRank(r, metric); // on sait qu'il n'est pas undefined grâce au filtre

                                return (
                                    <div
                                        key={tmeta.topicSlug}
                                        className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg"
                                    >
                                        <img
                                            src={getLogoUrl(tmeta)}
                                            alt={tmeta.title}
                                            className="w-5 h-5 rounded-full border border-white/30"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.src = "/default-avatar.jpg";
                                            }}
                                        />
                                        <span className="truncate flex-grow">{tmeta.title ?? tmeta.topicSlug}</span>
                                        <span className="ml-auto text-green-400 font-bold flex-shrink-0">
                                            #{rank}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Message si aucun rang n'est trouvé */}
                        {sortedTopicsToDisplay.length === 0 && (
                            <div className="text-center text-white/70 py-16">
                                No ranks found for the selected topics and metric.
                            </div>
                        )}

                        {/* Bottom - Responsive footer */}
                        <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0 text-[11px] sm:text-xs text-white/70 mt-auto pt-2 border-t border-white/10">
                            <span className="pl-1 sm:pl-2">
                                {new Date(profile?.generatedAt || Date.now()).toLocaleDateString("en-US")}
                            </span>
                            <span className="text-center sm:text-right px-2 sm:px-3 leading-snug max-w-[90%] sm:max-w-none">
                                For fun and informational purposes only<br className="sm:hidden" /> / not affiliated with the official Mindo project
                            </span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={handleCopyImage}
                        // Support Dark Mode pour les boutons d'action
                        className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-4 py-2 rounded-lg text-sm text-gray-800 dark:text-gray-200 transition"
                    >
                        <Copy size={16} />
                        Copy PNG
                    </button>
                    <button
                        onClick={handleDownloadImage}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition"
                    >
                        <Download size={16} />
                        Download PNG
                    </button>
                </div>
            </div>
        </div>
    );
}