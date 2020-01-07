var fs = require('fs');
var http = require('http');
var https = require('https');

const express = require('express');
const mysql = require('mysql');
var bodyParser = require('body-parser');
var nodemailer = require('nodemailer');
var jwt = require ('jsonwebtoken');

// const options = {
//   key: fs.readFileSync('/home/devuser/ssl-cert/7r48-key.pem'),
//   cert: fs.readFileSync('/home/devuser/ssl-cert/7r48-server.pem'),
//   ca: [fs.readFileSync('/home/devuser/ssl-cert/Inter-CA1.pem'), fs.readFileSync('/home/devuser/ssl-cert/Inter-CA2.pem')],
//   rejectUnauthorized: true
// };

const app= express();


app.get('/',function(req,res){
    res.send(`
    
        <!doctype html>
        <html>
        <body>
            <form action="/loginAdmin" method="post">
                <input type="email" name="email" placeholder="Enter User Email"/><br />
                <input type="password" name="password" placeholder="Enter User Password"/><br />
                <button type="submit" name="btn_login">Login</button><br><br>
            </form>
            <form action="/registerAdmin" method="post">
                <input type="email" name="email" placeholder="Enter Admin Email"/><br />
                <input type="password" name="password" placeholder="Enter Admin Password"/><br />
                <input type="text" name="name" placeholder="Enter Admin Name"/><br />
                <button type="submit" name="btn_register">Register</button><br>
            </form>
        </body>
        </html>
    `);
})


app.use(bodyParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.get('/',function(req,res){
    res.send('append in url:');
});
var httpServer = http.createServer(app).listen(3001);
//var httpsServer = https.createServer(options, app).listen(37017);


//create connection to sql
const db = mysql.createConnection({
    host : '127.0.0.1',
    user : 'root',
    password : '',
    database : 'radio'
});
db.connect((err) => {
    if (err){
        throw err;
    }
    console.log('Connected to MySQL.');
});




//register
app.post('/registerAdmin',(req,res)=>{
    var reqObj=req.body;
    var encrypted_PW=reqObj.password;
    console.log("ha");
    let keys=['name','email','password'];
    let values=[reqObj.name,reqObj.email,encrypted_PW];
    let str=checkInputInsert(keys,values);
    let sql='INSERT into admin ('+str[0]+') values('+str[1]+')';
    console.log(sql)
    let query=db.query(sql,(err,result)=>{
        if(err)
        {
            if(err.code=="ER_DUP_ENTRY")
            {
                res.send({
                    status:400,
                    message:"This email is already registered."});
            }
            else{
            res.send({
            status:444,
            message:"DB Error."});
            }
        }
        else if(!result){
            res.send({
                status:400,
                message:"Registration Fail."});
        }
        else{
            res.send({
                status:200,
                message:"User registration Successful."});
        }

    });
});

//login
app.post('/login',(req,res)=>{
    var reqObj=req.body;
    var encrypted_PW=PWDecryptEncrypt(reqObj.password);

    let sql=' SELECT id,phone,email FROM user WHERE email = ? and password=? ';
    let query = db.query(sql,[ reqObj.email,encrypted_PW ],(err,result1)=>{
        if(err){
            res.send({
                status:444,
                message:"DB Error."});
        }
        else if(result1[0]){
            const token = jwt.sign({id : result1[0].id},'secret',{ expiresIn : "10m"});
            let sql=' UPDATE user SET token= ? WHERE email = ? and password=? ';
            let query = db.query(sql,[reqObj.notification_token, reqObj.email, encrypted_PW ],(err,result)=>{
                if(err)
                {res.send({
                    status:400,
                    message:"Login FAIL."});
                }
                else{
                    res.send({
                        status:200,
                        message:"Login Successful.",
                        token:token,
                        data: result1[0]});

                }
            });
        }
        else{
            res.send({
                status:400,
                message:"Login Fail. Name or Password Wrong."});
        }
    });
});

app.post('/changePassword/',checkToken,(req,res)=>{
    let id=req.header('user_id');
    var reqObj=req.body;
    var encrypted_PW=PWDecryptEncrypt(reqObj.password);

    var keys=['password']
    var params=[encrypted_PW];
    let str=checkInputUpdate(keys,params)
    if(str=='undefined=undefined')
    res.status(401).json({
        message:'ERROR:No input field to update'
    });
    else{
    let sql='update user set '+str+' where id=?'
    console.log(sql)
    let query=db.query(sql,[id],(err,result)=>{
        if(err)
        {res.send({
            status:400,
            message:"DB Connection Fail."});
        }
        else if(result.affectedRows==0){
            res.send({
                status:444,
                message:"Something Went Wrong. No matched rows."});
        }
        else{
            console.log(result);
        res.send({
            status:200,
            message:"Changing Password Successful.",
            });
        }
    });
    }
});

app.post('/resetPassword/',checkToken,(req,res)=>{
    var encrypted_PW=PWDecryptEncrypt('+qzcHz3m9TmYtJdt5ZkDOW9K9U7kSQgz6u2B94fqV0I=');
    let email=req.header('email');
    let sql='update user set password=? where email=? '
    console.log(sql)


    let query=db.query(sql,[encrypted_PW,email],(err,result)=>{
        if(err)
        {res.send({
            status:400,
            message:"DB Connection Fail."});
        }
        else if(result.affectedRows==0){
            res.send({
                status:444,
                message:"Something Went Wrong. No matched rows."});
        }
        else{
        var transporter = nodemailer.createTransport({
        from: 'developer.7r48@gmail.com',
        host: 'smtp.gmail.com', // hostname
        secureConnection: true, // use SSL
        port: 465, // port for secure SMTP
        transportMethod: 'SMTP',
        auth: {
          user: 'developer.7r48@gmail.com',
          pass: '@Ma!l319831'
        }
      });

      var mailOptions = {
        from: 'developer.7r48@gmail.com',
        to: email,
        subject: 'Password Reset',
        text: 'Your Password is reset as \'123qwerty567\''
      };

      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            res.send({
                status:444,
                message:"Something Went Wrong. Email not sent."});
                console.log(error);
        } else {
            res.send({
                status:200,
                message:"Password Reset Email is sent."});
        }
      });
    }
});
});

