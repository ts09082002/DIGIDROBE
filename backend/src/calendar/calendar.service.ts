import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { getFirebaseAdmin } from '../firebase-admin';
import { v4 as uuid } from 'uuid';

export interface OOTD {
  id: string;
  date: string; // YYYY-MM-DD
  itemIds: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface WardrobeStats {
  mostWorn: { itemId: string; count: number }[];
  leastWorn: { itemId: string; count: number }[];
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
      date: data.date ?? new Date().toISOString().split('T')[0],
      itemIds: data.itemIds ?? [],
      notes: data.notes ?? '',
      createdAt: data.createdAt ?? new Date().toISOString(),
      updatedAt: data.updatedAt ?? new Date().toISOString(),
    };
  }

  async getOOTDByMonth(year: number, month: number): Promise<OOTD[]> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    const snapshot = await this.collection
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .get();

    return snapshot.docs
      .map((doc) => this.docToOOTD(doc.id, doc.data()))
      .filter((i): i is OOTD => i !== null)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async saveOOTD(
    date: string,
    itemIds: string[],
    notes: string = '',
  ): Promise<OOTD> {
    // Find existing OOTD for this date, or create new
    const snapshot = await this.collection
      .where('date', '==', date)
      .limit(1)
      .get();

    let id = uuid();
    let createdAt = new Date().toISOString();

    if (!snapshot.empty) {
      id = snapshot.docs[0].id;
      createdAt = snapshot.docs[0].data().createdAt || createdAt;
    }

    const updatedAt = new Date().toISOString();
    const item: OOTD = {
      id,
      date,
      itemIds,
      notes,
      createdAt,
      updatedAt,
    };

    await this.collection.doc(id).set(item);
    return item;
  }

  async getStats(days: number = 30): Promise<WardrobeStats> {
    // Calculate the date X days ago
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);
    const dateString = dateLimit.toISOString().split('T')[0];

    const snapshot = await this.collection
      .where('date', '>=', dateString)
      .get();

    const itemCounts: Record<string, number> = {};

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const items = data.itemIds || [];
      items.forEach((itemId: string) => {
        itemCounts[itemId] = (itemCounts[itemId] || 0) + 1;
      });
    });

    // Convert to array and sort
    const sortedItems = Object.entries(itemCounts)
      .map(([itemId, count]) => ({ itemId, count }))
      .sort((a, b) => b.count - a.count);

    return {
      mostWorn: sortedItems.slice(0, 5),
      leastWorn: sortedItems.slice().reverse().slice(0, 5), // Note: this only shows items worn AT LEAST once. Items worn 0 times wouldn't appear here (need full wardrobe list to compare). We will just return the bottom 5 of worn items for now.
    };
  }
}
