const Koa = require('koa')
const logger = require('koa-logger')
const bodyParser = require('koa-bodyparser')
const mongoose = require('mongoose')
const path = require('path')
const staticCache = require('koa-static-cache')
const cors = require('koa2-cors')
const serve = require('koa-static')
const conditional = require('koa-conditional-get')
const etag = require('koa-etag')

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

app.use(serve(__dirname + '/views'))
app.use(conditional())
app.use(etag())
app.use(staticCache(path.join(__dirname, 'views'), {
	maxAge: 120 * 24 * 60 * 60,
	dynamic: true,
	preload: true
}))
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
app.use(cors({
	origin: function(ctx) {
		if (ctx.request.url === '/test') {
			return '*'
		}
		return 'http://localhost:8080'
	},
	credentials: true,
	exposeHeaders: ['WWW-Authenticate', 'Server-Authorization'],
	maxAge: 3600 * 24,
	allowMethods: ['GET', 'POST', 'PUT'],
	allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
}))
app.use(router.routes())
app.use(router.allowedMethods())

module.exports = app
