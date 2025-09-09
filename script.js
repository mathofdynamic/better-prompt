class BetterPromptApp {
    constructor() {
        this.promptInput = document.getElementById('promptInput');
        this.inputOverlay = document.getElementById('inputOverlay');
        this.suggestionTooltip = document.getElementById('suggestionTooltip');
        this.suggestionsList = document.getElementById('suggestionsList');
        this.closeTooltip = document.getElementById('closeTooltip');
        this.requestCounter = document.getElementById('requestCounter');
        this.statusIndicator = document.getElementById('statusIndicator');
        
        this.debounceTimer = null;
        this.abortController = null;
        this.requestToken = 0; // used to ignore stale responses
        this.currentSuggestions = [];
        this.requestCount = 0;
        this.isProcessing = false;
        this.hideTooltipTimer = null;
        this.isTooltipHovered = false;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.updateStatus('Ready');
        
        // Add test button for debugging
        this.addTestButton();
    }
    
    addTestButton() {
        const testButton = document.createElement('button');
        testButton.textContent = 'Test API Connection';
        testButton.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.3);
            padding: 10px 15px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 12px;
            backdrop-filter: blur(10px);
            z-index: 1000;
        `;
        
        testButton.addEventListener('click', () => {
            this.testAPIConnection();
        });
        
        document.body.appendChild(testButton);
    }
    
    async testAPIConnection() {
        this.updateStatus('Testing API connection...', 'loading');
        
        try {
            const testPrompt = "یک گربه در حال بازی کردن";
            const response = await this.sendRequest(testPrompt);
            
            if (response && response.suggestions) {
                this.updateStatus(`✅ API working! Found ${response.total_suggestions} suggestions`);
                console.log('✅ API Test successful:', response);
            } else {
                this.updateStatus('⚠️ API responded but no suggestions found');
            }
        } catch (error) {
            this.updateStatus(`❌ API test failed: ${error.message}`, 'error');
            console.error('❌ API Test failed:', error);
        }
    }
    
    setupEventListeners() {
        // Input event listeners
        this.promptInput.addEventListener('input', this.handleInput.bind(this));
        this.promptInput.addEventListener('keydown', this.handleKeydown.bind(this));
        this.promptInput.addEventListener('scroll', this.syncScroll.bind(this));
        
        // Tooltip event listeners
        this.closeTooltip.addEventListener('click', this.hideTooltip.bind(this));
        this.suggestionTooltip.addEventListener('click', (e) => e.stopPropagation());
        
        // Click outside to close tooltip
        document.addEventListener('click', this.hideTooltip.bind(this));
        
        // Prevent tooltip from closing when clicking inside
        this.suggestionTooltip.addEventListener('click', (e) => e.stopPropagation());
    }
    
    handleInput(e) {
        const text = e.target.value;
        
        // Update text direction based on content
        this.updateTextDirection(text);
        
        // Clear existing debounce timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        // Hide tooltip when user is typing
        this.hideTooltip();
        
        // Clear existing highlights
        this.clearHighlights();

        // If a request is in-flight, abort it and increment token so stale responses are ignored
        if (this.abortController) {
            try { this.abortController.abort(); } catch (_) {}
        }
        this.requestToken++;
        
        // Set up new debounce timer
        this.debounceTimer = setTimeout(() => {
            this.processPrompt(text);
        }, CONFIG.DEBOUNCE_DELAY);
    }
    
    handleKeydown(e) {
        // Hide tooltip on Escape key
        if (e.key === 'Escape') {
            this.hideTooltip();
        }
    }
    
    updateTextDirection(text) {
        const isRTL = this.detectRTL(text);
        const direction = isRTL ? 'rtl' : 'ltr';
        
        this.promptInput.setAttribute('dir', direction);
        this.inputOverlay.setAttribute('dir', direction);
    }
    
    detectRTL(text) {
        // Simple RTL detection based on Persian/Arabic characters
        const rtlRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
        return rtlRegex.test(text);
    }
    
    async processPrompt(text) {
        if (!text || text.trim().length === 0) {
            this.clearHighlights();
            return;
        }
        
        // Check if text has at least 3 words
        const words = text.trim().split(/\s+/);
        if (words.length < CONFIG.MIN_WORDS_FOR_REQUEST) {
            this.clearHighlights();
            return;
        }
        
        // Don't process if already processing
        if (this.isProcessing) {
            return;
        }
        
        this.isProcessing = true;
        this.updateStatus('Processing...', 'loading');
        
        try {
            const response = await this.sendRequest(text, this.requestToken);
            // If another request started after this one, ignore this response
            if (response && response.__token === this.requestToken) {
                this.handleResponse(response);
            }
        } catch (error) {
            console.error('Error processing prompt:', error);
            this.updateStatus('Error processing request', 'error');
            this.clearHighlights();
        } finally {
            this.isProcessing = false;
        }
    }
    
    async sendRequest(prompt, token) {
        this.requestCount++;
        this.requestCounter.textContent = this.requestCount;
        
        try {
            this.abortController = new AbortController();
            // Use query parameter instead of header to avoid CORS issues
            const url = `${CONFIG.API_URL}?api-key=${encodeURIComponent(CONFIG.API_KEY)}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt }),
                signal: this.abortController.signal
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
            }
            
            const data = await response.json();
            // decorate with token so caller can verify freshness
            data.__token = token;
            console.log('API Response:', data);
            return data;
            
        } catch (error) {
            console.error('API Request failed:', error);
            
            // Provide more specific error messages
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error: Unable to connect to the API. Please check your internet connection and try again.');
            } else if (error.message.includes('CORS')) {
                throw new Error('CORS error: Please run the application through a local server (not file://). Use the provided server.py script.');
            } else {
                throw new Error(`API Error: ${error.message}`);
            }
        } finally {
            this.abortController = null;
        }
    }
    
    handleResponse(response) {
        if (response.suggestions && response.suggestions.length > 0) {
            this.currentSuggestions = response.suggestions;
            this.highlightWords(response.suggestions);
            this.updateStatus(`Found ${response.total_suggestions} suggestions`);
        } else {
            this.clearHighlights();
            this.updateStatus('No suggestions found');
        }
    }
    
    highlightWords(suggestions) {
        const text = this.promptInput.value;
        let highlightedText = text;
        
        // Sort suggestions by position (from end to start to avoid index shifting)
        const sortedSuggestions = suggestions.sort((a, b) => {
            const aIndex = text.lastIndexOf(a.word);
            const bIndex = text.lastIndexOf(b.word);
            return bIndex - aIndex;
        });
        
        sortedSuggestions.forEach(suggestion => {
            const word = suggestion.word;
            const regex = new RegExp(this.escapeRegExp(word), 'g');
            highlightedText = highlightedText.replace(regex, (match, offset) => {
                return `<span class="highlighted-word" data-word="${this.escapeHtml(word)}" data-suggestions='${JSON.stringify(suggestion.suggestions)}'>${this.escapeHtml(match)}</span>`;
            });
        });
        
        this.inputOverlay.innerHTML = highlightedText;

        // Ensure base input text is hidden while overlay shows full text
        this.promptInput.classList.add('has-highlights');

        // Add event listeners to highlighted words
        this.addHighlightListeners();
    }
    
    addHighlightListeners() {
        const highlightedWords = this.inputOverlay.querySelectorAll('.highlighted-word');
        
        highlightedWords.forEach(wordElement => {
            wordElement.addEventListener('mouseenter', (e) => {
                // Cancel any pending hides when re-entering a word
                if (this.hideTooltipTimer) {
                    clearTimeout(this.hideTooltipTimer);
                    this.hideTooltipTimer = null;
                }
                this.showTooltip(e);
            });
            wordElement.addEventListener('mouseleave', () => {
                // Start a grace-period timer; if user moves into tooltip, we cancel it
                if (this.hideTooltipTimer) {
                    clearTimeout(this.hideTooltipTimer);
                }
                this.hideTooltipTimer = setTimeout(() => {
                    if (!this.isTooltipHovered) {
                        this.hideTooltip();
                    }
                }, 1000);
            });
        });
    }
    
    showTooltip(e) {
        const wordElement = e.target;
        const word = wordElement.getAttribute('data-word');
        const suggestions = JSON.parse(wordElement.getAttribute('data-suggestions'));
        
        // Populate suggestions
        this.suggestionsList.innerHTML = '';
        suggestions.forEach(suggestion => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'suggestion-item';
            suggestionItem.textContent = suggestion;
            suggestionItem.addEventListener('click', () => {
                this.replaceWord(word, suggestion);
                this.hideTooltip();
            });
            this.suggestionsList.appendChild(suggestionItem);
        });
        
        // Position tooltip
        this.positionTooltip(wordElement);
        
        // Attach hover listeners to tooltip to manage grace period
        this.suggestionTooltip.addEventListener('mouseenter', () => {
            this.isTooltipHovered = true;
            if (this.hideTooltipTimer) {
                clearTimeout(this.hideTooltipTimer);
                this.hideTooltipTimer = null;
            }
        }, { once: false });

        this.suggestionTooltip.addEventListener('mouseleave', () => {
            this.isTooltipHovered = false;
            if (this.hideTooltipTimer) {
                clearTimeout(this.hideTooltipTimer);
            }
            this.hideTooltipTimer = setTimeout(() => {
                if (!this.isTooltipHovered) {
                    this.hideTooltip();
                }
            }, 300);
        }, { once: false });

        // Show tooltip
        this.suggestionTooltip.classList.add('visible');
    }
    
    positionTooltip(wordElement) {
        const rect = wordElement.getBoundingClientRect();
        const containerRect = this.inputOverlay.getBoundingClientRect();
        const inputWrapperRect = this.inputOverlay.parentElement.getBoundingClientRect();
        
        // Calculate position relative to the input wrapper
        const left = rect.left - inputWrapperRect.left;
        const top = rect.bottom - inputWrapperRect.top + 10;
        
        this.suggestionTooltip.style.left = `${left}px`;
        this.suggestionTooltip.style.top = `${top}px`;
    }
    
    hideTooltip() {
        this.suggestionTooltip.classList.remove('visible');
        if (this.hideTooltipTimer) {
            clearTimeout(this.hideTooltipTimer);
            this.hideTooltipTimer = null;
        }
        this.isTooltipHovered = false;
    }
    
    replaceWord(oldWord, newWord) {
        const text = this.promptInput.value;
        const newText = text.replace(new RegExp(this.escapeRegExp(oldWord), 'g'), newWord);
        
        // Update input value
        this.promptInput.value = newText;
        
        // Add animation to the replaced word
        this.animateWordReplacement(oldWord, newWord);
        
        // Update text direction
        this.updateTextDirection(newText);

        // Keep existing suggestions except the one we just changed
        if (Array.isArray(this.currentSuggestions) && this.currentSuggestions.length > 0) {
            this.currentSuggestions = this.currentSuggestions.filter(s => s.word !== oldWord);
            if (this.currentSuggestions.length > 0) {
                // Re-highlight remaining suggestions
                this.highlightWords(this.currentSuggestions);
            } else {
                this.clearHighlights();
            }
        }

        // Do not send a new request here; wait for user edits
    }
    
    animateWordReplacement(oldWord, newWord) {
        // Determine direction for animation based on current text direction
        const isRTL = this.promptInput.getAttribute('dir') === 'rtl';
        const exitClass = isRTL ? 'word-exit-rtl' : 'word-exit-ltr';
        const enterClass = isRTL ? 'word-enter-rtl' : 'word-enter-ltr';

        // Find and animate the word in the overlay
        const wordElements = this.inputOverlay.querySelectorAll('.highlighted-word');
        wordElements.forEach(element => {
            if (element.getAttribute('data-word') === oldWord) {
                // Exit animation for old content
                element.classList.add(exitClass);
                
                // After exit finishes, swap text and play enter animation
                setTimeout(() => {
                    element.classList.remove(exitClass);
                    element.textContent = newWord;
                    element.classList.add(enterClass);
                    setTimeout(() => element.classList.remove(enterClass), 260);
                }, 160);
            }
        });
    }
    
    clearHighlights() {
        this.inputOverlay.innerHTML = '';
        this.currentSuggestions = [];
        
        // Reveal base input text again
        this.promptInput.classList.remove('has-highlights');
    }
    
    syncScroll() {
        this.inputOverlay.scrollTop = this.promptInput.scrollTop;
        this.inputOverlay.scrollLeft = this.promptInput.scrollLeft;
    }
    
    updateStatus(message, type = 'ready') {
        this.statusIndicator.textContent = message;
        this.statusIndicator.className = `status-indicator ${type}`;
    }
    
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BetterPromptApp();
});
