//package.json은 외장모듈 관리를 위해 사용(npm init)
var http = require('http')
var express = require('express')
var static = require('serve-static')
var path = require('path')
var bodyParser = require('body-parser')
var multer = require('multer')
var fs = require('fs')
var cors = require('cors') // 다른 서버로 접근하기위해서 사용
var mysql = require('mysql');
var crypto = require('crypto'); //비밀번호 암호화
var socketio = require('socket.io');
var Jimp = require('jimp');
var mysqlDB = require('./mysql-db');
var login = require("./login")
mysqlDB.connect();

var app = express();

app.set('port',process.env.PORT || 9000); //포트 지정

app.use(express.static(path.join(__dirname,'public')));
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json()); //post방식으로 데이터 받기위해 2줄 적어야한다

app.use(cors());



var storage = multer.diskStorage({
    destination : function(req,file,callback){
        var dir = './public/not_complete_picture';
        callback(null,dir);

    }, //파일위치 정하기
    filename : function(req,file,callback){
       var extension = path.extname(file.originalname); //확장자
       var basename = path.basename(file.originalname,extension); //확장자 뺀 파일이름
       callback(null,basename+extension);
    } //파일이름 정하기
})

var upload = multer({
    storage : storage,
    limits:{
        files:10,
        fileSize:1024*1024*10
    }
});


var mpersonStorage = multer.diskStorage({
    destination : function(req,file,callback){
        callback(null,'./public/mperson_picture');
    },
    filename : function(req,file,callback){
        callback(null,file.originalname);
    }
})

var mpersonUpload = multer({
    storage : mpersonStorage,
    limits:{ 
        files:10,
        fileSize:1024*1024*1024
    }
})


var router = express.Router();
app.use('/',router);

router.route("/get/department").get(function(req,res){
    var data
    mysqlDB.query("select * from DEPARTMENT",function(err,rows,fields){
        if(err){
            console.log(err)
            console.log("error 입니다")
            data={"checked":"error"}
            res.write(JSON.stringify(data))
        }else{
            console.log(rows)
            res.write(JSON.stringify(rows))
        }
    })
}) //부서얻기

router.route("/complete/data").get(function(req,res){
    var m_id = req.query.m_id;
    console.log("m_id : " + m_id);

    mysqlDB.query("select m_find_latitude, m_find_longitude from MAPLIST where m_id =?",[m_id],function(err,results){
        if(err){
            console.log("complete 에러 발생");
        }else{
           // console.log(JSON.stringify(results));
            var data = { 
                "m_find_latitude":results[0].m_find_latitude,
                "m_find_longitude":results[0].m_find_longitude
            }
            res.write(JSON.stringify(data));
        }
    })
})

router.route("/not_complete/list").get(function(req,res){ //특정 인덱스에 대해서만 수색불가정보 가저오기
    var m_id = req.query.m_id;
    var index = req.query.index;
    console.log("m_id : "+m_id);
    console.log("index : "+index);
    mysqlDB.query('select ul_longitude,ul_latitude,ul_desc,ul_file,ul_index from UNABLE_LOCATION where m_id = ? and ul_index = ?',[m_id,index],function(err,rows,fields){
        if(err){
            console.log("not_complete_list error입니다")
        }
        else{
            res.write(JSON.stringify(rows));
            res.end();
        }
    })
})

router.route("/tracking/list").get(function(req,res){
    var mid = req.query.m_id;
    var index = req.query.index;
    console.log("mid : "+mid);
    console.log("index : "+index);
    mysqlDB.query("select * from MAPDETAIL where m_id = ? and md_index = ?",[mid,index],function(err,rows,fields){
        if(err){
            console.log("mapdetail query error : "+err);
        }else{
           // console.log("mapdetail rows : "+ JSON.stringify(rows));
            res.write(JSON.stringify(rows));
        }
    })
})



//기존 맵에 들어갔을 때, 전체 지도 트래킹 정보 받아오기

