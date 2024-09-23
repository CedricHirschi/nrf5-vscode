import * as vscode from 'vscode';
import * as current from './extension';

export var writeEmitter: vscode.EventEmitter<string> | undefined = undefined;
export var buildTask: vscode.Task | undefined = undefined;
export var flashTask: vscode.Task | undefined = undefined;

export class TaskProvider implements vscode.TaskProvider {
    provideTasks(token?: vscode.CancellationToken): vscode.ProviderResult<vscode.Task[]> {
        const closeEm = new vscode.EventEmitter<number>();
        const writeEm = new vscode.EventEmitter<string>();

        const buildExec = new vscode.CustomExecution(
            async (): Promise<vscode.Pseudoterminal> => {
                return {
                    onDidWrite: writeEm.event,
                    onDidClose: closeEm.event,
                    open: async () => {
                        writeEmitter = writeEm;
                        Promise.resolve(current.builder.build()).then((result) => {
                            if (result === true) {
                                writeEm.fire("Build finished\n\r");
                                closeEm.fire(0);
                            } else {
                                writeEm.fire("Build failed\n\r");
                                closeEm.fire(1);
                            }
                        }).catch((error) => {
                            writeEm.fire("Build failed: " + error + "\n\r");
                            closeEm.fire(1);
                        });
                    },
                    close: () => {
                        writeEmitter = undefined;
                    }
                };
            }
        );

        const FlashExec = new vscode.CustomExecution(
            async (): Promise<vscode.Pseudoterminal> => {
                return {
                    onDidWrite: writeEm.event,
                    onDidClose: closeEm.event,
                    open: async () => {
                        writeEmitter = writeEm;
                        Promise.resolve(current.builder.flash()).then((result) => {
                            if (result === true) {
                                writeEm.fire("Flash finished\n\r");
                                closeEm.fire(0);
                            } else {
                                writeEm.fire("Flash failed\n\r");
                                closeEm.fire(1);
                            }
                        }).catch((error) => {
                            writeEm.fire("Flash failed: " + error + "\n\r");
                            closeEm.fire(1);
                        });
                    },
                    close: () => {
                        writeEmitter = undefined;
                    }
                };
            }
        );

        buildTask = new vscode.Task(
            { type: 'nrf5-vscode', command: 'build' },
            vscode.TaskScope.Workspace,
            'build',
            'nrf5-vscode',
            buildExec,
            '$gcc'
        );

        flashTask = new vscode.Task(
            { type: 'nrf5-vscode', command: 'flash' },
            vscode.TaskScope.Workspace,
            'flash',
            'nrf5-vscode',
            FlashExec
        );

        return [buildTask, flashTask];
    }

    resolveTask(task: vscode.Task, token?: vscode.CancellationToken): vscode.ProviderResult<vscode.Task> {
        switch (task.definition.command) {
            case 'build':
                return task;
            default:
                break;
        }
        return undefined;
    }
}

export function build() {
    vscode.tasks.executeTask(buildTask!);
}

export function flash() {
    vscode.tasks.executeTask(flashTask!);
}