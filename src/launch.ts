import * as vscode from 'vscode';
import * as nRF5 from './nrf5';
import * as current from './extension';
import * as hardware from './hardware.json';
import * as commands from './commands.json';
import * as tasks from './tasks';
import path from 'path';

const hardwareNames = hardware.hardwareNames;

export class Launcher {
    project: nRF5.Project;

    constructor(project: nRF5.Project) {
        this.project = project;
    }

    start() {
        // find the jlink hardware name
        const jlinkDevice = hardwareNames.find((device) => {
            return device.name === this.project.hardwareFolder;
        });

        if (!jlinkDevice) {
            vscode.window.showErrorMessage('No J-Link compatible device found for this project');
            return;
        }

        // build the project
        tasks.build();

        const elfFile = nRF5.replacePlaceholders(commands.elf);
        const svdFile = nRF5.replacePlaceholders(commands.svd);

        const debugConfig: vscode.DebugConfiguration = {
            name: 'nRF5x via J-Link/Cortex-Debug',
            cwd: '${workspaceFolder}',
            executable: elfFile,
            request: 'launch',
            type: 'cortex-debug',
            runToEntryPoint: 'main',
            servertype: 'jlink',
            device: jlinkDevice!.jlink,
            serverpath: path.join(current.jLinkPath, 'JLinkGDBServerCL.exe'),
            rttConfig: {
                enabled: true,
                address: "auto",
                decoders: [
                    {
                        label: "",
                        port: 0,
                        type: "console"
                    }
                ]
            },
            liveWatch: {
                enabled: true,
                samplesPerSecond: 4
            },
            svdFile: svdFile
        };

        vscode.debug.startDebugging(this.project.workspaceFolder, debugConfig);
    }
}

export function startDebugSession() {

}