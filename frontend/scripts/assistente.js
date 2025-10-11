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
    }

    injectStyles() {
        // Nenhuma mudança aqui. Seu CSS está ótimo.
        const styles = `
            .enchant-ai-assistant {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
                font-family: 'Lexend Deca', sans-serif;
            }

            .enchant-ai-button {
                width: 60px;
                height: 60px;
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
            }

            .enchant-ai-button:hover {
                background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
            }

            .enchant-ai-button svg {
                width: 28px;
                height: 28px;
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

            .enchant-chat-container {
                position: fixed;
                bottom: 90px;
                right: 20px;
                width: 380px;
                height: 550px;
                background: white;
                border-radius: 16px;
                display: none;
                flex-direction: column;
                border: 1px solid #dee2e6;
                overflow: hidden;
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
                margin: 0;
                font-size: 12px;
                opacity: 0.9;
            }

            .enchant-chat-messages {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
                background: #f8f9fa;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .enchant-chat-messages::-webkit-scrollbar {
                width: 6px;
            }

            .enchant-chat-messages::-webkit-scrollbar-track {
                background: #f1f1f1;
            }

            .enchant-chat-messages::-webkit-scrollbar-thumb {
                background: #693B11;
                border-radius: 3px;
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
                background: #e2ccae;
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
            }

            .enchant-message.bot .enchant-message-content {
                background: white;
                border: 1px solid #dee2e6;
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
                border: 1px solid #dee2e6;
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
                border-top: 1px solid #dee2e6;
                display: flex;
                gap: 10px;
            }

            .enchant-chat-input {
                flex: 1;
                padding: 10px 15px;
                border: 2px solid #dee2e6;
                border-radius: 20px;
                font-size: 14px;
                outline: none;
                font-family: 'Lexend Deca', sans-serif;
                transition: border-color 0.3s ease;
            }

            .enchant-chat-input:focus {
                border-color: #693B11;
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
                color: #6c757d;
                font-size: 13px;
                margin-top: 20px;
            }

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
            }

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

                .enchant-ai-button {
                    bottom: 15px;
                    right: 15px;
                }
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    createChatWidget() {
        // Nenhuma mudança aqui. A estrutura HTML do seu widget é mantida.
        const widget = document.createElement('div');
        widget.className = 'enchant-ai-assistant';
        widget.innerHTML = `
            <button class="enchant-ai-button" id="enchant-ai-toggle">
                <svg class="chat-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3 .97 4.29L2 22l5.71-.97C9 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.38 0-2.68-.31-3.85-.86l-.28-.14-2.85.48.48-2.85-.14-.28C4.31 14.68 4 13.38 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z"/>
                    <circle cx="9" cy="12" r="1"/>
                    <circle cx="12" cy="12" r="1"/>
                    <circle cx="15" cy="12" r="1"/>
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
                </div>

                <div class="enchant-chat-messages" id="enchant-chat-messages">
                    <div class="enchant-welcome-message">
                        <p>Olá! Sou o assistente virtual da Enchant.</p>
                        <p>Posso te ajudar a navegar pelo site e entender os dados de risco climático.</p>
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
        // Nenhuma mudança aqui. Seus eventos estão corretos.
        const toggleButton = document.getElementById('enchant-ai-toggle');
        const sendButton = document.getElementById('enchant-send-button');
        const input = document.getElementById('enchant-chat-input');

        toggleButton.addEventListener('click', () => this.toggleChat());
        sendButton.addEventListener('click', () => this.sendMessage());
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
    }

    toggleChat() {
        // Nenhuma mudança aqui.
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
        // Nenhuma mudança aqui na lógica principal.
        const input = document.getElementById('enchant-chat-input');
        const message = input.value.trim();

        if (!message) return;

        this.addMessage(message, 'user');
        input.value = '';

        this.showTypingIndicator();

        try {
            // A chamada agora usa a nova função 'callGeminiAPI' modificada
            const response = await this.callGeminiAPI(message);
            this.removeTypingIndicator();
            this.addMessage(response, 'bot');
        } catch (error) {
            this.removeTypingIndicator();
            this.addMessage('Desculpe, ocorreu um erro ao contatar o assistente. Por favor, tente novamente.', 'bot');
            console.error('Erro na API:', error);
        }
    }

    addMessage(text, sender) {
        // Nenhuma mudança aqui.
        const messagesContainer = document.getElementById('enchant-chat-messages');

        // Remove a mensagem de boas-vindas se for a primeira interação
        const welcomeMessage = messagesContainer.querySelector('.enchant-welcome-message');
        if (welcomeMessage) welcomeMessage.remove();

        const messageDiv = document.createElement('div');
        messageDiv.className = `enchant-message ${sender}`;

        const avatarIcon = sender === 'bot'
            ? '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>'
            : '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>';

        messageDiv.innerHTML = `
            <div class="enchant-message-avatar">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${avatarIcon}</svg>
            </div>
            <div class="enchant-message-content">${this.escapeHtml(text)}</div>
        `;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Adiciona a mensagem ao histórico para dar memória ao assistente
        if (text !== 'Desculpe, ocorreu um erro ao contatar o assistente. Por favor, tente novamente.') {
            this.conversationHistory.push({ role: sender === 'user' ? 'user' : 'model', parts: [{ text }] });
        }
    }

    showTypingIndicator() {
        // Nenhuma mudança aqui.
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
        // Nenhuma mudança aqui.
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
    }

    async callGeminiAPI(userMessage) {
        // O corpo da requisição agora envia a mensagem e o histórico para o NOSSO backend
        const body = {
            userMessage: userMessage,
            conversationHistory: this.conversationHistory
        };

        // A chamada 'fetch' agora aponta para a nossa rota de proxy no backend
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
        // A resposta do nosso backend vem dentro de uma propriedade 'response'
        return data.response;
    }

    escapeHtml(text) {
        // Nenhuma mudança aqui.
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