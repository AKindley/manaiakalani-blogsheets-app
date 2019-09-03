<template>
	<div class="group-div" @click="clusterLink">
		<div style="position:absolute;left:0;width:50%;height:100%">
			<ul style="list-style-type:none;text-align:left;font-size:large;">
				<li>Name: {{cluster.name}}</li>
				<li>Twitter: {{cluster.twitter}}</li>
			</ul>
		</div>
		<div style="position:absolute;right:0;height:100%;width:50%;/*background-color:red*/" v-if="cluster.error">
			<ul id="errorList">
				<li v-for="error in cluster.error" :style="[error.error ? {'background' : 'red'} : {'background':'green'}]">
				{{error.name}}: {{error.error ? "ERROR" : "OK"}}
				</li>
			</ul>
		</div>
	</div>
</template>

<script>
	export default {
		name: 'ClusterDiv',
		props: {
			cluster: Object
		},
		methods:{
			clusterLink (event) {
				event.preventDefault();
				this.$router.push(window.location.pathname + '/' + this.cluster._id);
			}
		}
		
		
	}
</script>

<style scoped>
	.group-div {
		width:calc(100% - 80px);
		height:100px;
		margin:auto;
		position:relative;
		border:3px solid black;
		margin-top:30px;
		overflow:hidden;
		border-radius:4px;
		cursor: pointer
	}
	
	.group-div:hover{
		border-color: #4289ca
	}
	
	li {
		padding-bottom:5px;
	}
</style>