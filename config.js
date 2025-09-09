// Configuration file for the Better Prompt application
const CONFIG = {
    API_KEY: typeof window !== 'undefined' && window.CONFIG && window.CONFIG.API_KEY ? window.CONFIG.API_KEY : '',
    API_URL: typeof window !== 'undefined' && window.CONFIG && window.CONFIG.API_URL ? window.CONFIG.API_URL : 'https://better-prompt.nebula-ai-company.workers.dev/',
    DEBOUNCE_DELAY: 1000, // 1 second
    MIN_WORDS_FOR_REQUEST: 3
};
