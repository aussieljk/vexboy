import chalk from 'chalk';

export class Logger {
  private quiet: boolean;
  private verbose: boolean;
  private useColor: boolean;

  constructor(options: { quiet?: boolean; verbose?: boolean; color?: boolean } = {}) {
    this.quiet = options.quiet ?? false;
    this.verbose = options.verbose ?? false;
    this.useColor = options.color ?? true;
  }

  private applyColor(text: string, colorFn: (text: string) => string): string {
    return this.useColor ? colorFn(text) : text;
  }

  info(message: string): void {
    if (!this.quiet) {
      console.log(this.applyColor(message, chalk.cyan));
    }
  }

  success(message: string): void {
    if (!this.quiet) {
      console.log(this.applyColor(message, chalk.green));
    }
  }

  warn(message: string): void {
    if (!this.quiet) {
      console.log(this.applyColor(message, chalk.yellow));
    }
  }

  error(message: string): void {
    console.error(this.applyColor(message, chalk.red));
  }

  debug(message: string): void {
    if (this.verbose) {
      console.log(this.applyColor(message, chalk.dim));
    }
  }

  log(message: string): void {
    if (!this.quiet) {
      console.log(message);
    }
  }

  section(title: string): void {
    if (!this.quiet) {
      console.log();
      console.log(this.applyColor('═'.repeat(80), chalk.cyan.bold));
      console.log(this.applyColor(title, chalk.cyan.bold));
      console.log(this.applyColor('═'.repeat(80), chalk.cyan.bold));
      console.log();
    }
  }

  box(title: string): void {
    if (!this.quiet) {
      const line = '─'.repeat(65);
      console.log();
      console.log(this.applyColor(`┌${line}┐`, chalk.cyan));
      console.log(this.applyColor(`│ ${title.padEnd(64)}│`, chalk.cyan));
      console.log(this.applyColor(`└${line}┘`, chalk.cyan));
      console.log();
    }
  }
}
