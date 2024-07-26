<template>

  <div id="chat">
    <h1 class="titulo">
      Seja bem vindo a AGWeb<span v-if="cpfRegistered">, {{ name }}</span>!
    </h1>
    <p>
      <i v-if="isConnected" class="bi bi-circle-fill text-success"></i>
      <i v-else class="bi bi-circle-fill text-danger">Desconectado</i>
      {{ statusString }}
    </p> <!-- Adicionado ícone de status -->
    <div v-if="!cpfRegistered">
      <input @keyup.enter="registerCPF" v-model="cpf" placeholder="Digite seu CPF" />
      <div v-if="!nameRegistered">
        <input @keyup.enter="registerName" v-model="name" placeholder="Digite seu Nome" />
      </div>
      <button @click="registerCPF">Entrar</button>
    </div>

    <!--
    <div v-if="nameRegistered && !activeConversation && isConnected">
      <button @click="createOrJoinConversation">Iniciar Conversa!</button>
    </div> -->

    <ConversationComponent v-if="activeConversation" :active-conversation="activeConversation" :cpf="cpf" />
  </div>
</template>

<script>
import { Client as ConversationsClient } from "@twilio/conversations";
import ConversationComponent from "./ConversationComponent.vue";

export default {
  components: { ConversationComponent },
  data() {
    return {
      statusString: "",
      activeConversation: null,
      cpf: "",
      cpfRegistered: false,
      name: "",
      nameRegistered: false,
      isConnected: false,
    };
  },
  methods: {
    async initConversationsClient() {
      try {
        this.statusString = "Connecting to Twilio…";
        const token = await this.getToken(this.cpf);
        this.conversationsClient = new ConversationsClient(token);

        this.conversationsClient.on("connectionStateChanged", (state) => {
          switch (state) {
            case "connected":
              this.statusString = "Você está conectado";
              this.isConnected = true;
              this.createOrJoinConversation();
              break;
            case "disconnecting":
              this.statusString = "Desconectando...";
              break;
            case "disconnected":
              this.statusString = "Desconectado.";
              this.isConnected = false;
              break;
            case "denied":
              this.statusString = "Falha ao conectar";
              this.isConnected = false;
              break;
            default:
              this.statusString = `Estado de conexão desconhecido: ${state}`;
          }
        });
      } catch (error) {
        console.error("Erro ao iniciar.", error);
      }
    },

    async registerCPF() {
      try {
        this.cpfRegistered = true;
        await this.initConversationsClient();
      } catch (error) {
        console.error("Erro ao registrar o CPF", error);
      }
    },
    async registerName() {
      try {
        this.nameRegistered = true;
        await this.initConversationsClient();
      } catch (error) {
        console.error("Erro ao registrar o nome", error);
      }
    },

    async createOrJoinConversation() {
      try {
        let conversation = await this.conversationsClient.getConversationByUniqueName(this.cpf);
        this.activeConversation = conversation;
        await this.addParticipantToConversation(conversation.sid, "AGWeb");
        await this.addParticipantToConversation(conversation.sid, this.cpf);
        await this.addParticipantToConversation(conversation.sid, this.name);
      } catch (error) {
        if (error.message.includes("Not Found")) {
          try {
            let newConversation = await this.conversationsClient.createConversation({
              uniqueName: this.cpf,
            });
            await newConversation.join();
            this.activeConversation = newConversation;
            await this.addParticipantToConversation(newConversation.sid, "AGWeb");
            await this.addParticipantToConversation(newConversation.sid, this.cpf);
            await this.addParticipantToConversation(newConversation.sid, this.name);
          } catch (createError) {
            console.error("Erro ao criar a conversa", createError);
          }
        } else {
          console.error("Error fetching conversation:", error);
        }
      }

      if (!this.activeConversation) {
        console.error("activeConversation not properly initialized.");
      }
    },

    async addParticipantToConversation(conversationSid, participantIdentity) {
      try {
        const conversation = await this.conversationsClient.getConversationBySid(conversationSid);

        const participants = await conversation.getParticipants();
        const participantExists = participants.some(
          (participant) => participant.identity === participantIdentity
        );

        if (!participantExists) {
          await conversation.add(participantIdentity);
        } else {
          console.log(`Participant ${participantIdentity} is already in conversation ${conversationSid}.`);
        }
      } catch (error) {
        console.error(`Error adding participant ${participantIdentity} to conversation ${conversationSid}:`, error);
      }
    },

    async getToken(identity) {
      try {
        const response = await fetch(`http://localhost:5000/auth/user/${identity}`);
        if (!response.ok) {
          throw new Error("Error fetching Twilio authentication token");
        }
        const responseJson = await response.json();
        return responseJson.token;
      } catch (error) {
        console.error("Error fetching Twilio authentication token:", error);
        throw error;
      }
    },
  },
};
</script>


<style scoped>
/* Importanto biblioteca para ícones*/

@import 'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css';
@import 'https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.10.5/font/bootstrap-icons.min.css';

.titulo {
  font-family: "Encode Sans", Sans-serif;
  font-size: 28px;
  word-wrap: break-word;
  overflow-wrap: break-word;
  /* Garante a quebra de palavras longas */
  white-space: normal;
  /* Permite quebra de linha no texto */
  text-align: center;
  padding: 0 10px;
}

@media (max-width: 600px) {
  .titulo {
    font-size: 24px;
  }

}

@media (max-width: 400px) {
  .titulo {
    font-size: 22px;
  }
}
</style>
