const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const path = require('path');
const configViewEngine = require('./config/viewEngine');
const User = require('./models/User');
const bcrypt = require('bcrypt');

// const webRoutes = require('./routes/web');

const app = express();
const port = process.env.PORT || 8888;
const hostname = 'localhost';

app.use(morgan('dev'));
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());

//config req.body
app.use(express.json()) 
app.use(express.urlencoded({ extended: true }))

//config template engine
configViewEngine(app);

//Khai báo route
// app.use('/', webRoutes);

// // Kết nối tới MongoDB
// mongoose.connect('mongodb://127.0.0.1:27017/khoahoc_db', {
//     useNewUrlParser: true,
//     useUnifiedTopology: true
// }).then(() => {
//     console.log('Connnected to MongoDB');
// }).catch((err) => {
//     console.error('Error connecting to MongoDB', err);
// });

// app.listen(port, hostname ,() => {
//     console.log(`Server listening on http://${hostname}:${port}`);
// });


mongoose.connect('mongodb://127.0.0.1:27017/khoahoc_db', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');

    // Cấu hình session sau khi kết nối thành công
    app.use(session({
        secret: 'nodejs-secret',
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            client: mongoose.connection.getClient(),  // dùng lại client kết nối
            collectionName: 'sessions'
        }),
        cookie: { maxAge: 1000 * 60 * 60 }
    }));

    const webRouter = require('./routes/web');
    app.use('/', webRouter);

    app.listen(port, hostname, () => {
        console.log(`Server listening on http://${hostname}:${port}`);
    });
}).catch((err) => {
    console.error('Error connecting to MongoDB', err);
});