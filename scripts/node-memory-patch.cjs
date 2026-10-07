const originalMemoryUsage = process.memoryUsage.bind(process);

function safeMemoryUsage() {
  try {
    return originalMemoryUsage();
  } catch {
    return {
      rss: 0,
      heapTotal: 0,
      heapUsed: 0,
      external: 0,
      arrayBuffers: 0
    };
  }
}

safeMemoryUsage.rss = function rss() {
  try {
    if (typeof originalMemoryUsage.rss === "function") {
      return originalMemoryUsage.rss();
    }
    return originalMemoryUsage().rss;
  } catch {
    return 0;
  }
};

process.memoryUsage = safeMemoryUsage;
