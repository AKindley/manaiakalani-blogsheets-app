<template>
  <div class="hello">
    <h1>{{ msg }}</h1>
	<h2>{{this.$root.currentRoute}}</h2>
	<button @click="logout">Log Out</button>
	<div style="width: 120px; margin: auto" id="googbutt"></div>
  </div>
</template>

<script>
import json from './testJson.json'
import routes from '../routes'
export default {
  name: 'HelloWorld',
  props: {
    msg: String
  },
  data(){
	return{
	myJson: json,
	}
  },
  methods: {
	logout () {
		gapi.auth2.init({client_id: '1004381020845-kd42skbm4f5vnvmobhl64ifc82i6h2im.apps.googleusercontent.com'});
		const GoogleAuth = gapi.auth2.getAuthInstance();
		GoogleAuth.signOut();
		setTimeout(this.buggy, 4);
	},
	buggy () {
		this.$root.currentRoute = "/";
		window.history.pushState(
			null,
			routes["/"],
			"/"
		)		
	},
	onSignIn (user){ //seems to listen constantly, can't change the value of auth2 while logged in.
		const profile = user.getBasicProfile();
		this.$root.currentRoute  = "/main";
		window.history.pushState(
			null,
			routes["/main"],
			"/main"
		)
	}
  },
  mounted () {
		gapi.signin2.render('googbutt', {scope: 'email profile openid https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly', onsuccess : this.onSignIn})
  }  
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>
