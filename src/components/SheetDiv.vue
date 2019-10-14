<template>
	<div class="group-div" @click="sheetLink">
		<div style="position:absolute;display:flex;align-items:center;left:0;width:65%;height:100%;background-color:white">
			<div>
				<ul style="list-style-type:none;text-align:left;font-size:larger;">
					<li>{{sheet.title ? sheet.title : sheet.name}}</li>
				</ul>
			</div>
		</div>
		<div class="err-sect" :style="[sheet.error.length ? {'background' : 'red'} : {'background':'green'}]" v-if="sheet.error.length > 0">		
			<div style="width:100%;font-size:larger">
				{{sheet.error.length}} {{sheet.error.length > 1 ? "Errors":"Error"}}
			</div>
		</div>
	</div>
</template>

<script>
	export default {
		name: 'SheetDiv',
		props: {
			sheet: Object
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
	div:hover{
		border-color: #4289ca
	}
	.group-div {
		width:calc(100% - 80px);
		height:40px;
		margin:auto;
		position:relative;
		border:3px solid black;
		margin-top:30px;
		overflow:hidden;
		border-radius:4px;
		cursor: pointer
	}
	
	.err-sect {
		position:absolute;
		right:0;height:100%;
		width:35%;
		background-color:white;
		text-align:center;
		border-left:inherit;
		display:flex;
		align-items:center;
	}

</style>