import Home from './pages/Home.vue'
import Login from './pages/Login.vue'
import Sheet from './pages/Sheet.vue'
import Lobby from './pages/Lobby.vue'
import Cluster from './pages/Cluster.vue'
import Fail from './pages/404.vue'
import Callback from './pages/Callback.vue'

export default [
	{ 
		path: '/',
		component: Fail,
		meta: {
			requiresAuth:false
		}
	},
	{ 
		path: '/login',
		component: Login,
		meta: {
			requiresAuth:false
		}
	},
	{
		path: '/lobby',
		component: Lobby,
		meta: {
			requiresAuth:true
		}
	},
	{
		path: '/lobby/:cluster',
		component: Cluster,
		props: true,
		meta: {
			requiresAuth:true
		}
	},
	{
		path: '/lobby/:cluster/:sheet',
		component: Sheet,
		props: true,
		meta: {
			requiresAuth:true
		}
	},
	{
		path: '/auth/twitter/callback',
		component: Callback,
		meta: {
			requiresAuth:false
		}
	},
	{
		path: '*',
		component: Fail
	}
]