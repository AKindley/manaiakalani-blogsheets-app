<template>
  <div>
	<button @click="goBack" style="float:left">BACK</button>
    <img alt="Vue logo" src="../assets/logo.png"><br>
	<button @click="add">ADD CLUSTER</button>
	<button @click="processAll">Process All Sheets</button>
	<button @click="sessionCall">TEST SESSION</button>
	<div style="margin-top:40px;margin-left:40px;margin-right:40px;border:3px solid #1c43ab;border-radius:4px;background-color:white;color:black;padding-bottom:30px">
		<div style="padding:5px;font-size:larger;border-bottom:3px solid #1c43ab;background-color:#4289ca"><b>Clusters</b></div>
		<ClusterDiv v-for="group in groups" :key="group.name" :cluster="group"/>
	</div>
  </div>
</template>
<script>
import ClusterDiv from '../components/ClusterDiv.vue'
export default {
	name: 'mainpage',
	components: {
		ClusterDiv
	},
	data () {
		return {
			groups: []
		}
  },
  methods: {
		add (event) {
			event.preventDefault();
			this.$router.push(window.location.pathname + '/add');
		},
		goBack (event){
			event.preventDefault();
			this.$router.go(-1);
		},
		processAll (event) {
			event.preventDefault();
			if (this.sessionCall()){
				this.axios.post('/sheets/process/complete').then((res)=>{
					console.log(res);
				});
			}
			else{this.$router.push('/')}
		},
		sessionCall () {
			this.axios.get('/auth/google/session').then((res) => {
				return res.data;
			});
		}
  },
  mounted () {
		let uri = '/entries/';
		this.axios.get(uri).then((response) => {
			if (response.data){
				this.groups = response.data;
			}
			else{this.$router.push('/');}
		});
  }
}

</script>


