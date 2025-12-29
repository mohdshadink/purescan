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
  const { userId } = await auth();

  if (!userId) {
    return { error: 'Unauthorized' };
  }

  try {
    // Ensure table exists
    await seed();

    await db.sql`
      INSERT INTO scans (userId, foodName, score, analysis, imageUrl)
      VALUES (${userId}, ${data.foodName}, ${data.score}, ${data.analysis}, ${data.imageUrl})
    `;

    revalidatePath('/history');
    return { success: true };
  } catch (error) {
    console.error('Failed to save scan:', error);
    return { error: 'Failed to save scan' };
  }
}
