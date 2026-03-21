module.exports = async function globalTeardown() {
  if (global.__OLLAMA_STUB__) {
    await new Promise(resolve => global.__OLLAMA_STUB__.close(resolve));
    console.log('[globalTeardown] Ollama stub stopped');
  }
};
