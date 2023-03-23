const { validationResult } = require('express-validator/check');

const fs = require('fs');

const path = require('path');

const io = require('../socket');

const Post = require('../models/Post');
const User = require('../models/User');

exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  let totalItems;
  try{
    totalItems = await Post.find()
      .countDocuments()
      const posts = await Post.find()
          .populate('creator')
          .sort({createdAt : -1})
          .skip((currentPage - 1) * perPage)
          .limit(perPage);
        res.status(200).json({
            message: 'Fetched posts successfully.',
            posts: posts,
            totalItems: totalItems
          });
    }
    catch (err) {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
  };
}

exports.createPost = async (req, res, next) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    const error = new Error('Validation Failed, entered data is incorrect');
    error.statusCode = 422;
    throw error;
  }  console.log(req.file);
  if(!req.file){
    const error = new Error('Image is not Provided');
    error.statusCode = 422;
    throw error;
  }
  const imageUrl = req.file.path.replace("\\" ,"/");
  const title = req.body.title;
  const content = req.body.content;
  const post = new Post({
    title: title,
    content: content,
    imageUrl : imageUrl,
    creator : req.userId
  });
  try{
  await post.save()
  const creator = await User.findById(req.userId);
  creator.posts.push(post);
  await creator.save();
  io.getIo().emit('posts' ,
   {action : 'create' ,
    post :{...post._doc , creator : { _id : req.userId , name : creator.name}}});
  res.status(201).json({
      message: 'Post created successfully!',
      post : post,
      creator : {name : creator.name , _id : creator._id}
    });
  }
  catch (err) {
    if(!err.statusCode){
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getPost = async (req,res,next) => {
  const postId = req.params.postId;
  try{
  const post = await Post.findById(postId);
  if(!post){
    const error = new Error('Post Not Found');
    error.statusCode = 404;
    throw err;
  }
  res.status(200).json({message : 'Post Fetched!' , post : post});
  }
  catch (err) {
    if(!err.statusCode){
      err.statusCode = 500;
    }
    next(err);
  }
}


exports.updatePost = async (req,res,next) =>{
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    const error = new Error('Validation Failed, entered data is incorrect');
    error.statusCode = 422;
    throw error;
  }
  const postId = req.params.postId;
  const title = req.body.title;
  const content = req.body.content;
  let imageUrl = req.body.image;
  if(req.file){
    imageUrl = req.file.path.replace("\\" ,"/");
  }
  if(!imageUrl){
    const error = new Error('No file Picked');
    error.statusCode = 422;
    throw error;
  }
  try{
    const post = await Post.findById(postId).populate('creator');
      if(!post){
        const error = new Error('Post Not Found');
        error.statusCode = 404;
        throw err;
      }
      if( post.creator._id.toString() !== req.userId){
        const error = new Error('You are not authorized');
        error.statusCode = 403;
        throw error;
      }
      if(imageUrl !== post.imageUrl){
        clearImage(post.imageUrl);
      }
      post.title = title;
      post.content = content;
      post.imageUrl = imageUrl;
    try{
      const result = await post.save();
      io.getIo().emit('posts' , {action : 'update' , post : result});
      res.status(200).json({message : 'Post Updated!' , post : post});
    }
    catch (err) {
      if(!err.statusCode){
        err.statusCode = 500;
      }
      next(err);
    }
  }
    catch (err) {
      if(!err.statusCode){
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deletePost = async (req,res,next) => {
  const postId = req.params.postId;
  try {
    const post = await Post.findById(postId);
      if(!post){
        const error = new Error('Post Not Found');
        error.statusCode = 404;
        throw err;
      }
      if( post.creator.toString() !== req.userId){
        const error = new Error('You are not authorized');
        error.statusCode = 403;
        throw error;
      }
      // check user logged in
      clearImage(post.imageUrl);
      await Post.findByIdAndRemove(postId);
      const user = await User.findById(req.userId);
      user.posts.pull(postId);
      await  user.save();
      io.getIo().emit('posts' , {
        action : 'delete' , post : postId});
      res.status(200).json({message : 'Post Deleted'});
    }
    catch (err) {
      if(!err.statusCode){
      err.statusCode = 500;
    }
    next(err);
  }
}

exports.getStatus = async (req,res,next) => {
  try{
    const user = await User.findById(req.userId)
    if(!user){
      const error = new Error('User not found');
      error.statusCode = 404;
      throw err;
    }
    res.status(200).json({ status : user.status});
  }
  catch (err) {
    if(!err.statusCode){
    err.statusCode = 500;
  }
  next(err);
  }
}

exports.updateStatus = async (req,res,next) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    const error = new Error('Validation Failed, entered data is incorrect');
    error.statusCode = 422;
    throw error;
  }
  const newStatus = req.body.status;
  try{
    const user = await User.findById(req.userId);
    if(!user){
      const error = new Error('User Not Found');
      error.statusCode = 404;
      throw err;
    }
    user.status = newStatus;
    await user.save();
    res.status(200).json({message : 'Status Updated'});
  }
  catch (err) {
    if(!err.statusCode){
    err.statusCode = 500;
  }
  next(err);
  }
}


const clearImage =filePath => {
  filePath = path.join(__dirname, '..' , filePath);
  fs.unlink(filePath , err => console.log(err));
}