const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
	uid: {
		type: Number,
		index: true,
		unique: true
	},
	name: String,
	avatar: String,
	is_signin: {
		type: Number,
		default: 0
	},
	is_shown: {
		type: Number,
		default: 0
	},
	signin_time: {
		type: Date,
		default: 0
	}
}, {
	timestamps: {
		updatedAt: 'signin_time'
	}
})

mongoose.model('User', UserSchema)