router.route("/get/detail/data").get(function(req,res){
    var mid = req.query.mid;
    

    mysqlDB.query("select  md_index,md_inner_scale,md_run_length from MAPDETAIL where m_id = ?",[mid],function(err,rows,fields){
        if(err){
            console.log("mapdetail query error : "+err);
        }else{
          //  console.log("mapdetail rows : "+ JSON.stringify(rows));
            res.write(JSON.stringify(rows));
        }
    })
})
//전체 지도 수색불가 정보 받아오기
router.route("/get/not_complete/data").get(function(req,res){
    var mid = req.query.mid;

    mysqlDB.query("select ul_longitude,ul_latitude,ul_desc,ul_file,ul_index from UNABLE_LOCATION where m_id = ?",[mid],function(err,rows,fields){
        if(err){
            console.log("unable_location query error :"+err);

        }else{
           // console.log("u_l_q  rows : "+JSON.stringify(rows));
            res.write(JSON.stringify(rows));
        }
    })
})

router.route("/insert/department").get(function(req,res){
    var department = req.query.department
    var color = req.query.color

    var data = {"u_department":department,"color":color}
    mysqlDB.query("insert into DEPARTMENT set ?",data,function(err,results){
        var check
        if(err){
            console.log(err)
            check = {"overlap_examine":"error"}
        }else{
            check = {"overlap_examine":"success"}
        }
        res.send(JSON.stringify(check))
    })
})

router.route("/insert/mperson").post(mpersonUpload.array('upload',1),function(req,res){
     var p_name = req.body.p_name;
    var p_age = req.body.p_age;
    var p_time = req.body.p_time;
    var p_place_string = req.body.p_place_string;
    var p_place_latitude = req.body.p_place_latitude;
    var p_place_longitude = req.body.p_place_longitude;
    var p_place_description = req.body.p_place_description;
    //console.log(`${p_name} , ${p_age},${p_time}, ${p_place}`)
    var files = req.files;
    var p_photo = files[0].originalname;
    var extension = path.extname(files[0].originalname); //확장자
    var basename = path.basename(files[0].originalname,extension);
    console.log(extension);
    console.log(basename);
    console.log(files[0].originalname);
    /*if(extension == ".jpeg"||extension == '.jpg'){
        Jimp.read("./public/mperson_picture/"+files[0].originalname, function(err,image){
            if(err){
                console.log("jimp read error");
                console.log(err);
            }else{
                console.log("image write 전");
                image.write("./public/mperson_picture/"+basename+".png");
                console.log("fs unlink 전");
                fs.unlink("./public/mperson_picture/"+files[0].originalname, function(err){
                    if(err){
                        console.log("unlink 에러");
                        console.log(err);
                    }
                })
                
            } 
        })
      
      
        var p_photo = basename+".png"//파일이름
    }
    else{
        var p_photo = files[0].originalname//파일이름
    }*/
    

    var data = {p_name : p_name , p_age:p_age,p_time:p_time, p_place_string:p_place_string, p_place_latitude:p_place_latitude,
    p_place_longitude:p_place_longitude,p_place_description:p_place_description,p_photo:p_photo};
    var data2;
    mysqlDB.query('insert into MPERSON set ?',data,function(err,results){
        if(err){
            console.log('mperson insert시 에러발생');
            console.log("error : "+err);
            data2= {overlap_examine:'no'}
        }
        else{
            data2 = {overlap_examine:'yes'}
        }
        res.write(JSON.stringify(data2));
    })

    var files = req.files;



})

