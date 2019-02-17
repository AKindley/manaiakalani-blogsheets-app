<template>
	<div>
		<div>
			<input style="width:500px" v-model="sheetUrl" @keyup.enter="submit" placeholder="Please enter a URL">
			<button @click="submit">submit</button>
			<select v-model="selectedSheet">
				<option v-for="sheet in sheetsList">
					{{sheet}}
				</option>
			</select>
		</div>

		<div>
			<table class="sheetX">
				<thead>
					<tr>
						<th v-for="letter in ['','A','B','C','D','E','F','G','H','I','J']" class="sheetX-H">
						{{letter}}
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="row in rows">
						<td>
							{{rows.indexOf(row)+1}}
						</td>
						<td v-for="col in row" class="sheetX-B">
							{{col}}
						</td>
					</tr>
				</tbody>
			</table>

		</div>
	</div>
</template>

<script>
	export default {
		name: 'Sheets',
		data(){
			return{
			sheetUrl: '',
			curSheetId: '',
			sheetsList: [],
			selectedSheet: '',
			rows: [],
			}
		},
		methods: {
			submit (event){
				event.preventDefault();
				let exp = new RegExp('/spreadsheets/d/([a-zA-Z0-9-_]+)');
				this.curSheetId = this.sheetUrl.match(exp)[1];
				/*this.embedUrl = ('https://docs.google.com/spreadsheets/d/' + result + '/pubhtml?headers=true');
				console.log(this.embedUrl);
					<div>
						<iframe :src="this.embedUrl" width="400px" height="300px"></iframe>
					</div>*/
				var self = this;
				gapi.load('client', function(){
				gapi.client.load('https://sheets.googleapis.com/$discovery/rest?version=v4').then(() =>{
					gapi.client.sheets.spreadsheets.get({spreadsheetId: self.curSheetId
					}).then(function(response) {
						let sheets = response.result.sheets;
						let sheet;
						self.sheetsList = [];
						for (sheet in sheets){
							self.sheetsList.push(sheets[sheet].properties.title)
						}
						self.selectedSheet = self.sheetsList[0];
					}); 
						
					/*gapi.client.sheets.spreadsheets.values.get({
						spreadsheetId: self.curSheetId,
						range: 'A1:J10'
					}).then(function (response) {
						var result = response.result;
						self.rows = result.values;
						});*/
					});
				});
				
			}
		},
		
		watch: {
			selectedSheet: function() {
				var self = this;
				gapi.load('client', function(){
				gapi.client.load('https://sheets.googleapis.com/$discovery/rest?version=v4').then(() =>{
					gapi.client.sheets.spreadsheets.values.get({
						spreadsheetId: self.curSheetId,
						range: (self.selectedSheet + '!A1:J10')
					}).then(function(response) {
						var result = response.result;
						self.rows = result.values;
					});
				});				
			});
			}
		}
	}
</script>

<style type="text/css">
	.sheetX  {border-collapse:collapse;border-spacing:0;border-color:#ccc;margin:0px auto;}
	.sheetX td{font-family:Arial, sans-serif;font-size:14px;padding:10px 20px;border-style:solid;border-width:1px;overflow:hidden;word-break:normal;border-color:#ccc;color:#333;background-color:#fff;}
	.sheetX th{font-family:Arial, sans-serif;font-size:14px;font-weight:normal;padding:10px 20px;border-style:solid;border-width:1px;overflow:hidden;word-break:normal;border-color:#ccc;color:#333;background-color:#f0f0f0;}
	.sheetX .sheetX-H{font-weight:bold;background-color:#efefef;color:#333333;border-color:#9b9b9b;text-align:left;vertical-align:top}
	.sheetX .sheetX-B{border-color:inherit;text-align:left;vertical-align:top}
</style>