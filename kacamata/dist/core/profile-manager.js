"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const electron_1 = require("electron");
class ProfileManager {
    constructor() {
        const userDataPath = electron_1.app.getPath('userData');
        this.dataPath = path.join(userDataPath, 'clarity-data.json');
        this.data = this.loadData();
    }
    loadData() {
        try {
            if (fs.existsSync(this.dataPath)) {
                const fileContent = fs.readFileSync(this.dataPath, 'utf-8');
                return JSON.parse(fileContent);
            }
        }
        catch (error) {
            console.error('Error loading data:', error);
        }
        return { profiles: [], telemetry: [] };
    }
    saveData() {
        try {
            fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2), 'utf-8');
        }
        catch (error) {
            console.error('Error saving data:', error);
        }
    }
    listProfiles() {
        return [...this.data.profiles].sort((a, b) => b.updated_at - a.updated_at);
    }
    getProfile(id) {
        return this.data.profiles.find((p) => p.id === id) || null;
    }
    saveProfile(profile) {
        const now = Date.now();
        const existingIndex = this.data.profiles.findIndex((p) => p.id === profile.id);
        const updatedProfile = {
            ...profile,
            created_at: profile.created_at || now,
            updated_at: now,
        };
        if (existingIndex >= 0) {
            this.data.profiles[existingIndex] = updatedProfile;
        }
        else {
            this.data.profiles.push(updatedProfile);
        }
        this.saveData();
        return updatedProfile;
    }
    deleteProfile(id) {
        const index = this.data.profiles.findIndex((p) => p.id === id);
        if (index >= 0) {
            this.data.profiles.splice(index, 1);
            this.saveData();
            return true;
        }
        return false;
    }
    addTelemetry(telemetry) {
        this.data.telemetry.push(telemetry);
        // Keep only last 1000 entries to prevent file from growing too large
        if (this.data.telemetry.length > 1000) {
            this.data.telemetry = this.data.telemetry.slice(-1000);
        }
        this.saveData();
    }
    close() {
        // No-op for JSON storage
    }
}
exports.ProfileManager = ProfileManager;
