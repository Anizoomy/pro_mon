const userModel = require('../models/user');
const cloudinary = require('../config/cloudinary');
const bcrypt = require('bcrypt');
const fs = require('fs')
const jwt = require('jsonwebtoken')
const { sendEmail } = require('../middleware/email')
const { html } = require('../middleware/singnUp')
const { forgotHtml } = require('../middleware/forgot')


exports.create = async (req, res) => {
    try {
        
        const { fullName, email, age, password, phoneNumber } = req.body;
        
        const file = req.file;
        
        let response;
        
        const existingEmail = await userModel.findOne({ email: email.toLowerCase });

        const existingPhoneNumber = await userModel.findOne({ phoneNumber: phoneNumber });


        if (existingEmail || existingPhoneNumber) {

            fs.unlinkSync(file.path)

            res.status(400).json('User already exist');
        };
        if (file && file.path) {
            response = await cloudinary.uploader.upload(file.path);
            fs.unlinkSync(file.path);

        }
        const saltRound = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, saltRound)
        const user = new userModel({
            fullName,
            email,
            age,
            password: hashPassword,
            phoneNumber,
            profilePicture: {
                publicId: response.public_id,
                imageUrl: response.secure_url
            }
        });
        await user.save()

        const subject = 'Kindly Verify Your Email';
        const link = `${req.protocol}://${req.get("host")}/api/v1/verify/${user._id}`

        console.log("Sending email to:", user.email, user.fullName);

        await sendEmail(
            user.email,
            user.fullName,
            subject,
            html(link, user.fullName)

        ).then(() => {
            console.log("mail sent")

        }).catch((e) => {
            console.log(e)
        })

        res.status(201).json({
            message: 'USer created successfully',
            data: user
        })
    } catch (error) {
        res.status(500).json({
            message: 'Internal server error',
            error: error.message
        })
    }
};

exports.verifyUser = async (req, res) => {
    try {
        
        const checkUser = await userModel.findById(req.params, id)
        
        if (!checkUser) {
            return res.status(404).json({
                message: 'User not found'
            })
        }

        if (checkUser.isVerified) {
            return res.status(400).json({
                message: 'Email already verified'
            })
        }
        await userModel.findByIdAndUpdate(req.params.id, { isVerified: true }), { new: true }

        res.status(200).json({
            message: 'Email successfully verified'
        })

    } catch (error) {
        res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    }
}




exports.login = async (req,res)=>{
    try {
        
        const {email, password} = req.body
        const checkUser = await userModel.findOne({email: email.toLowerCase().trim()})
        if(!checkUser){
            return res.status(400).json({
                message: "Invalid credentials"
            })
        }
       
        const checkPassword = await bcrypt.compare(password, checkUser.password)
       
        if(!checkUser || !checkPassword){
            return res.status(400).json({
                message: "Invalid credentials"
            })
        }
        
        const token = jwt.sign({id: checkUser._id}, "daniel", {expiresIn: "1d"})
        res.status(200).json({
            message: `Login Successful`,
            data: checkUser,
            token: token
        })
    } catch (error) {
        res.status(500).json({
            message: "Internal Server Error",
            error: error.message
        });
    }
}


exports.forgotPassword = async(req,res)=>{
    try {
        
        const {email} = req.body;
        const checkEmail = await userModel.findOne({email: email.toLowerCase().trim()})
      
        if(!checkEmail){
            return res.status(400).json({
                message: "Invalid email provided"
            })
        }
        
        const subject = `Reset Password`
        
        const token = jwt.sign({id: checkEmail._id}, "suliya", {expiresIn: "1d"})
        
        await userModel.findByIdAndUpdate(checkEmail._id, {token},{new:true})
        
        const link = `${req.protocol}://${req.get("host")}/api/v1/reset/${checkEmail._id}`
      
        const expires = "24 hours";
        await sendMail({
            to: email,
            subject,
            html: forgotHtml(link, checkEmail.fullName, expires)
        }) 
       
        res.status(200).json({
            message: "Kindly check your email for instructions"
        })
    } catch (error) {
        res.status(500).json({
            message: "Internal Server Error",
            error: error.message
        });
    }
}


exports.resetPassword = async(req,res)=>{
    try {
        
        const {newPassword, confirmPassword} = req.body
        
        if(newPassword !== confirmPassword){
            return res.status(400).json({
                message: "Passwords does not match"
            })
        }
     
        const saltRound = await bcrypt.genSalt(10)
        const hash = await bcrypt.hash(confirmPassword, saltRound)
       
        const user = await userModel.findById(req.params.id)
       
        jwt.verify(user.token, "suliya", async(err,result)=>{
            if(err){
                return res.status(400).json({
                    message: "Email expired"
                })
            } else{
                await userModel.findByIdAndUpdate(result.id, {password:hash,token:null}, {new:true})
            }
        })
       
        res.status(200).json({
            message: "Password Successfully Changed"
        })
    } catch (error) {
        res.status(500).json({
            message: "Internal Server Error",
            error: error.message
        });
    }
};


exports.changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword, confirmPassword } = req.body
        if (!oldPassword || !newPassword || !confirmPassword) {
            res.statud(400).json({
                message: 'All fields are required'
            })
        }
        const id = req.user

        const user = await userModel.findById(id)

        const checkPassword = await bcrypt.compare(oldPassword, user.password)
        if (!checkPassword) {
            return res.status(400).json({
                message: 'Password does not match your current password'
            })
        }
        const checkExistingPass = await bcrypt.compare(newPassword, user.password)

        if (checkExistingPass) {
            return res.status(400).json({
                message: 'You cannot use previous password'
            })
        }

        if (confirmPassword !== newPassword) {
            return res.status(400).json({
                message: 'New passwords must match'
            })
        }

        const salt = await bcrypt.genSalt(10)
        const hashPassword = await bcrypt.hash(confirmPassword, salt)

        await userModel.findByIdAndUpdate(id, { password: hashPassword }, { new: true })

        res.status(200).json({
            message: "Password successfully changed"
        })

    } catch (error) {
        res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    }
}
 
