const _ = require('lodash')
const mongoose = require('mongoose')
const Router = require('koa-router')

const router = new Router()
const User = mongoose.model('User')
const Comment = mongoose.model('Comment')

router.get('/', async (ctx, next) => {
	console.log(ctx.query.uid)
	ctx.redirect(`/invitation.html?uid=${ctx.query.uid}`)
	ctx.status = 301
	await next()
})

router.put('/api/signin', async (ctx, next) => {
	const obj = {}
	if (_.has(ctx.request.body, 'uid') && _.size(ctx.request.body) === 1) {
		const rs = await User.findOneAndUpdate({ uid: ctx.request.body.uid }, { $set: { is_signin: 1 }})
		if (rs !== null) {
			obj.message = 'Operation successfully'
			ctx.response.status = 200
		} else {
			obj.message = 'Failed to find this uid'
			ctx.response.status = 404
		}
	} else {
		obj.message = 'Invalid request params, Please checkout your params'
		ctx.response.status = 400
	}
	ctx.response.body = {
		status: ctx.response.status,
		message: obj.message, 
		data: obj.data ? obj.data : {}
	}
	await next()
})

router.post('/api/comment', async (ctx, next) => {
	const obj = {}
	if (ctx.request.query.uid) {
		if (_.has(ctx.request.body, 'content') && _.size(ctx.request.body) === 1) {
			const user = await User.findOne({ uid: Number(ctx.request.query.uid) })
			if (user !== null) {
				const comment = new Comment({
					uid: ctx.request.query.uid,
					content: ctx.request.body.content
				})
				const comments = await comment.save()
				if (comments !== null) {
					obj.message = 'Operation successfully'
					obj.data = comments
					ctx.response.status = 200 
				} else {
					obj.message = 'Failed to find this uid'
					ctx.response.status = 404
				}
			} else {
				obj.message = 'cannot find this uid in db'
				ctx.response.status = 404
			}
		} else {
			obj.message = 'Invalid request params, Please checkout your params'
			ctx.response.status = 400
		}
	} else {
		obj.message = 'cannot get query uid'
		ctx.response.status = 400
	}
	ctx.response.body = {
		status: ctx.response.status,
		message: obj.message,
		data: obj.data ? obj.data : {}
	}
	await next()
})

router.get('/api/checked_in', async (ctx, next) => {
	const obj = {}
	let users = null
	if (_.has(ctx.query, 'lasttime') && _.size(ctx.query) === 1) {
		if (Number(ctx.query.lasttime) === 0) {
			users = await User.find({ is_signin: 1 }, { _id: 0, uid: 1, name: 1, avatar: 1, signin_time: 1})
		} else {
			users = await User.find({ is_signin: 1, signin_time: { $gte: ctx.query.lasttime }}, { _id: 0, uid: 1, name: 1, avatar: 1, signin_time: 1})
		}
		obj.data = users
		obj.message = 'Operation successfully'
		ctx.response.status = 200
	} else {
		obj.message = 'Invalid request params, Please checkout your params'
		ctx.response.status = 400
	}
	ctx.response.body = {
		status: ctx.response.status,
		message: obj.message,
		data: obj.data ? obj.data : {}
	}
	await next()
})

router.get('/api/comments', async (ctx, next) => {
	const obj = {}
	let comments = null
	if (_.has(ctx.query, 'lasttime') && _.size(ctx.query) === 1) {
		if (Number(ctx.query.lasttime) === 0) {
			comments = await Comment.find({}, { _id: 0, uid: 1, content: 1, comment_time: 1 })
		} else {
			comments = await Comment.find({ comment_time: { $gte: ctx.query.lasttime }}, { _id: 0, uid: 1, content: 1, comment_time: 1 })
		}
		obj.data = comments
		obj.message = 'Operation successfully'
		ctx.response.status = 200
	} else {
		obj.message = 'Invalid request params, Please checkout your params'
		ctx.response.status = 400
	}
	ctx.response.body = {
		status: ctx.response.status,
		message: obj.message,
		data: obj.data ? obj.data : {}
	}
	await next()
})

module.exports = router
