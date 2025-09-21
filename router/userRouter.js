const router = require('express').Router()
const upload = require('../middleware/multer')

const { create } = require('../controllers/userController')

router.post("/create", upload.single("profilePicture"), create)
router.get("/verify/:id", verifyUser)



module.exports = router