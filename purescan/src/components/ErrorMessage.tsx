import { AlertCircle } from "lucide-react";

export default function ErrorMessage({ message }: { message: string }) {
    return (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/50 text-red-200">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{message}</p>
        </div>
    );
}
