import * as vscode from 'vscode';
import { StatusBarService } from './statusBarService';

export class TimerService {
    private workDuration: number;
    private breakDuration: number;
    private currentTimer?: NodeJS.Timeout;
    private remainingTime: number = 0;
    private isRunning: boolean = false;
    private isBreakTime: boolean = false;
    private statusBarService: StatusBarService;
    private countdownTimer?: NodeJS.Timeout;

    private workCompleteEmitter = new vscode.EventEmitter<void>();
    private breakCompleteEmitter = new vscode.EventEmitter<void>();
    
    public readonly onWorkComplete = this.workCompleteEmitter.event;
    public readonly onBreakComplete = this.breakCompleteEmitter.event;

    constructor(private context: vscode.ExtensionContext) {
        console.log('TimerService: Initializing');
        const config = vscode.workspace.getConfiguration('timeKeeper');
        this.workDuration = config.get<number>('workDuration', 25) * 60 * 1000; // Convert to milliseconds
        this.breakDuration = config.get<number>('breakDuration', 5) * 60 * 1000;

        // Create status bar service
        this.statusBarService = new StatusBarService(context);
        console.log('TimerService: StatusBarService created');

        // Listen for configuration changes
        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('timeKeeper')) {
                    const config = vscode.workspace.getConfiguration('timeKeeper');
                    this.workDuration = config.get<number>('workDuration', 25) * 60 * 1000;
                    this.breakDuration = config.get<number>('breakDuration', 5) * 60 * 1000;
                }
            })
        );
    }

    public start(): void {
        if (this.isRunning) {
            vscode.window.showWarningMessage('Timer is already running!');
            return;
        }

        this.isRunning = true;
        this.isBreakTime = false;
        this.remainingTime = this.workDuration;
        
        vscode.window.showInformationMessage(`Timer started! Work for ${this.workDuration / 60000} minutes.`);
        
        this.startCountdown();
        this.updateStatusBar();
    }

    public stop(): void {
        this.isRunning = false;
        
        if (this.currentTimer) {
            clearTimeout(this.currentTimer);
            this.currentTimer = undefined;
        }
        
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = undefined;
        }
        
        this.updateStatusBar();
        vscode.window.showInformationMessage('Timer stopped.');
    }
    
    public toggle(): void {
        if (this.isRunning) {
            this.stop();
        } else {
            this.start();
        }
    }

    private startCountdown(): void {
        // Update every second
        this.countdownTimer = setInterval(() => {
            this.remainingTime -= 1000;
            this.updateStatusBar();

            if (this.remainingTime <= 0) {
                this.onTimerComplete();
            }
        }, 1000);
    }

    private onTimerComplete(): void {
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = undefined;
        }

        if (this.isBreakTime) {
            // Break time is over
            this.isRunning = false;
            this.breakCompleteEmitter.fire();
            vscode.window.showInformationMessage('Break time is over!');
            this.updateStatusBar();
        } else {
            // Work time is over, start break
            this.isBreakTime = true;
            this.remainingTime = this.breakDuration;
            this.workCompleteEmitter.fire();
            vscode.window.showInformationMessage(`Time for a ${this.breakDuration / 60000} minute break!`);
            this.startCountdown();
        }
    }

    private updateStatusBar(): void {
        if (!this.isRunning) {
            this.statusBarService.updateTimer(
                `⏰ Start Timer`,
                'Click to start timer',
                false
            );
            return;
        }

        const minutes = Math.floor(this.remainingTime / 60000);
        const seconds = Math.floor((this.remainingTime % 60000) / 1000);
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const icon = this.isBreakTime ? '☕' : '💻';
        const mode = this.isBreakTime ? 'Break' : 'Work';
        
        this.statusBarService.updateTimer(
            `${icon} ${mode}: ${timeString}`,
            'Click to stop timer',
            true
        );
    }

    public getRemainingTime(): { minutes: number; seconds: number; isBreak: boolean } {
        const minutes = Math.floor(this.remainingTime / 60000);
        const seconds = Math.floor((this.remainingTime % 60000) / 1000);
        return { minutes, seconds, isBreak: this.isBreakTime };
    }

    public isActive(): boolean {
        return this.isRunning;
    }
    
    public initialize(): void {
        // Show initial state
        this.updateStatusBar();
    }
}