///여기서부터 
/*router.route("/complete").get(function(req,res){
    var mid = req.query.mid;
    var lat = req.query.lat;
    var lng = req.query.lng;
    console.log("mid : "+mid);
    console.log("lat : "+lat);
    console.log("lng : "+lng);
    var data;
    mysqlDB.query('UPDATE MAPLIST SET m_find_latitude = ?, m_find_longitude = ? where m_id = ?',[lat, lng, mid],function(err,rows,fields){
        if(err){
            console.log("실종자 발견")
            data ={"overlap_examine":"deny"};
            res.write(JSON.stringify(data));
            res.end()
        }
        else{
            data = {"overlap_examine" : 'yes'};
            res.write(JSON.stringify(data));
            res.end();
        }
    })
});*/



/*router.route("/not_complete").get(function(req,res){
    var mid = req.query.mid;
    var desc = req.query.desc;
    var lat = req.query.lat;
    var lng = req.query.lng;
    console.log("mid : "+mid);
    console.log("desc : "+desc);
    console.log("lat : "+lat);
    console.log("lng : "+lng);
    var data;
    mysqlDB.query('INSERT into UNABLE_LOCATION (m_id, ul_longitude, ul_latitude, ul_desc) values (?, ?, ?, ?);',[mid, lng,lat, desc],function(err,rows,fields){
        if(err){
            console.log("발견지점 불가 삽입 실패")
            data ={"overlap_examine":"deny"};
            res.write(JSON.stringify(data));
            res.end()
        }
        else{
            data = {"overlap_examine" : 'yes'};
            res.write(JSON.stringify(data));
            res.end();
        }
    })

    
    
})*/
   

