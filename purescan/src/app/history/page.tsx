export const dynamic = "force-dynamic";

export default async function HistoryPage() {
    return (
        <div className="min-h-screen p-8 font-[family-name:var(--font-geist-sans)] transition-colors duration-500 flex items-center justify-center">
            <div className="text-center max-w-md">
                <h1 className="text-3xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)]">
                    History Unavailable
                </h1>
                <p className="text-[var(--foreground)] opacity-60 mb-6">
                    Scan history requires authentication, which has been disabled for this version.
                </p>
                <a
                    href="/"
                    className="inline-block px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                    Back to Scanner
                </a>
            </div>
        </div>
    );
}
