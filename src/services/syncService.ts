import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface SyncState {
    state: 'work' | 'break' | 'idle';
    timestamp: number;
    windowId: string;
    remainingTime: number;
}

export class SyncService {
    private syncFilePath: string;
    private windowId: string;
    private watcher?: fs.FSWatcher;
    private stateChangeEmitter = new vscode.EventEmitter<string>();
    
    public readonly onStateChange = this.stateChangeEmitter.event;

    constructor(private context: vscode.ExtensionContext) {
        // Use a temp directory for sync file
        const tmpDir = os.tmpdir();
        this.syncFilePath = path.join(tmpDir, 'vscode-time-keeper-sync.json');
        this.windowId = `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        this.initializeSync();
    }

    private initializeSync(): void {
        // Create sync file if it doesn't exist
        if (!fs.existsSync(this.syncFilePath)) {
            this.writeSyncState({
                state: 'idle',
                timestamp: Date.now(),
                windowId: this.windowId,
                remainingTime: 0
            });
        }

        // Watch for changes
        this.watcher = fs.watch(this.syncFilePath, (eventType) => {
            if (eventType === 'change') {
                this.handleSyncFileChange();
            }
        });

        // Clean up old states on startup
        this.cleanupOldStates();
    }

    private handleSyncFileChange(): void {
        try {
            const content = fs.readFileSync(this.syncFilePath, 'utf8');
            const states: SyncState[] = JSON.parse(content);
            
            // Find the most recent state from another window
            const otherWindowStates = states
                .filter(s => s.windowId !== this.windowId)
                .sort((a, b) => b.timestamp - a.timestamp);
            
            if (otherWindowStates.length > 0) {
                const latestState = otherWindowStates[0];
                
                // Only react to recent changes (within last 5 seconds)
                if (Date.now() - latestState.timestamp < 5000) {
                    this.stateChangeEmitter.fire(latestState.state);
                }
            }
        } catch (error) {
            console.error('Error reading sync file:', error);
        }
    }

    public broadcastState(state: 'work' | 'break' | 'idle', remainingTime: number = 0): void {
        try {
            let states: SyncState[] = [];
            
            // Read existing states
            if (fs.existsSync(this.syncFilePath)) {
                const content = fs.readFileSync(this.syncFilePath, 'utf8');
                states = JSON.parse(content);
            }
            
            // Remove old state for this window
            states = states.filter(s => s.windowId !== this.windowId);
            
            // Add new state
            states.push({
                state,
                timestamp: Date.now(),
                windowId: this.windowId,
                remainingTime
            });
            
            // Keep only recent states (last 30 seconds)
            const cutoffTime = Date.now() - 30000;
            states = states.filter(s => s.timestamp > cutoffTime);
            
            // Write back
            this.writeSyncState(states);
        } catch (error) {
            console.error('Error broadcasting state:', error);
        }
    }

    private writeSyncState(state: SyncState | SyncState[]): void {
        try {
            const states = Array.isArray(state) ? state : [state];
            fs.writeFileSync(this.syncFilePath, JSON.stringify(states, null, 2));
        } catch (error) {
            console.error('Error writing sync file:', error);
        }
    }

    private cleanupOldStates(): void {
        try {
            if (fs.existsSync(this.syncFilePath)) {
                const content = fs.readFileSync(this.syncFilePath, 'utf8');
                let states: SyncState[] = JSON.parse(content);
                
                // Keep only states from last 30 seconds
                const cutoffTime = Date.now() - 30000;
                states = states.filter(s => s.timestamp > cutoffTime);
                
                this.writeSyncState(states);
            }
        } catch (error) {
            console.error('Error cleaning up old states:', error);
        }
    }

    public dispose(): void {
        if (this.watcher) {
            this.watcher.close();
        }
        
        // Remove this window's state on dispose
        try {
            if (fs.existsSync(this.syncFilePath)) {
                const content = fs.readFileSync(this.syncFilePath, 'utf8');
                let states: SyncState[] = JSON.parse(content);
                states = states.filter(s => s.windowId !== this.windowId);
                this.writeSyncState(states);
            }
        } catch (error) {
            console.error('Error removing window state:', error);
        }
    }
}