router.route("/not_complete/image").post(upload.array("upload",1),function(req,res){ //수색불가시 사진 보낼 때의 url
    var files = req.files;
    var mid = req.body.mid;
  

    console.log("mid : "+mid);
  

    console.log('===업로드된 파일 ====');
    console.log(files[0]); 
    console.log("file name : "+files[0].originalname);
    var dir = "./public/not_complete_picture/"+mid;
    if(!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
    var admit;
    fs.renameSync("./public/not_complete_picture/"+files[0].originalname, dir+"/"+files[0].originalname,function(err){});
        
    admit = {"overlap_examine" : 'yes'};
    res.write(JSON.stringify(admit));
    res.end();
    
  

});
    





router.route("/mapdetail").get(function(req,res){
    var m_id = req.query.m_id;
    mysqlDB.query('select * from MAPDETAIL where m_id = ?',[m_id],function(err,rows,fields){
        if(err){
            console.log("error입니다")
        }
        else{
            res.write(JSON.stringify(rows));
            res.end();
        }
    })
})



router.route("/person/maplist").get(function(req,res){ //맵정보 가져오기,실종자별로 
    var p_id = req.query.p_id;
    mysqlDB.query('select * from MAPLIST where m_status = 1 and p_id=?',[p_id],function(err,rows,fields){
        if(err){
            console.log("error 입니다");
            console.log(err);
        }else{
            res.writeHead(200,{"Content-Type":"text/html;charset=utf8"});
            res.write(JSON.stringify(rows));
            res.end();
        }
    })
})


router.route("/map/attendance").post(function(req,res){ //방 참가 처리
    var mapId = req.body.mapId;
    var password = req.body.password;

    mysqlDB.query('select * from MAPLIST where m_id=?',[mapId],function(err,results){
        var attendance;
        if(err)
        {
            attendance = {"overlap_examine":"error"};
            console.log("방참가 에러 에러");
            console.log(JSON.stringify(attendance));
            res.write(JSON.stringify(attendance));
            res.end();
        }
        else if(!results[0]){
            attendance = {"overlap_examine":"no"}; 
            res.write(JSON.stringify(attendance));
            res.end();
        }
        else{
            var map = results[0];
            var hashpassword = crypto.createHash("sha512").update(password+map.m_salt).digest("hex");
            if(hashpassword === map.m_password){
                attendance = {"overlap_examine":"yes"};
            }else{
                attendance = {"overlap_examine":"wrong"}
            }
            //console.log(JSON.stringify(attendance));
            res.write(JSON.stringify(attendance));
            res.end();
        }
    })
})

router.route("/map/make").post(function(req,res){
    var p_id = req.body.p_id
    var m_password = req.body.m_password
    var m_owner = req.body.m_owner
    var m_status = req.body.m_status
    var m_size = req.body.m_size
    var m_unit_scale = req.body.m_unit_scale
    var m_rotation = req.body.m_rotation
    var m_center_place_string = req.body.m_center_place_string
    var m_center_point_latitude = req.body.m_center_point_latitude
    var m_center_point_longitude = req.body.m_center_point_longitude
    console.log(p_id)
    console.log(m_password)
    console.log(m_owner)
    console.log(m_status)
    console.log(m_size)
    console.log(m_unit_scale)
    console.log(m_rotation)
    console.log(m_center_place_string)
    console.log(m_center_point_latitude)
    console.log(m_center_point_longitude)    
    
    var m_salt = Math.round((new Date().valueOf() * Math.random())) + "";
    var hashPassword = crypto.createHash("sha512").update(m_password+m_salt).digest("hex");
    
    var data = {p_id:p_id,m_password:hashPassword,m_owner:m_owner,m_status:m_status,m_size:m_size,
                m_unit_scale:m_unit_scale,m_rotation:m_rotation,m_center_place_string:m_center_place_string,
                m_center_point_latitude:m_center_point_latitude,m_center_point_longitude:m_center_point_longitude,
                m_salt:m_salt}
    mysqlDB.query('insert into MAPLIST set ?',data,function(err,results){
        var admit;
        if(err){
            console.log("맵 목록 insert 에러 발생");
            admit ={"overlap_examine":"error"};
        }else{
            console.log(results)
            admit = {"overlap_examine":"success","m_id":results.insertId}
        }
        res.write(JSON.stringify(admit));
        res.end()
    })
})

/*router.route("/map/make").post(function(req,res){ //맵만들기
    var p_id = req.body.p_id
    var m_password = req.body.m_password
    var m_owner = req.body.m_owner
    var m_status = req.body.m_status
    var m_size = req.body.m_size
    var m_unit_scale = req.body.m_unit_scale
    var m_rotation = req.body.m_rotation
    var m_center_place_string = req.body.m_center_place_string
    var m_center_point_latitude = req.body.m_center_point_latitude
    var m_center_point_longitude = req.body.m_center_point_longitude
    
    var salt = Math.round((new Date().valueOf() * Math.random())) + "";
    var hashPassword = crypto.createHash("sha512").update(mapPassword+salt).digest("hex");
    console.log(`mperson : ${mperson} , mapPassword : ${mapPassword}, mapOwner : ${mapOwner}, mapStaus : ${mapStaus} , mapHorizontal : ${mapHorizontal}, mapVertical : ${mapVertical} , `+
                `mapPlacestring : ${mapPlacestring} , mapPlaceLatitude : ${mapPlaceLatitude}, mapPlaceLongitude : ${mapPlaceLongitude}, mapUp : ${mapUp} , mapDown : ${mapDown}, mapRight : ${mapRight} , `+
                `mapLeft : ${mapLeft} , mapUnitScale : ${mapUnitScale}, mapRotation : ${mapRotation}, mapCenterLatitude : ${mapCenterLatitude} , mapCenterLongitude : ${mapCenterLongitude}, mapNorthWestLatitude : ${mapNorthWestLatitude} , `+
                `mapNorthWestLongitude : ${mapNorthWestLongitude} , mapNorthEastLatitude : ${mapNorthEastLatitude}, mapNorthEastLongitude : ${mapNorthEastLongitude},`+
                `mapSouthWestLatitude : ${mapSouthWestLatitude} , mapSouthWestLongitude : ${mapSouthWestLongitude}, mapSouthEastLatitude : ${mapSouthEastLatitude},`+
                `mapSouthEastLongitude : ${mapSouthEastLongitude} , salt : ${salt}, hashPassword : ${hashPassword}`);
    
    var data = {p_id:mperson,m_password:hashPassword,m_owner:mapOwner,m_status:mapStaus,m_horizontal:mapHorizontal,m_vertical:mapVertical,
                m_place_string:mapPlacestring,m_place_latitude:mapPlaceLatitude,m_place_longitude:mapPlaceLongitude,m_up:mapUp,m_down:mapDown,m_right:mapRight,m_left:mapLeft,
                m_unit_scale:mapUnitScale,m_rotation:mapRotation,m_center_point_latitude:mapCenterLatitude,m_center_point_longitude:mapCenterLongitude,
                m_northWest_latitude:mapNorthWestLatitude,m_northWest_longitude:mapNorthWestLongitude,
                m_northEast_latitude:mapNorthEastLatitude,m_northEast_longitude:mapNorthEastLongitude,
                m_southWest_latitude:mapSouthWestLatitude,m_southWest_longitude:mapSouthWestLongitude,
                m_southEast_latitude:mapSouthEastLatitude,m_southEast_longitude:mapSouthEastLongitude,
                m_salt:salt};
    mysqlDB.query('insert into MAPLIST set ?',data,function(err,results){
        var admit;
        if(err){
            console.log("맵 목록 insert 에러 발생");
            admit ={"overlap_examine":"deny"};
            res.write(JSON.stringify(admit));
            res.end()
        }else{
            admit={"overlap_examine":"success","m_id":results.insertId};
            //console.log("results :" +JSON.stringify(results));
            //console.log("회원가입 성공");
            res.write(JSON.stringify(admit));
            res.end();
            var run_length = " ";
            var scale = 0;
            if(mapUnitScale == "20"){
                scale = '4';
                run_length = '2,14,'
            } else if(mapUnitScale == '30' || mapUnitScale == '50'){
                scale = '8';
                run_length = '2,30,'
            } else if(mapUnitScale == '100'){
                scale = '16';
                run_length = '2,62,'
            } else if(mapUnitScale == '250'){
                scale = '32';
                run_length = '2,126,'
            } else{
                scale = '64';
                run_length = '2,254,'
            }
            var data2 ;
            for(var i =0;i<64;i++){
                data2 = {
                    "m_id":results.insertId,
                    "md_index":i,
                    "md_inner_scale":scale,
                    "md_run_length":run_length
                }
                mysqlDB.query('insert into MAPDETAIL set ?',data2,function(err,row,fields){
                    if(err){
                        console.log("mapdetail insert error");
                    }else{
                        console.log("mapdetail insert success");
                    }
                })
            }
        }
    })
})*/


router.route("/mypage/maplist").get(function(req,res){ //맵정보 가저오기
    var u_id = req.query.u_id;
    mysqlDB.query('select m_id,p_name,m_center_place_string from MAPLIST,MPERSON where m_status = 1 and m_owner=? and MAPLIST.p_id=MPERSON.p_id',[u_id],function(err,rows,fields){
        if(err){
            console.log("error 입니다");
        }else{
            console.log(rows);
            res.write(JSON.stringify(rows));
            res.end();
        }
    })
})

router.route("/delete/room").post(function(req,res){ //방삭제
    var mapId = req.body.mapId;
    var password = req.body.password;
    //console.log("mapId : "+mapId);
    //console.log("password : "+password);

    mysqlDB.query('select * from MAPLIST where m_id=?',[mapId],function(err,results){
        var delete_room;
        if(err)
        {
            delete_room = {"overlap_examine":"error"};
            console.log("방참가 에러 에러");
            console.log(JSON.stringify(delete_room));
            res.write(JSON.stringify(delete_room));
            res.end();
        }
        else if(!results[0]){
            delete_room = {"overlap_examine":"no"}; 
            //console.log("방 없음")
            //console.log(JSON.stringify(delete_room));
            res.write(JSON.stringify(delete_room));
            res.end();
        }
        else{
            var map = results[0];
            var hashpassword = crypto.createHash("sha512").update(password+map.m_salt).digest("hex");
            if(hashpassword === map.m_password){
                //console.log("delete_room success");
                delete_room = {"overlap_examine":"yes"};
                mysqlDB.query(`UPDATE MAPLIST SET m_status = 0 WHERE m_id=${mapId}`);
            }else{
                //console.log("delete_room fail");
                delete_room = {"overlap_examine":"wrong"}
            }
           // console.log(JSON.stringify(delete_room));
            res.write(JSON.stringify(delete_room));
            res.end();
        }
    })
});

router.route("/change/department").get(function(req,res){ //부서 변경
    var u_department = req.query.u_department;
    var u_id = req.query.u_id;

    //색상정보 알아오기
    mysqlDB.query('select color from DEPARTMENT where u_department=?',[u_department],function(err,results){
        var data
        if(err){
            console.log("에러 발생");
            data={"check":"error"}
            res.send(JSON.stringify(data))
        }else{
            console.log("color얻어오기")
            var color = results[0]
            console.log("color : "+color.color)
            mysqlDB.query('update USER set u_department = ? where u_id=?',[u_department,u_id],function(err,rows,fields){
                var user;
                if(err){
                    console.log("에러 발생");
                    user = {"check":"error"}
                    res.send(JSON.stringify(user))
                }else{
                    console.log("부서변경 성공");
                    user = {"check":"yes","color":color.color}
                    res.send(JSON.stringify(user))
                }
            })
        }
    })
});

router.route("/change/password").post(function(req,res){ //비밀번호 변경
    var u_id = req.body.u_id;
    var password = req.body.password;
   // console.log("u_id : "+u_id);
    //console.log("password : "+password);
    
    var salt = Math.round((new Date().valueOf() * Math.random())) + "";
    var hashPassword = crypto.createHash("sha512").update(password+salt).digest("hex");
    mysqlDB.query('update USER set u_password=?,u_salt=? where u_id=?',[hashPassword,salt,u_id],function(err,rows,fields){
        var user;
        if(err){
            console.log(err);
            console.log("에러 발생");
            user={"check":"no"};  
            res.send(JSON.stringify(user));          
        }
        else{
            //console.log("rows : " + rows);
            //console.log("fields : "+ fields);
            user={"check":"yes"}
            res.send(JSON.stringify(user)); 
        }
    })
})

router.route("/examine").post(function(req,res){ //중복체크
    var email = req.body.email;
   // console.log("email : "+email);
    mysqlDB.query('select * from USER where u_email=?',[email],function(err,results){
        if(err){
            console.log("에러발생");
        }
        else if(results[0])
        {
            //console.log("이미 이메일이 존재합니다.");
            res.writeHead(200,{"Content-Type":"text/html;charset=utf8"});
            var examine={"overlap_examine":"deny"};
            //console.log(JSON.stringify(examine));
            res.write(JSON.stringify(examine));
            res.end();
        }
        else{
           // console.log("존재하지 않습니다.")
            res.writeHead(200,{"Content-Type":"text/html;charset=utf8"});
            var examine={"overlap_examine":"access"}
            res.write(JSON.stringify(examine));
            res.end();
        }
    })  
})

router.route("/admin/process").post(function(req,res){ //회원가입
    var email = req.body.email;
    var inputPassword = req.body.password;
    var name = req.body.name;
    var department = req.body.department;
    var salt = Math.round((new Date().valueOf() * Math.random())) + "";
    var hashPassword = crypto.createHash("sha512").update(inputPassword+salt).digest("hex");
   // console.log(`email : ${email} , inputPassword : ${inputPassword}, hashPassword : ${hashPassword}, name : ${name} , department : ${department}, salt : ${salt}`);
    
    var data = {u_email:email,u_password:hashPassword,u_name:name,u_department:department,u_salt:salt};
    mysqlDB.query('insert into USER set ?',data,function(err,results){
        var admit;
        if(err){
            console.log("회원가입시 insert 에러 발생");
            admit ={"overlap_examine":"deny"};
            res.write(JSON.stringify(admit));
            res.end()
        }else{
            admit={"overlap_examine":"success"};
           // console.log("회원가입 성공");
            res.write(JSON.stringify(admit));
            res.end();
        }
    })
})

router.route("/login/process").post(login.loginProcess)


router.route("/mperson").get(function(req,res){ //실종자 리스트 (지역정보 쿼리스트링으로 받아오기)
    mysqlDB.query('select * from MPERSON',function(err,rows,fields){
        if(err){
            console.log("query error : " + err);
        }else{
            var result = 'rows : '+JSON.stringify(rows)+'<br><br>' +
            'fields : ' + JSON.stringify(fields);
            console.log(rows);
            //console.log("result : " +result);
            res.writeHead(200,{"Content-Type":"text/html;charset=utf8"});
            res.write(JSON.stringify(rows));
            res.end();
        }
    })
})

router.route('/process/gettest').get(function(req,res){
    var id = req.query.id;
    var password = req.query.password;
  //  console.log(`id : ${id} , password : ${password}`);
    res.writeHead(200,{"Content-Type":'text/html;charset=utf8'});
    res.write(`<h3>id : ${id} , password : ${password}</h3>`);
    res.end();
})

router.route('/process/login').post(function(req,res){
    var id = req.body.id || req.query.id;
    var password = req.body.password || req.query.password;
   // console.log(`id : ${id} , password : ${password}`);
})

router.route('/process/file').post(upload.array('photo',1),function(req,res){ //photo는 웹페이지 input의 name값
  //  console.log('/process/photo 라우팅 함수 호출됨.'); 

    var files = req.files; //여기에 파일정보가 있다. 
    console.log('==== 업로드된 파일 ====');
    if(files.length >0){
        console.log(files[0]);
    }else{
        console.log('파일이 없습니다');
    }

    if(Array.isArray(files)){
        for(var i =0;i<files.length;i++){
            originalname = files[i].originalname;
            filename = files[i].filename;
            mimetype = files[i].mimetype;
            size = files[i].size;
            console.log(`originalname : ${originalname} , filename : ${filename} , mimetype : ${mimetype} , size : ${size}`);
        }
    }

    res.writeHead(200,{"Content-Type":"text/html;charset=utf8"});
    res.write("<h1>파일 업로드 성공</h1>")
    res.end();
})

app.use(function(req,res,next){
    res.writeHead(200,{'Content-Type':'text/html;charset=utf8'})
    res.write(`<h3>해당하는 내용이 없습니다</h3>`)
    res.end();
})

var server = http.createServer(app).listen(app.get('port'),function(){
    console.log("익스프레스로 웹 서버를 실행함 : "+ app.get('port'));
}) //express를 이용해 웹서버 만든다

var io = socketio.listen(server); //소켓 서버 생성
console.log('socket.io 요청을 받아들일 준비가 되었습니다');

//var total_list = new Array(); 
//var user_list = {};
//var user_id = new Array();
//socket
io.sockets.on('connection',function(socket){
    
    console.log('Socket ID : '+ socket.id + ', Connect');
    
    socket.on('attendRoom',function(data){
        var u_id = data.id // user id
        var m_id = data.mapid // map id
        
        socket.join(m_id);
        var message = { msg: 'server', data:'방참여'}
        console.log("curRoom : "+ io.sockets.adapter.rooms[m_id]);
        console.log("curRoom_length : "+ io.sockets.adapter.rooms[m_id].length);
        io.sockets.connected[socket.id].emit('attendRoom',message);
    
    })

    socket.on('makeroom',function(data){
        var u_id = data.id //user id
        var m_id = data.mapid //map id

        console.log("make room");
        if(io.sockets.adapter.rooms[m_id]){
            console.log("이미 방이 만들어져 있습니다.");
        }else
        console.log('새로방을 만듭니다');

        socket.join(m_id);

        var curRoom = io.sockets.adapter.rooms[m_id];
        curRoom.u_id = u_id;
        curRoom.m_id = m_id;
        curRoom.s_id = socket.id;
        console.log("curRoom : "+curRoom);
        var message = {msg:'server',data :'방만들기 완료'}
        io.sockets.connected[socket.id].emit('makeroom',message);
    })
    
    socket.on('complete',function(data){
        console.log('Client Message : '+data);
        var mid = data.mid;
        var lat = data.lat;
        var lng = data.lng;
        console.log("mid : "+mid);
        console.log("lat :" +lat);
        console.log("lng : "+lng);
        
        //모두에게 데이터 보내기
        var serve_data = {
            lat : lat,
            lng : lng
        };
        var data;
        mysqlDB.query('UPDATE MAPLIST SET m_find_latitude = ?, m_find_longitude = ? where m_id = ?',[lat, lng, mid],function(err,rows,fields){
            if(err){
                console.log("실종자 발견")
            }
            else{
               console.log("성공");
            }
        })
        
        io.sockets.in(mid).emit('complete',serve_data);
    });

    socket.on('not_complete',function(data){ //사진 넣어야함 =>사진은 http로
        console.log('Client Mesaage : '+data);
        var mid = data.mid;
        var lat = data.lat;
        var lng = data.lng;
        var desc = data.desc;
        var photo_name;
        var index = data.index;
        if(data.photo_name == null)
            photo_name = null;
        else{
            photo_name = data.photo_name;
        }

        console.log("mid : "+mid);
        console.log("dist : "+lat);
        console.log("index : "+lng);
        console.log("content : "+desc);
        console.log("img name :"+photo_name);
        console.log("index : "+index)


        //디비 저장
        mysqlDB.query('INSERT into UNABLE_LOCATION (m_id, ul_longitude, ul_latitude, ul_desc,ul_file,ul_index) values (?, ?, ?, ?,?,?);',[mid, lng,lat, desc,photo_name,index],function(err,rows,fields){
            if(err){
                console.log("발견지점 불가 삽입 실패")
            }
            else{
                var serve_data = {
                    "lat":lat,
                    "lng":lng,
                    "desc":desc,
                    "photo_name":photo_name,
                    "index":index
                };
                
                io.sockets.in(mid).emit('not_complete',serve_data);
            }
        })  
    })

    socket.on('seeroad',function(data){
        var uid = data.uid;
        var mid = data.mid;
        var lat = data.lat;
        var lng = data.lng;
        var index = data.index;
        //var scale = data.scale;
        var run_length = data.run_length;

        data = {
            "m_id":mid,
            "md_index" : index,
            "md_run_length":run_length
        }

        mysqlDB.query("update MAPDETAIL set md_run_length=? where m_id=? and md_index=?",[run_length,mid,index],function(err,rows,fields){
            if(err){
                console.log("mapdetail update error");
            }else{
                console.log("mapdetail update success");
            }
        }) // 디비에 run_length 관련 데이터 저장
        
        console.log("mid : "+mid);
        console.log("lat : "+lat);
        console.log("lng : "+lng);
        serve_data = {
            "uid":uid,
            "lat":lat,
            "lng":lng
        } //방에있는 클라이언트에게 뿌릴 데이터

        io.sockets.in(mid).emit('seeroad',serve_data);
        console.log("io_socket");
    })

   /* socket.on('disconnect',function(data){
        var u_id = data.u_id;
        var socket_id = user_list[u_id];
        console.log("disconnect");
        console.log("data : "+u_id);
        var index = user_id.indexOf(u_id);
        user_id.pop(index);
        delete user_list.u_id;
        io.sockets.connected[socket_id].emit("disconnect",null);
    })*/
})