//add new shop
app.post('/addShop',checkToken,(req,res)=>{
    var reqObj=req.body;
    let keys=['name','location','type'];
    let values=[reqObj.name,reqObj.location,reqObj.type];
    let str=checkInputInsert(keys,values);
    let sql='INSERT into shop('+str[0]+') values('+str[1]+');';
    console.log(sql)
    let query=db.query(sql,(err,result)=>{
        if(err)
        {res.send({
            status:444,
            message:"DB Error."});}
        else if(!result){
            res.send({
                status:400,
                message:"Adding shop Fail."});
        }
        else{
            res.send({
                status:200,
                message:"Shop addition Successful."});
        }

    });
});

//update shop
app.post('/updateShop/',checkToken,(req,res)=>{
    let id=req.header('shop_id');
    var reqObj=req.body;
    let keys=['name','location','type'];
    let values=[reqObj.name,reqObj.location,reqObj.type];
    let str=checkInputUpdate(keys,values)
    if(str=='undefined=undefined')
    res.status(401).json({
        message:'ERROR:No input field to update'
    });
    else{
    let sql='update shop set '+str+' where id=?'
    console.log(sql)
    let query=db.query(sql,[id],(err,result)=>{
        if(err)
        {res.send({
            status:444,
            message:"DB Error."});}
        else if(!result){
            res.send({
                status:400,
                message:"Updating Shop Info Fail."});
        }
        else{
            res.send({
                status:200,
                message:"Updating Shop Info successful.",
                data: result});
        }
    });
    }
});

//delete shop by id
app.delete('/deleteShop/',checkToken,(req,res)=>{
    let id=req.header('shop_id');
    var no_of_records=checkRecordsShop(res,id);
    if(no_of_records>0){
        res.send({
            status:401,
            message:"This Shop has record. You can't delete it."});
    }
    else{
    let sql=' delete from shop where id=? ';
    let query = db.query(sql,[id],(err,result)=>{
        if(err)
        {res.send({
            status:444,
            message:"DB Error."});}
        else if(result.affectedRows==0){
            res.send({
                status:400,
                message:"Deleting Shop Fail."});
        }
        else{
            res.send({
                status:200,
                message:'Shop '+id+' is deleted.',
                data: result});
        }
    });
}
});

function checkRecordsShop(res,shop_id){
    let sql=' SELECT count(*) FROM record where shop_id=?';
    let query = db.query(sql,[ shop_id],(err,result)=>{
        if(err)
        {res.send({
            status:444,
            message:"DB Error."});}

        else{
            return result[0];
        }
    });
}

