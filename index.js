const Koa = require('koa')
const logger = require('koa-logger')
const bodyParser = require('koa-bodyparser')
const mongoose = require('mongoose')

mongoose.connect('mongodb://localhost/lugedemo', function(err, db) {
	if (!err) {
		console.log('Connected to /lugedemo!')
	} else {
		console.error('Failed to connect database')
	}
})

require('./models/Users')
require('./models/Comments')

const router = require('./routes/index')
const app = new Koa()

app.on('error', function (err) {
	console.log('index error: ', err.message)
	console.error(err)
})

app.use(logger())
app.use(async (ctx, next) => {
	try {
		await next()
	} catch (err) {
		ctx.response.status = err.statusCode || err.status || 500
		ctx.response.body = {
			message: err.message
		}
		ctx.app.emit('error', err, ctx)
	}
})
app.use(bodyParser({
	onerror(error, ctx) {
		ctx.throw(400, `cannot parse request body, ${JSON.stringify(error)}`)
	}
}))
app.use(router.routes())
app.use(router.allowedMethods())

module.exports = app
