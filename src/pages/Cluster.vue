<template>
  <div>
	<button @click="goBack" style="float:left">BACK</button>
    <img alt="Vue logo" src="../assets/logo.png"><br>
		<label>Cluster Name: <div>
			<input v-if="editing" v-model="clusterName" placeholder="name...">
			<span v-if="!editing">{{clusterName}}</span>
		</div></label>
		<label>Twitter Handle: <div>
			<span v-if="!editing">{{clusterTwitter}}</span>
			<input v-if="editing" v-model="clusterTwitter" placeholder="twitter...">
		</div></label>
	<div>
	<div v-if="!groups.access_token&&cluster!=='add'&&loaded==true" style="height:75px;margin:auto;position:relative;color:black;margin-top:30px;overflow:hidden;font-size:larger;background-color:#4289ca">
		<div style="height:35%;font-weight:bold;display:flex">
			<label style="margin:auto;margin-bottom:0px">Sign in to Twitter to associate the account with this cluster:</label>
		</div>
		<div style="display:flex;align-items:center;margin:auto;height:65%;width:100%">
			<img @click="twitterLog" style="margin:auto" src="../assets/tSignin.png"/>
		</div>
	</div>
	<div v-if="cluster !== 'add'">
		<button style="float:left;margin-top:10px;margin-left:40px" @click="sheetsGo">Add a sheet</button>
		<button :disabled="!editing" style="float:right; margin-right:40px;margin-top:10px" @click="update">UPDATE</button>
		<button style="float:right;margin-top:10px;" @click="editCluster">{{editing ? 'CANCEL' : 'EDIT CLUSTER'}}</button><br><br>
		<div v-if="errorSheets.length > 0" style="margin-top:40px;margin-left:40px;margin-right:40px;border:3px solid red;border-radius:4px;background-color:#ffb2ae;color:black;padding-bottom:30px">
			<div style="padding: 5px;font-size:larger;border-bottom:3px solid red;background-color:#ff6961"><b>Sheets With Errors: {{errorSheets.length}}</b></div>
			<SheetDiv v-for="sheet in errorSheets" :key="sheet._id" :sheet="sheet" />
		</div>
		<div v-if="okSheets.length" style="margin-top:40px;margin-left:40px;margin-right:40px;border:3px solid #1c43ab;border-radius:4px;background-color:white;color:black;padding-bottom:30px">
			<div style="padding:5px;font-size:larger;border-bottom:3px solid #1c43ab;background-color:#4289ca"><b>Sheets</b></div>
			<SheetDiv v-for="sheet in okSheets" :key="sheet._id" :sheet="sheet"/>
		</div>
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
			clusterSheets: [],
			loaded: false
		}
	},
  
	methods: {
		sheetsGo () {
			this.$router.push(window.location.pathname + '/add');
		},
		sheetsGoPlease (event) {
			this.$router.push(window.location.pathname + '/' + event.currentTarget.getAttribute('data-key'));
		},
		async submitMe (event) {
			event.preventDefault();
			if(await this.sessionCall()){
				let uri = server + '/entries/add';
				let testThing = {};
				testThing.name = this.clusterName;
				testThing.twitter = this.clusterTwitter;
				this.axios.post(uri, testThing);
				this.$router.go(-1);
			}
			else{this.$router.push('/');}
		},
		goBack () {
			this.$router.go(-1);
		},
		async update (event) {
			event.preventDefault();
			if(await this.sessionCall()){
				let uri = '/entries/update/' + this.cluster;
				let testThing = this.groups;
				testThing.name = this.clusterName;
				testThing.twitter = this.clusterTwitter;
				this.axios.post(uri, testThing);
			}
			else{this.$router.push('/');}
		},
		editCluster (event) {
			event.preventDefault();
			this.editing = !this.editing;
		},
		async twitterLog(event) {
			event.preventDefault();
			if(await this.sessionCall()){
				window.open( server + '/auth/twitter/test/' + this.cluster); //Twitter auth link call
			}
			else{this.$router.push('/');}
		},
		async sessionCall () {
			return await this.axios.get('/auth/google/session').then((res) => {
				return res.data;
				});
		}
	},
	computed:{
		errorSheets: function(){
			let sArray = this.clusterSheets.filter(function(sheet){ 
				return sheet.error.length > 0;
			});
			return sArray;
		},
		okSheets: function(){
			let sArray = this.clusterSheets.filter(function(sheet){
				return sheet.error.length == 0;
			});
			return sArray;
		}
	},
	mounted () {
		if (this.cluster !== 'add') {
			let uri = '/entries/edit/' + this.cluster;
			this.axios.get(uri).then((response) => {
				if(response.data){
					this.groups = response.data;
					this.clusterName = this.groups.name;
					this.clusterTwitter = this.groups.twitter;
					this.loaded = true;
				}
				else{this.$router.push('/');}
			});
			let uri2 = '/sheets/' + this.cluster;
			this.axios.get(uri2).then((response) => {
				if (response.data){
					this.clusterSheets = response.data;
				}
				else{this.$router.push('/');}
			});
		}
	}
}

</script>
<style>
	img:hover{
		cursor:pointer
	}
</style>
