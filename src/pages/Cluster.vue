<template>
  <div>
	<button @click="goBack" style="float:left">BACK</button>
    <img alt="Vue logo" src="../assets/logo.png"><br>
	<div>
	<button @click="twitterLog">Twitter login</button>
		<label>Cluster Name: <div>
			<input v-if="editing" v-model="clusterName" placeholder="name...">
			<span v-if="!editing">{{clusterName}}</span>
		</div></label>
		<label>Twitter Handle: <div>
			<span v-if="!editing">{{clusterTwitter}}</span>
			<input v-if="editing" v-model="clusterTwitter" placeholder="twitter...">
		</div></label>
	<div v-if="cluster !== 'add'">
		<button style="float:left;margin-top:10px;margin-left:40px" @click="sheetsGo">Add a sheet</button>
		<button :disabled="!editing" style="float:right; margin-right:40px;margin-top:10px" @click="update">UPDATE</button>
		<button style="float:right;margin-top:10px;" @click="editCluster">{{editing ? 'CANCEL' : 'EDIT CLUSTER'}}</button><br>
		<SheetDiv v-for="sheet in clusterSheets" :key="sheet._id" :sheet="sheet"/>
	</div>
	<div v-else>
		<button @click="submitMe">Submit</button>
	</div>
	</div>
  </div>
</template>
<script>
import SheetDiv from '../components/SheetDiv.vue'
var config = require('../config.json');
var server = config.serverAddress;
export default {
  name: 'clusterzz',
  props: ['cluster'],
  components: {
	SheetDiv,
  },
  data () {
	return {
		editing: this.cluster === 'add' ? true : false,
		groups: {},
		clusterName: '',
		clusterTwitter: '',
		clusterSheets: {}
	}
  },
  
  methods: {
	sheetsGo () {
		this.$router.push(window.location.pathname + '/add');
	},
	sheetsGoPlease (event) {
		this.$router.push(window.location.pathname + '/' + event.currentTarget.getAttribute('data-key'));
	},
	submitMe (event) {
		event.preventDefault();
		let uri = server + '/entries/add';
		let testThing = {};
		testThing.name = this.clusterName;
		testThing.twitter = this.clusterTwitter;
		this.axios.post(uri, testThing);
		this.$router.go(-1);
	},
	goBack () {
		this.$router.go(-1);
	},
	update (event) {
		event.preventDefault();
		let uri = '/entries/update/' + this.cluster;
		let testThing = this.groups;
		testThing.name = this.clusterName;
		testThing.twitter = this.clusterTwitter;
		this.axios.post(uri, testThing);
		
	},
	editCluster (event) {
		event.preventDefault();
		this.editing = !this.editing;
	},
	twitterLog(event) {
		event.preventDefault();
		window.open( server + '/auth/twitter/test/' + this.cluster); //Twitter auth link call
	}
  },
  mounted () {
	if (this.cluster !== 'add') {
		let uri = '/entries/edit/' + this.cluster;
		this.axios.get(uri).then((response) => {
			this.groups = response.data;
			this.clusterName = this.groups.name;
			this.clusterTwitter = this.groups.twitter;
		});
		let uri2 = '/sheets/' + this.cluster;
		this.axios.get(uri2).then((response) => {
			this.clusterSheets = response.data;
		});
	}
  }
}

</script>

