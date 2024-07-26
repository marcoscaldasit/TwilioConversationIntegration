<template>
  <div id="conversation">
    <div class="conversation-container">
      <div v-for="message in messages" :key="message.sid" class="bubble-container"
        :class="{ myMessage: message.author === cpf }">
        <div class="bubble">
          <div class="name">{{ message.author === 'system' ? 'Teddy AGWeb' : message.author }}:
        </div>
        <div class="message" v-html="formatMessage(message.body)"></div>
      </div>
    </div>
  </div>
  <div class="input-container">
    <!--Mudança de input para textarea, além disso, o evento adjustTextareaHeight foi adicionado para garantir
      que a altura do textarea seja ajustada automaticamente conforme o usuário digita as mensagens -->
    <textarea v-model="messageText" @keydown.enter="handleEnter" @input="adjustTextareaHeight" class="form-control"
      placeholder="Digite sua mensagem"></textarea>
    <button @click="sendMessage" :disabled="isSending" class="btn btn-success">
      <i class="bi bi-send"></i>
    </button>
  </div>
  </div>
</template>

<script>
export default {
  props: {
    activeConversation: {
      type: Object,
      required: true,
    },
    cpf: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      messages: [],
      messageText: "",
      isSending: false,
      isFirstMessage: true,
    };
  },
  mounted() {
    this.loadMessages();
    this.activeConversation.on("messageAdded", (message) => {
      this.messages.push(message);
      this.scrollToBottom();
    });
    // Adiciona um ouvinte de evento para ajustar a altura do textarea
    const textarea = this.$el.querySelector('textarea');
    textarea.addEventListener('input', this.adjustTextareaHeight);
  },
  methods: {
    formatMessage(message) {
    formatMessage(message) {
      if (message.includes('\n')) {
        const items = message.split('\n');
        return items.join('<br>')
      }
      return message;
    },
    async loadMessages() {
      try {
        const newMessages = await this.activeConversation.getMessages();
        this.messages = newMessages.items;
        this.scrollToBottom();
      } catch (error) {
        console.error("Error loading messages:", error);
      }
    },
    handleEnter(event) {
      if (event.shiftKey) {
        return;
      }
      event.preventDefault();
      this.sendMessage();
    },
    async sendMessage() {
      if (!this.activeConversation) {
        console.error("No active conversation to send message to.");
        return;
      }
      if (!this.messageText) {
        console.error("Message is empty or undefined.");
        return;
      }
      try {
        this.isSending = true;
        await this.activeConversation.sendMessage(this.messageText);

        // Determinar se estamos iniciando ou continuando o fluxo
        const endpoint = this.isFirstMessage ? "trigger-flow" : "continue-flow";
        this.isFirstMessage = false;

        const response = await fetch(`http://localhost:5000/${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversationSid: this.activeConversation.sid,
            message: this.messageText,
            cpf: this.cpf
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to trigger Flow");
        }

        const data = await response.json();
        console.log("Flow triggered successfully:", data);

        this.messageText = "";
        this.resetTextareaHeight(); // Reseta a altura da textarea após o envio da mensagem
      } catch (error) {
        console.error("Error triggering Flow:", error);
      } finally {
        this.isSending = false;
        this.scrollToBottom();
      }
    },
    /*
    Função criada para ajustar dinamicamente a altura do textarea conforme o usuário digita a mensagem, o evento 'input'
    chama essa função sempre que o conteúdo do textarea muda
    */

    adjustTextareaHeight(event) {
      const textarea = event.target;
      textarea.style.height = 'auto'; // Reseta a altura
      textarea.style.height = `${textarea.scrollHeight}px`; // Ajusta para o scrollHeight
    },
    resetTextareaHeight() {
      const textarea = this.$el.querySelector('textarea');
      textarea.style.height = 'auto'; // Reseta a altura
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$el.querySelector(".conversation-container");
        container.scrollTop = container.scrollHeight;
      });
    },
  },
};
</script>

<style>
body,
html {
  margin: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  overflow: hidden;
  /* Impede o scroll na tela inteira */
}

#conversation {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  max-height: 80vh;
  min-height: 80vh;

  /* Altura máxima para o contêiner */
}

.conversation-container {
  margin: 0 auto;
  width: 100%;
  padding: 0 20px;
  flex: 1;
  overflow-y: auto;
}

.bubble-container {
  display: flex;
  flex-direction: column;
  margin: 10px 0;
}

.bubble {
  display: inline-block;
  border: 2px solid #f1f1f1;
  background-color: #fdfbfa;
  border-radius: 10px;
  padding: 10px;
  max-width: 40%;
  word-wrap: break-word;
}

.myMessage .bubble {
  background-color: #008069;
  border: 1px solid #6666667c;
  align-self: flex-end;
  color: rgb(255, 255, 255);
  text-align: start;
}

.bubble-container:not(.myMessage) .bubble {
  background-color: rgb(253, 253, 253);
  border: 1px solid #49494996;
  align-self: flex-start;
  color: rgb(0, 0, 0);
  text-align: start;
}

.name {
  font-size: 12px;
  font-weight: bold;
  margin-bottom: 5px;
  text-align: left;
}

.message {
  font-size: 14px;
}

/*
Alinhei os itens como flex-end para que botão de envio da mensagem fique alinhado no final do campo textarea. 
*/
.input-container {
  display: inline-flex;
  align-items: flex-end;
  /* Alinha o botão com o final do textarea */
  border-top: 1px;
  background-color: #f9f9f900;
  padding: 10px;
  box-sizing: border-box;
  width: 100%;
  background: #ffffff00;
}

/* O campo textarea agora possui resize: none, isso evita que o redimensionamento manual seja feito, além disso, o campo
"cresce" automaticamente conforme o texto é digitado, fazendo com que o botão de envio da mensagem fique na posição correta*/
.input-container textarea {
  flex-grow: 1;
  height: auto;
  min-height: 20px;
  max-height: 150px;
  padding: 10px;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 5px;
  box-sizing: border-box;
  word-wrap: break-word;
  margin-right: 10px;
  resize: none;
}

.input-container button {
  padding: 10px 20px;
  border: none;
  background-color: rgb(167, 219, 46);
  color: white;
  border-radius: 5px;
  cursor: pointer;
}

.input-container button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

/* Estilizações para a barra de rolagem */
::-webkit-scrollbar {
  width: 12px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  margin: 20px 0;
}

::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 6px;
  border: 3px solid transparent;
  background-clip: padding-box;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* Responsividade para Mobile */
@media (max-width: 600px) {
  .bubble {
    max-width: 60%;
  }

  .input-container textarea {
    font-size: 14px;
  }

  #conversation {
    display: flex;
    flex-direction: column;
    height: 100vh;
    /* Ocupa toda a altura da tela */
  }

  .conversation-container {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
  }

  .input-container {
    width: 100%;
    padding: 10px 20px 10px 20px;
    background-color: #f9f9f9;
    border-top: 1px solid #ccc;
  }
}

/* Responsividade para Tablets */
@media (min-width: 601px) and (max-width: 1024px) {
  .conversation-container {
    width: 95%;
    padding: 0 15px;
    /* Ajuste o padding conforme necessário */
  }

  .input-container textarea {
    font-size: 16px;
    min-height: 40px;
  }

  .input-container button {
    padding: 12px 18px;
    font-size: 16px;
  }
}

/* Ajustes adicionais para telas menores que 400px */
@media (max-width: 400px) {
  .bubble {
    max-width: 50%;
    padding: 8px;
    font-size: 12px;
  }

  .name {
    font-size: 10px;
  }

  .message {
    font-size: 12px;
  }

  .input-container {
    padding: 5px;
  }

  .input-container textarea {
    font-size: 12px;
    padding: 5px;
  }

  .input-container button {
    padding: 5px 5px;
    font-size: 10px;
  }

  .conversation-container {
    padding: 5px;
  }
}
</style>