//add new item
app.post('/addItem',checkToken,(req,res)=>{
    var reqObj=req.body;
    let keys=['name','category_id'];
    let values=[reqObj.name,reqObj.category_id];
    let str=checkInputInsert(keys,values);
    let sql='INSERT into item('+str[0]+') values('+str[1]+');';
    console.log(sql)
    let query=db.query(sql,(err,result)=>{
        if(err)
        {res.send({
            status:444,
            message:"DB Error."});}
        else if(!result){
            res.send({
                status:400,
                message:"Adding item Fail."});
        }
        else{
            res.send({
                status:200,
                message:"Item addition Successful."});
        }

    });
});

//update item
app.post('/updateItem/',checkToken,(req,res)=>{
    let id=req.header('item_id');
    var reqObj=req.body;
    let keys=['name','category_id'];
    let values=[reqObj.name,reqObj.category_id];
    let str=checkInputUpdate(keys,values)
    if(str=='undefined=undefined')
    res.status(401).json({
        message:'ERROR:No input field to update'
    });
    else{
    let sql='update item set '+str+' where id=?'
    console.log(sql)
    let query=db.query(sql,[id],(err,result)=>{
        if(err)
        {res.send({
            status:444,
            message:"DB Error."});}
        else if(!result){
            res.send({
                status:400,
                message:"Updating Item Fail."});
        }
        else{
            res.send({
                status:200,
                message:"Updating Item successful.",
                data: result});
        }
    });
    }
});

//delete item by id
app.delete('/deleteItem/',checkToken,(req,res)=>{
    let id=req.header('item_id');
    var no_of_records=checkRecordsItem(res,id);
    if(no_of_records>0){
        res.send({
            status:401,
            message:"This Item has reocrds. You can't delete it."});
    }
    else{
    let sql=' delete from item where id=? ';
    let query = db.query(sql,[id],(err,result)=>{
        if(err)
        {res.send({
            status:444,
            message:"DB Error."});}
        else if(result.affectedRows==0){
            res.send({
                status:400,
                message:"Deleting Item Fail."});
        }
        else{
            res.send({
                status:200,
                message:'Item '+id+' is deleted.',
                data: result});
        }
    });
}
});

function checkRecordsItem(res,item_id){
    let sql=' SELECT count(*) FROM record where item_id=?';
    let query = db.query(sql,[ item_id],(err,result)=>{
        if(err)
        {res.send({
            status:444,
            message:"DB Error."});}

        else{
            return result[0];
        }
    });
}


//add new category
app.post('/addCategory',checkToken,(req,res)=>{
    var reqObj=req.body;
    let keys=['name'];
    let values=[reqObj.name];
    let str=checkInputInsert(keys,values);
    let sql='INSERT into category('+str[0]+') values('+str[1]+');';
    console.log(sql)
    let query=db.query(sql,(err,result)=>{
        if(err)
        {res.send({
            status:444,
            message:"DB Error."});}
        else if(!result){
            res.send({
                status:400,
                message:"Adding category Fail."});
        }
        else{
            res.send({
                status:200,
                message:"Category addition Successful."});
        }

    });
});

//update category
app.post('/updateCategory/',checkToken,(req,res)=>{
    let id=req.header('category_id');
    var reqObj=req.body;
    let keys=['name'];
    let values=[reqObj.name];
    let str=checkInputUpdate(keys,values)
    if(str=='undefined=undefined')
    res.status(401).json({
        message:'ERROR:No input field to update'
    });
    else{
    let sql='update category set '+str+' where id=?'
    console.log(sql)
    let query=db.query(sql,[id],(err,result)=>{
        if(err)
        {res.send({
            status:444,
            message:"DB Error."});}
        else if(!result){
            res.send({
                status:400,
                message:"Updating category Fail."});
        }
        else{
            res.send({
                status:200,
                message:"Updating category successful.",
                data: result});
        }
    });
    }
});

//delete category by id
app.delete('/deleteCategory/',checkToken,(req,res)=>{
    let id=req.header('category_id');
    var no_of_records=checkItems(res,id);
    if(no_of_records>0){
        res.send({
            status:401,
            message:"This Category has items. You can't delete it."});
    }
    else{
    let sql=' delete from category where id=? ';
    let query = db.query(sql,[id],(err,result)=>{
        if(err)
        {res.send({
            status:444,
            message:"DB Error."});}
        else if(result.affectedRows==0){
            res.send({
                status:400,
                message:"Deleting category Fail."});
        }
        else{
            res.send({
                status:200,
                message:'Category '+id+' is deleted.',
                data: result});
        }
    });
}
});

function checkItems(res,category_id){
    let sql=' SELECT count(*) FROM item where category_id=?';
    let query = db.query(sql,[ category_id],(err,result)=>{
        if(err)
        {res.send({
            status:444,
            message:"DB Error."});}

        else{
            return result[0];
        }
    });
}

