import * as chalk from 'chalk';
import { Queue } from '../container/index';
import { cprint } from '../fmt/index';
import { DelayedTask } from './index';

export class RateLimiter {

    private _interval:      number;
    private _limit:         number;
    private _dispatched:    number;
    private _refreshTask:   DelayedTask;
    private _running:       boolean;
    private _queue:         Queue;

    constructor(count: number, milliseconds?: number) {
        milliseconds = milliseconds || 0;
        this._interval = 1000;
        this._limit = Infinity;
        this._dispatched = 0;
        this._refreshTask = new DelayedTask();
        this._refreshTask.withTime(this._interval).withCallback((): void => {
            this._dispatched = 0;
            this.dispatch();
            if (this._queue.length > 0) {
                this._refreshTask.start();
            }
        });
        this._running = false;
        this._queue = new Queue();

        if (Number.isInteger(count)) {
            count = count > 0 ? count : 0;
            if (Number.isInteger(milliseconds) === false) {
                milliseconds = this._interval;
            }
            milliseconds = milliseconds > 0 ? milliseconds : 1;
            const rate: number = this._interval / milliseconds;
            this._limit = Math.round(rate * count);
        }
    }

    add(task: () => void):void {
        this._queue.push(task);
        this._refreshTask.start();
        this.dispatch();
    }

    dispatch(): void {
        while (this._dispatched < this._limit && this._queue.length > 0) {
            const task: any = this._queue.pop();
            try {
                task && task();
            }
            catch (error) {
                // TODO: turn this into EventEmitter and emit error?
                cprint(`(RateLimiter) - ${error.message}`, chalk.red);
            }
            ++this._dispatched;
        }
    }

    start(): void {
        if (this._running === false) {
            this._running = true;
            this._refreshTask.start();
            this.dispatch();
        }
    }

    stop(): void {
        if (this._running === true) {
            this._refreshTask.stop();
            this._running = false;
        }
    }
}
