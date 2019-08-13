
import Vue from 'vue/dist/vue.js'
import VueRouter from 'vue-router'
import routes from './routes'
import axios from 'axios'
import VueAxios from 'vue-axios'
var config = require('./config.json');
var server = config.serverAddress;

Vue.config.productionTip = false
Vue.use(VueRouter);
Vue.use(VueAxios, axios);
axios.defaults.baseURL = server; //server url for backend http requests

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

