/* global gapi */

import Vue from 'vue/dist/vue.js'
import VueRouter from 'vue-router'
import routes from './routes'
import axios from 'axios'
import VueAxios from 'vue-axios'

Vue.config.productionTip = false
Vue.use(VueRouter);
Vue.use(VueAxios, axios);
axios.defaults.baseURL = 'http://localhost:4000'; //server url for backend http requests

const router = new VueRouter({
	mode: 'history',
	routes
})

new Vue({
  router: router,
  data () {
	  return{
		  signedIn: false
	  }
  }
}).$mount('#app');

/*window.init = function(){ // Need to work out how to persist (Not just on load)
	console.log("This happened")
	gapi.load('client:auth2', function() {
	gapi.auth2.init({client_id: '1004381020845-kd42skbm4f5vnvmobhl64ifc82i6h2im.apps.googleusercontent.com', scope:'https://www.googleapis.com/auth/spreadsheets.readonly'});
	});
	
}*/
