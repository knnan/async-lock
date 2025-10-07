# Async Lock

A lightweight, zero-dependency async mutex (mutual exclusion lock) implementation for JavaScript/Node.js with AbortSignal support.

## Features

- 🔒 Simple mutex implementation for async operations
- ⏱️ Built-in timeout support
- 🛑 AbortSignal integration for cancellable operations
- 🪶 Zero dependencies
- 📦 Tiny footprint
- 🔧 Easy to use API
- 🎯 TypeScript-friendly (with JSDoc annotations)

## Installation

```bash
npm install @knnan/async-lock
```

```bash
yarn add @knnan/async-lock
```

```bash
pnpm add @knnan/async-lock
```

## Usage

### Basic Usage

```javascript
import { AsyncMutex } from '@knnan/async-lock';

const mutex = new AsyncMutex();

// Acquire lock manually
const release = await mutex.acquire();
try {
    // Critical section - only one execution at a time
    await doSomethingCritical();
} finally {
    release(); // Always release the lock
}
```

### Using runExclusive (Recommended)

The `runExclusive` method automatically handles lock acquisition and release:

```javascript
const result = await mutex.runExclusive(async () => {
    // Critical section
    await updateSharedResource();
    return 'done';
});
```

### With Timeout

Prevent deadlocks by setting a timeout:

```javascript
// Acquire with timeout
try {
    const release = await mutex.acquireWithTimeout(5000); // 5 seconds
    try {
        await doSomething();
    } finally {
        release();
    }
} catch (error) {
    console.error('Failed to acquire lock within timeout');
}

// Or use runExclusiveWithTimeout
try {
    await mutex.runExclusiveWithTimeout(async () => {
        await doSomething();
    }, 5000);
} catch (error) {
    console.error('Operation timed out');
}
```

### With AbortSignal

Cancel pending lock acquisitions:

```javascript
const controller = new AbortController();

// Cancel after 3 seconds
setTimeout(() => controller.abort(), 3000);

try {
    const release = await mutex.acquire(controller.signal);
    try {
        await doSomething();
    } finally {
        release();
    }
} catch (error) {
    if (error.name === 'AbortError') {
        console.log('Lock acquisition was cancelled');
    }
}
```

## API Reference

### `AsyncMutex`

#### Constructor

```javascript
const mutex = new AsyncMutex();
```

Creates a new mutex instance.

#### Methods

##### `acquire(signal?: AbortSignal): Promise<Function>`

Acquires the mutex lock. If the lock is already held, the promise will wait until it's released.

**Parameters:**
- `signal` (optional): An AbortSignal to cancel the acquisition

**Returns:** A promise that resolves to a release function

**Example:**
```javascript
const release = await mutex.acquire();
try {
    // critical section
} finally {
    release();
}
```

##### `acquireWithTimeout(timeoutMs: number): Promise<Function>`

Acquires the mutex with a timeout.

**Parameters:**
- `timeoutMs`: Timeout in milliseconds

**Returns:** A promise that resolves to a release function, or rejects on timeout

**Example:**
```javascript
const release = await mutex.acquireWithTimeout(5000);
```

##### `runExclusive(fn: Function): Promise<any>`

Executes a function exclusively, automatically managing the lock.

**Parameters:**
- `fn`: An async function to execute

**Returns:** A promise that resolves to the return value of `fn`

**Example:**
```javascript
const result = await mutex.runExclusive(async () => {
    return await doSomething();
});
```

##### `runExclusiveWithTimeout(fn: Function, timeoutMs: number): Promise<any>`

Executes a function exclusively with a timeout.

**Parameters:**
- `fn`: An async function to execute
- `timeoutMs`: Timeout in milliseconds

**Returns:** A promise that resolves to the return value of `fn`, or rejects on timeout

**Example:**
```javascript
await mutex.runExclusiveWithTimeout(async () => {
    await doSomething();
}, 5000);
```

## Use Cases

### Preventing Race Conditions

```javascript
const mutex = new AsyncMutex();
let counter = 0;

async function incrementCounter() {
    await mutex.runExclusive(async () => {
        const current = counter;
        await someAsyncOperation();
        counter = current + 1;
    });
}

// Safe concurrent calls
await Promise.all([
    incrementCounter(),
    incrementCounter(),
    incrementCounter()
]);
```

### Database Connection Pool

```javascript
const dbMutex = new AsyncMutex();

async function queryDatabase(sql) {
    return await dbMutex.runExclusive(async () => {
        const connection = await getConnection();
        try {
            return await connection.query(sql);
        } finally {
            await releaseConnection(connection);
        }
    });
}
```

### File Access Synchronization

```javascript
const fileMutex = new AsyncMutex();

async function writeToFile(data) {
    await fileMutex.runExclusive(async () => {
        await fs.promises.appendFile('data.txt', data);
    });
}
```

### API Rate Limiting

```javascript
const apiMutex = new AsyncMutex();

async function callAPI(endpoint) {
    return await apiMutex.runExclusive(async () => {
        const response = await fetch(endpoint);
        await delay(1000); // Rate limit: 1 request per second
        return response.json();
    });
}
```

## Error Handling

Always use try-finally blocks when manually managing locks:

```javascript
const release = await mutex.acquire();
try {
    await doSomething();
} catch (error) {
    // Handle errors
    console.error(error);
} finally {
    release(); // Always release, even on error
}
```

Or use `runExclusive` which handles this automatically:

```javascript
try {
    await mutex.runExclusive(async () => {
        await doSomething();
    });
} catch (error) {
    console.error(error);
}
```

## Common Pitfalls

### ❌ Forgetting to Release

```javascript
// BAD: Lock is never released
const release = await mutex.acquire();
await doSomething(); // If this throws, release() never runs
release();
```

### ✅ Always Use Finally

```javascript
// GOOD: Lock is always released
const release = await mutex.acquire();
try {
    await doSomething();
} finally {
    release();
}
```

### ❌ Nested Locks (Deadlock)

```javascript
// BAD: Will deadlock
await mutex.runExclusive(async () => {
    await mutex.runExclusive(async () => {
        // This will never execute
    });
});
```

### ✅ Use Separate Mutexes or Avoid Nesting

```javascript
// GOOD: Sequential execution
await mutex.runExclusive(async () => {
    await doSomething();
});
await mutex.runExclusive(async () => {
    await doSomethingElse();
});
```

## Browser Support

Works in all modern browsers and Node.js environments that support:
- Promises
- Async/await
- AbortSignal (for cancellation features)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Author

Your Name

## Links

- [GitHub Repository](https://github.com/knnan/async-lock)
- [npm Package](https://www.npmjs.com/package/@knnan/async-lock)
- [Issue Tracker](https://github.com/knnan/async-lock/issues)

## Changelog

### 1.0.0
- Initial release
- Basic mutex functionality
- AbortSignal support
- Timeout support
- `runExclusive` helpers
