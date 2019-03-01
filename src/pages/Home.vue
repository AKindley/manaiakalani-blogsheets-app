<template>
  <div>
    <img alt="Vue logo" src="../assets/logo.png">
    <HelloWorld msg="Vue Test App"/>
  </div>
</template>
<script>
import HelloWorld from '../components/HelloWorld.vue'

export default {
  name: 'home',
  components: {
    HelloWorld
  }
}

</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  background-color:white;
  color: #2c3e50;
  width:800px;
  margin:auto;
  min-height:100%;
  box-shadow: 0px 0px 30px 5px black;
  padding-bottom: 40px;
}

html {
	height:100%;
}

body {
	height:100%;
	background-color: #1c43ab;
	margin-top:0px;
	margin-bottom:0px;
}
</style>
