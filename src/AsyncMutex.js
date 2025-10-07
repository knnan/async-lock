export class AsyncMutex {
    #locked = false;

    /** @type { Function[] } */
    #waiting = [];

    /**
     * Acquire a mutex
     * @param { AbortSignal } [signal]
     */
    acquire(signal) {
        if (signal) {
            return this.#acquireWithSignal(signal);
        }
        return this.#acquireDefault();
    }

    /**
     * @returns { Promise<Function> } - release function
     */
    #acquireDefault() {
        return new Promise((resolve) => {
            if (!this.#locked) {
                this.#locked = true;
                resolve(this.#makeRelease());
            } else {
                this.#waiting.push(resolve);
            }
        });
    }

    /**
     *
     * @param { AbortSignal } [signal] - AbortController signal
     * @returns { Promise<Function> } - release function
     */
    #acquireWithSignal(signal) {
        return new Promise((resolve, reject) => {
            // chkec if already aborted
            if (signal.aborted) {
                reject(signal.reason || new Error("Acquisition aborted"));
                return;
            }
            const resolveRef = (release) => {
                // eslint-disable-next-line no-param-reassign
                signal.onabort = null;
                resolve(release);
            };
            const onAbort = () => {
                const index = this.#waiting.indexOf(resolveRef);
                if (index !== -1) {
                    this.#waiting.splice(index, 1);
                }
                reject(signal.reason || new Error("Acquisition aborted"));
            };

            // eslint-disable-next-line no-param-reassign
            signal.onabort = onAbort;

            if (!this.#locked) {
                this.#locked = true;
                // eslint-disable-next-line no-param-reassign
                signal.onabort = null;
                resolve(this.#makeRelease());
            } else {
                this.#waiting.push(resolveRef);
            }
        });
    }

    /**
     *
     * @param { number } timeoutMs - Timeout in milliseconds
     */
    acquireWithTimeout(timeoutMs) {
        const signal = AbortSignal.timeout(timeoutMs);
        return this.acquire(signal);
    }

    /**
     *
     * @param { Function } fn - Async function to run
     */
    async runExclusive(fn) {
        const releaseFn = await this.acquire();
        try {
            return await fn();
        } finally {
            releaseFn();
        }
    }

    /**
     *
     * @param { Function } fn - Async function to run
     * @param { number } timeousMs - Timeout in milliseconds
     */
    async runExclusiveWithTimeout(fn, timeousMs) {
        const releaseFn = await this.acquireWithTimeout(timeousMs);
        try {
            return await fn();
        } finally {
            releaseFn();
        }
    }

    #makeRelease() {
        let released = false;

        const release = () => {
            if (released) {
                logger.warn("Mutex already released");
                return;
            }
            released = true;

            if (this.#waiting.length) {
                const nextResolve = this.#waiting.shift();
                nextResolve(this.#makeRelease());
            } else {
                this.#locked = false;
            }
        };
        return release;
    }
}
