<template>
	<div class="group-div" @click="sheetLink">
		<div style="position:absolute;left:0;width:50%;height:100%">
			<ul style="list-style-type:none;text-align:left;font-size:large;">
				<li>Name: {{sheet.title ? sheet.title : sheet.name}}</li>
				<li>Cell Range: {{sheet.range}}</li>
			</ul>
		</div>				
	</div>
</template>

<script>
	export default {
		name: 'SheetDiv',
		props: {
			sheet: Object,
		},
		methods: {
			sheetLink (event){
				event.preventDefault();
				this.$router.push(window.location.pathname + '/' + this.sheet._id);
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