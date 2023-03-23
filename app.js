const express = require('express');
const feedRoutes = require('./routes/feed');

const path = require('path');

const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');

const multer = require('multer');

const { v4: uuidv4 } = require('uuid');
 
const fileStorage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'images');
    },
    filename: function(req, file, cb) {
        cb(null, uuidv4() + file.originalname)
    }
});

const fileFilter = (req,file,cb) =>{
  if(file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg'){
    return cb(null,true);
  }else{
    return cb(null,false);
  }
}

const bodyparser = require('body-parser');

const app = express();

app.use(bodyparser.json());

app.use(multer({ storage: fileStorage , fileFilter: fileFilter}).single('image'));

app.use('/images',express.static(path.join(__dirname,'images')));


app.use((req,res,next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS ,GET, POST, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers' , 'Content-Type, Authorization');
    next();
})

app.use('/feed',feedRoutes);
app.use('/auth',authRoutes);

app.use((error,req,res,next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({message : message , data : data});
});



mongoose.connect('mongodb+srv://hello:Robotrage1202@cluster0.9gqmi33.mongodb.net/messages?retryWrites=true&w=majority')
  .then(result => {
    const server = app.listen(808);
    const io = require('./socket').init(server);
    io.on('connection' , socket => {
      console.log('client connected');
    })
  })
  .catch(err => {
    console.log(err);
  });