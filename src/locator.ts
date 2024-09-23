import * as fs from "fs";
import * as path from "path";

export function findSES(): string {
    var result: string = "";
    const possiblePaths: string[] = [];

    // Add possible paths for windows
    if (process.platform === "win32") {
        possiblePaths.push("C:\\Program Files\\SEGGER");
        possiblePaths.push("C:\\Program Files (x86)\\SEGGER");
    } else if (process.platform === "darwin") {
        possiblePaths.push("/Applications/SEGGER");
    } else {
        possiblePaths.push("/opt/SEGGER");
    }

    for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
            const files = fs.readdirSync(possiblePath);
            for (const file of files) {
                if (file.startsWith("SEGGER Embedded Studio") && fs.lstatSync(path.join(possiblePath, file)).isDirectory()) {
                    result = path.join(possiblePath, file);
                    break;
                }
            }
        }
    }

    return result;
}

export function findJLink(): string {
    var result: string = "";
    const possiblePaths: string[] = [];

    // Add possible paths for windows
    if (process.platform === "win32") {
        possiblePaths.push("C:\\Program Files\\SEGGER");
        possiblePaths.push("C:\\Program Files (x86)\\SEGGER");
    } else if (process.platform === "darwin") {
        possiblePaths.push("/Applications/SEGGER");
    } else {
        possiblePaths.push("/opt/SEGGER");
    }

    for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
            const files = fs.readdirSync(possiblePath);
            for (const file of files) {
                if (file.startsWith("JLink") && fs.lstatSync(path.join(possiblePath, file)).isDirectory()) {
                    result = path.join(possiblePath, file);
                    break;
                }
            }
        }
    }

    return result;
}