//get all shops
app.get('/getAllShops',checkToken,(req,res)=>{
    let sql=' SELECT * FROM shop ';
    let query = db.query(sql,(err,result)=>{
        if(err)
        {res.send({
            status:444,
            message:"DB Error."});}
        else if(!result[0]){
            res.send({
                status:400,
                message:"No Rows."});
        }
        else{
            res.send({
                status:200,
                message:"Getting Data successful.",
                data: result});
        }
    });
});

//get all categories
app.get('/getAllCategories',checkToken,(req,res)=>{
    let sql=' SELECT * FROM category ';
    let query = db.query(sql,(err,result)=>{
        if(err)
        {res.send({
            status:444,
            message:"DB Error."});}
        else if(!result[0]){
            res.send({
                status:400,
                message:"No Rows."});
        }
        else{
            res.send({
                status:200,
                message:"Getting Data successful.",
                data: result});
        }
    });
});

//get all items
app.get('/getAllItems',checkToken,(req,res)=>{
    let sql=' SELECT * FROM item ';
    let query = db.query(sql,(err,result)=>{
        if(err)
        {res.send({
            status:444,
            message:"DB Error."});}
        else if(!result[0]){
            res.send({
                status:400,
                message:"No Rows."});
        }
        else{
            res.send({
                status:200,
                message:"Getting Data successful.",
                data: result});
        }
    });
});

//get items by category_id
app.get('/getItemsByCategory',checkToken,(req,res)=>{
    let id=req.header('category_id');
    let sql=' SELECT * FROM item WHERE category_id = ? ';
    let query = db.query(sql,[ id],(err,result)=>{
        if(err)
        {res.send({
            status:444,
            message:"DB Error."});}
        else if(!result[0]){
            res.send({
                status:400,
                message:"No Match Rows."});
        }
        else{
            res.send({
                status:200,
                message:"Getting Data successful.",
                data: result});
        }
    });
});

//add new record
app.post('/addNewRecord',checkToken,(req,res)=>{
    var reqObj=req.body;
    let keys=['shop_id','item_id','unit_price','wholesale_price','count','rate','comment'];
    let values=[reqObj.shop_id,reqObj.item_id,reqObj.unit_price,reqObj.wholesale_price,reqObj.count,reqObj.rate,reqObj.comment];
    let str=checkInputInsert(keys,values);
    let sql='INSERT into record('+str[0]+',date) values('+str[1]+',now());';
    console.log(sql)
    let query=db.query(sql,(err,result)=>{
        if(err)
        {console.log(err)
            res.send({
            status:444,
            message:"DB Error."});}
        else if(!result){
            res.send({
                status:400,
                message:"Adding record Fail."});
        }
        else{
            res.send({
                status:200,
                message:"Record addition Successful."});
        }

    });
});

//update category
app.post('/updateRecord/',checkToken,(req,res)=>{
    let id=req.header('record_id');
    var reqObj=req.body;
    let keys=['shop_id','item_id','unit_price','wholesale_price','count','rate','comment'];
    let values=[reqObj.shop_id,reqObj.item_id,reqObj.unit_price,reqObj.wholesale_price,reqObj.count,reqObj.rate,reqObj.comment];
    let str=checkInputUpdate(keys,values)
    if(str=='undefined=undefined')
    res.status(401).json({
        message:'ERROR:No input field to update'
    });
    else{
    let sql='update record set '+str+' where id=?'
    console.log(sql)
    let query=db.query(sql,[id],(err,result)=>{
        if(err)
        {res.send({
            status:444,
            message:"DB Error."});}
        else if(!result){
            res.send({
                status:400,
                message:"Updating record Fail."});
        }
        else{
            res.send({
                status:200,
                message:"Updating record successful.",
                data: result});
        }
    });
    }
});

//delete record by id
app.delete('/deleteRecord/',checkToken,(req,res)=>{
    let id=req.header('record_id');

    let sql=' delete from record where id=? ';
    let query = db.query(sql,[id],(err,result)=>{
        if(err)
        {res.send({
            status:444,
            message:"DB Error."});}
        else if(result.affectedRows==0){
            res.send({
                status:400,
                message:"Deleting record Fail."});
        }
        else{
            res.send({
                status:200,
                message:'Record '+id+' is deleted.',
                data: result});
        }
    });

});

