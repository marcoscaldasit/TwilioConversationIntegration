require("dotenv").config();
const express = require("express");
const cors = require("cors");
const twilio = require('twilio');
const { User } = require("@twilio/conversations");

const app = express();
app.use(cors());
app.use(express.json());

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const AccessToken = twilio.jwt.AccessToken;
const ChatGrant = AccessToken.ChatGrant;

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioApiKey = process.env.TWILIO_API_KEY_SID;
const twilioApiSecret = process.env.TWILIO_API_KEY_SECRET;
const serviceSid = process.env.TWILIO_CONVERSATIONS_SERVICE_SID;

const userStates = {}; // Estrutura de dados para armazenar o estado do usuário

function getAccessToken(user) {
  const token = new AccessToken(
    twilioAccountSid,
    twilioApiKey,
    twilioApiSecret,
    { identity: user }
  );
  token.addGrant(new ChatGrant({
    serviceSid: serviceSid,
  }));

  return token.toJwt();

}


// Teste

app.get("/", (req, res) => {
  res.send("Server is up and running!");
});

app.get("/auth/user/:user", (req, res) => {
  try {
    const jwt = getAccessToken(req.params.user);
    res.send({ token: jwt });
  } catch (error) {
    console.log("Erro ao gerar token:", error);
    res.status(500).send("Erro ao gerar token");
  }
});

app.post("/reconnect/:user", async (req, res) => {
  try {
    const user = req.params.user;
    const state = userStates[user];

    if (state === "disconnected" || state === "denied") {
      const jwt = getAccessToken(user);
      userStates[user] = "connected";
      res.send({ token: jwt });
    } else {
      res.status(200).send({ message: "User is already connected" });
    }
  } catch (error) {
    console.log("Erro ao conectar:", error);
    res.status(500).send("Erro ao conectar");
  }
});

app.post('/trigger-flow', async (req, res) => {
  try {
    const { conversationSid, message, cpf } = req.body;
  
    console.log(`Recebido conversationSid: '${conversationSid}', message: '${message}', cpf: '${cpf}'`);

    if (!conversationSid || !message || !cpf) {
      res.status(400).send({ error: "conversationSid, message ausentes ou cpf ausentes" });
      return;
    }

    const flowSid = process.env.TWILIO_FLOW_SID;

    const execution = await client.studio.v2.flows(flowSid).executions.create({
      to: conversationSid,
      from: 'AGWeb', // Certifique-se que 'Web App App' é um identificador válido
      parameters: { message, cpf }
    });
    // Armazenar o estado atual do usuário
    userStates[conversationSid] = { step: 1, lastMessage: message, executionSid: execution.sid, reply: false };
    res.status(200).json({ success: true, responseMessage: "Mensagem recebida", userMessage: message });

  } catch (error) {
    console.error("Erro ao acionar o fluxo:", error);
    res.status(500).json({ error: "Erro ao acionar o fluxo" });
  }
});

app.post('/continue-flow', async (req, res) => {
  try {
    const { conversationSid, message } = req.body;

    if (!conversationSid || !message) {
      res.status(400).send({ error: "conversationSid ou message ausentes" });
      return;
    }

    const state = userStates[conversationSid];
    if (!state) {
      res.status(400).send({ error: "Estado do usuário não encontrado" });
      return;
    }

    userStates[conversationSid].lastMessage = message;
    userStates[conversationSid].reply = true;
    console.log('userStates[conversationSid]', userStates[conversationSid]);

    res.status(200).json({ success: true, responseMessage: "Mensagem processada com sucesso", message });
  } catch (error) {
    console.error("Erro ao processar resposta do usuário:", error);
    res.status(500).json({ error: "Erro ao processar resposta do usuário" });
  }
});

