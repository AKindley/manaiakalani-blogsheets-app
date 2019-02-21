<template>
  <div>
	<button @click="goBack" style="float:left">BACK</button>
    <img alt="Vue logo" src="../assets/logo.png"><br>
	<div v-if="cluster !== 'add'">
		<span>Name: {{groupSel.name}}</span><br>
		<span>Twitter: {{groupSel.twitter}}</span><br>
		<span>Number of sheets: {{groupSel.numSheets}}</span><br>
		<button @click="sheetsGo">Sheet1/Add a sheet</button>
	</div>
	<div v-else>
		<span> Cluster Name: </span><br>
		<input v-model="clusterName" placeholder="name..."><br>
		<span> Twitter Handle: </span><br>
		<input v-model="clusterTwitter" placeholder="twitter..."><br>
		<button @click="submitMe">Submit</button>
	</div>
  </div>
</template>
<script>

export default {
  name: 'clusterzz',
  props: ['cluster'],
  data () {
	return {
		groups: [
			{name: 'Manaiakalani is cool', twitter: 'manaiakalani@', numSheets: 20, error: false},
			{name: "Me", twitter: 'me@', numSheets: 50, error: true, errorMsg: 'stuff went bad'}
		],
		clusterName: '',
		clusterTwitter: ''
	}
  },
  computed: {
	groupSel: function () {
		let index = this.groups.findIndex(x => x.name === decodeURI(this.cluster));
		return this.groups[index];
	}
  },
  methods: {
	sheetsGo () {
		this.$router.push(window.location.pathname + '/sheet1');
	},
	submitMe (event) {
		event.preventDefault();
		console.log('Your Cluster is: ' + this.clusterName);
		console.log('Your Twitter Handle is: ' + this.clusterTwitter);
		this.$router.go(-1);
	},
	goBack () {
		this.$router.go(-1);
	}
  }
}

</script>

