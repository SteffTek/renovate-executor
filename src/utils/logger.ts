/**
 * Imports
 */
import ansiColors from "ansi-colors";

export enum LogLevel {
    LOG = "log",
    INFO = "info",
    ERROR = "error",
    WARNING = "warning",
    SUCCESS = "success",
}

/**
 * Custom Logger Class for formatting logs
 * @class Logger
 */
export class Logger {
    /**
     * Log a message
     * @param message The message to log
     */
    private static sendLog(message: string, level: LogLevel = LogLevel.INFO): void {
        const color = (level: LogLevel) => {
            const name = level.toUpperCase().padEnd(7, " ");
            switch (level) {
                case LogLevel.INFO:
                    return ansiColors.cyan(name);
                case LogLevel.ERROR:
                    return ansiColors.red(name);
                case LogLevel.WARNING:
                    return ansiColors.yellow(name);
                case LogLevel.SUCCESS:
                    return ansiColors.green(name);
                default:
                    return ansiColors.gray(name);
            }
        };
        const formatted = ansiColors.bold(`[ ${color(level)} | ${new Date().toISOString()} ]`);
        process.stdout.write(`${formatted}: ${message}\n`);
    }

    /**
     * Log a message
     * @param message The message to log
     */
    public static log(...message: unknown[]): void {
        Logger.sendLog(Logger.combineMessage(message), LogLevel.LOG);
    }

    /**
     * Log a info
     * @param message The message to log
     */
    public static info(...message: unknown[]): void {
        Logger.sendLog(Logger.combineMessage(message), LogLevel.INFO);
    }

    /**
     * Log an error
     * @param message The message to log
     */
    public static error(...message: unknown[]): void {
        Logger.sendLog(Logger.combineMessage(message), LogLevel.ERROR);
    }

    /**
     * Log a warning
     * @param message The message to log
     */
    public static warn(...message: unknown[]): void {
        Logger.sendLog(Logger.combineMessage(message), LogLevel.WARNING);
    }

    /**
     * Log a success
     * @param message The message to log
     */
    public static success(...message: unknown[]): void {
        Logger.sendLog(Logger.combineMessage(message), LogLevel.SUCCESS);
    }

    private static combineMessage(...message: unknown[]): string {
        return message
            .map((msg: unknown) => {
                return String(msg);
            })
            .join(" ");
    }
}

/**
 * Function to use the custom logger
 */
export function useLogger(): void {
    console.log = Logger.log;
    console.info = Logger.info;
    console.error = Logger.error;
    console.warn = Logger.warn;
    console.success = Logger.success;
}

/**
 * Expand the console object with the custom success logger
 */
declare global {
    interface Console {
        success: (...message: unknown[]) => void;
    }
}
