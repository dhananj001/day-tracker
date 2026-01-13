// ============================================
// APPWRITE CLIENT + SERVER SDK SETUP
// ============================================

import { Client, Account, Databases, ID, Query } from "appwrite";

// Environment variables
export const APPWRITE_CONFIG = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!,
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!,
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
  activitiesCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_ACTIVITIES_COLLECTION_ID!,
  sessionsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_SESSIONS_COLLECTION_ID!,
  globalTimerCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_GLOBAL_TIMER_COLLECTION_ID!,
  devicesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION_ID!,
};

// Client-side Appwrite client (singleton)
let client: Client | null = null;
let account: Account | null = null;
let databases: Databases | null = null;

export function getClient(): Client {
  if (!client) {
    client = new Client()
      .setEndpoint(APPWRITE_CONFIG.endpoint)
      .setProject(APPWRITE_CONFIG.projectId);
  }
  return client;
}

export function getAccount(): Account {
  if (!account) {
    account = new Account(getClient());
  }
  return account;
}

export function getDatabases(): Databases {
  if (!databases) {
    databases = new Databases(getClient());
  }
  return databases;
}

// Re-export utilities
export { ID, Query };

// Type for Appwrite document
export interface AppwriteDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  $databaseId: string;
  $collectionId: string;
}
