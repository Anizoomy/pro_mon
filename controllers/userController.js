const userModel = require('../models/user');
const cloudinary = require('../config/cloudinary');
const bcrypt = require('bcrypt');
const fs = require('fs')
const { sendEmail } = require('../middleware/email')
const { html } = require('../middleware/singnUp')


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



// Controller to log in a user
exports.login = async (req,res)=>{
    try {
        // Get email and password from request body
        const {email, password} = req.body
        // Find user by email
        const checkUser = await userModel.findOne({email: email.toLowerCase().trim()})
        // If user not found, return a response
        if(!checkUser){
            return res.status(400).json({
                message: "Invalid credentials"
            })
        }
        // Compare provided password with the previously hashed password
        const checkPassword = await bcrypt.compare(password, checkUser.password)
        // If password does not match, return a response
        if(!checkUser || !checkPassword){
            return res.status(400).json({
                message: "Invalid credentials"
            })
        }
        // Generate JWT token for user
        const token = jwt.sign({id: checkUser._id}, "daniel", {expiresIn: "1d"})
        // Respond with user data and token
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

// Controller to handle forgot password 
exports.forgotPassword = async(req,res)=>{
    try {
        // Get email from request body
        const {email} = req.body
        // Find user by email
        const checkEmail = await userModel.findOne({email: email.toLowerCase().trim()})
        // If user not found, return a response
        if(!checkEmail){
            return res.status(400).json({
                message: "Invalid email provided"
            })
        }
        // Set email subject
        const subject = `Reset Password`
        // Generate JWT token for password reset
        const token = jwt.sign({id: checkEmail._id}, "suliya", {expiresIn: "1d"})
        // Update user with reset token
        await userModel.findByIdAndUpdate(checkEmail._id, {token},{new:true})
        // Create password reset link
        const link = `${req.protocol}://${req.get("host")}/api/v1/reset/${checkEmail._id}`
        // Set expiration time for link
        const expires = "24 hours";
        // Send password reset email
        await sendMail({
           to: email,
            subject,
            html: forgotHtml(link, checkEmail.fullName, expires)
        }) 
        // Return a response
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

// Controller to change password
exports.resetPassword = async(req,res)=>{
    try {
        // Get newPassword and confirmPassword from request body
        const {newPassword, confirmPassword} = req.body
        // If passwords do not match, return a response
        if(newPassword !== confirmPassword){
            return res.status(400).json({
                message: "Passwords does not match"
            })
        }
        // Generate salt for password hashing
        const saltRound = await bcrypt.genSalt(10)
        // Hash the new password
        const hash = await bcrypt.hash(confirmPassword, saltRound)
        // Find user by ID
        const user = await userModel.findById(req.params.id)
        // Verify reset token
        jwt.verify(user.token, "suliya", async(err,result)=>{
            if(err){
                // If token expired, return a response
                return res.status(400).json({
                    message: "Email expired"
                })
            } else{
                // Update user's password and clear token
                await userModel.findByIdAndUpdate(result.id, {password:hash,token:null}, {new:true})
            }
        })
        // Return a response
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
    const {oldPassword, newPassword, confirmPassword} = req.body
    if(!oldPassword || !newPassword || !confirmPassword) {
      res.statud(400).json({
        message: 'All fields are required'
      })
    }
    const id = req.user

    const user = await userModel.findById(id)

    const checkPassword = await bcrypt.compare(oldPassword, user.password)
    if(!checkPassword) {
      return res.status(400).json({
        message: 'Password does not match your current password'
      })
    }
    const checkExistingPass = await bcrypt.compare(newPassword, user.password)

    if(checkExistingPass) {
      return res.status(400).json({
        message: 'You cannot use previous password'
      })
    }

    if(confirmPassword !== newPassword){
      return res.status(400).json({
        message: 'New passwords must match'
      })
    }

    const salt = await bcrypt.genSalt(10)
    const hashPassword = await bcrypt.hash(confirmPassword, salt)

    await userModel.findByIdAndUpdate(id, {password: hashPassword}, {new:true})

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
 