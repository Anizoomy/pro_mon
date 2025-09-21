const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    // unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
  },
  age: {
    type: Number,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
    // unique:true
  },
  profilePicture: {
    imageUrl: {type: String, required: true},
    publicId: {type: String, required: true}
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  token: {
    type: String,
    required: false
  }
}, {
    timestamp: true
})

const userModel = mongoose.model('users', userSchema)
module.exports = userModel