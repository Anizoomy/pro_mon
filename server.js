require('dotenv').config();
const express = require('express');
const PORT = process.env.PORT 
const mogoonse = require('mongoose');
const db = process.env.DATABASE_URI
const cors = require('cors')
const userRouter = require ('./router/userRouter')
const app = express();

app.use(express.json())

app.use(cors());
app.use('/api/v1', userRouter);

mogoonse.connect(db)
.then(() => {
    console.log('Connection to database has been established successfully');
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost: ${PORT}`);
})
}).catch((error) => {
    console.log('Error connecting to database', error.message);
})

