export default function LoadingSpinner() {
    return (
        <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full" />
            <div className="absolute inset-0 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
    );
}
