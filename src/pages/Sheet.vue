<template>
  <div>
	<button @click="goBack" style="float:left">BACK</button>
	<Sheets :SheetId="sheet" :ClusterId="cluster" ref="sheets"/>
  </div>
</template>
<script>
import Sheets from '../components/Sheets.vue'
export default {
	name: 'sheets',
	props: ['cluster','sheet'],
	data () {
		return {
			sheetInfo: {}
		}  
	},
	components: {
		Sheets
	},
	methods: {
		goBack(event){
			event.preventDefault();
			this.$router.go(-1);
		}
	},
	mounted () {
		this.axios.get('/auth/google/session').then((res) => {
			if(res.data){
				if (this.sheet !== 'add'){
					this.$refs.sheets.loadSheet();
				}
			}
			else{this.$router.push('/');}
		});
	}

}

</script>

