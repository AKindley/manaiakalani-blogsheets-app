<template>
  <div>
	<button @click="goBack" style="float:left">BACK</button>
    <img alt="Vue logo" src="../assets/logo.png"><br>
	<div>
		<button @click="update">UPDATE</button><br>
		<span> Cluster Name: </span><br>
		<input v-model="clusterName" placeholder="name..."><br>
		<span> Twitter Handle: </span><br>
		<input v-model="clusterTwitter" placeholder="twitter..."><br>	
	<div v-if="cluster !== 'add'">
		<span>Number of sheets: {{groups.numSheets}}</span><br>
		<button @click="sheetsGo">Sheet1/Add a sheet</button>
	</div>
	<div v-else>
		<button @click="submitMe">Submit</button>
	</div>
	</div>
  </div>
</template>
<script>

export default {
  name: 'clusterzz',
  props: ['cluster'],
  data () {
	return {
		groups: {},
		clusterName: '',
		clusterTwitter: ''
	}
  },
  computed: {
	groupSel: function () {
		let uri = 'http://localhost:4000/entries/edit/' + this.cluster;
		this.axios.get(uri).then((response) => {
			console.log(response)
			this.groups = response.data;
		});		
	}
  },
  methods: {
	sheetsGo () {
		this.$router.push(window.location.pathname + '/sheet1');
	},
	submitMe (event) {
		event.preventDefault();
		/*console.log('Your Cluster is: ' + this.clusterName);
		console.log('Your Twitter Handle is: ' + this.clusterTwitter);*/
		let uri = 'http://localhost:4000/entries/add';
		let testThing = {};
		testThing.name = this.clusterName;
		testThing.twitter = this.clusterTwitter;
		testThing.numSheets = 2;
		this.axios.post(uri, testThing).then((response) => {
			console.log(response)
		});
		this.$router.go(-1);
	},
	goBack () {
		this.$router.go(-1);
	},
	update (event) {
		event.preventDefault();
		let uri = 'http://localhost:4000/entries/update/' + this.cluster;
		let testThing = this.groups;
		this.axios.post(uri, testThing).then((response) => {
			console.log(response);
		});
		
	}
  },
  mounted () {
	  if (this.cluster !== 'add') {
		let uri = 'http://localhost:4000/entries/edit/' + this.cluster;
		this.axios.get(uri).then((response) => {
			console.log(response)
			this.groups = response.data;
			this.clusterName = this.groups.name;
			this.clusterTwitter = this.groups.twitter;
		});				
	  }
  }
}

</script>

