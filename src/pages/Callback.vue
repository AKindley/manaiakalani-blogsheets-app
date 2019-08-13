<template>
  <div>
	This page should close immediately
  </div>
</template>
<script>
export default {
	name: 'callback',
	mounted () {
		window.close();
	}

}

</script>