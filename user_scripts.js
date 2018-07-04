const Excel = require('exceljs')
const MongoClient = require('mongodb').MongoClient;

(async () => {
	const workbook = new Excel.Workbook()
	const client = await MongoClient.connect('mongodb://localhost:27017')
	workbook.xlsx.readFile('./public/userdata.xlsx').then(async () => {
		const worksheet = workbook.getWorksheet('Sheet1')
		const db = client.db('lugedemo')
		worksheet.eachRow({ includeEmpty: false }, async (row, rowNum) => {
			const obj = {
				uid: row.values[1],
				name: row.values[2],
				avatar: row.values[3],
				is_signin: row.values[4],
				signin_time: row.values[5],
				is_shown: row.values[6]
			}
			await db.collection('users').insert(obj)
			client.close()
		})
	})
})()
