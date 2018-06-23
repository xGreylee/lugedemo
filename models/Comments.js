const mongoose = require('mongoose')

const CommentSchema = new mongoose.Schema({
	uid: {
		type: Number,
		ref: 'User',
		index: true
	},
	content: String,
}, {
	timestamps: { createdAt: 'comment_time' }
})

mongoose.model('Comment', CommentSchema)
