<template>
  <div>
	<button @click="goBack" style="float:left">BACK</button>
    <img alt="Vue logo" src="../assets/logo.png"><br>
	<span>CLUSTERS</span><br>
	<button @click="add">ADD CLUSTER</button>
	<button @click="processAll">Process All Sheets</button>
	<ClusterDiv v-for="group in groups" :key="group.name" :cluster="group"/>
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
			this.axios.post('/sheets/process/complete');
		}
  },
  mounted () {
		let uri = '/entries/';
		this.axios.get(uri).then((response) => {
			this.groups = response.data;
		});
  }
}

</script>


