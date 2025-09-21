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