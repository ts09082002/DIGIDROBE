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
    const start = `${month}-01`;
    const end = `${month}-31`;

    const snapshot = await this.collection
      .where('userId', '==', userId)
      .where('date', '>=', start)
      .where('date', '<=', end)
      .get();

    return snapshot.docs
      .map((doc) => this.docToOOTD(doc.id, doc.data()))
      .filter((i): i is OOTD => i !== null)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async saveOOTD(
    date: string,
    itemIds: string[],
    userId: string,
    aiStyled?: boolean,
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
      });
      const updatedSnapshot = await this.collection.doc(docId).get();
      return this.docToOOTD(docId, updatedSnapshot.data())!;
    }

    const doc = await this.collection.add({
      userId,
      date,
      outfitItems: itemIds,
      aiStyled: !!aiStyled,
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
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);
    const isoThreshold = thresholdDate.toISOString().split('T')[0];

    const snapshot = await this.collection
      .where('userId', '==', userId)
      .where('date', '>=', isoThreshold)
      .get();
    const outfits = snapshot.docs.map(
      (doc) => this.docToOOTD(doc.id, doc.data())!,
    );

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
}
