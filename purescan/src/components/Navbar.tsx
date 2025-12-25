import { ShieldCheck } from "lucide-react";

export default function Navbar() {
    return (
        <nav className="w-full p-6 flex items-center justify-between relative z-20">
            <div className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-500 blur-lg opacity-50 group-hover:opacity-100 transition-opacity" />
                    <ShieldCheck className="w-8 h-8 text-cyan-400 relative z-10" />
                </div>
                <span className="text-xl font-bold tracking-wider text-white">
                    Pure<span className="text-cyan-400">Scan</span>
                </span>
            </div>
        </nav>
    );
}
