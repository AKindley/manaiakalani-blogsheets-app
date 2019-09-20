<template>
	<div class="group-div" @click="clusterLink">
		<div style="position:absolute;left:0;width:60%;">
			{{cluster.name}}
		</div>
		<div style="position:absolute;right:0;width:40%;background-color:red;height:100%;display:inherit;align-items:inherit;border-left:inherit" 
		:style="[cluster.error[0].errorCount ? {'background-color' : 'red'} : {'background-color':'green'}]">
			<div id="errorList" style="margin:auto" v-if="cluster.error[0].errorCount">
					{{cluster.error[0].errorCount}} {{cluster.error[0].errorCount == 1 ? "Error":"Errors"}} on {{cluster.error[0].sheetCount}} {{cluster.error[0].sheetCount == 1 ? "Sheet":"Sheets"}}	
			</div>
			<div style="margin:auto" v-else>
				No Errors
			</div>
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
		height:40px;
		margin:auto;
		position:relative;
		border:3px solid black;
		margin-top:30px;
		overflow:hidden;
		border-radius:4px;
		cursor: pointer;
		color:black;
		font-size:larger;
		display:flex;
		align-items:center;
	}
	
	.group-div:hover{
		border-color: #4289ca;
	}
	
	li {
		padding-bottom:5px;
	}
</style>