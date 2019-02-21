<template>
  <div>
	<button @click="goBack" style="float:left">BACK</button>
    <img alt="Vue logo" src="../assets/logo.png">
	<Sheets />
  </div>
</template>
<script>
import Sheets from '../components/Sheets.vue'
export default {
  name: 'sheets',
  components: {
	Sheets
  },
  methods: {
		goBack(event){
			event.preventDefault();
			this.$router.go(-1);
		}
  }
}

</script>

