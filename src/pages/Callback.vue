<template>
  <div>
	'This is a callback page for twitter stuff'
  </div>
</template>
<script>
export default {
	name: 'callback',
	data () {
		return {
			oauth_token: '',
			oauth_verifier: ''
		}  
	},
	methods: {
		goBack(event){
			event.preventDefault();
			this.$router.go(-1);
		},	
	},
	mounted () {
		this.oauth_token = this.$route.query.oauth_token;
		this.oauth_verifier = this.$route.query.oauth_verifier;
		console.log(this.oauth_token);
		this.axios.get('\auth\twitter\callback?oauth_token=' + this.oauth_token + '&oauth_verifier=' + this.oauth_verifier);
	}

}

</script>