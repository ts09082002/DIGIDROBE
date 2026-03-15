import { Injectable, Logger } from '@nestjs/common';
import { getFirebaseAdmin } from '../firebase-admin';
import { v4 as uuid } from 'uuid';

export type NotificationType = 'daily_outfit' | 'upload';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  metadata?: {
    outfitItemIds?: string[];
    quote?: string;
  };
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly collection = getFirebaseAdmin()
    .firestore()
    .collection('notifications');

  async create(input: Omit<Notification, 'id' | 'createdAt' | 'read'> & {
    read?: boolean;
  }): Promise<Notification> {
    const id = uuid();
    const now = new Date().toISOString();

    const doc: Notification = {
      id,
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      createdAt: now,
      read: input.read ?? false,
      metadata: input.metadata,
    };

    await this.collection.doc(id).set(doc);
    this.logger.debug(`Created notification ${id} for user ${input.userId}`);
    return doc;
  }

  async findForUser(userId: string): Promise<Notification[]> {
    if (!userId || userId === 'undefined') {
      this.logger.warn('findForUser: userId is missing or invalid');
      return [];
    }

    const snapshot = await this.collection
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    return snapshot.docs.map((d) => d.data() as Notification);
  }

  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
    this.logger.debug(`Deleted notification ${id}`);
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
    this.logger.log(`Claimed ${orphanedDocs.length} orphaned notifications for user ${userId}`);
    return orphanedDocs.length;
  }
}

