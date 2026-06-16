const chatBox = document.getElementById('chat-box');
const micBtn = document.getElementById('mic-btn');
const statusText = document.getElementById('status-text');
const statusIndicator = document.getElementById('status-indicator');

let isListening = false;
let recognition;
let synth = window.speechSynthesis;

// Initialize Speech Recognition
if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        isListening = true;
        micBtn.classList.add('listening');
        statusIndicator.classList.add('listening');
        statusText.innerText = 'Listening...';
    };

    recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        handleUserMessage(transcript);
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        resetMic();
        statusText.innerText = 'Error. Try again.';
    };

    recognition.onend = () => {
        resetMic();
    };
} else {
    statusText.innerText = 'Speech Recognition not supported in this browser.';
    micBtn.disabled = true;
}

micBtn.addEventListener('click', () => {
    if (isListening) {
        recognition.stop();
    } else {
        // Cancel any ongoing speech
        synth.cancel();
        recognition.start();
    }
});

function resetMic() {
    isListening = false;
    micBtn.classList.remove('listening');
    statusIndicator.classList.remove('listening');
    statusText.innerText = 'Ready to listen';
}

async function handleUserMessage(message) {
    // 1. Display user message
    appendUserMessage(message);
    
    // 2. Show typing indicator
    const typingId = showTypingIndicator();

    try {
        // 3. Send to backend
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });

        const data = await response.json();
        
        // 4. Remove typing indicator
        document.getElementById(typingId).remove();

        if (data.error) {
            appendBotMessage("Oops, something went wrong: " + data.error);
            return;
        }

        // 5. Display AI response and correction
        appendBotMessage(data.reply, data.correction);
        
        // 6. Speak the response
        speak(data.reply);

    } catch (error) {
        console.error('Error fetching bot response:', error);
        document.getElementById(typingId).remove();
        appendBotMessage("Sorry, I'm having trouble connecting right now.");
    }
}

function appendUserMessage(text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message user-message';
    msgDiv.innerHTML = `
        <div class="avatar"><i class="fa-solid fa-user"></i></div>
        <div class="message-content">
            <p>${text}</p>
        </div>
    `;
    chatBox.appendChild(msgDiv);
    scrollToBottom();
}

function appendBotMessage(reply, correction = null) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message bot-message';
    
    let correctionHTML = '';
    if (correction) {
        correctionHTML = `
            <div class="correction-box">
                <i class="fa-solid fa-lightbulb"></i>
                <div>
                    <strong>Tip:</strong> ${correction}
                </div>
            </div>
        `;
    }

    msgDiv.innerHTML = `
        <div class="avatar"><i class="fa-solid fa-robot"></i></div>
        <div class="message-content">
            <p>${reply}</p>
            ${correctionHTML}
        </div>
    `;
    chatBox.appendChild(msgDiv);
    scrollToBottom();
}

function showTypingIndicator() {
    const id = 'typing-' + Date.now();
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message bot-message';
    msgDiv.id = id;
    msgDiv.innerHTML = `
        <div class="avatar"><i class="fa-solid fa-robot"></i></div>
        <div class="message-content">
            <div class="typing-indicator">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
        </div>
    `;
    chatBox.appendChild(msgDiv);
    scrollToBottom();
    return id;
}

function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

function speak(text) {
    if (synth.speaking) {
        console.error('speechSynthesis.speaking');
        return;
    }
    const utterThis = new SpeechSynthesisUtterance(text);
    
    // Try to find a good natural English voice
    const voices = synth.getVoices();
    
    let bestVoice = voices.find(voice => voice.lang.startsWith('en') && voice.name.includes('Natural'));
    if (!bestVoice) bestVoice = voices.find(voice => voice.lang.startsWith('en') && voice.name.includes('Google US English'));
    if (!bestVoice) bestVoice = voices.find(voice => voice.lang.startsWith('en') && (voice.name.includes('Female') || voice.name.includes('Google')));
    if (!bestVoice) bestVoice = voices.find(voice => voice.lang.startsWith('en'));

    if (bestVoice) {
        utterThis.voice = bestVoice;
    }
    
    utterThis.pitch = 1.05; // Slightly friendlier pitch
    utterThis.rate = 1.05;  // Slightly faster, more conversational pace
    synth.speak(utterThis);
}

// Load voices when they are ready (Chrome specific issue)
speechSynthesis.onvoiceschanged = () => {
    synth.getVoices();
};
