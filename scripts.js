const Excel = require('exceljs')
const MongoClient = require('mongodb').MongoClient;

(async () => {
	const workbook = new Excel.Workbook()
	const client = await MongoClient.connect('mongodb://localhost:27017')
	workbook.xlsx.readFile('./public/commentdata.xlsx').then(async () => {
		const worksheet = workbook.getWorksheet('Sheet1')
		const db = client.db('lugedemo')
		// worksheet.eachRow({ includeEmpty: false }, async (row, rowNum) => {
		// 	const obj = {
		// 		uid: row.values[1],
		// 		name: row.values[2],
		// 		avatar: row.values[3],
		// 		is_signin: row.values[4],
		// 		signin_time: row.values[5],
		// 	}
		// 	await db.collection('users').insert(obj)
		// })
		worksheet.eachRow({ includeEmpty: false }, async (row, rowNum) => {
			const obj = {
				uid: row.values[1],
				content: row.values[2],
				comment_time: Date.now()
			}
			await db.collection('comments').insert(obj)
			client.close()
		})
	})
})()
