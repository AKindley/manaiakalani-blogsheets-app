import Vue from 'vue'
import routes from './routes'
Vue.config.productionTip = false
const app = new Vue({
  el: '#app',
  data: {
    currentRoute: window.location.pathname
  },
  computed: {
    ViewComponent () {
		const matchingView = routes[this.currentRoute]
		return matchingView //Listens for changes in this.auth2 
			? () => import('./pages/' + matchingView + '.vue')
			: () => import('./pages/404.vue')
    }
  },
  render (h) {
    return h(this.ViewComponent) //renders the returned component 
  }
})

window.init = function(){ // Need to work out how to persist (Not just on load)
	gapi.load('client:auth2', function() {
	gapi.auth2.init({client_id: '1004381020845-kd42skbm4f5vnvmobhl64ifc82i6h2im.apps.googleusercontent.com', scope:'https://www.googleapis.com/auth/spreadsheets.readonly'});
	});
	
}
window.addEventListener('popstate', () => {
  app.currentRoute = window.location.pathname
})