//get all records
app.get('/getAllRecords',checkToken,(req,res)=>{
    let sql=' SELECT * FROM record ';
    let query = db.query(sql,(err,result)=>{
        if(err)
        {res.send({
            status:444,
            message:"DB Error."});}
        else if(!result[0]){
            res.send({
                status:400,
                message:"No Rows."});
        }
        else{
            res.send({
                status:200,
                message:"Getting Data successful.",
                data: result});
        }
    });
});

//get records by shop_id
app.get('/getRecordsByShop',checkToken,(req,res)=>{
    let id=req.header('shop_id');
    let sql=' SELECT * FROM record WHERE shop_id = ? ';
    let query = db.query(sql,[ id],(err,result)=>{
        if(err)
        {
            res.send({
            status:444,
            message:"DB Error."});
        }
        else if(!result[0]){
            res.send({
                status:400,
                message:"No Match Rows."});
        }
        else{
            res.send({
                status:200,
                message:"Getting Data successful.",
                data: result});
        }
    });
});

//get records by item_id
app.get('/getRecordsByItem',checkToken,(req,res)=>{
    let id=req.header('item_id');
    let sql=' SELECT * FROM record WHERE item_id = ? ';
    let query = db.query(sql,[ id],(err,result)=>{
        if(err)
        {
            res.send({
            status:444,
            message:"DB Error."});
        }
        else if(!result[0]){
            res.send({
                status:400,
                message:"No Match Rows."});
        }
        else{
            res.send({
                status:200,
                message:"Getting Data successful.",
                data: result});
        }
    });
});

//get records by category_id
app.get('/getRecordsByCategory',checkToken,(req,res)=>{
    let id=req.header('category_id');
    let sql=' SELECT * FROM record,item WHERE record.item_id=item.id and item.category_id = ? ';
    let query = db.query(sql,[ id],(err,result)=>{
        if(err)
        {
            res.send({
            status:444,
            message:"DB Error."});
        }
        else if(!result[0]){
            res.send({
                status:400,
                message:"No Match Rows."});
        }
        else{
            res.send({
                status:200,
                message:"Getting Data successful.",
                data: result});
        }
    });
});


///////////////////////////////////////////////////////////////
app.get('/getEncrypted',(req,res)=>{
    const plainText = req.header('text');
    const cipherText = cryptLib.encryptPlainTextWithRandomIV(plainText, key);
    res.send({

        encriyptedText:cipherText
    });

});

const cryptLib = require('@skavinvarnan/cryptlib');
const key = "myTestKey";
//password decrypt and encrypt again


//---------------------------------------------------------------------------------------------
//check inputs for insert
function checkInputInsert(key,value){
    var validKeys=[],validValues=[];
    var ky="",val="";var n=0;

    for(var i = 0; i < value.length;i++)
    {
        if(value[i] != null && typeof value[i] != undefined && value[i].length!=0)
        {
            validKeys[n]=key[i];
            validValues[n]="\'"+value[i]+"\'";
            n++;
        }
    }
    ky=validKeys[0];val=validValues[0];
    for(var j =1; j< n ;j++){
        ky=ky+","+validKeys[j];
        val=val+","+validValues[j];
    }
    var st=[ky,val];
    console.log(st[0]);
    console.log(st[1])
    return st;
}

//check inputs for update
function checkInputUpdate(key,value){
    var validKeys=[],validValues=[];var n=0;
    var ky="",val="";

    for(var i = 0; i < value.length;i++)
    {
        if(value[i] != null && typeof value[i] != undefined && value[i].length!=0)
        {
            validKeys[n]=key[i];
            validValues[n]="\'"+value[i]+"\'";
            n++;
        }
    }
    kyVal=validKeys[0]+'='+validValues[0];
    for(var j =1; j< n ;j++){
        kyVal=kyVal+","+validKeys[j]+'='+validValues[j];
    }
    console.log(kyVal)
    return kyVal;
}

function checkToken(req,res,next){
    //next();
    let auth = req.header('Authorization');
    const token = auth && auth.split(" ")[1];
    //const token =req.header('Authorization');
    if(token) {
        try {
            const decoded = jwt.verify(token,'secret');

            if(decoded) {

                let now = new Date().getTime();

                if(decoded.exp * 1000 < now) {
                    res.send({
                        status:401,
                        message:"Token Expired."});
                } else {
                    req.userData = decoded;
                    next();
                }
            } else {
                res.send({
                    status:401,
                    message:"Authorization Fail."});
            }

        } catch (e) {
            res.send({
                status:401,
                message:"Authorization Fail."});
        }

    } else {

        res.send({
            status:401,
            message:"Authorization Fail."});
    }
}