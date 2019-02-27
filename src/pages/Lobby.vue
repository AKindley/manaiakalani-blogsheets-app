<template>
  <div>
	<button @click="goBack" style="float:left">BACK</button>
    <img alt="Vue logo" src="../assets/logo.png"><br>
	<span>CLUSTERS</span><br>
	<button @click="add">ADD CLUSTER</button>
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


