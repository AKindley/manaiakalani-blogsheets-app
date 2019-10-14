
import Vue from 'vue/dist/vue.js'
import VueRouter from 'vue-router'
import routes from './routes'
import axios from 'axios'
import VueAxios from 'vue-axios'
var config = require('./config.json');
var server = config.serverUrl + ':' + config.serverPort;

Vue.config.productionTip = false
Vue.use(VueRouter);
Vue.use(VueAxios, axios);
axios.defaults.baseURL = server + '/api/'; //server url for backend http requests
axios.defaults.withCredentials = true;

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

