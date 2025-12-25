import { motion } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";

interface Props {
    result: { score: number; status: string; details: string };
    // imageFiles prop removed as now handled in page.tsx
    imageFiles?: File[];
}

export default function AnalysisResult({ result }: Props) {
    // Quality Logic
    const score = result.score;
    const isPremium = score >= 70;
    const isAverage = score >= 30 && score < 70;

    const colorClass = isPremium ? "text-emerald-400" : isAverage ? "text-yellow-400" : "text-red-400";
    const bgClass = isPremium ? "bg-emerald-500" : isAverage ? "bg-yellow-500" : "bg-red-500";
    const borderClass = isPremium ? "border-emerald-500" : isAverage ? "border-yellow-500" : "border-red-500";

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8"
        >
            <div className="flex flex-col gap-6">

                {/* Header Data */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-xs font-bold text-teal-500/80 uppercase tracking-widest mb-2 font-mono">Bio-Scan Result</h3>
                        <h2 className={`text-4xl font-extrabold flex items-center gap-3 ${colorClass}`}>
                            {isPremium ? <CheckCircle className="w-8 h-8" /> : isAverage ? <AlertTriangle className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
                            {result.status}
                        </h2>
                    </div>

                    <div className="text-right w-full md:w-auto p-4 rounded-xl bg-black/40 border border-white/5">
                        <div className="text-5xl font-mono font-bold text-white">{score}</div>
                        <div className="text-[10px] text-teal-400/60 uppercase tracking-widest mt-1">Quality Index</div>
                    </div>
                </div>

                {/* Quality Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-500 font-mono">
                        <span>HAZARDOUS</span>
                        <span>AVERAGE</span>
                        <span>PREMIUM</span>
                    </div>
                    <div className="h-4 w-full bg-gray-900 rounded-full overflow-hidden p-1 border border-white/5 relative">
                        {/* Zones Background (Subtle) */}
                        <div className="absolute inset-0 flex h-full w-full opacity-10 pointer-events-none">
                            <div className="w-[30%] bg-red-500 h-full" />
                            <div className="w-[40%] bg-yellow-500 h-full" />
                            <div className="w-[30%] bg-green-500 h-full" />
                        </div>

                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${score}%` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className={`h-full ${bgClass} rounded-full shadow-[0_0_15px_currentColor] relative z-10`}
                        />
                    </div>
                </div>

                {/* Details Card */}
                <div className="p-6 rounded-xl bg-black/20 border border-white/5 mt-4">
                    <h4 className="flex items-center gap-2 text-sm text-teal-300 font-bold mb-3">
                        <Info size={16} /> ANALYSIS DETAILS
                    </h4>
                    <p className="text-gray-300 leading-relaxed text-sm">
                        {result.details}
                    </p>
                </div>

            </div>
        </motion.div>
    );
}
