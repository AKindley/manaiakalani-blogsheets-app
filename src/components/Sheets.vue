<template>
	<div>
		<span> {{cellRange}} </span>
		<div>
			<input style="width:500px" v-model="sheetUrl" @keyup.enter="submit" placeholder="Please enter a URL">
			<button @click="submit">submit</button>
			<button @click="addSheet">save sheet to cluster</button>
			<select v-model="selectedSheet">
				<option :key="`${sheet}`" v-for="sheet in sheetsList">
					{{sheet}}
				</option>
			</select>
		</div>

		<div>
			<table v-if="rows.length > 0" class="sheetX">
				<thead>
					<tr>
						<th :key="`col-${letter}`" v-for="letter in ['','A','B','C','D','E','F','G','H','I','J']" class="sheetX-H">
						{{letter}}
						</th>
					</tr>
				</thead>
				<tbody>
					<tr :key="`row-${index}`" v-for="(row, index) in rows">
						<th>
							{{index+1}}
						</th>
						<td :key="`row-${index}-col-${index2}`" v-for="(col, index2) in row" 
						@click="selectCell" 
						class="sheetX-B" :class="{ looking : colInd[index2] == column && rowInd[index] >= rowNum }" 
						:data-col="colInd[index2]" 
						:data-row="rowInd[index]"
						@mouseover="hovering"
						@mouseleave="leaving">
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
		props: ['SheetId','ClusterId'],
		data(){
			return{
			sheetUrl: '',
			curSheetId: '',
			sheetsList: [],
			selectedSheet: '',
			rows: [],
			rowInd: ['1','2','3','4','5','6','7','8','9','10'],
			colInd: ['A','B','C','D','E','F','G','H','I','J'],
			cellRange: '',
			column: '',
			rowNum: ''
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
				
			},
			
			selectCell (event){
				event.preventDefault();
				let col = event.currentTarget.getAttribute('data-col');
				let row = event.currentTarget.getAttribute('data-row');
				this.cellRange = col + row + ':' + col;
				this.column  = col;
				this.rowNum = parseInt(row);
			},
			
			hovering(event){
				event.preventDefault();
				event.currentTarget.classList.add('mouseHover');
			},
			
			leaving(event){
				event.preventDefault();
				event.currentTarget.classList.remove('mouseHover');
			},
			
			addSheet(event){
				event.preventDefault();
				var newSheet = {
					name: this.selectedSheet,
					range: this.cellRange,
					spreadsheetId: this.curSheetId,
					clusterId: this.ClusterId
				};
				if (this.SheetId === 'add'){
					let uri = 'http://localhost:4000/sheets/add';
					this.axios.post(uri, newSheet).then((response) => {
						console.log(response);
					});
				}
				else{
					let uri = 'http://localhost:4000/sheets/update/' + this.SheetId;
					this.axios.post(uri, newSheet).then((response) => {
						console.log(response);
					});
				}
			},
			loadSheet () {
				let uri = 'http://localhost:4000/sheets/get/' + this.SheetId;
				console.log(uri)
				this.axios.get(uri).then((response) => {
					console.log(response);
					let temp = response.data;
					this.curSheetId = temp.spreadsheetId;
					this.cellRange = temp.range;
					this.selectedSheet = temp.name;
					this.sheetsList[0] = temp.name;
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
		},
	}
</script>

<style type="text/css">
	.sheetX  {border-collapse:collapse;border-spacing:0;border-color:#ccc;margin:0px auto;}
	.sheetX td{font-family:Arial, sans-serif;font-size:14px;padding:10px 20px;border-style:solid;border-width:1px;overflow:hidden;word-break:normal;border-color:#ccc;color:#333;background-color:#fff;}
	.sheetX th{font-family:Arial, sans-serif;font-size:14px;font-weight:normal;padding:10px 20px;border-style:solid;border-width:1px;overflow:hidden;word-break:normal;border-color:#ccc;color:#333;background-color:#f0f0f0;}
	.sheetX .sheetX-H{font-weight:bold;background-color:#efefef;color:#333333;border-color:#9b9b9b;text-align:left;vertical-align:top}
	.sheetX .sheetX-B{border-color:inherit;text-align:left;vertical-align:top}
	.sheetX .looking{background-color:#e334ef}
	.sheetX .mouseHover{background-color: #eeeee2}
</style>