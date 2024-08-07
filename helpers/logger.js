const path = require("path")
const config = require("../config.json")
const fs = require("fs/promises")
module.exports = class HighlayerLogger {
    constructor(id) {
        this.id = id

    }
    async dump() {
        let res;
        try {
            res = await fs.readFile(path.join(config.archiveDataDir, "logs", this.id + ".log"))
        } catch (e) {
            res = "No logs"
        }finally{
            return res
        }
        
    }
    log(...contents) {
        if (!config.enableLogging) {
            return
        }

        fs.appendFile(path.join(config.archiveDataDir, "logs", this.id + ".log"), "\n\n--LOG\n" + contents.map(prettyStringify).join('\n---\n') + "\n--LOG")
    }
    error(...contents) {

        if (!config.enableLogging) {
            return
        }
        fs.appendFile(path.join(config.archiveDataDir, "logs", this.id + ".log"), "\n\n--ERROR\n" + contents.map(prettyStringify).join('\n---\n') + "\n--ERROR")
    }
}

function prettyStringify(value, replacer = null, space = 2) {
    const getCircularReplacer = () => {
        const seen = new WeakSet();
        return (key, value) => {
            if (typeof value === "object" && value !== null) {
                if (seen.has(value)) {
                    return '[Circular]';
                }
                seen.add(value);
            }
            return value;
        };
    };

    value = JSON.parse(JSON.stringify(value, replacer || getCircularReplacer()));

    const formatObject = (obj, depth) => {
        const indent = ' '.repeat(depth * space);
        const lines = [];
        if (Array.isArray(obj)) {
            return `[${obj.map(item => prettyStringify(item, replacer, space)).join(', ')}]`;
        }
        const properties = Object.getOwnPropertyNames(obj);

        properties.forEach(prop => {
            const val = obj[prop];
            if (typeof val === 'function') {
                lines.push(`${indent}${prop}: [Function]`);
            } else if (typeof val === 'object' && val !== null) {
                lines.push(`${indent}${prop}: ${formatObject(val, depth + 1)}`);
            } else {
                lines.push(`${indent}${prop}: ${JSON.stringify(val)}`);
            }
        });


        return `{\n${lines.join(',\n')}\n${indent.slice(space)}}`;
    };

    if (typeof value === 'object' && value !== null) {
        return formatObject(value, 1);
    } else {
        return JSON.stringify(value);
    }
}