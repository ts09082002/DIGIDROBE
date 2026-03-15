import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { getFirebaseAdmin } from '../firebase-admin';
import { v4 as uuid } from 'uuid';

export class OOTD {
  id: string;
  userId: string;
  date: string; // ISO YYYY-MM-DD
  outfitItems: string[]; // array of wardrobeItem IDs
  aiStyled?: boolean;
  notes?: string;
  rating?: number;
  createdAt: string;
}

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);
  private readonly collection = getFirebaseAdmin()
    .firestore()
    .collection('outfits_calendar');

  private docToOOTD(
    id: string,
    data: FirebaseFirestore.DocumentData | undefined,
  ): OOTD | null {
    if (!data) return null;
    return {
      id,
      userId: data.userId ?? '',
      date: data.date ?? '',
      outfitItems: data.outfitItems ?? [],
      aiStyled: data.aiStyled ?? false,
      notes: data.notes ?? '',
      rating: data.rating ?? undefined,
      createdAt: data.createdAt ?? new Date().toISOString(),
    };
  }

  async getByMonth(month: string, userId: string): Promise<OOTD[]> {
    if (!userId) {
      this.logger.warn('getByMonth: userId is missing');
      return [];
    }
    const start = `${month}-01`;
    const end = `${month}-31`;

    try {
      const snapshot = await this.collection
        .where('userId', '==', userId)
        .where('date', '>=', start)
        .where('date', '<=', end)
        .get();

      return snapshot.docs
        .map((doc) => this.docToOOTD(doc.id, doc.data()))
        .filter((i): i is OOTD => i !== null)
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      this.logger.error(`Error fetching by month: ${error.message}. Potential index needed: https://console.firebase.google.com/v1/r/project/digidrobe-backend/firestore/indexes?create_composite=Clpwcm9qZWN0cy9kaWdpZHJvYmUtYmFja2VuZC9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvb3V0Zml0c19jYWxlbmRhci9pbmRleGVzL18QARoKCgZ1c2VySWQQARoICgRkYXRlEAEaDAoIX19uYW1lX18QAQ`);
      throw error;
    }
  }

  async saveOOTD(
    date: string,
    itemIds: string[],
    userId: string,
    aiStyled?: boolean,
    notes?: string,
  ): Promise<OOTD> {
    const existing = await this.collection
      .where('userId', '==', userId)
      .where('date', '==', date)
      .get();

    if (!existing.empty) {
      const docId = existing.docs[0].id;
      await existing.docs[0].ref.update({
        outfitItems: itemIds,
        aiStyled: !!aiStyled,
        notes: notes || '',
      });
      const updatedSnapshot = await this.collection.doc(docId).get();
      return this.docToOOTD(docId, updatedSnapshot.data())!;
    }

    const doc = await this.collection.add({
      userId,
      date,
      outfitItems: itemIds,
      aiStyled: !!aiStyled,
      notes: notes || '',
      createdAt: new Date().toISOString(),
    });
    const newSnapshot = await doc.get();
    return this.docToOOTD(doc.id, newSnapshot.data())!;
  }

  async getStats(
    days: number,
    userId: string,
  ): Promise<{
    totalOutfits: number;
    mostWorn: any[];
    leastWorn: any[];
    aiStyledCount: number;
  }> {
    if (!userId) {
      this.logger.warn('getStats: userId is missing');
      return { totalOutfits: 0, mostWorn: [], leastWorn: [], aiStyledCount: 0 };
    }
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);
    const isoThreshold = thresholdDate.toISOString().split('T')[0];

    let outfits: OOTD[] = [];
    try {
      const snapshot = await this.collection
        .where('userId', '==', userId)
        .where('date', '>=', isoThreshold)
        .get();
      outfits = snapshot.docs.map((doc) => this.docToOOTD(doc.id, doc.data())!);
    } catch (error) {
      this.logger.error(`Error fetching stats: ${error.message}`);
    }

    const counts: Record<string, number> = {};
    let aiStyledCount = 0;
    outfits.forEach((o) => {
      if (o.aiStyled) aiStyledCount++;
      (o.outfitItems || []).forEach((id) => {
        counts[id] = (counts[id] || 0) + 1;
      });
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const mostWorn = sorted.slice(0, 20).map(([id, count]) => ({ id, count }));
    const leastWorn = [...sorted]
      .reverse()
      .slice(0, 20)
      .map(([id, count]) => ({ id, count }));

    return {
      totalOutfits: outfits.length,
      mostWorn,
      leastWorn,
      aiStyledCount,
    };
  }
  async claimGuestItems(userId: string): Promise<number> {
    if (!userId || userId === 'anonymous' || userId === 'undefined') return 0;

    const allSnapshot = await this.collection.get();
    const orphanedDocs = allSnapshot.docs.filter(doc => {
      const d = doc.data();
      return !d.userId || d.userId === 'anonymous' || d.userId === 'undefined';
    });

    if (orphanedDocs.length === 0) return 0;

    const batch = getFirebaseAdmin().firestore().batch();
    orphanedDocs.forEach((doc) => {
      batch.update(doc.ref, {
        userId,
      });
    });

    await batch.commit();
    this.logger.log(`Claimed ${orphanedDocs.length} orphaned calendar outfits for user ${userId}`);
    return orphanedDocs.length;
  }
}
