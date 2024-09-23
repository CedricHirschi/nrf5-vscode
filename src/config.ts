import * as vscode from 'vscode';
import * as current from './extension';
import { joinPath } from './common';
import * as fs from 'fs';
const xml2js = require('xml2js');

const defaultArgs = [
    "-mthumb",
    "-munaligned-access",
    "-mtp=soft",
    "-mfp16-format=ieee",
    "-nostdinc",
    "-gdwarf-4",
    "-g0",
    "-gpubnames",
    "-fomit-frame-pointer",
    "-fno-dwarf2-cfi-asm",
    "-ffunction-sections",
    "-fdata-sections",
    "-fshort-enums",
    "-fno-common"
];

export class Configurator {
    emProjectFile: vscode.Uri;
    emProject: any;
    projectName: string;
    configName: string;
    config: any;

    constructor(emProjectPath: vscode.Uri = vscode.Uri.file('')) {
        this.emProjectFile = emProjectPath;
        this.emProject = {};
        this.projectName = '';
        this.configName = '';
        this.config = {};
    }

    // this function generates the .vscode/c_cpp_properties.json file
    //   takes compiler properties from the .emProject file
    //   and generates the c_cpp_properties.json file
    init() {
        if (this.emProjectFile === vscode.Uri.file('')) {
            console.error('No .emProject file specified');
            return;
        }
        // .emProject is in XML format
        //   we need to parse it to get the compiler properties
        const parser = new xml2js.Parser();

        // read the .emProject file
        const emProject = fs.readFileSync(this.emProjectFile.fsPath, 'utf8');
        // parse the .emProject file to a JSON object
        parser.parseString(emProject, (err: any, result: any) => {
            if (err) {
                console.error(err);
            } else {
                this.emProject = result.solution;
            }
        });

        this.projectName = this.emProject.$.Name;

        const rawConfig = this.emProject.project[0].configuration[0].$;

        this.config['defines'] = rawConfig.c_preprocessor_definitions.split(';').map((define: string) => { return define.trim(); }).filter((define: string) => { return define !== ''; });

        this.config['compilerArgs'] = new Array();
        this.config['compilerArgs'].push(`-mcpu=${String(rawConfig.arm_core_type).toLowerCase()}`);
        this.config['compilerArgs'].push(`-m${String(rawConfig.arm_endian).toLowerCase()}-endian`);
        this.config['compilerArgs'].push(`-mfloat-abi=${String(rawConfig.arm_fp_abi).toLowerCase()}`);
        this.config['compilerArgs'].push(`-mfpu=${String(rawConfig.arm_fpu_type).toLowerCase()}`);
        this.config['compilerArgs'] = this.config['compilerArgs'].concat(defaultArgs);

        this.config['includePaths'] = new Array();
        this.config['includePaths'].push(joinPath('${workspaceFolder}', '**'));

        const sdkPath = current.project.sdkPath!;
        this.config['includePaths'].push(joinPath(sdkPath, '**'));
        this.config['includePaths'].push(joinPath(sdkPath, 'components', '**'));
        this.config['includePaths'].push(joinPath(sdkPath, 'external', '**'));
        this.config['includePaths'].push(joinPath(sdkPath, 'integration', '**'));
        this.config['includePaths'].push(joinPath(sdkPath, 'modules', '**'));
        this.config['includePaths'].push(joinPath(current.sesPath, 'include', '**'));

        return this;
    }

    getConfigs(): vscode.QuickPickItem[] {
        const items: vscode.QuickPickItem[] = [];
        for (let i = 0; i < this.emProject.configuration.length; i++) {
            const configName = this.emProject.configuration[i].$.Name;
            items.push({ label: configName });
        }
        return items;
    }

    async selectConfig(): Promise<string> {
        const items = this.getConfigs();

        var result = '';
        var quickPick = vscode.window.createQuickPick();
        quickPick.items = items;
        quickPick.placeholder = 'Select build configuration';
        quickPick.canSelectMany = false;
        quickPick.onDidChangeSelection((selection) => {
            if (selection[0]) {
                result = selection[0].label;
            }

            quickPick.hide();
        });
        quickPick.show();

        await new Promise((resolve) => quickPick.onDidHide(resolve));

        this.setConfig(result);

        return result;
    }

    private createProperties() {
        current.printer.print('Creating c_cpp_properties.json file');

        const propertiesFile = vscode.Uri.file(current.project.workspaceFolder!.uri.fsPath + '/.vscode/c_cpp_properties.json');
        // if it doesn't exist, create it
        const propertiesJSON = {
            "configurations": [
                {
                    "name": "nRF5",
                    "includePath": this.config['includePaths'],
                    "defines": this.config['defines'],
                    "intelliSenseMode": "gcc-arm",
                    "compilerPath": "",                          // hacky, but it works
                    "compilerArgs": this.config['compilerArgs']
                }
            ],
            "version": 4
        };
        // create the .vscode folder if it doesn't exist
        const dotVSCodePath = joinPath(current.project.workspaceFolder!.uri.fsPath, '.vscode');
        if (!fs.existsSync(dotVSCodePath)) {
            fs.mkdirSync(dotVSCodePath);
        }
        // write the file
        fs.writeFileSync(propertiesFile.fsPath, JSON.stringify(propertiesJSON, null, 4));

        current.printer.print('Created c_cpp_properties.json file');
    }

    constructProperties() {
        // construct the c_cpp_properties.json file from the config
        // see if the file exists
        const propertiesFile = joinPath(current.project.workspaceFolder!.uri.fsPath, '.vscode', 'c_cpp_properties.json');
        if (fs.existsSync(propertiesFile)) {
            // if it exists, read it
            const properties = fs.readFileSync(propertiesFile, 'utf8');
            // parse it to a JSON object
            const propertiesJSON = JSON.parse(properties);

            // find configuration with name 'nRF5'
            const nRF5Config = propertiesJSON.configurations.find((config: any) => {
                return config.name === 'nRF5';
            }, 'nRF5');

            if (!nRF5Config) {
                this.createProperties();
                return;
            }

            current.printer.print('Updating c_cpp_properties.json file');

            // update the include paths
            nRF5Config.includePath = this.config['includePaths'];
            // update the defines
            nRF5Config.defines = this.config['defines'];
            // update the compiler args
            nRF5Config.compilerArgs = this.config['compilerArgs'];

            // write the file back
            fs.writeFileSync(propertiesFile, JSON.stringify(propertiesJSON, null, 4));

            current.printer.print('Updated c_cpp_properties.json file');
        } else {
            this.createProperties();
        }
    }

    setConfig(configName: string) {
        if (configName === '') {
            return;
        }
        const selectedConfig = this.emProject.configuration.find((config: any) => {
            return config.$.Name === configName;
        }, configName).$;

        this.config['defines'] = this.config['defines'].concat(selectedConfig.c_preprocessor_definitions.split(';').map((define: string) => { return define.trim(); })).filter((define: string) => { return define !== ''; });
        this.configName = configName;

        this.constructProperties();
    }
}