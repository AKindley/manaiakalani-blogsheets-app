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
			groups: [
				{name: 'Manaiakalani is cool', twitter: 'manaiakalani@', numSheets: 20, error: false},
				{name: "Me", twitter: 'me@', numSheets: 50, error: true, errorMsg: 'stuff went bad'}
			]
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
  }
}

</script>


