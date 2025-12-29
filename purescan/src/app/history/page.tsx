import { db, seed } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
    const { userId } = await auth();

    if (!userId) {
        redirect("/");
    }

    // Ensure table exists to prevent crash on first load
    await seed();

    interface Scan {
        id: number;
        userid: string;
        foodname: string;
        score: number;
        analysis: string;
        imageurl: string;
        createdat: Date;
    }

    let rows: Scan[] = [];
    try {
        const result = await db.sql<Scan>`
      SELECT * FROM scans 
      WHERE userId = ${userId} 
      ORDER BY createdAt DESC
    `;
        rows = result.rows;
    } catch (error) {
        // If table doesn't exist yet, we just show empty history
        console.error("Error fetching history:", error);
    }

    return (
        <div className="min-h-screen p-8 font-[family-name:var(--font-geist-sans)] transition-colors duration-500">
            <h1 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)]">
                Scan History
            </h1>

            {rows.length === 0 ? (
                <p className="text-[var(--foreground)] opacity-60">No scans found. Start analyzing your food!</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rows.map((scan) => (
                        <div
                            key={scan.id}
                            className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300"
                        >
                            <div className="relative h-48 w-full">
                                <Image
                                    src={scan.imageurl} // Postgres usually returns lowercase keys
                                    alt={scan.foodname}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h2 className="text-xl font-semibold text-[var(--foreground)]">{scan.foodname}</h2>
                                    <span
                                        className={`px-2 py-1 rounded text-xs font-bold ${scan.score > 70
                                            ? "bg-green-500/20 text-green-500"
                                            : scan.score > 40
                                                ? "bg-yellow-500/20 text-yellow-500"
                                                : "bg-red-500/20 text-red-500"
                                            }`}
                                    >
                                        {scan.score}/100
                                    </span>
                                </div>
                                <p className="text-sm text-[var(--foreground)] opacity-70 line-clamp-3">
                                    {scan.analysis}
                                </p>
                                <div className="mt-4 text-xs text-[var(--foreground)] opacity-50">
                                    {new Date(scan.createdat).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
