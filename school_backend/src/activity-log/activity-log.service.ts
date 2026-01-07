import { Injectable, Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';

export interface ActivityLogEntry {
    id?: string;
    type: 'student' | 'teacher' | 'class' | 'homework' | 'quiz' | 'subject' | 'course' | 'submission' | 'quiz-result';
    action: 'created' | 'updated' | 'deleted';
    entityId: string;
    entityName: string;
    details?: string;
    performedBy?: string;
    createdAt?: any;
}

@Injectable()
export class ActivityLogService {
    private db: admin.firestore.Firestore;

    constructor(@Inject('FIREBASE_ADMIN') private firebaseAdmin: typeof admin) {
        this.db = firebaseAdmin.firestore();
    }

    async logActivity(entry: Omit<ActivityLogEntry, 'id' | 'createdAt'>): Promise<void> {
        try {
            const activityData = {
                ...entry,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            await this.db.collection('activity_logs').add(activityData);
            console.log(`[ACTIVITY LOG] ${entry.action} ${entry.type}: ${entry.entityName}`);
        } catch (error) {
            console.error('[ACTIVITY LOG] Failed to log activity:', error);
        }
    }

    async getRecentActivities(limit: number = 50): Promise<ActivityLogEntry[]> {
        try {
            const snapshot = await this.db
                .collection('activity_logs')
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as ActivityLogEntry[];
        } catch (error) {
            console.error('[ACTIVITY LOG] Failed to fetch activities:', error);
            return [];
        }
    }

    async getActivitiesByType(type: string, limit: number = 20): Promise<ActivityLogEntry[]> {
        try {
            const snapshot = await this.db
                .collection('activity_logs')
                .where('type', '==', type)
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as ActivityLogEntry[];
        } catch (error) {
            console.error('[ACTIVITY LOG] Failed to fetch activities by type:', error);
            return [];
        }
    }

    async getActivitiesByAction(action: 'created' | 'updated' | 'deleted', limit: number = 20): Promise<ActivityLogEntry[]> {
        try {
            const snapshot = await this.db
                .collection('activity_logs')
                .where('action', '==', action)
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as ActivityLogEntry[];
        } catch (error) {
            console.error('[ACTIVITY LOG] Failed to fetch activities by action:', error);
            return [];
        }
    }
}
