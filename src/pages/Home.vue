<template>
  <div>
    <img alt="Vue logo" src="../assets/logo.png"><br><br>
	<div class="googleButton" @click="googleLog">
		<img src="../assets/gNormal.png" class="img-normal">
		<img src="../assets/gPress.png" class="img-pressed">
		<img src="../assets/gFocus.png" class="img-focused">
	</div>
  </div>
</template>
<script>
var config = require('../config.json');
var server = config.serverAddress;
export default {
  name: 'home',
  methods:{
	  googleLog(event){
		  event.preventDefault();
		  window.location = server + '/auth/google';
	  }
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
.googleButton .img-normal{display:inline; z-index: 10}
.googleButton .img-focused{display:none; z-index: 20}
.googleButton .img-pressed{display:none; z-index: 30}
.googleButton:hover .img-focused{display:inline} .googleButton:hover .img-normal{display:none; z-index: 10}
.googleButton:active .img-pressed{display:inline} .googleButton:active .img-normal{display:none; z-index: 10} .googleButton:active .img-focused{display:none; z-index: 20}
</style>
