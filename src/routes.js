import Home from './pages/Home.vue'
import Sheet from './pages/Sheet.vue'
import Lobby from './pages/Lobby.vue'
import Cluster from './pages/Cluster.vue'
import Fail from './pages/404.vue'
import Callback from './pages/Callback.vue'

export default [
	{ 
		path: '/',
		component: Home
	},
	{
		path: '/lobby',
		component: Lobby
	},
	{
		path: '/lobby/:cluster',
		component: Cluster,
		props: true
		
	},
	{
		path: '/lobby/:cluster/:sheet',
		component: Sheet,
		props: true
	},
	{
		path: '/twitter/callback',
		component: Callback
		
	},
	{
		path: '*',
		component: Fail
	}
]