/*Webhook principal, ele é acionado quando o usuário ou a Twilio envia mensagens automática e serve para
* Registrar o estado da conversa
* Decidir o fluxo de resposta com base no type da query
*/ 
app.post('/twilio-webhook', async (req, res) => {
  const { type } = req.query;
  const { conversationSid, message } = req.body;

  if (!conversationSid || !message) {
    console.error("Erro: conversationSid ou message ausentes");
    console.log('Payload recebido:', req.body);
    res.status(400).send({ error: "conversationSid ou message ausentes" });
    return;
  }

  try {
    console.log(`Recebido conversationSid: '${conversationSid}', message: '${message}'`);
    // Armazenar o estado atual do usuário
    if (!userStates[conversationSid]) {
      userStates[conversationSid] = { step: 1, lastMessage: message };
    } else {
      userStates[conversationSid].lastMessage = message;
    }

    // Enviar mensagem ao frontend para exibir a resposta
    await enviarMensagemParaChat(conversationSid, message);

    let myInterval;
    let x = 0;
    const executionTime = process.env.EXECUTION_TIME ? parseInt(process.env.EXECUTION_TIME) : 20;
    switch (type) {
      case 'website_reply':
        myInterval = setInterval(() => {
          x++;
          if (x == executionTime || userStates[conversationSid].reply) {
            const reply = userStates[conversationSid].reply ? 'reply' : 'no-reply'
            userStates[conversationSid].reply = false;
            res.status(200).send({ replyStatus: reply, message: userStates[conversationSid].lastMessage });
            clearInterval(myInterval);
          }
        }, 1000);
        break;
      case 'nomatch':
        userStates[conversationSid].reply = false;
        res.status(200).send({ replyStatus: reply, message: userStates[conversationSid].lastMessage });
        break;

      default:

        myInterval = setInterval(() => {
          x++;
          console.log(executionTime);
          console.log(typeof executionTime);
          if (x === executionTime || userStates[conversationSid].reply) {
            res.status(200).send(userStates[conversationSid].lastMessage);
            userStates[conversationSid].reply = false;
            clearInterval(myInterval);
          }
        }, 1000);

        break;
    }


  } catch (error) {
    console.error("Erro ao processar mensagem do Twilio:", error);
    res.status(500).json({ error: "Erro ao processar mensagem do Twilio" });
  }
});

app.post('/user-response', async (req, res) => {
  const { conversationSid, userMessage } = req.body;

  if (!conversationSid || !userMessage) {
    res.status(400).json({ error: "conversationSid or userMessage missing" });
    return;
  }

  try {
    // Update user state or perform any necessary actions based on user response
    console.log(`User responded in conversation ${conversationSid}: ${userMessage}`);

    // Check if the user wants to end the conversation
    if (userMessage.toLowerCase().includes('sair')) {
      // End the conversation and remove user state
      delete userStates[conversationSid];
    }

    // Send user's message back to Twilio Studio
    const response = await client.studio.v2.flows(process.env.TWILIO_FLOW_SID)
      .executions
      .create({
        to: conversationSid,
        from: 'Web App App', // Verifique se 'Web App App' é um identificador válido para envio
        parameters: { userMessage }
      });

    console.log("Resposta do usuário enviada para o Twilio Studio:", response);

    // Continue waiting for more user messages
    res.status(200).json({ success: true, responseMessage: "User response received" });
  } catch (error) {
    console.error("Erro ao processar resposta do usuário:", error);
    res.status(500).json({ error: "Erro ao processar resposta do usuário" });
  }
});

async function enviarMensagemParaChat(conversationSid, message) {
  console.log(`enviarMensagemParaChat chamado com conversationSid: '${conversationSid}' e message: '${message}'`);
  await client.conversations.v1.conversations(
    conversationSid)
    .messages
    .create({ body: message })
    .then(message => console.log("Mensagem enviada para o chat:", message.sid))
    .catch(error => console.error("Erro ao enviar a mensagem para o chat:", error));
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Example app listening at http://localhost:${PORT}`);
});