/** Coalesce edits without running two builds against the same compiler/output. */
module.exports = function rebuildQueue(rebuild, delay = 300) {
    let timer = null, active = null, pending = false, closed = false, latest;
    const drain = () => {
        if (active || closed) return;
        active = (async () => {
            while (pending && !closed) {
                pending = false;
                await rebuild(latest);
            }
        })().finally(() => {
            active = null;
            if (pending && !closed) drain();
        });
        return active;
    };
    return {
        schedule(value) {
            if (closed) return;
            latest = value;
            clearTimeout(timer);
            timer = setTimeout(() => {
                timer = null;
                pending = true;
                drain();
            }, delay);
        },
        async close() {
            closed = true;
            clearTimeout(timer);
            timer = null;
            pending = false;
            await active;
        },
    };
};
