import * as vscode from 'vscode';
import { TimerService } from './services/timerService';
import { EditorLockService } from './services/editorLockService';
import { OverlayService } from './services/overlayService';
import { SyncService } from './services/syncService';
import { BreakTabService } from './services/breakTabService';

let timerService: TimerService;
let editorLockService: EditorLockService;
let overlayService: OverlayService;
let syncService: SyncService;
let breakTabService: BreakTabService;
let statusBarItem: vscode.StatusBarItem;
let settingsBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    console.log('Time Keeper extension is now active!');

    // Simple timer state
    let isRunning = false;
    let isBreak = false;
    let remainingTime = 0;
    let interval: NodeJS.Timeout | undefined;

    // Create status bar items with explicit priority
    statusBarItem = vscode.window.createStatusBarItem('timeKeeper.timer', vscode.StatusBarAlignment.Right, 1000);
    statusBarItem.text = '⏰ Start Timer';
    statusBarItem.command = 'timeKeeper.quickToggle';
    statusBarItem.tooltip = 'Click to start timer';
    statusBarItem.name = 'Time Keeper';
    console.log('Creating main status bar item');
    
    settingsBarItem = vscode.window.createStatusBarItem('timeKeeper.settings', vscode.StatusBarAlignment.Right, 999);
    settingsBarItem.text = '⚙️';
    settingsBarItem.command = 'timeKeeper.showMenu';
    settingsBarItem.tooltip = 'Timer Settings';
    settingsBarItem.name = 'Time Keeper Settings';
    console.log('Creating settings status bar item');

    // Force show immediately
    statusBarItem.show();
    settingsBarItem.show();
    
    console.log('Status bar items shown');
    
    context.subscriptions.push(statusBarItem, settingsBarItem);

    // Initialize services
    editorLockService = new EditorLockService();
    overlayService = new OverlayService(context);
    syncService = new SyncService(context);
    breakTabService = new BreakTabService(context);

    function startTimer() {
        if (isRunning) {
            vscode.window.showWarningMessage('Timer is already running!');
            return;
        }

        isRunning = true;
        isBreak = false;
        const config = vscode.workspace.getConfiguration('timeKeeper');
        remainingTime = config.get<number>('workDuration', 25) * 60 * 1000;

        vscode.window.showInformationMessage(`Timer started! Work for ${config.get<number>('workDuration', 25)} minutes.`);
        
        updateStatusBar();
        
        interval = setInterval(() => {
            remainingTime -= 1000;
            updateStatusBar();

            if (remainingTime <= 0) {
                if (isBreak) {
                    // Break is over
                    isRunning = false;
                    if (interval) clearInterval(interval);
                    editorLockService.unlock();
                    overlayService.hide();
                    breakTabService.hideBreakTab();
                    syncService.broadcastState('idle');
                    vscode.window.showInformationMessage('Break time is over! Ready to work?', 'Start Timer').then(selection => {
                        if (selection === 'Start Timer') {
                            startTimer();
                        }
                    });
                    settingsBarItem.show();
                } else {
                    // Work is over, start break
                    isBreak = true;
                    remainingTime = config.get<number>('breakDuration', 5) * 60 * 1000;
                    editorLockService.lock();
                    overlayService.show();
                    breakTabService.showBreakTab();
                    syncService.broadcastState('break', remainingTime / 1000);
                    vscode.window.showInformationMessage(`Time for a ${config.get<number>('breakDuration', 5)} minute break!`);
                }
                updateStatusBar();
            }
        }, 1000);

        // Update overlay and break tab timer
        setInterval(() => {
            if (isRunning) {
                const minutes = Math.floor(remainingTime / 60000);
                const seconds = Math.floor((remainingTime % 60000) / 1000);
                overlayService.updateTimer(minutes, seconds);
                if (isBreak) {
                    breakTabService.updateTimer(minutes, seconds);
                }
            }
        }, 1000);

        settingsBarItem.hide();
    }

    function stopTimer() {
        isRunning = false;
        if (interval) {
            clearInterval(interval);
            interval = undefined;
        }
        updateStatusBar();
        vscode.window.showInformationMessage('Timer stopped.');
        settingsBarItem.show();
    }

    function updateStatusBar() {
        if (!isRunning) {
            statusBarItem.text = '⏰ Start Timer';
            statusBarItem.tooltip = 'Click to start timer';
        } else {
            const minutes = Math.floor(remainingTime / 60000);
            const seconds = Math.floor((remainingTime % 60000) / 1000);
            const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            const icon = isBreak ? '☕' : '💻';
            const mode = isBreak ? 'Break' : 'Work';
            statusBarItem.text = `${icon} ${mode}: ${timeString}`;
            statusBarItem.tooltip = 'Click to stop timer';
        }
    }

    // Register commands
    const startCommand = vscode.commands.registerCommand('timeKeeper.start', () => {
        startTimer();
    });

    const stopCommand = vscode.commands.registerCommand('timeKeeper.stop', () => {
        stopTimer();
    });
    
    const quickToggleCommand = vscode.commands.registerCommand('timeKeeper.quickToggle', () => {
        if (isRunning) {
            stopTimer();
        } else {
            startTimer();
        }
    });

    const showMenuCommand = vscode.commands.registerCommand('timeKeeper.showMenu', async () => {
        const action = await vscode.window.showQuickPick([
            '⏱️ Set Work Duration',
            '☕ Set Break Duration',
            '🔄 Reset to Defaults',
            '⚙️ Open Settings'
        ], {
            placeHolder: 'Timer Settings'
        });

        if (!action) return;

        if (action.includes('Work Duration')) {
            const input = await vscode.window.showInputBox({
                prompt: 'Enter work duration in minutes',
                value: String(vscode.workspace.getConfiguration('timeKeeper').get<number>('workDuration', 25)),
                validateInput: (value) => {
                    const num = Number(value);
                    if (isNaN(num) || num <= 0) {
                        return 'Please enter a positive number';
                    }
                    return null;
                }
            });
            if (input) {
                await vscode.workspace.getConfiguration('timeKeeper').update('workDuration', Number(input), true);
                vscode.window.showInformationMessage(`Work duration set to ${input} minutes`);
            }
        } else if (action.includes('Break Duration')) {
            const input = await vscode.window.showInputBox({
                prompt: 'Enter break duration in minutes',
                value: String(vscode.workspace.getConfiguration('timeKeeper').get<number>('breakDuration', 5)),
                validateInput: (value) => {
                    const num = Number(value);
                    if (isNaN(num) || num <= 0) {
                        return 'Please enter a positive number';
                    }
                    return null;
                }
            });
            if (input) {
                await vscode.workspace.getConfiguration('timeKeeper').update('breakDuration', Number(input), true);
                vscode.window.showInformationMessage(`Break duration set to ${input} minutes`);
            }
        } else if (action.includes('Reset')) {
            await vscode.workspace.getConfiguration('timeKeeper').update('workDuration', 25, true);
            await vscode.workspace.getConfiguration('timeKeeper').update('breakDuration', 5, true);
            vscode.window.showInformationMessage('Timer settings reset to defaults');
        } else if (action.includes('Open Settings')) {
            vscode.commands.executeCommand('workbench.action.openSettings', 'timeKeeper');
        }
    });

    const emergencyUnlockCommand = vscode.commands.registerCommand('timeKeeper.emergencyUnlock', () => {
        vscode.window.showWarningMessage('Emergency unlock activated! Timer stopped.', 'OK');
        stopTimer();
        editorLockService.unlock();
        overlayService.hide();
        breakTabService.hideBreakTab();
    });

    context.subscriptions.push(startCommand, stopCommand, quickToggleCommand, showMenuCommand, emergencyUnlockCommand);

    // Listen for sync events from other windows
    syncService.onStateChange((state) => {
        if (state === 'break') {
            editorLockService.lock();
            overlayService.show();
            breakTabService.showBreakTab();
        } else if (state === 'work') {
            editorLockService.unlock();
            overlayService.hide();
            breakTabService.hideBreakTab();
        }
    });
}

export function deactivate() {
    if (editorLockService) {
        editorLockService.unlock();
    }
    if (overlayService) {
        overlayService.hide();
    }
    if (breakTabService) {
        breakTabService.hideBreakTab();
    }
    if (syncService) {
        syncService.dispose();
    }
}