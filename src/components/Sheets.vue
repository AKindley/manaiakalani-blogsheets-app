<template>
	<div>
		<div style="padding-top:40px;margin-left:40px;text-align:left">
			<label>URL: <input style="width:500px;" v-model="sheetUrl" :disabled="!editing" placeholder="Please enter a URL"></label>
			<button v-if="SheetId === 'add'" @click="submit">submit</button>
			<button style="float:right;margin-right:40px" v-if="SheetId !== 'add'" @click="editSheet">{{editing ? 'CANCEL' : 'EDIT'}}</button><br>
			<label>Sheet Label: <input style="width:200px;margin-top:20px" :disabled="!editing" v-model="sheetName" placeholder="Please enter a name(optional)"></label><br>
			<label>Sheet: <select style="margin-top:20px;width:100px" :disabled="!editing" v-model="selectedSheet">
				<option :key="`${sheet}`" v-for="sheet in sheetsList">
					{{sheet}}
				</option>
			</select></label>
			<button v-if="editing" style="float:right;margin-right:40px;margin-top:20px" @click="addSheet">save sheet to cluster</button>
		</div>

		<div style="margin-top:40px;margin-left:40px;margin-right:40px">
			<button @click="processSheet">TEST ME</button>
			<table style="width:100%;overflow-x:scroll;margin-top:40px" v-if="rows.length > 0" class="sheetX">
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
			<span :key="index" v-for="(values,index) in sheetDATA">{{values[0]}} </span>
		</div>
	</div>
</template>

<script>
	
	export default {
		name: 'Sheets',
		props: ['SheetId','ClusterId'],
		data(){
			return{
			editing: this.SheetId === 'add' ? true : false,
			sheetName: '',
			sheetUrl: '',
			curSheetId: '',
			sheetsList: [],
			selectedSheet: '',
			rows: [],
			rowInd: ['1','2','3','4','5','6','7','8','9','10'],
			colInd: ['A','B','C','D','E','F','G','H','I','J'],
			cellRange: '',
			column: '',
			rowNum: '',
			sheetDATA: []
			}
		},
		methods: {
			submit (event){
				event.preventDefault();
				let exp = new RegExp('/spreadsheets/d/([a-zA-Z0-9-_]+)');
				this.curSheetId = this.sheetUrl.match(exp)[1];
				let uri = '/sheets/getSpreadsheet/' + this.curSheetId;
				this.axios.get(uri).then((response) => {
					let sheets = response.data.sheets;
					let sheet;
					for (sheet in sheets){
						this.sheetsList.push(sheets[sheet].properties.title)
					}
					this.selectedSheet = this.sheetsList[0];
				});
			},
			
			selectCell (event){
				event.preventDefault();
				if (this.editing) {
					let col = event.currentTarget.getAttribute('data-col');
					let row = event.currentTarget.getAttribute('data-row');
					this.cellRange = col + row + ':' + col;
					this.column  = col;
					this.rowNum = parseInt(row);
				}
			},
			
			hovering(event){
				event.preventDefault();
				if (this.editing){
					event.currentTarget.classList.add('mouseHover');
				}
			},
			
			leaving(event){
				event.preventDefault();
				event.currentTarget.classList.remove('mouseHover');
			},
			
			addSheet(event){
				event.preventDefault();
				if (this.selectedSheet && this.cellRange && this.curSheetId && this.ClusterId){
				var newSheet = {
					name: this.selectedSheet,
					title: this.sheetName,
					range: this.cellRange,
					spreadsheetId: this.curSheetId,
					clusterId: this.ClusterId
				};
				if (this.SheetId === 'add'){
					let uri = '/sheets/add';
					this.axios.post(uri, newSheet);
					this.$router.go(-1);
				}
				else{
					let uri = '/sheets/update/' + this.SheetId;
					this.axios.post(uri, newSheet);
				}
				}
				else{
					window.alert("Please fill in all required fields!");
				}
			},
			loadSheet () {
				let uri = '/sheets/get/' + this.SheetId;
				this.axios.get(uri).then((response) => {
					let temp = response.data;
					this.curSheetId = temp.spreadsheetId;
					this.cellRange = temp.range;
					this.selectedSheet = temp.name;
					this.sheetsList[0] = temp.name;
					this.sheetName = temp.title;
					this.column = this.cellRange[0];
					this.rowNum = parseInt(this.cellRange[1]);
					this.sheetUrl = 'https://docs.google.com/spreadsheets/d/' + temp.spreadsheetId;
				});
			},
			editSheet () {
				this.editing = !this.editing;
			},
			processSheet () {
				let uri = '/sheets/parse/' + this.SheetId;
				this.axios.get(uri).then((response) => {
					this.sheetDATA = response.data.values;
				});
			}
		},
		
		watch: {
			selectedSheet: function() {
				if (this.SheetId !== 'add'){ 
					let uri = '/sheets/loadSheet/' + this.SheetId;
					this.axios.get(uri).then((response) => {
						this.rows = response.data.values;
					});
				}
				else{
					let uri = '/sheets/getSheet/' + this.curSheetId + '/' + this.selectedSheet;
					this.axios.get(uri).then((response) => {
						this.rows = response.data.values;
					});
				}
			}
		},
	}
</script>

<style type="text/css">
	.sheetX  {border-collapse:collapse;border-spacing:0;border-color:#ccc;margin:0px auto;}
	.sheetX td{font-family:Arial, sans-serif;font-size:10px;border-style:solid;border-width:1px;overflow:hidden;word-break:normal;border-color:#ccc;color:#333;background-color:#fff;}
	.sheetX th{font-family:Arial, sans-serif;font-size:14px;font-weight:normal;padding:10px 5px;border-style:solid;border-width:1px;overflow:hidden;word-break:normal;border-color:#ccc;color:#333;background-color:#f0f0f0;}
	.sheetX .sheetX-H{font-weight:bold;background-color:#efefef;color:#333333;border-color:#9b9b9b;vertical-align:top}
	.sheetX .sheetX-B{border-color:inherit;text-align:center;}
	.sheetX .looking{background-color:#728acc}
	.sheetX .mouseHover{background-color: #eeeee2;cursor: pointer;}
</style>