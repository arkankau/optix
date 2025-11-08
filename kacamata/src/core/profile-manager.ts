import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { Profile, Telemetry } from '../types';

interface StorageData {
  profiles: Profile[];
  telemetry: Telemetry[];
}

export class ProfileManager {
  private dataPath: string;
  private data: StorageData;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.dataPath = path.join(userDataPath, 'clarity-data.json');
    this.data = this.loadData();
  }

  private loadData(): StorageData {
    try {
      if (fs.existsSync(this.dataPath)) {
        const fileContent = fs.readFileSync(this.dataPath, 'utf-8');
        return JSON.parse(fileContent);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    return { profiles: [], telemetry: [] };
  }

  private saveData(): void {
    try {
      fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  listProfiles(): Profile[] {
    return [...this.data.profiles].sort((a, b) => b.updated_at - a.updated_at);
  }

  getProfile(id: string): Profile | null {
    return this.data.profiles.find((p) => p.id === id) || null;
  }

  saveProfile(profile: Profile): Profile {
    const now = Date.now();
    const existingIndex = this.data.profiles.findIndex((p) => p.id === profile.id);

    const updatedProfile: Profile = {
      ...profile,
      created_at: profile.created_at || now,
      updated_at: now,
    };

    if (existingIndex >= 0) {
      this.data.profiles[existingIndex] = updatedProfile;
    } else {
      this.data.profiles.push(updatedProfile);
    }

    this.saveData();
    return updatedProfile;
  }

  deleteProfile(id: string): boolean {
    const index = this.data.profiles.findIndex((p) => p.id === id);
    if (index >= 0) {
      this.data.profiles.splice(index, 1);
      this.saveData();
      return true;
    }
    return false;
  }

  addTelemetry(telemetry: Telemetry): void {
    this.data.telemetry.push(telemetry);
    // Keep only last 1000 entries to prevent file from growing too large
    if (this.data.telemetry.length > 1000) {
      this.data.telemetry = this.data.telemetry.slice(-1000);
    }
    this.saveData();
  }

  close(): void {
    // No-op for JSON storage
  }
}

