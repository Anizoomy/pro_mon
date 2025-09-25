const jwt = require('jsonwebtoken')
const userModel = require('../models/user')

exports.checkLogin = async (req, res, next) => {
    try {
        const token = req.headers.authorization

        if(!token) {
            return res.status(401).json({
                message: 'Kaindly login'
            })
        }

        const checkValidToken = jwt.verify(token.split(" ")[1], 'daniel', async(err, result) => {
            if(err) {
                res.status(401).json({
                    message: 'Login session expired, kindly re-login'
                })
            } else{
                const user = await userModel.findById(result.id)
                req.user = user._id
            }
            next()
        })
    } catch (error) {
        res.status(500).json({
            message: 'Internal Server Error',
            error: error.message
        })
    }
}