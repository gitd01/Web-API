var express = require('express');
var jwt = require('jsonwebtoken');
require("dotenv").config();
var fileupload = require('express-fileupload');
var multer = require('multer');
var fs = require('fs');
var gTTS = require('gtts');
var Fs = require('@supercharge/fs');
var videoShow = require('videoshow');
var ffmpeg = require('fluent-ffmpeg');
var path  = require('path');
var axios = require('axios');
// const { resolve } = require('path');
// const { rejects } = require('assert');
var mime = require('mime');

const app = express();
app.use(fileupload());
app.use(express.json());
// const upload = multer();

// ffmpeg.setFfmpegPath("C:/ffmpeg/ffmpeg.exe");
// ffmpeg.setFfprobePath("C:/ffmpeg");
ffmpeg.setFlvtoolPath("C:/flvtool");
// console.log(ffmpeg);

app.get('/',(req,res,next)=>{
    res.status(200).send("Hey! This is REST API which is used to upload files, to convert text to audio, to merge audio, video and image and to download any files from server using JWT token.")
})

const TOKEN_KEY = process.env.TOKEN_KEY

app.post('/create_new_storage',(req,res)=>{
    const user = { id:1};
    const token = jwt.sign({user}, TOKEN_KEY);
    res.json({
        token:token
    });
});

function ensureToken(req,res,next){
    const bearerHeader = req.headers["authorization"];
    if(typeof bearerHeader !== 'undefined'){
        const bearer = bearerHeader.split(" ");
        const bearerToken = bearer[1];
        req.token = bearerToken;
        next();
    } else{
        return res.json({
            success:0,
            message:"Token error"
        });
    }
}

app.post('/upload_file', ensureToken ,(req,res)=>{
            console.log(req.files);
            const file = req.files.my_file;
            file.mv(`${__dirname}/public/upload/${file.name}`,(err,result)=>{
                if(err){
                    throw err;
                }
                res.send({
                    status: "ok",
                    file_path: `public/upload/${file.name}`
                });
            });
});

app.get('/my_upload_file',ensureToken, (req, res) => {
    const directoryPath = `${__dirname}/public/upload/`;
    fs.readdir(directoryPath, function (err, files) {
      if (err) {
        res.status(500).send({
          message: "Unable to scan files!",
        });
      }
      let fileInfos = [];
          fileInfos.push({
          status:'ok',
          data: files,
        });  
      res.status(200).send(fileInfos);
      console.log(fileInfos);
    });
});

app.post('/text_file_to_audio',ensureToken,(req,res)=>{
    console.log(req.files);
    const file = req.files.file_path
    const textToMp3 = `${req.files.file_path.data} `;
    var gtts = new gTTS(textToMp3, 'en');
    gtts.save(`${__dirname}/public/upload/`+Fs.filename(`${file.name}`)+`.mp3`, (err, result)=> {
    if(err) { 
        throw new Error(err) 
    }
    return res.json({ 
                status: "ok",
                message: "text to speech converted",
                audio_file_path: "public/upload/"+Fs.filename(`${file.name}`)+`.mp3`
            });
    });
});

app.post('/merge_image_and_audio',ensureToken,(req,res)=>{
    const image = req.files.image_file_path.name
    const img = [
        {path: `./public/upload/${image}`
        }
    ]
    const audio = req.files.audio_file_path.name;
    var videoOptions = {
        loop: 5,
        fps: 25,
        transition: true,
        transitionDuration: 1,
        videoBitrate:1024,
        videoCodec: 'libx264',
        size: '640x?',
        audioBitrate: '128k',
        audioChannels: 2,
        format: 'mp4',
        pixelFormat: 'yuv420p'
    };
    videoShow(img,videoOptions)
    .audio(`./public/upload/${audio}`)
    .save(`./public/upload/${Fs.filename(`${image}`)}.mp4`)
    .on('start',(command)=>{
        console.log('Conversion started '+command)
    })
    .on('error',(err, stdout, stderr)=>{
        console.log('Some error occured '+ err)
    })
    .on('end',(output)=>{
        console.log('Conversion completed '+ output)
    });
    return res.json({
        status: "ok",
        message: "Video Created Successfully",
        video_file_path:  "public/upload/"+Fs.filename(`${image}`)+`.mp4`
    });
});

app.post('/merge_all_video',ensureToken,(req,res)=>{
    const file= req.files.video_file_path_list;
    // console.log(file[0]);
    ffmpeg({source: `${__dirname}/public/upload/${file[0].name}`})
    .input(`${__dirname}/public/upload/${file[1].name}`)
    .on('start',(command)=>{
        console.log('Conversion started '+command)
    })
    .on('end', (output)=>{
        console.log('Merging is done '+ output)
    })
    .on('error',(err, stdout, stderr)=>{
        console.log(err)
    })
    .mergeToFile("./public/upload/"+Fs.filename(`${file[0].name}`)+`8.mp4`)
    return res.json({
        status: "ok",
        message: "Merged All Video Successfully",
        video_file_path: "public/upload/"+Fs.filename(`${file[0].name}`)+`8.mp4`
    });
});

app.get('/download_file',(req,res)=>{
    const file_path = `${__dirname}/public/upload/d.png`;
    res.download(
        file_path,
        "download.png"
    )
})

const PORT=process.env.PORT;
app.listen(PORT,function(){
    console.log(`listening on port ${PORT}...`);
});