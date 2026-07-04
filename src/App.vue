<template>
  <ChatComponent />
</template>

<script>
import ChatComponent from "./components/ChatComponent.vue"
import "@twilio/conversations"

export default {
  name: "App",
  components: {
    ChatComponent
  }
}
</script>

<style>
#app {
  font-family: "Encode Sans", Sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

body {
  background: url('/public/fundo.png') no-repeat center center fixed;
  /*Papel de parede da conversa*/
  background-size: cover;
}

#app input {
  padding: 12px 20px;
  margin: 8px 0;
  display: inline-block;
  border: 1px solid #000000;
  border-radius: 4px;
  box-sizing: border-box;
  margin-right: 5px;
  width: 70%;
  position: sticky;
  bottom: 0;
  left: 0;
  background: #fff;
}

#app button {
  background-color: rgb(0, 0, 0);
  color: white;
  padding: 14px 20px;
  margin: 8px 0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
