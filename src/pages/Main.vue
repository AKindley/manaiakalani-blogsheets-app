<template>
  <div id="app">
    <img alt="Vue logo" src="../assets/logo.png">
    <HelloWorld msg="Vue Test App page 2"/>
	<Sheets />
  </div>
</template>
<script>
import HelloWorld from '../components/HelloWorld.vue'
import Sheets from '../components/Sheets.vue'
export default {
  name: 'app',
  components: {
    HelloWorld,
	Sheets
  }
}

</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
