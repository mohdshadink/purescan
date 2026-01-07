'use server';

import { db, seed } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function saveScan(data: {
  foodName: string;
  score: number;
  analysis: string;
  imageUrl: string;
}) {
  try {
    // No authentication - skip database save
    console.log('Anonymous upload: Skipping DB save (No authentication)');
    return { success: false, reason: 'anonymous' };
  } catch (error) {
    console.error('Failed to save scan (Non-fatal):', error);
    return { success: false, error: 'db_error' };
  }
}
