import * as vscode from 'vscode';
import * as path from 'path';

export class OverlayService {
    private panel?: vscode.WebviewPanel;
    private timerUpdateInterval?: NodeJS.Timeout;

    constructor(private context: vscode.ExtensionContext) {}

    public show(): void {
        if (this.panel) {
            this.panel.reveal();
            return;
        }

        // Create webview panel that covers the entire editor
        this.panel = vscode.window.createWebviewPanel(
            'timeKeeperOverlay',
            'Break Time',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        // Make it cover all columns
        this.panel.webview.html = this.getWebviewContent();

        // Handle panel disposal
        this.panel.onDidDispose(() => {
            this.panel = undefined;
            if (this.timerUpdateInterval) {
                clearInterval(this.timerUpdateInterval);
                this.timerUpdateInterval = undefined;
            }
        });

        // Update timer display every second
        this.startTimerUpdate();
    }

    public hide(): void {
        if (this.panel) {
            this.panel.dispose();
            this.panel = undefined;
        }
        if (this.timerUpdateInterval) {
            clearInterval(this.timerUpdateInterval);
            this.timerUpdateInterval = undefined;
        }
    }

    public updateTimer(minutes: number, seconds: number): void {
        if (this.panel) {
            this.panel.webview.postMessage({
                command: 'updateTimer',
                minutes,
                seconds
            });
        }
    }

    private startTimerUpdate(): void {
        // This will be connected to the timer service in the main extension
        this.timerUpdateInterval = setInterval(() => {
            // Timer updates will be sent from the extension
        }, 1000);
    }

    private getWebviewContent(): string {
        const config = vscode.workspace.getConfiguration('timeKeeper');
        const opacity = config.get<number>('overlayOpacity', 0.95);

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Break Time</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    width: 100vw;
                    height: 100vh;
                    background-color: rgba(0, 0, 0, ${opacity});
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    color: white;
                    user-select: none;
                    overflow: hidden;
                }

                .container {
                    text-align: center;
                    animation: fadeIn 0.5s ease-in;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .icon {
                    font-size: 120px;
                    margin-bottom: 30px;
                    animation: pulse 2s ease-in-out infinite;
                }

                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }

                h1 {
                    font-size: 48px;
                    font-weight: 300;
                    margin-bottom: 20px;
                    letter-spacing: 2px;
                }

                .timer {
                    font-size: 72px;
                    font-weight: 200;
                    margin-bottom: 40px;
                    font-variant-numeric: tabular-nums;
                }

                .message {
                    font-size: 24px;
                    font-weight: 300;
                    opacity: 0.8;
                    margin-bottom: 60px;
                    line-height: 1.5;
                }

                .tip {
                    font-size: 18px;
                    opacity: 0.6;
                    font-style: italic;
                    max-width: 600px;
                    line-height: 1.4;
                }

                .emergency {
                    position: absolute;
                    bottom: 40px;
                    font-size: 14px;
                    opacity: 0.4;
                    transition: opacity 0.3s;
                }

                .emergency:hover {
                    opacity: 0.8;
                }

                .progress-ring {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 400px;
                    height: 400px;
                    z-index: -1;
                }

                .progress-ring circle {
                    fill: none;
                    stroke: rgba(255, 255, 255, 0.1);
                    stroke-width: 2;
                }

                .progress-ring .progress {
                    fill: none;
                    stroke: rgba(255, 255, 255, 0.3);
                    stroke-width: 2;
                    stroke-linecap: round;
                    transform: rotate(-90deg);
                    transform-origin: center;
                    transition: stroke-dashoffset 1s linear;
                }
            </style>
        </head>
        <body>
            <svg class="progress-ring">
                <circle cx="200" cy="200" r="190"/>
                <circle class="progress" cx="200" cy="200" r="190" 
                    stroke-dasharray="1193.8" 
                    stroke-dashoffset="1193.8"/>
            </svg>
            
            <div class="container">
                <div class="icon">☕</div>
                <h1>Break Time!</h1>
                <div class="timer" id="timer">05:00</div>
                <div class="message">
                    Time to rest your eyes and stretch.<br>
                    Step away from your screen.
                </div>
                <div class="tip" id="tip">
                    💡 Tip: Look at something 20 feet away for 20 seconds to reduce eye strain.
                </div>
            </div>
            
            <div class="emergency">
                Press Cmd+Shift+P and type "Emergency Unlock" if needed
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                const tips = [
                    "💡 Tip: Look at something 20 feet away for 20 seconds to reduce eye strain.",
                    "💪 Tip: Do some quick stretches - roll your shoulders and neck.",
                    "💧 Tip: Stay hydrated! Get a glass of water.",
                    "🚶 Tip: Take a short walk to improve circulation.",
                    "🧘 Tip: Try some deep breathing exercises to relax.",
                    "👀 Tip: Blink frequently to keep your eyes moist.",
                    "🪟 Tip: Look out the window and let natural light in."
                ];

                let currentTip = 0;
                const tipElement = document.getElementById('tip');
                
                // Rotate tips every 10 seconds
                setInterval(() => {
                    currentTip = (currentTip + 1) % tips.length;
                    tipElement.style.opacity = '0';
                    setTimeout(() => {
                        tipElement.textContent = tips[currentTip];
                        tipElement.style.opacity = '0.6';
                    }, 300);
                }, 10000);

                // Handle timer updates from extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.command === 'updateTimer') {
                        const timerElement = document.getElementById('timer');
                        const minutes = String(message.minutes).padStart(2, '0');
                        const seconds = String(message.seconds).padStart(2, '0');
                        timerElement.textContent = minutes + ':' + seconds;
                        
                        // Update progress ring
                        const progress = document.querySelector('.progress');
                        const totalSeconds = 5 * 60; // 5 minutes default
                        const remainingSeconds = message.minutes * 60 + message.seconds;
                        const percentage = remainingSeconds / totalSeconds;
                        const offset = 1193.8 * (1 - percentage);
                        progress.style.strokeDashoffset = offset;
                    }
                });
            </script>
        </body>
        </html>`;
    }

    public isVisible(): boolean {
        return this.panel !== undefined;
    }
}