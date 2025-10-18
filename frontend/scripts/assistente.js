class EnchantAIAssistant {
    constructor() {
        this.isOpen = false;
        this.conversationHistory = [];

        this.init();
    }

    init() {
        this.injectStyles();
        this.createChatWidget();
        this.attachEventListeners();
        this.loadAndRenderHistory();
    }

    loadAndRenderHistory() {
        const savedHistory = localStorage.getItem('enchant-ai-history');
        if (savedHistory) {
            this.conversationHistory = JSON.parse(savedHistory);

            const messagesContainer = document.getElementById('enchant-chat-messages');
            const welcomeMessage = messagesContainer.querySelector('.enchant-welcome-message');
            if (welcomeMessage) welcomeMessage.remove();

            this.conversationHistory.forEach(message => {
                const text = message.parts[0].text;
                const sender = message.role === 'user' ? 'user' : 'bot';

                // Recriamos o HTML da mensagem
                const messageDiv = document.createElement('div');
                messageDiv.className = `enchant-message ${sender}`;
                const avatarContent = this.getAvatar(sender); // Usando uma função auxiliar
                messageDiv.innerHTML = `
                <div class="enchant-message-avatar">${avatarContent}</div>
                <div class="enchant-message-content">${this.escapeHtml(text)}</div>
            `;
                messagesContainer.appendChild(messageDiv);
            });
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    getAvatar(sender) {
        if (sender === 'user' && this.userProfileImg) {
            return `<img src="${this.userProfileImg}" alt="User Avatar" class="enchant-avatar-img">`;
        }
        const svgPath = sender === 'bot'
            ? '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>'
            : '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>';
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${svgPath}</svg>`;
    }

    addMessage(text, sender) {
        const messagesContainer = document.getElementById('enchant-chat-messages');

        const welcomeMessage = messagesContainer.querySelector('.enchant-welcome-message');
        if (welcomeMessage) welcomeMessage.remove();

        const messageDiv = document.createElement('div');
        messageDiv.className = `enchant-message ${sender}`;

        const avatarContent = this.getAvatar(sender);

        messageDiv.innerHTML = `
        <div class="enchant-message-avatar">${avatarContent}</div>
        <div class="enchant-message-content">${this.escapeHtml(text)}</div>
    `;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        if (text.indexOf('Desculpe, ocorreu um erro') === -1) {
            this.conversationHistory.push({ role: sender === 'user' ? 'user' : 'model', parts: [{ text }] });

            localStorage.setItem('enchant-ai-history', JSON.stringify(this.conversationHistory));
        }
    }

    injectStyles() {
        const styles = `
            .enchant-ai-assistant {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
                font-family: 'Lexend Deca', sans-serif;
            }

            .enchant-ai-button {
                width: 70px;
                height: 70px;
                border-radius: 50%;
                background: linear-gradient(135deg, #693B11 0%, #8B4513 100%);
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(105, 59, 17, 0.3);
            }

            .enchant-ai-button:hover {
                background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
                transform: scale(1.05);
            }

            .enchant-ai-button svg {
                width: 50px;
                height: 50px;
                fill: white;
            }

            .enchant-ai-button .close-icon {
                display: none;
            }

            .enchant-ai-button.active .chat-icon {
                display: none;
            }

            .enchant-ai-button.active .close-icon {
                display: block;
            }

            @keyframes blink {
                0%, 5%, 10%, 100% {
                    opacity: 1;
                }
                2.5%, 7.5% {
                    opacity: 0.3;
                }
            }

            .enchant-ai-button .eye {
                animation: eyeBlink 10s infinite;
            }

            @keyframes eyeBlink {
                0%, 4%, 8%, 100% {
                    fill: #693B11;
                }
                2%, 6% {
                    fill: white;
                }
            }

            .enchant-chat-container {
                position: fixed;
                bottom: 90px;
                right: 20px;
                width: 380px;
                height: 550px;
                background: #f5f5f5;
                border-radius: 16px;
                display: none;
                flex-direction: column;
                border: 1px solid #d0d0d0;
                overflow: hidden;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
            }

            .enchant-chat-container.open {
                display: flex;
                animation: slideUp 0.3s ease;
            }

            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .enchant-chat-header {
                background: linear-gradient(135deg, #693B11 0%, #8B4513 100%);
                color: white;
                padding: 20px;
                display: flex;
                align-items: center;
                gap: 12px;
                position: relative;
            }

            .enchant-close-chat-button {
                position: absolute;
                right: 15px;
                top: 50%;
                transform: translateY(-50%);
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.2);
                border: none;
                cursor: pointer;
                display: none;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
            }

            .enchant-close-chat-button:hover {
                background: rgba(255, 255, 255, 0.3);
            }

            .enchant-close-chat-button svg {
                width: 18px;
                height: 18px;
                fill: white;
            }

            .enchant-chat-header-icon {
                width: 40px;
                height: 40px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .enchant-chat-header-icon svg {
                width: 20px;
                height: 20px;
                fill: white;
            }

            .enchant-chat-header-text h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
            }

            .enchant-chat-header-text p {
                margin: 0 !important;
                text-align: left;
                font-size: 12px;
                opacity: 0.9;
                color: white;
            }

            .enchant-chat-messages {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
                background: #fafafa;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .enchant-chat-messages::-webkit-scrollbar {
                width: 6px;
            }

            .enchant-chat-messages::-webkit-scrollbar-track {
                background: #f0f0f0;
            }

            .enchant-chat-messages::-webkit-scrollbar-thumb {
                background: #693B11;
                border-radius: 3px;
            }

            .enchant-chat-messages::-webkit-scrollbar-thumb:hover {
                background: #8B4513;
            }

            .enchant-message {
                display: flex;
                gap: 10px;
                animation: fadeIn 0.3s ease;
            }

            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .enchant-message.user {
                flex-direction: row-reverse;
            }

            .enchant-message-avatar {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .enchant-message.bot .enchant-message-avatar {
                background: linear-gradient(135deg, #693B11 0%, #8B4513 100%);
            }

            .enchant-message.user .enchant-message-avatar {
                background: #e8d4b8;
            }

            .enchant-message-avatar svg {
                width: 18px;
                height: 18px;
            }

            .enchant-message.bot .enchant-message-avatar svg {
                fill: white;
            }

            .enchant-message.user .enchant-message-avatar svg {
                fill: #693B11;
            }

            .enchant-message-content {
                max-width: 75%;
                padding: 12px 16px;
                border-radius: 12px;
                font-size: 14px;
                line-height: 1.5;
                word-wrap: break-word;
            }

            .enchant-message.bot .enchant-message-content {
                background: white;
                color: #2d2d2d;
                border: 1px solid #e0e0e0;
                border-radius: 12px 12px 12px 4px;
            }

            .enchant-message.user .enchant-message-content {
                background: #693B11;
                color: white;
                border-radius: 12px 12px 4px 12px;
            }

            .enchant-typing-indicator {
                display: flex;
                gap: 4px;
                padding: 12px 16px;
                background: white;
                border: 1px solid #e0e0e0;
                border-radius: 12px;
                width: fit-content;
            }

            .enchant-typing-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #693B11;
                animation: typing 1.4s infinite;
            }

            .enchant-typing-dot:nth-child(2) {
                animation-delay: 0.2s;
            }

            .enchant-typing-dot:nth-child(3) {
                animation-delay: 0.4s;
            }

            @keyframes typing {
                0%, 60%, 100% {
                    transform: translateY(0);
                    opacity: 0.7;
                }
                30% {
                    transform: translateY(-10px);
                    opacity: 1;
                }
            }

            .enchant-chat-input-container {
                padding: 15px;
                background: white;
                border-top: 1px solid #e0e0e0;
                display: flex;
                gap: 10px;
            }

            .enchant-chat-input {
                flex: 1;
                padding: 10px 15px;
                border: 2px solid #e0e0e0;
                border-radius: 20px;
                font-size: 14px;
                outline: none;
                font-family: 'Lexend Deca', sans-serif;
                transition: border-color 0.3s ease;
                background: #fafafa;
                color: #2d2d2d;
            }

            .enchant-chat-input::placeholder {
                color: #999;
            }

            .enchant-chat-input:focus {
                border-color: #693B11;
                background: white;
            }

            .enchant-send-button {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: #693B11;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
            }

            .enchant-send-button:hover {
                background: #8B4513;
                transform: scale(1.05);
            }

            .enchant-send-button:disabled {
                background: #ccc;
                cursor: not-allowed;
            }

            .enchant-send-button svg {
                width: 18px;
                height: 18px;
                fill: white;
            }

            .enchant-welcome-message {
                text-align: center;
                color: #777;
                font-size: 13px;
                margin-top: 20px;
            }

            .enchant-welcome-message p {
                margin: 8px 0;
            }

            /* Responsividade para tablets */
            @media (max-width: 768px) {
                .enchant-ai-assistant {
                    bottom: 15px;
                    right: 15px;
                }

                .enchant-ai-button {
                    width: 55px;
                    height: 55px;
                }

                .enchant-chat-container {
                    bottom: 80px;
                    right: 15px;
                    width: calc(100vw - 30px);
                    max-width: 380px;
                    height: 500px;
                }

                .enchant-chat-messages {
                    padding: 15px;
                }

                .enchant-message-content {
                    max-width: 80%;
                    font-size: 13px;
                }
            }

            /* Responsividade para smartphones */
            @media (max-width: 480px) {
                .enchant-chat-container {
                    bottom: 0;
                    right: 0;
                    left: 0;
                    width: 100%;
                    height: 100vh;
                    border-radius: 0;
                    max-width: none;
                }

                .enchant-close-chat-button {
                    display: flex;
                }

                .enchant-ai-button {
                    bottom: 15px;
                    right: 15px;
                    width: 50px;
                    height: 50px;
                }

                .enchant-chat-header {
                    padding: 15px;
                }

                .enchant-chat-header-text h3 {
                    font-size: 15px;
                }

                .enchant-chat-header-text p {
                    font-size: 11px;
                }

                .enchant-chat-messages {
                    padding: 12px;
                }

                .enchant-message-content {
                    max-width: 85%;
                    font-size: 13px;
                    padding: 10px 14px;
                }

                .enchant-chat-input-container {
                    padding: 12px;
                }

                .enchant-chat-input {
                    font-size: 13px;
                    padding: 9px 14px;
                }

                .enchant-send-button {
                    width: 38px;
                    height: 38px;
                }
            }

            /* Responsividade para telas muito pequenas */
            @media (max-width: 360px) {
                .enchant-message-content {
                    max-width: 90%;
                    font-size: 12px;
                }

                .enchant-chat-input {
                    font-size: 12px;
                }
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    //MASCOTE
    createChatWidget() {
        const widget = document.createElement('div');
        widget.className = 'enchant-ai-assistant';
        widget.innerHTML = `
            <button class="enchant-ai-button" id="enchant-ai-toggle">
                <svg class="chat-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <!-- Orelhinhas -->
                    <circle cx="8" cy="8" r="2.5" fill="white"/>
                    <circle cx="16" cy="8" r="2.5" fill="white"/>
                    <!-- Cabeça -->
                    <circle cx="12" cy="12" r="7" fill="white"/>
                    <!-- Olhinhos que piscam -->
                    <circle cx="10" cy="11" r="1.2" fill="#693B11" class="eye"/>
                    <circle cx="14" cy="11" r="1.2" fill="#693B11" class="eye"/>
                </svg>
                <svg class="close-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
            </button>

            <div class="enchant-chat-container" id="enchant-chat-container">
                <div class="enchant-chat-header">
                    <div class="enchant-chat-header-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                        </svg>
                    </div>
                    <div class="enchant-chat-header-text">
                        <h3>Assistente Enchant</h3>
                        <p>Como posso ajudar?</p>
                    </div>
                    <button class="enchant-close-chat-button" id="enchant-close-chat">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>

                <div class="enchant-chat-messages" id="enchant-chat-messages">
                    <div class="enchant-welcome-message">
                        <p>Olá! Sou o assistente virtual da Enchant.</p>
                        <p>Posso te ajudar a navegar pelo site e entender os dados.</p>
                    </div>
                </div>

                <div class="enchant-chat-input-container">
                    <input 
                        type="text" 
                        class="enchant-chat-input" 
                        id="enchant-chat-input" 
                        placeholder="Digite sua pergunta..."
                        maxlength="500"
                    />
                    <button class="enchant-send-button" id="enchant-send-button">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(widget);
    }

    attachEventListeners() {
        const toggleButton = document.getElementById('enchant-ai-toggle');
        const sendButton = document.getElementById('enchant-send-button');
        const input = document.getElementById('enchant-chat-input');
        const closeButton = document.getElementById('enchant-close-chat');

        toggleButton.addEventListener('click', () => this.toggleChat());
        closeButton.addEventListener('click', () => this.toggleChat());
        sendButton.addEventListener('click', () => this.sendMessage());
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
    }

    toggleChat() {
        this.isOpen = !this.isOpen;
        const container = document.getElementById('enchant-chat-container');
        const button = document.getElementById('enchant-ai-toggle');

        if (this.isOpen) {
            container.classList.add('open');
            button.classList.add('active');
            document.getElementById('enchant-chat-input').focus();
        } else {
            container.classList.remove('open');
            button.classList.remove('active');
        }
    }

    async sendMessage() {
        const input = document.getElementById('enchant-chat-input');
        const message = input.value.trim();

        if (!message) return;

        this.addMessage(message, 'user');
        input.value = '';

        this.showTypingIndicator();

        try {
            const response = await this.callGeminiAPI(message);
            this.removeTypingIndicator();
            this.addMessage(response, 'bot');
        } catch (error) {
            this.removeTypingIndicator();
            this.addMessage('Desculpe, ocorreu um erro ao contatar o assistente. Por favor, tente novamente.', 'bot');
            console.error('Erro na API:', error);
        }
    }

    showTypingIndicator() {
        const messagesContainer = document.getElementById('enchant-chat-messages');

        const welcomeMessage = messagesContainer.querySelector('.enchant-welcome-message');
        if (welcomeMessage) welcomeMessage.remove();

        const typingDiv = document.createElement('div');
        typingDiv.className = 'enchant-message bot';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="enchant-message-avatar">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
            </div>
            <div class="enchant-typing-indicator">
                <div class="enchant-typing-dot"></div>
                <div class="enchant-typing-dot"></div>
                <div class="enchant-typing-dot"></div>
            </div>
        `;
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    removeTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
    }

    async callGeminiAPI(userMessage) {
        const body = {
            userMessage: userMessage,
            conversationHistory: this.conversationHistory
        };

        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Erro do servidor: ${response.status}`);
        }

        const data = await response.json();
        return data.response;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.enchantAI = new EnchantAIAssistant();
    });
} else {
    window.enchantAI = new EnchantAIAssistant();
}