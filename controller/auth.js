const User = require('../models/User');
const { validationResult } = require('express-validator/check');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


exports.signup = async (req,res,next) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        const error = new Error('Validation Failed, entered data is incorrect');
        error.statusCode = 422;
        error.data = errors.array();
        console.log(errors);
        throw error;
      } 

    const email = req.body.email;
    const name = req.body.name;
    const password = req.body.password;
    try{
        const hashedPw = await bcrypt.hash(password , 12);
        const user = new User({
            email: email,
            name : name,
            password : hashedPw,
        });
        const result = await user.save();
        res.status(201).json({message : 'User created' , userId : result._id});
    }
    catch(err) {
        if(!err.statusCode){
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.login = async (req,res,next) => {
    const email = req.body.email;
    const password = req.body.password;
    let loadedUser ;
    try{
        const user = await User.findOne({email: email})
        if(!user) {
            const error = new Error('A user with this email could not be found');
            error.statusCode = 401;
            throw error;
        }
        loadedUser = user;
        const isEqual = await bcrypt.compare(password , user.password);
        if(!isEqual){
            const error = new Error('Password Dont Match');
            error.statusCode = 401;
            throw error; 
        }
        const token = jwt.sign({
            email: loadedUser.email,
            userId : loadedUser._id.toString()
        } , 'secret' , {expiresIn:'1h'});
        res.status(200).json({ token : token , userId : loadedUser._id.toString() });
     }
     catch(err) {
        if(!err.statusCode){
        err.statusCode = 500;
        }
        next(err);
    }
}