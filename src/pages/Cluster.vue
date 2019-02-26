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
		<button @click="sheetsGo">Add a sheet</button><br>
		<button v-for="sheet in clusterSheets" @click="sheetsGoPlease" :data-key="sheet._id" :key="sheet._id">{{sheet.name}}</button><br>
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
		clusterTwitter: '',
		clusterSheets: {}
	}
  },
  /*computed: {
	groupSel: function () {
		let uri = 'http://localhost:4000/entries/edit/' + this.cluster;
		this.axios.get(uri).then((response) => {
			console.log(response)
			this.groups = response.data;
		});		
	}
  },*/
  methods: {
	sheetsGo () {
		this.$router.push(window.location.pathname + '/add');
	},
	sheetsGoPlease (event) {
		this.$router.push(window.location.pathname + '/' + event.currentTarget.getAttribute('data-key'));
	},
	submitMe (event) {
		event.preventDefault();
		/*console.log('Your Cluster is: ' + this.clusterName);
		console.log('Your Twitter Handle is: ' + this.clusterTwitter);*/
		let uri = 'http://localhost:4000/entries/add';
		let testThing = {};
		testThing.name = this.clusterName;
		testThing.twitter = this.clusterTwitter;
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
		testThing.name = this.clusterName;
		testThing.twitter = this.clusterTwitter;
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
		let uri2 = 'http://localhost:4000/sheets/' + this.cluster;
		this.axios.get(uri2).then((response) => {
			console.log(response);
			this.clusterSheets = response.data;
		});
	}
  }
}

</script>

