'use server';

import { db, seed } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

export async function saveScan(data: {
  foodName: string;
  score: number;
  analysis: string;
  imageUrl: string;
}) {
  try {
    // Optimistic Auth Check: Don't block hard if auth is slow/flaky on mobile
    // Use a race condition or just basic await but catch 'unauthorized' gracefully
    const session = await auth();
    const userId = session?.userId;

    // Fail-open: If no user, we just skip saving (don't error out the analysis)
    if (!userId) {
      console.log('Mobile/Anon upload: Skipping DB save (No User ID)');
      return { success: false, reason: 'anonymous' };
    }

    // Ensure table exists (idempotent, fast)
    await seed();

    await db.sql`
      INSERT INTO scans (userId, foodName, score, analysis, imageUrl)
      VALUES (${userId}, ${data.foodName}, ${data.score}, ${data.analysis}, ${data.imageUrl})
    `;

    revalidatePath('/history');
    return { success: true };
  } catch (error) {
    console.error('Failed to save scan (Non-fatal):', error);
    // Return success: false but don't throw, preserving the UI analysis result
    return { success: false, error: 'db_error' };
  }
}
