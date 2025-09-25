const router = require('express').Router()
const upload = require('../middleware/multer')
const { checkLogin } = require('../middleware/auth')

const { create, verifyUser, login, forgotPassword, resetPassword, changePassword } = require('../controllers/userController')

router.post("/create", upload.single("profilePicture"), create)
router.get("/verify/:id", verifyUser)
router.post("/login", login)
router.post("/password", forgotPassword)
router.get("/reset/:id", resetPassword)
router.put("/password", checkLogin, changePassword)

module.exports = router